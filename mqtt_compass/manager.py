"""Management of several MQTT brokers.

The explorer can watch more than one broker. Every broker has its own connection and its
own topic tree. The user switches between them in the web interface.
"""

from __future__ import annotations

import logging
from typing import Any

from .broker import BrokerService
from .config import BrokerSettings

_log = logging.getLogger("mqtt_compass.manager")


class BrokerManager:
    """Holds the connections to all the configured brokers."""

    def __init__(self, settings: list[BrokerSettings] | None = None) -> None:
        self._services: dict[str, BrokerService] = {}
        self._order: list[str] = []

        for item in settings or []:
            self._add_service(item)

    # -- the list of the brokers ------------------------------------------------------

    def list(self) -> list[dict[str, Any]]:
        """Return a summary of every broker with its status."""
        result: list[dict[str, Any]] = []
        for broker_id in self._order:
            service = self._services[broker_id]
            status = service.status()
            result.append(
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
            )
        return result

    @property
    def ids(self) -> list[str]:
        """The ids of all the brokers, in the order they were added."""
        return list(self._order)

    def settings_list(self) -> list[BrokerSettings]:
        """The settings of all the brokers - they are written back to the configuration."""
        return [self._services[broker_id].settings for broker_id in self._order]

    def has(self, broker_id: str) -> bool:
        """Is there a broker with this id?"""
        return broker_id in self._services

    def get(self, broker_id: str) -> BrokerService | None:
        """Return the service of a broker, or ``None`` if there is no such broker."""
        return self._services.get(broker_id)

    def first(self) -> BrokerService | None:
        """Return the service of the first broker."""
        for broker_id in self._order:
            return self._services[broker_id]
        return None

    # -- changing the list of the brokers ---------------------------------------------

    def _add_service(self, settings: BrokerSettings) -> BrokerService:
        """Create the service of a broker and remember it."""
        if not settings.id:
            settings.id = settings.make_id(set(self._services))
        if not settings.name:
            settings.name = settings.host
        service = BrokerService(settings)
        self._services[settings.id] = service
        self._order.append(settings.id)
        return service

    async def add(self, settings: BrokerSettings) -> BrokerService:
        """Add a new broker and connect to it."""
        service = self._add_service(settings)
        await service.start()
        _log.info("The broker %s (%s:%s) was added.", settings.id, settings.host, settings.port)
        return service

    async def update(self, broker_id: str, settings: BrokerSettings) -> BrokerService | None:
        """Change the settings of a broker and reconnect it."""
        service = self._services.get(broker_id)
        if service is None:
            return None
        settings.id = broker_id
        if not settings.name:
            settings.name = service.settings.name
        service = BrokerService(settings)
        self._services[broker_id] = service
        await service.start()
        _log.info("The broker %s was changed.", broker_id)
        return service

    async def remove(self, broker_id: str) -> bool:
        """Remove a broker and disconnect from it."""
        service = self._services.pop(broker_id, None)
        if service is None:
            return False
        self._order.remove(broker_id)
        await service.stop()
        _log.info("The broker %s was removed.", broker_id)
        return True

    # -- the life cycle ----------------------------------------------------------------

    async def start(self) -> None:
        """Connect to all the brokers."""
        for broker_id in self._order:
            await self._services[broker_id].start()

    async def stop(self) -> None:
        """Disconnect from all the brokers."""
        for broker_id in self._order:
            await self._services[broker_id].stop()
