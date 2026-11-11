"""Tests of the command line interface."""

from __future__ import annotations

from mqtt_compass.cli import apply_arguments, build_parser
from mqtt_compass.config import Config


def test_defaults_without_arguments() -> None:
    args = build_parser().parse_args([])
    config = apply_arguments(Config(), args)
    assert config.server.host == "0.0.0.0"
    assert config.server.port == 8088


def test_arguments_win() -> None:
    args = build_parser().parse_args(["--host", "127.0.0.1", "--port", "9000"])
    config = apply_arguments(Config(), args)
    assert config.server.host == "127.0.0.1"
    assert config.server.port == 9000


def test_broker_arguments() -> None:
    args = build_parser().parse_args(
        ["--broker-host", "broker.local", "--broker-port", "8883", "--username", "u", "--password", "p", "--tls"]
    )
    config = apply_arguments(Config(), args)
    assert config.broker.host == "broker.local"
    assert config.broker.port == 8883
    assert config.broker.username == "u"
    assert config.broker.password == "p"
    assert config.broker.tls is True


def test_subscribe_argument() -> None:
    args = build_parser().parse_args(["--subscribe", "home/#"])
    config = apply_arguments(Config(), args)
    assert config.broker.subscribe == "home/#"


def test_environment_is_used(monkeypatch) -> None:
    monkeypatch.setenv("MQTT_COMPASS_HOST", "10.0.0.1")
    monkeypatch.setenv("MQTT_COMPASS_PORT", "7777")
    monkeypatch.setenv("MQTT_COMPASS_BROKER_HOST", "broker.local")
    monkeypatch.setenv("MQTT_COMPASS_BROKER_PORT", "1884")
    monkeypatch.setenv("MQTT_COMPASS_BROKER_USERNAME", "envuser")
    monkeypatch.setenv("MQTT_COMPASS_TOKEN", "s3cret")

    config = apply_arguments(Config(), build_parser().parse_args([]))
    assert config.server.host == "10.0.0.1"
    assert config.server.port == 7777
    assert config.broker.host == "broker.local"
    assert config.broker.port == 1884
    assert config.broker.username == "envuser"
    assert config.server.auth_token == "s3cret"


def test_the_argument_wins_over_the_environment(monkeypatch) -> None:
    monkeypatch.setenv("MQTT_COMPASS_HOST", "10.0.0.1")
    config = apply_arguments(Config(), build_parser().parse_args(["--host", "127.0.0.1"]))
    assert config.server.host == "127.0.0.1"


def test_an_invalid_port_in_the_environment_is_ignored(monkeypatch) -> None:
    monkeypatch.setenv("MQTT_COMPASS_PORT", "not-a-number")
    config = apply_arguments(Config(), build_parser().parse_args([]))
    assert config.server.port == 8088
