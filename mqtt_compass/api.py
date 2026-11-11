"""Request and response models of the HTTP API."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class BrokerSettingsIn(BaseModel):
    """The broker settings as they are sent by the UI.

    ``password`` may be omitted. If it is missing, the previous password is kept, so that
    the UI does not have to send a secret it does not know.
    """

    id: str | None = None
    """The id of the broker. It is built from the host and the port if it is not given."""

    name: str | None = None
    """The name that is shown in the user interface."""

    host: str = "localhost"
    port: int = Field(default=1883, ge=1, le=65535)
    username: str | None = None
    password: str | None = None
    tls: bool = False
    tls_insecure: bool = False
    ca_certs: str | None = None
    client_cert: str | None = None
    client_key: str | None = None
    client_id: str | None = None
    keepalive: int = Field(default=60, ge=10, le=3600)
    protocol: str = "3.1.1"
    subscribe: str = "#"
    qos: int = Field(default=0, ge=0, le=2)
    connect_timeout: int = Field(default=10, ge=1, le=120)


class PublishRequest(BaseModel):
    """A message that should be published."""

    topic: str = Field(min_length=1)
    payload: str | None = None
    """``None`` or an empty string publishes an empty payload, which deletes the value."""

    qos: int = Field(default=0, ge=0, le=2)
    retain: bool = False


class SubscribeRequest(BaseModel):
    """An additional topic filter that should be watched."""

    topic: str = Field(min_length=1)
    qos: int = Field(default=0, ge=0, le=2)


class ApiResponse(BaseModel):
    """The generic answer of a successful call."""

    ok: bool = True
    message: str | None = None
    data: dict[str, Any] | None = None
