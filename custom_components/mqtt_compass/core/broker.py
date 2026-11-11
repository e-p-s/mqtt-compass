"""The MQTT broker connection.

This module contains everything that talks to the broker. It is deliberately free of any
web framework, so that the same class can be used by the standalone server *and* later by a
Home Assistant custom integration.
"""

from __future__ import annotations

import asyncio
import contextlib
import json
import logging
import ssl
import time
from collections.abc import Callable
from typing import Any

import paho.mqtt.client as mqtt

from .config import BrokerSettings
from .tree import TopicTree, parse_payload

_log = _log = logging.getLogger("mqtt_compass.broker")


def payload_kind(value: str) -> str:
    """Find out what a payload is.

    The kind is determined once, when the message arrives. It tells the explorer whether a
    topic has sub values that can be shown as a tree.

    :return: ``string``, ``number``, ``boolean``, ``null``, ``object`` or ``array``
    """
    text = value.strip()
    if not text:
        return "string"
    if text[0] in "{[":
        try:
            parsed = json.loads(text)
        except ValueError:
            return "string"
        return "array" if isinstance(parsed, list) else "object"
    try:
        parsed = json.loads(text)
    except ValueError:
        return "string"
    if parsed is None:
        return "null"
    if isinstance(parsed, bool):
        return "boolean"
    if isinstance(parsed, (int, float)):
        return "number"
    return "string"


class BrokerService:
    """Connects to an MQTT broker and keeps a :class:`~mqtt_compass.tree.TopicTree` up to date.

    The paho client runs its network loop in its own thread. Every callback is therefore
    forwarded into the asyncio loop of the service before anything is touched, so the tree
    is only ever mutated from the event loop thread.
    """

    def __init__(self, settings: BrokerSettings | None = None) -> None:
        self._settings = settings or BrokerSettings()
        self._settings.validate()

        self.tree = TopicTree()
        self._client: mqtt.Client | None = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self._status: dict[str, Any] = {
            "connected": False,
            "state": "disconnected",
            "lastError": None,
            "lastConnected": None,
            "broker": self._settings.to_dict(with_secret=False),
            "messageCount": 0,
        }
        self._connect_task: asyncio.Task[None] | None = None
        self._stopping = False

    # -- properties -----------------------------------------------------------------

    @property
    def settings(self) -> BrokerSettings:
        return self._settings

    @property
    def connected(self) -> bool:
        return bool(self._status["connected"])

    def status(self) -> dict[str, Any]:
        """Return the current connection status."""
        status = dict(self._status)
        status["broker"] = self._settings.to_dict(with_secret=False)
        status.update(self.tree.stats())
        return status

    # -- lifecycle ------------------------------------------------------------------

    async def start(self) -> None:
        """Connect to the broker. Does not raise if the broker is not reachable."""
        self._loop = asyncio.get_running_loop()
        self._stopping = False
        self._client = self._build_client()
        self._client.connect_async(self._settings.host, self._settings.port, self._settings.keepalive)
        self._client.loop_start()
        self._set_status(state="connecting")

    async def stop(self) -> None:
        """Disconnect and stop the network loop."""
        self._stopping = True
        client = self._client
        self._client = None
        if client is not None:
            with contextlib.suppress(Exception):
                client.disconnect()
            with contextlib.suppress(Exception):
                client.loop_stop()
        self._set_status(state="disconnected", connected=False)

    async def apply_settings(self, settings: BrokerSettings) -> None:
        """Replace the broker settings and reconnect."""
        settings.validate()
        await self.stop()
        self._settings = settings
        self.tree = TopicTree()
        self._set_status(messageCount=0, lastError=None)
        await self.start()

    # -- publishing -----------------------------------------------------------------

    def publish(self, topic: str, payload: str | None, *, qos: int = 0, retain: bool = False) -> int:
        """Publish a message. Returns the message id.

        Raises ``RuntimeError`` when not connected and ``ValueError`` for an invalid topic.
        """
        if not topic:
            raise ValueError("The topic must not be empty.")
        if any(char in topic for char in ("+", "#")):
            raise ValueError("The topic must not contain the wildcards '+' or '#'.")
        if not 0 <= qos <= 2:
            raise ValueError(f"QoS {qos} is invalid, use 0, 1 or 2.")

        client = self._client
        if client is None:
            raise RuntimeError("Not connected to a broker.")
        if not self._status["connected"]:
            raise RuntimeError("The connection to the broker is not established (yet).")

        data = payload.encode("utf-8") if payload is not None else b""
        info = client.publish(topic, data, qos=qos, retain=retain)
        return info.mid

    async def subscribe(self, topic_filter: str, qos: int = 0) -> None:
        """Add another subscription (e.g. to watch a subtree that is not covered by the main filter)."""
        client = self._client
        if client is None or not self._status["connected"]:
            raise RuntimeError("Not connected to a broker.")
        client.subscribe(topic_filter, qos=qos)

    # -- notifications --------------------------------------------------------------

    def subscribe_updates(self) -> asyncio.Queue[dict[str, Any]]:
        """Register a new listener. The queue receives update messages."""
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=1000)
        self._subscribers.add(queue)
        return queue

    def unsubscribe_updates(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        self._subscribers.discard(queue)

    def _notify(self, message: dict[str, Any]) -> None:
        for queue in list(self._subscribers):
            try:
                queue.put_nowait(message)
            except asyncio.QueueFull:
                # A slow client must not block the broker thread - drop the oldest entry.
                with contextlib.suppress(asyncio.QueueEmpty):
                    queue.get_nowait()
                with contextlib.suppress(asyncio.QueueFull):
                    queue.put_nowait(message)

    # -- internals ------------------------------------------------------------------

    def _build_client(self) -> mqtt.Client:
        protocol = {
            "3.1": mqtt.MQTTv31,
            "3.1.1": mqtt.MQTTv311,
            "5": mqtt.MQTTv5,
        }[self._settings.protocol]

        client = mqtt.Client(
            mqtt.CallbackAPIVersion.VERSION2,
            client_id=self._settings.client_id or "",
            protocol=protocol,
        )
        if self._settings.username:
            client.username_pw_set(self._settings.username, self._settings.password)

        if self._settings.tls:
            client.tls_set(
                ca_certs=self._settings.ca_certs,
                certfile=self._settings.client_cert,
                keyfile=self._settings.client_key,
                cert_reqs=ssl.CERT_NONE if self._settings.tls_insecure else ssl.CERT_REQUIRED,
                tls_version=ssl.PROTOCOL_TLS_CLIENT,
            )
            if self._settings.tls_insecure:
                client.tls_insecure_set(True)
        elif self._settings.tls_insecure:
            _log.warning("'tls_insecure' has no effect without 'tls'.")

        client.on_connect = self._on_connect
        client.on_disconnect = self._on_disconnect
        client.on_message = self._on_message
        client.on_subscribe = self._on_subscribe
        return client

    # paho callbacks - they run in the network thread --------------------------

    def _on_connect(self, client, userdata, flags, reason_code, properties=None) -> None:  # noqa: ANN001
        failed = bool(getattr(reason_code, "is_failure", False)) if reason_code is not None else False
        text = str(reason_code)
        self._call_soon(self._handle_connect, failed, text)

    def _on_disconnect(self, client, userdata, disconnect_flags=None, reason_code=None, properties=None) -> None:  # noqa: ANN001
        text = str(reason_code) if reason_code is not None else "disconnected"
        self._call_soon(self._handle_disconnect, text)

    def _on_message(self, client, userdata, msg) -> None:  # noqa: ANN001
        self._call_soon(self._handle_message, msg.topic, msg.payload, msg.qos, msg.retain)

    def _on_subscribe(self, client, userdata, mid, reason_codes=None, properties=None) -> None:  # noqa: ANN001
        if reason_codes:
            _log.debug("Subscribed (mid=%s): %s", mid, reason_codes)

    def _call_soon(self, func: Callable[..., None], *args: Any) -> None:
        loop = self._loop
        if loop is None or loop.is_closed():
            return
        try:
            loop.call_soon_threadsafe(func, *args)
        except RuntimeError:
            pass

    # handlers - they run in the event loop ---------------------------------------

    def _handle_connect(self, failed: bool, reason: str) -> None:
        if failed:
            _log.warning("Connection refused by the broker: %s", reason)
            self._set_status(state="error", connected=False, lastError=reason)
            return

        _log.info("Connected to %s:%s", self._settings.host, self._settings.port)
        self._set_status(state="connected", connected=True, lastError=None, lastConnected=time.time())
        client = self._client
        if client is not None:
            result, _mid = client.subscribe(self._settings.subscribe, qos=self._settings.qos)
            if result != mqtt.MQTT_ERR_SUCCESS:
                _log.error("Could not subscribe to %r: %s", self._settings.subscribe, result)
        self._notify({"type": "status", "status": self.status()})

    def _handle_disconnect(self, reason: str) -> None:
        if self._stopping:
            return
        _log.warning("Disconnected from the broker: %s", reason)
        self._set_status(state="disconnected", connected=False, lastError=reason)
        self._notify({"type": "status", "status": self.status()})

    def _handle_message(self, topic: str, payload: bytes, qos: int, retain: bool) -> None:
        value, size = parse_payload(payload)

        if value is None:
            # An empty payload deletes the value.
            self.tree.remove(topic)
            self._notify({"type": "remove", "topic": topic})
        else:
            self.tree.set_value(
                topic,
                value,
                qos=qos,
                retain=retain,
                size=size,
                kind=payload_kind(value),
            )
            self._notify(
                {
                    "type": "value",
                    "topic": topic,
                    "value": value,
                    "qos": qos,
                    "retain": retain,
                    "size": size,
                    "timestamp": time.time(),
                }
            )

        self._status["messageCount"] += 1

    def _set_status(self, **kwargs: Any) -> None:
        self._status.update(kwargs)
