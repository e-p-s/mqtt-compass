"""The REST API of the MQTT Compass integration.

The API has the same shape as the one of the standalone server, so that the same web UI
works with both. Only the prefix is different: ``/api/mqtt_compass`` here.

    /api/mqtt_compass/brokers                  - the list of the brokers
    /api/mqtt_compass/brokers/{id}             - one broker
    /api/mqtt_compass/brokers/{id}/tree        - the topic tree
    /api/mqtt_compass/brokers/{id}/value       - the value of one topic
    /api/mqtt_compass/brokers/{id}/updates     - the changes since a sequence number
    /api/mqtt_compass/brokers/{id}/publish     - publish a message

The panel in Home Assistant runs in an iframe and cannot open a WebSocket of its own, so
it asks for the changes in short intervals instead of ``/ws``.
"""

from __future__ import annotations

import json
import logging
from typing import Any

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import API_PREFIX, DOMAIN
from .core.broker import BrokerService

_log = logging.getLogger(__name__)


def _service(hass: HomeAssistant) -> BrokerService:
    """Return the service of the only broker."""
    entries = hass.config_entries.async_entries(DOMAIN)
    if not entries:
        raise HomeAssistantError("The MQTT Compass is not configured.")
    service = hass.data.get(DOMAIN, {}).get(entries[0].entry_id)
    if service is None:
        raise HomeAssistantError("The MQTT Compass is not running.")
    return service


async def _apply_broker_update(request: Any, service: BrokerService) -> Any:
    """Validate incoming settings, keep a blank password, apply and reconnect."""
    try:
        body = await request.json()
    except (json.JSONDecodeError, ValueError):
        return _error(400, "The body is not valid JSON.")

    incoming = dict(body)
    password = incoming.pop("password", None)
    if password is None and incoming.get("username") == service.settings.username:
        incoming["password"] = service.settings.password
    else:
        incoming["password"] = password

    settings = service.settings.__class__(**incoming)
    try:
        settings.validate()
    except (TypeError, ValueError) as err:
        return _error(400, str(err))

    await service.apply_settings(settings)
    return {"ok": True, "message": "Reconnected."}


class HomeAssistantError(Exception):
    """The integration is not ready."""


class BrokersView(HomeAssistantView):
    """The list of the brokers."""

    url = f"{API_PREFIX}/brokers"
    name = f"api:{DOMAIN}:brokers"
    requires_auth = True

    async def get(self, request) -> Any:
        """Return the list with the status of every broker."""
        service = _service(request.app["hass"])
        status = service.status()
        return {
            "brokers": [
                {
                    "id": service.settings.id,
                    "name": service.settings.name or service.settings.host,
                    "host": service.settings.host,
                    "port": service.settings.port,
                    "username": service.settings.username,
                    "connected": status["connected"],
                    "state": status["state"],
                    "lastError": status["lastError"],
                    "topics": status["topics"],
                    "folders": status["folders"],
                    "messageCount": status["messageCount"],
                }
            ]
        }


    async def post(self, request) -> Any:
        """Create/replace the single broker from the UI and reconnect."""
        return await _apply_broker_update(request, _service(request.app["hass"]))


class BrokerView(HomeAssistantView):
    """The settings of one broker."""

    url = f"{API_PREFIX}/brokers/{{broker_id}}"
    name = f"api:{DOMAIN}:broker"
    requires_auth = True

    async def get(self, request) -> Any:
        """Return the settings. The password is masked."""
        service = _service(request.app["hass"])
        return {"broker": service.settings.to_dict(with_secret=False)}

    async def put(self, request) -> Any:
        """Change the settings and reconnect."""
        return await _apply_broker_update(request, _service(request.app["hass"]))


class TreeView(HomeAssistantView):
    """The topic tree."""

    url = f"{API_PREFIX}/brokers/{{broker_id}}/tree"
    name = f"api:{DOMAIN}:tree"
    requires_auth = True

    async def get(self, request) -> Any:
        """Return the tree. The payloads can be cut - see the standalone server."""
        service = _service(request.app["hass"])
        length = _max_value_length(request)
        return service.tree.snapshot(length)


class ValueView(HomeAssistantView):
    """The complete value of one topic."""

    url = f"{API_PREFIX}/brokers/{{broker_id}}/value"
    name = f"api:{DOMAIN}:value"
    requires_auth = True

    async def get(self, request) -> Any:
        """Return the value of the topic."""
        service = _service(request.app["hass"])
        value = service.tree.value_of(request.query.get("topic", ""))
        if value is None:
            return _error(404, "There is no value for this topic.")
        return value


class UpdatesView(HomeAssistantView):
    """The changes since a sequence number."""

    url = f"{API_PREFIX}/brokers/{{broker_id}}/updates"
    name = f"api:{DOMAIN}:updates"
    requires_auth = True

    async def get(self, request) -> Any:
        """Return the changes."""
        service = _service(request.app["hass"])
        try:
            since = int(request.query.get("since", "0"))
        except ValueError:
            since = 0
        return {"sequence": service.tree.sequence, "changes": service.tree.changes_since(since)}


class StatusView(HomeAssistantView):
    """The connection status."""

    url = f"{API_PREFIX}/brokers/{{broker_id}}/status"
    name = f"api:{DOMAIN}:status"
    requires_auth = True

    async def get(self, request) -> Any:
        """Return the status."""
        return _service(request.app["hass"]).status()


class PublishView(HomeAssistantView):
    """Publish a message."""

    url = f"{API_PREFIX}/brokers/{{broker_id}}/publish"
    name = f"api:{DOMAIN}:publish"
    requires_auth = True

    async def post(self, request) -> Any:
        """Publish the message."""
        service = _service(request.app["hass"])
        try:
            body = await request.json()
        except (json.JSONDecodeError, ValueError):
            return _error(400, "The body is not valid JSON.")

        topic = body.get("topic")
        if not topic:
            return _error(400, "The topic must not be empty.")

        try:
            mid = service.publish(
                topic,
                body.get("payload"),
                qos=int(body.get("qos", 0)),
                retain=bool(body.get("retain", False)),
            )
        except (RuntimeError, ValueError) as err:
            return _error(400, str(err))

        return {"ok": True, "message": f"Published (mid={mid})."}


def _max_value_length(request) -> int | None:
    """Read the wanted length of the payloads from the query."""
    try:
        length = int(request.query.get("maxValueLength", "0"))
    except ValueError:
        return None
    return length if length > 0 else None


def _error(status: int, message: str) -> Any:
    """Build an error answer."""
    from aiohttp import web

    return web.Response(status=status, text=message)
