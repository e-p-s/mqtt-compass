"""Constants of the MQTT Compass integration."""

from __future__ import annotations

DOMAIN = "mqtt_compass"

#: The prefix of the REST API of the integration.
API_PREFIX = "/api/mqtt_compass"

#: The path where the web UI is served.
PANEL_URL = "/api/mqtt_compass/static"

ATTR_BROKER = "broker"

CONF_HOST = "host"
CONF_PORT = "port"
CONF_USERNAME = "username"
CONF_PASSWORD = "password"
CONF_TLS = "tls"
CONF_TLS_INSECURE = "tls_insecure"
CONF_CLIENT_ID = "client_id"
CONF_KEEPALIVE = "keepalive"
CONF_PROTOCOL = "protocol"
CONF_SUBSCRIBE = "subscribe"
CONF_QOS = "qos"

DEFAULT_PORT = 1883
DEFAULT_KEEPALIVE = 60
DEFAULT_SUBSCRIBE = "#"
DEFAULT_PROTOCOL = "3.1.1"
