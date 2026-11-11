"""The config flow of the MQTT Compass integration."""

from __future__ import annotations

from typing import Any

import voluptuous as vol
from homeassistant.config_entries import ConfigFlow, ConfigFlowResult, OptionsFlowWithConfigEntry, OptionsFlowWithConfigEntry
from homeassistant.core import callback

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


class MqttExplorerConfigFlow(ConfigFlow, domain=DOMAIN):
    """Ask for the broker and create the entry."""

    VERSION = 1

    async def async_step_user(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Handle the initial step."""
        errors: dict[str, str] = {}

        if user_input is not None:
            host = user_input[CONF_HOST]
            port = user_input[CONF_PORT]

            # Only one broker is supported for now.
            await self.async_set_unique_id(f"{host}:{port}")
            self._abort_if_unique_id_configured()

            return self.async_create_entry(title=f"{host}:{port}", data=user_input)

        schema = vol.Schema(
            {
                vol.Required(CONF_HOST, default="localhost"): str,
                vol.Required(CONF_PORT, default=DEFAULT_PORT): int,
                vol.Optional(CONF_USERNAME): str,
                vol.Optional(CONF_PASSWORD): str,
                vol.Optional(CONF_TLS, default=False): bool,
                vol.Optional(CONF_TLS_INSECURE, default=False): bool,
                vol.Optional(CONF_CLIENT_ID): str,
                vol.Optional(CONF_KEEPALIVE, default=DEFAULT_KEEPALIVE): int,
                vol.Optional(CONF_PROTOCOL, default=DEFAULT_PROTOCOL): str,
                vol.Optional(CONF_SUBSCRIBE, default=DEFAULT_SUBSCRIBE): str,
                vol.Optional(CONF_QOS, default=DEFAULT_QOS): int,
            }
        )

        return self.async_show_form(step_id="user", data_schema=schema, errors=errors)

    @staticmethod
    @callback
    def async_get_options_flow(config_entry: Any) -> Any:
        """Return the options flow."""
        return MqttExplorerOptionsFlow(config_entry)


class MqttExplorerOptionsFlow(OptionsFlowWithConfigEntry):
    """Handle the options of an existing entry."""

    async def async_step_init(self, user_input: dict[str, Any] | None = None) -> ConfigFlowResult:
        """Manage the options."""
        if user_input is not None:
            return self.async_create_entry(data=user_input)

        options = self.config_entry.options
        schema = vol.Schema(
            {
                vol.Optional(CONF_SUBSCRIBE, default=options.get(CONF_SUBSCRIBE, DEFAULT_SUBSCRIBE)): str,
                vol.Optional(CONF_QOS, default=options.get(CONF_QOS, DEFAULT_QOS)): int,
                vol.Optional(CONF_KEEPALIVE, default=options.get(CONF_KEEPALIVE, DEFAULT_KEEPALIVE)): int,
                vol.Optional(
                    CONF_TLS_INSECURE, default=options.get(CONF_TLS_INSECURE, False)
                ): bool,
            }
        )
        return self.async_show_form(step_id="init", data_schema=schema)
