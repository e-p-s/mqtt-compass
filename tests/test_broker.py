"""Tests of the broker service.

The tests do not need a real broker. The message handling is triggered directly, the same
way the paho callback does it (only from the event loop).
"""

from __future__ import annotations

import asyncio

import pytest

from mqtt_compass.broker import BrokerService
from mqtt_compass.config import BrokerSettings


@pytest.fixture
def service() -> BrokerService:
    return BrokerService(BrokerSettings(host="localhost", port=1883))


async def test_message_fills_the_tree(service: BrokerService) -> None:
    service._handle_message("home/office/temp", b"21.5", 0, False)

    node = service.tree.find("home/office/temp")
    assert node is not None
    assert node.value is not None
    assert node.value.value == "21.5"


async def test_message_is_forwarded_to_the_subscribers(service: BrokerService) -> None:
    queue = service.subscribe_updates()
    service._handle_message("a", b"1", 0, False)

    message = queue.get_nowait()
    assert message["type"] == "value"
    assert message["topic"] == "a"
    assert message["value"] == "1"


async def test_empty_payload_removes_the_topic(service: BrokerService) -> None:
    service._handle_message("a", b"1", 0, False)
    assert service.tree.find("a") is not None

    service._handle_message("a", b"", 0, False)
    assert service.tree.find("a") is None


async def test_empty_payload_notifies_with_remove(service: BrokerService) -> None:
    queue = service.subscribe_updates()
    service._handle_message("a", b"1", 0, False)
    queue.get_nowait()

    service._handle_message("a", b"", 0, False)
    message = queue.get_nowait()
    assert message["type"] == "remove"
    assert message["topic"] == "a"


async def test_status_counts_the_messages(service: BrokerService) -> None:
    service._handle_message("a", b"1", 0, False)
    service._handle_message("b", b"2", 0, False)

    status = service.status()
    assert status["messageCount"] == 2
    assert status["topics"] == 2


async def test_status_never_leaks_the_password(service: BrokerService) -> None:
    service._settings.password = "top-secret"
    assert "top-secret" not in str(service.status())


async def test_publish_without_connection_fails(service: BrokerService) -> None:
    with pytest.raises(RuntimeError):
        service.publish("a", "1")


async def test_publish_rejects_wildcards(service: BrokerService) -> None:
    with pytest.raises(ValueError):
        service.publish("a/+/b", "1")
    with pytest.raises(ValueError):
        service.publish("a/#", "1")


async def test_publish_rejects_empty_topic(service: BrokerService) -> None:
    with pytest.raises(ValueError):
        service.publish("", "1")


async def test_publish_rejects_invalid_qos(service: BrokerService) -> None:
    with pytest.raises(ValueError):
        service.publish("a", "1", qos=5)


async def test_subscribers_can_be_removed(service: BrokerService) -> None:
    queue = service.subscribe_updates()
    service.unsubscribe_updates(queue)
    service._handle_message("a", b"1", 0, False)
    assert queue.empty()


async def test_a_slow_subscriber_does_not_block(service: BrokerService) -> None:
    queue = service.subscribe_updates()
    # Fill the queue up to its limit.
    for index in range(1100):
        service._handle_message(f"topic/{index}", b"1", 0, False)

    assert queue.qsize() <= 1000


async def test_handle_connect_subscribes(service: BrokerService) -> None:
    subscribed: list[tuple[str, int]] = []

    class FakeClient:
        def subscribe(self, topic: str, qos: int = 0):
            subscribed.append((topic, qos))
            return (0, 1)

    service._client = FakeClient()  # type: ignore[assignment]
    service._handle_connect(False, "Success")

    assert subscribed == [("#", 0)]
    assert service.status()["connected"] is True


async def test_handle_connect_with_failure(service: BrokerService) -> None:
    service._handle_connect(True, "not authorised")
    assert service.status()["connected"] is False
    assert service.status()["state"] == "error"


async def test_disconnect_updates_the_status(service: BrokerService) -> None:
    service._handle_connect(False, "Success")
    service._handle_disconnect("connection lost")
    assert service.status()["connected"] is False


async def test_apply_settings_replaces_the_tree(service: BrokerService) -> None:
    service._handle_message("a", b"1", 0, False)
    assert service.tree.find("a") is not None

    await service.apply_settings(BrokerSettings(host="broker.local"))
    assert service.tree.find("a") is None
    assert service.settings.host == "broker.local"


async def test_apply_settings_validates(service: BrokerService) -> None:
    with pytest.raises(ValueError):
        await service.apply_settings(BrokerSettings(port=0))


async def test_notify_survives_a_closed_loop(service: BrokerService) -> None:
    service._loop = None
    service._call_soon(service._handle_message, "a", b"1", 0, False)
    await asyncio.sleep(0)
