"""The MQTT Compass integration for Home Assistant.

The integration opens its own connection to the MQTT broker - the MQTT integration of
Home Assistant can only be subscribed to the topics that are configured there, but an
explorer has to see everything that the broker knows.

The web UI is the same one that the standalone server uses. It is added to a dashboard as
an iframe card::

    type: iframe
    url: /api/mqtt_compass/static/index.html
    aspect_ratio: 1.6
"""

from __future__ import annotations

import logging
from pathlib import Path

from homeassistant.components.http import HomeAssistantView, StaticPathConfig
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.typing import ConfigType

from .api import (
    BrokerView,
    BrokersView,
    PublishView,
    StatusView,
    TreeView,
    UpdatesView,
    ValueView,
)
from .const import (
    CONF_CLIENT_ID,
    CONF_HOST,
    CONF_KEEPALIVE,
    CONF_PASSWORD,
    CONF_PORT,
    CONF_PROTOCOL,
    CONF_QOS,
    CONF_SUBSCRIBE,
    CONF_TLS,
    CONF_TLS_INSECURE,
    CONF_USERNAME,
    DEFAULT_KEEPALIVE,
    DEFAULT_PORT,
    DEFAULT_PROTOCOL,
    DEFAULT_QOS,
    DEFAULT_SUBSCRIBE,
    DOMAIN,
)
from .panel import PanelView
from .core.broker import BrokerService
from .core.config import BrokerSettings

_LOG = logging.getLogger(__name__)

#: The folder with the built web UI.
STATIC_DIR = Path(__file__).parent / "static"


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Set up one broker."""
    settings = _settings_from_entry(entry)
    service = BrokerService(settings)

    hass.data.setdefault(DOMAIN, {})[entry.entry_id] = service

    await service.start()

    # The REST API. The views are registered only once, they work with the first entry.
    if not hass.data[DOMAIN].get("_views_registered"):
        hass.http.register_view(BrokersView)
        hass.http.register_view(BrokerView)
        hass.http.register_view(StatusView)
        hass.http.register_view(TreeView)
        hass.http.register_view(ValueView)
        hass.http.register_view(UpdatesView)
        hass.http.register_view(PublishView)
        hass.http.register_view(PanelView)

        if (STATIC_DIR / "assets").is_dir():
            await hass.http.async_register_static_paths(
                [StaticPathConfig(f"/api/mqtt_compass/static/assets", str(STATIC_DIR / "assets"))]
            )

        hass.data[DOMAIN]["_views_registered"] = True

    entry.async_on_unload(entry.add_update_listener(async_reload_entry))

    return True


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    """Tear down one broker."""
    service: BrokerService | None = hass.data.get(DOMAIN, {}).pop(entry.entry_id, None)
    if service is not None:
        await service.stop()
    return True


async def async_reload_entry(hass: HomeAssistant, entry: ConfigEntry) -> None:
    """Reload the entry after the options were changed."""
    await hass.config_entries.async_reload(entry.entry_id)


def _settings_from_entry(entry: ConfigEntry) -> BrokerSettings:
    """Build the broker settings from the config entry."""
    data: ConfigType = {**entry.data, **entry.options}
    return BrokerSettings(
        host=data.get(CONF_HOST, "localhost"),
        port=data.get(CONF_PORT, DEFAULT_PORT),
        username=data.get(CONF_USERNAME),
        password=data.get(CONF_PASSWORD),
        tls=data.get(CONF_TLS, False),
        tls_insecure=data.get(CONF_TLS_INSECURE, False),
        client_id=data.get(CONF_CLIENT_ID),
        keepalive=data.get(CONF_KEEPALIVE, DEFAULT_KEEPALIVE),
        protocol=data.get(CONF_PROTOCOL, DEFAULT_PROTOCOL),
        subscribe=data.get(CONF_SUBSCRIBE, DEFAULT_SUBSCRIBE),
        qos=data.get(CONF_QOS, DEFAULT_QOS),
    )


__all__ = ["DOMAIN", "HomeAssistantView", "async_setup_entry", "async_unload_entry"]
