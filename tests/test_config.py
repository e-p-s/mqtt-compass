"""Tests of the configuration handling."""

from __future__ import annotations

import json

import pytest

from mqtt_compass.config import BrokerSettings, Config, validate_topic_filter


def test_defaults() -> None:
    config = Config()
    assert config.broker.host == "localhost"
    assert config.broker.port == 1883
    assert config.broker.subscribe == "#"
    assert config.server.port == 8088


def test_roundtrip(tmp_path) -> None:
    file = tmp_path / "config.json"
    config = Config()
    config.broker.host = "10.0.0.5"
    config.broker.username = "user"
    config.broker.password = "secret"
    config.save(file)

    loaded = Config.load(file)
    assert loaded.broker.host == "10.0.0.5"
    assert loaded.broker.username == "user"
    assert loaded.broker.password == "secret"


def test_missing_file_yields_defaults(tmp_path) -> None:
    config = Config.load(tmp_path / "nope.json")
    assert config.broker.host == "localhost"


def test_broken_file_raises(tmp_path) -> None:
    file = tmp_path / "config.json"
    file.write_text("{not json", encoding="utf-8")
    with pytest.raises(ValueError):
        Config.load(file)


def test_password_is_masked() -> None:
    settings = BrokerSettings(username="u", password="p")
    assert settings.to_dict(with_secret=False)["password"] == "***"
    assert settings.to_dict(with_secret=True)["password"] == "p"


def test_no_password_stays_none() -> None:
    settings = BrokerSettings()
    assert settings.to_dict(with_secret=False)["password"] is None


def test_validate_rejects_bad_port() -> None:
    with pytest.raises(ValueError):
        BrokerSettings(port=0).validate()


def test_validate_rejects_bad_protocol() -> None:
    with pytest.raises(ValueError):
        BrokerSettings(protocol="4").validate()


def test_validate_rejects_qos2_for_mqtt31() -> None:
    with pytest.raises(ValueError):
        BrokerSettings(protocol="3.1", qos=2).validate()


def test_validate_accepts_defaults() -> None:
    BrokerSettings().validate()


def test_unknown_keys_are_ignored(tmp_path) -> None:
    file = tmp_path / "config.json"
    file.write_text(json.dumps({"broker": {"host": "x", "unknown": 1}}), encoding="utf-8")
    config = Config.load(file)
    assert config.broker.host == "x"


# -- the topic filter ------------------------------------------------------------------


@pytest.mark.parametrize(
    "topic_filter",
    ["#", "+", "home/#", "home/+/temp", "home/office/temp", "sport/+/player1/#"],
)
def test_valid_topic_filters(topic_filter: str) -> None:
    validate_topic_filter(topic_filter)


@pytest.mark.parametrize(
    "topic_filter",
    ["", "a/#/b", "sport#", "sport+", "a/b#", "home/+/temp#", "#/a"],
)
def test_invalid_topic_filters(topic_filter: str) -> None:
    with pytest.raises(ValueError):
        validate_topic_filter(topic_filter)


def test_validate_checks_the_topic_filter() -> None:
    with pytest.raises(ValueError):
        BrokerSettings(subscribe="a/#/b").validate()
