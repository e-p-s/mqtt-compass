"""Configuration of the MQTT explorer.

The configuration is kept in a plain JSON file so that it can be edited by hand and shipped
inside a container image. The broker settings can also be changed at runtime through the
REST API - the file is then rewritten so a restart picks them up again.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field, fields
from pathlib import Path
from typing import Any

#: Configuration file that is used when nothing else is given.
DEFAULT_CONFIG_FILE = Path("mqtt-compass.json")


def _known_fields(cls: type, data: dict[str, Any]) -> dict[str, Any]:
    """Drop all keys that the dataclass does not know.

    A configuration file may contain settings of a newer version. They must not break the
    start of the explorer, they are simply ignored.
    """
    names = {item.name for item in fields(cls)}
    return {key: value for key, value in data.items() if key in names}


@dataclass
class BrokerSettings:
    """Everything needed to reach an MQTT broker."""

    id: str = ""
    """The internal id. It is built from the host and the port if it is not given."""

    name: str = ""
    """The name that is shown in the user interface."""

    host: str = "localhost"
    port: int = 1883
    username: str | None = None
    password: str | None = None
    tls: bool = False
    """Use TLS/SSL."""

    tls_insecure: bool = False
    """Do not verify the server certificate. Only for self signed certificates in a LAN."""

    ca_certs: str | None = None
    """Path to a CA certificate file."""

    client_cert: str | None = None
    """Path to the client certificate (mTLS)."""

    client_key: str | None = None
    """Path to the client key (mTLS)."""

    client_id: str | None = None
    """Client id. ``None`` lets the broker generate one."""

    keepalive: int = 60
    """Keep alive interval in seconds."""

    protocol: str = "3.1.1"
    """``3.1``, ``3.1.1`` or ``5``."""

    subscribe: str = "#"
    """Topic filter the explorer subscribes to."""

    qos: int = 0
    """QoS used for the subscription."""

    connect_timeout: int = 10
    """Timeout in seconds while connecting."""

    def to_dict(self, *, with_secret: bool = True) -> dict[str, Any]:
        data = asdict(self)
        if not with_secret:
            data["password"] = "***" if self.password else None
        return data

    def make_id(self, taken: set[str] | None = None) -> str:
        """Build a unique id from the host and the port."""
        base = f"{self.host}-{self.port}".lower().replace(" ", "-")
        base = "".join(char if char.isalnum() or char in "-_." else "-" for char in base)
        if not taken or base not in taken:
            return base
        number = 2
        while f"{base}-{number}" in taken:
            number += 1
        return f"{base}-{number}"

    def validate(self) -> None:
        """Raise ``ValueError`` if the settings are obviously broken."""
        if not self.host:
            raise ValueError("The broker host must not be empty.")
        if not 1 <= self.port <= 65535:
            raise ValueError(f"The broker port {self.port} is out of range.")
        if self.protocol not in ("3.1", "3.1.1", "5"):
            raise ValueError(f"Unsupported MQTT protocol {self.protocol!r}. Use '3.1', '3.1.1' or '5'.")
        if self.qos not in (0, 1, 2):
            raise ValueError(f"QoS {self.qos} is invalid, use 0, 1 or 2.")
        if self.protocol == "3.1" and self.qos == 2:
            raise ValueError("QoS 2 is not supported by MQTT 3.1.")
        validate_topic_filter(self.subscribe)

    @property
    def topic_filter(self) -> str:
        """The topic filter that is watched (an alias for :attr:`subscribe`)."""
        return self.subscribe


def validate_topic_filter(topic_filter: str) -> None:
    """Check that the topic filter is valid.

    The rules are the ones of the MQTT specification and of the the MQTT specification:
    ``+`` must occupy a whole level, and ``#`` is only allowed as the last character.
    """
    if not topic_filter:
        raise ValueError("The topic filter must not be empty.")

    parts = topic_filter.split("/")
    for index, part in enumerate(parts):
        if "#" in part and part != "#":
            raise ValueError(
                f"The topic filter {topic_filter!r} is invalid: "
                "the wildcard '#' must be a level of its own."
            )
        if "#" in part and index != len(parts) - 1:
            raise ValueError(
                f"The topic filter {topic_filter!r} is invalid: "
                "the wildcard '#' is only allowed as the last level."
            )
        if "+" in part and part != "+":
            raise ValueError(
                f"The topic filter {topic_filter!r} is invalid: "
                "the wildcard '+' must be a level of its own."
            )


@dataclass
class ServerSettings:
    """Settings of the built in web server."""

    host: str = "0.0.0.0"  # noqa: S104 - a LAN tool, listening on all interfaces is the default
    port: int = 8088
    """Port of the web UI."""

    allowed_origins: list[str] = field(default_factory=list)
    """Allowed CORS origins. Empty means "same origin only"."""

    auth_token: str | None = None
    """If set, the API requires this bearer token."""

    websocket: bool = True
    """If false, the WebSocket is not offered and the UI falls back to polling.

    Some proxies break the WebSocket connection. In that case the UI can ask for the
    changes with short intervals instead.
    """


@dataclass
class Config:
    """The complete configuration of the explorer."""

    brokers: list[BrokerSettings] = field(default_factory=list)
    """All the brokers that can be watched. The explorer can switch between them."""

    server: ServerSettings = field(default_factory=ServerSettings)

    _path: Path | None = field(default=None, repr=False, compare=False)
    """Where the configuration was read from - it is written back on a change."""

    @property
    def broker(self) -> BrokerSettings:
        """The first broker - the one the command line options change."""
        if not self.brokers:
            self.brokers.append(BrokerSettings())
        return self.brokers[0]

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "Config":
        server = ServerSettings(**_known_fields(ServerSettings, data.get("server", {})))

        brokers: list[BrokerSettings] = []
        raw_brokers = data.get("brokers")
        if isinstance(raw_brokers, list):
            for entry in raw_brokers:
                if isinstance(entry, dict):
                    brokers.append(BrokerSettings(**_known_fields(BrokerSettings, entry)))
        elif isinstance(data.get("broker"), dict):
            # The older format with a single broker.
            brokers.append(BrokerSettings(**_known_fields(BrokerSettings, data["broker"])))

        config = cls(brokers=brokers, server=server)
        config._make_ids()
        return config

    def _make_ids(self) -> None:
        """Give every broker an id and a name, if they do not have one."""
        taken: set[str] = set()
        for settings in self.brokers:
            if not settings.id:
                settings.id = settings.make_id(taken)
            taken.add(settings.id)
            if not settings.name:
                settings.name = settings.host

    @classmethod
    def load(cls, path: Path | str | None) -> "Config":
        """Read the configuration from a JSON file. A missing file yields the defaults."""
        if path is None:
            config = cls()
            config._make_ids()
            return config
        file = Path(path)
        if not file.exists():
            config = cls()
            config._make_ids()
            config._path = file
            return config
        try:
            data = json.loads(file.read_text("utf-8"))
        except json.JSONDecodeError as err:
            raise ValueError(f"The configuration file {file} is not valid JSON: {err}") from err
        config = cls.from_dict(data)
        config._path = file
        return config

    def save(self, path: Path | str) -> None:
        """Write the configuration back to a JSON file."""
        file = Path(path)
        file.parent.mkdir(parents=True, exist_ok=True)
        data = {
            "brokers": [asdict(settings) for settings in self.brokers],
            "server": asdict(self.server),
        }
        file.write_text(json.dumps(data, indent=2) + "\n", "utf-8")
