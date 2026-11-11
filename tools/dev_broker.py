"""A small MQTT broker for the development and the tests.

It is not part of the package - it only exists to have something to talk to while the
explorer is developed. Start it with::

    python tools/dev_broker.py
"""

from __future__ import annotations

import asyncio
import logging

from amqtt.broker import Broker

logging.basicConfig(level=logging.INFO)


async def main() -> None:
    broker = Broker(
        {
            "listeners": {
                "default": {"type": "tcp", "bind": "127.0.0.1:1883", "max_connections": 100},
            },
            "sys_interval": 0,
            "auth": {"allow-anonymous": True, "plugins": ["auth_anonymous"]},
            "topic-check": {"enabled": False},
        }
    )
    await broker.start()
    print("The development broker is running on 127.0.0.1:1883 - press Ctrl+C to stop it.")
    try:
        await asyncio.Event().wait()
    except (KeyboardInterrupt, asyncio.CancelledError):
        pass
    finally:
        await broker.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
