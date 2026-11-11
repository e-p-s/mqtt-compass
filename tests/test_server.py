"""Tests of the HTTP API."""

from __future__ import annotations

import json
from typing import Any

import pytest
from fastapi.testclient import TestClient

from mqtt_compass.broker import BrokerService
from mqtt_compass.config import BrokerSettings, Config, ServerSettings
from mqtt_compass.manager import BrokerManager
from mqtt_compass.server import create_app


@pytest.fixture
def manager() -> BrokerManager:
    """A manager with one broker - the start/stop of the network loop is switched off."""
    settings = BrokerSettings(host="localhost", port=1883)
    broker_manager = BrokerManager([settings])
    service = broker_manager.get(settings.id)
    assert service is not None

    async def _start() -> None:
        return None

    async def _stop() -> None:
        return None

    service.start = _start  # type: ignore[method-assign]
    service.stop = _stop  # type: ignore[method-assign]
    return broker_manager


@pytest.fixture
def service(manager: BrokerManager) -> BrokerService:
    """The service of the only broker."""
    found = manager.first()
    assert found is not None
    return found


@pytest.fixture
def client(manager: BrokerManager) -> TestClient:
    first = manager.first()
    assert first is not None
    config = Config(brokers=[first.settings], server=ServerSettings(port=8088))
    app = create_app(config, manager)

    with TestClient(app) as test_client:
        yield test_client


def test_status(client: TestClient) -> None:
    response = client.get("/api/status")
    assert response.status_code == 200
    data = response.json()
    assert data["connected"] is False
    assert data["topics"] == 0


def test_tree_is_empty(client: TestClient) -> None:
    response = client.get("/api/tree")
    assert response.status_code == 200
    assert response.json()["children"] == []


def test_tree_contains_the_values(client: TestClient, service: BrokerService) -> None:
    service._handle_message("home/temp", b"21.5", 0, False)

    response = client.get("/api/tree")
    assert response.json()["children"][0]["name"] == "home"


def test_config_masks_the_password(client: TestClient, service: BrokerService) -> None:
    service._settings.password = "top-secret"
    response = client.get("/api/config")
    assert response.status_code == 200
    assert response.json()["broker"]["password"] == "***"
    assert "top-secret" not in response.text


def test_config_can_be_changed(client: TestClient) -> None:
    response = client.put(
        "/api/config",
        json={"host": "broker.local", "port": 8883, "subscribe": "home/#", "protocol": "3.1.1", "qos": 0},
    )
    assert response.status_code == 200
    assert response.json()["data"]["broker"]["host"] == "broker.local"


def test_config_rejects_an_invalid_port(client: TestClient) -> None:
    response = client.put("/api/config", json={"host": "x", "port": 0})
    assert response.status_code == 422


def test_config_rejects_an_invalid_protocol(client: TestClient) -> None:
    response = client.put("/api/config", json={"host": "x", "port": 1883, "protocol": "9"})
    assert response.status_code == 400


def test_publish_without_a_connection_fails(client: TestClient) -> None:
    response = client.post("/api/publish", json={"topic": "a", "payload": "1"})
    assert response.status_code == 400
    assert "not connected" in response.json()["detail"].lower()


def test_publish_rejects_wildcards(client: TestClient) -> None:
    response = client.post("/api/publish", json={"topic": "a/#", "payload": "1"})
    assert response.status_code == 400


def test_publish_needs_a_topic(client: TestClient) -> None:
    response = client.post("/api/publish", json={"payload": "1"})
    assert response.status_code == 422


def test_websocket_sends_the_status_and_the_changes(client: TestClient, manager: BrokerManager) -> None:
    """The WebSocket carries the small messages - the tree is fetched over REST."""
    first = manager.first()
    assert first is not None

    with client.websocket_connect(f"/api/brokers/{first.settings.id}/ws?since=0") as websocket:
        message = websocket.receive_json()
        assert message["type"] == "status"
        assert message["status"]["broker"]["host"] == "localhost"

        # A change is pushed to the client.
        first._handle_message("live/topic", b"42", 1, True)
        message = websocket.receive_json()
        assert message["type"] == "value"
        assert message["topic"] == "live/topic"
        assert message["value"] == "42"
        assert message["qos"] == 1
        assert message["retain"] is True


def test_websocket_sends_the_changes_that_were_missed(client: TestClient, manager: BrokerManager) -> None:
    """The client tells with `since` what it already knows - the rest is sent first."""
    first = manager.first()
    assert first is not None

    first._handle_message("a/b", b"1", 0, False)
    sequence = first.tree.sequence

    # A change that happens after the tree was fetched.
    first._handle_message("a/c", b"2", 0, False)

    with client.websocket_connect(f"/api/brokers/{first.settings.id}/ws?since={sequence}") as websocket:
        assert websocket.receive_json()["type"] == "status"
        message = websocket.receive_json()
        assert message["type"] == "value"
        assert message["topic"] == "a/c"


def test_the_tree_is_fetched_over_rest(client: TestClient, manager: BrokerManager) -> None:
    first = manager.first()
    assert first is not None
    first._handle_message("a/b", b"1", 0, False)

    response = client.get(f"/api/brokers/{first.settings.id}/tree")
    assert response.status_code == 200
    tree = response.json()
    assert tree["children"][0]["name"] == "a"
    assert tree["children"][0]["children"][0]["value"]["value"] == "1"
    assert tree["sequence"] > 0


def test_the_value_can_be_cut_and_fetched_again(client: TestClient, manager: BrokerManager) -> None:
    """A big tree is cut - the full value is fetched separately."""
    first = manager.first()
    assert first is not None
    payload = "x" * 500
    first._handle_message("long/value", payload.encode(), 0, False)

    tree = client.get(f"/api/brokers/{first.settings.id}/tree?maxValueLength=100").json()
    value = tree["children"][0]["children"][0]["value"]
    assert len(value["value"]) == 100
    assert value["truncated"] is True

    full = client.get(f"/api/brokers/{first.settings.id}/value?topic=long/value").json()
    assert full["value"] == payload


def test_a_structured_payload_is_never_cut(client: TestClient, manager: BrokerManager) -> None:
    """The sub values of a JSON payload have to be complete."""
    first = manager.first()
    assert first is not None
    payload = json.dumps({"key": "y" * 500})
    first._handle_message("json/value", payload.encode(), 0, False)

    tree = client.get(f"/api/brokers/{first.settings.id}/tree?maxValueLength=100").json()
    value = tree["children"][0]["children"][0]["value"]
    assert value["value"] == payload
    assert value["kind"] == "object"
    assert value["truncated"] is False


def test_a_token_is_required_when_it_is_set() -> None:
    config = Config(brokers=[BrokerSettings()], server=ServerSettings(auth_token="s3cret"))
    app = create_app(config)
    with TestClient(app) as client:
        assert client.get("/api/config").status_code == 401
        assert client.get("/api/config?token=s3cret").status_code == 200
        assert client.get("/api/config", headers={"Authorization": "Bearer s3cret"}).status_code == 200


def test_the_brokers_can_be_listed_and_changed(client: TestClient, manager: BrokerManager) -> None:
    first = manager.first()
    assert first is not None

    response = client.get("/api/brokers")
    assert response.status_code == 200
    brokers = response.json()["brokers"]
    assert len(brokers) == 1
    assert brokers[0]["host"] == "localhost"

    # A new broker can be added.
    response = client.post("/api/brokers", json={"host": "broker.local", "port": 1884, "name": "Zweeter"})
    assert response.status_code == 200
    new_id = response.json()["broker"]["id"]
    assert manager.has(new_id)

    # It can be changed.
    response = client.put(f"/api/brokers/{new_id}", json={"host": "broker.local", "port": 1885})
    assert response.status_code == 200
    assert manager.get(new_id).settings.port == 1885

    # And it can be removed again.
    response = client.delete(f"/api/brokers/{new_id}")
    assert response.status_code == 200
    assert not manager.has(new_id)


def test_an_unknown_broker_gives_a_404(client: TestClient) -> None:
    assert client.get("/api/brokers/nicht-da/tree").status_code == 404
    assert client.put("/api/brokers/nicht-da", json={"host": "x"}).status_code == 404
    assert client.delete("/api/brokers/nicht-da").status_code == 404


def test_every_broker_has_its_own_tree(client: TestClient, manager: BrokerManager) -> None:
    first = manager.first()
    assert first is not None
    first._handle_message("a/b", b"1", 0, False)

    response = client.post("/api/brokers", json={"host": "zweeter", "port": 1884})
    new_id = response.json()["broker"]["id"]

    # The tree of the new broker is empty, the one of the first has the value.
    assert client.get(f"/api/brokers/{new_id}/tree").json()["children"] == []
    assert client.get(f"/api/brokers/{first.settings.id}/tree").json()["children"][0]["name"] == "a"
