"""Command line interface of the MQTT explorer."""

from __future__ import annotations

import argparse
import logging
import os
import sys
from pathlib import Path

from .config import Config, DEFAULT_CONFIG_FILE
from .server import create_app

_LOG_FORMAT = "%(asctime)s  %(levelname)-7s %(name)s: %(message)s"
_LOG = logging.getLogger("mqtt_compass.cli")

#: The environment variables that are read when the argument is not given.
ENV_CONFIG = "MQTT_COMPASS_CONFIG"
ENV_HOST = "MQTT_COMPASS_HOST"
ENV_PORT = "MQTT_COMPASS_PORT"
ENV_TOKEN = "MQTT_COMPASS_TOKEN"
ENV_BROKER_HOST = "MQTT_COMPASS_BROKER_HOST"
ENV_BROKER_PORT = "MQTT_COMPASS_BROKER_PORT"
ENV_BROKER_USERNAME = "MQTT_COMPASS_BROKER_USERNAME"
ENV_BROKER_PASSWORD = "MQTT_COMPASS_BROKER_PASSWORD"
ENV_BROKER_TLS = "MQTT_COMPASS_BROKER_TLS"
ENV_SUBSCRIBE = "MQTT_COMPASS_SUBSCRIBE"


def _env_int(name: str) -> int | None:
    """Read an integer from the environment."""
    value = os.environ.get(name)
    if not value:
        return None
    try:
        return int(value)
    except ValueError:
        _LOG.warning("The environment variable %s has the invalid value %r - it is ignored.", name, value)
        return None


def _env_bool(name: str) -> bool | None:
    """Read a boolean from the environment."""
    value = os.environ.get(name)
    if value is None or value == "":
        return None
    return value.strip().lower() in ("1", "true", "yes", "on")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="mqtt-compass",
        description="A MQTT explorer with a classic object tree.",
    )
    parser.add_argument(
        "-c",
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_FILE,
        help=f"Path of the configuration file (default: {DEFAULT_CONFIG_FILE}).",
    )
    parser.add_argument("--host", help="Address the web server listens on.")
    parser.add_argument("--port", type=int, help="Port of the web server.")
    parser.add_argument("--broker-host", help="Address of the MQTT broker.")
    parser.add_argument("--broker-port", type=int, help="Port of the MQTT broker.")
    parser.add_argument("--username", help="User name for the MQTT broker.")
    parser.add_argument("--password", help="Password for the MQTT broker.")
    parser.add_argument("--tls", action="store_true", help="Use TLS for the broker connection.")
    parser.add_argument("--subscribe", help="Topic filter that is watched (default: '#').")
    parser.add_argument(
        "--no-websocket",
        action="store_true",
        help="Do not offer the WebSocket - the UI asks for the changes in short intervals instead.",
    )
    parser.add_argument("--write-config", action="store_true", help="Write the settings into the config file and exit.")
    parser.add_argument("-v", "--verbose", action="store_true", help="Log every message.")
    parser.add_argument("--version", action="version", version="mqtt-compass 0.1.0")
    return parser


def apply_arguments(config: Config, args: argparse.Namespace) -> Config:
    """Overwrite the configuration with the command line arguments.

    The precedence is: command line argument, then environment variable, then the
    configuration file. The options change the first broker.
    """
    if args.host:
        config.server.host = args.host
    elif os.environ.get(ENV_HOST):
        config.server.host = os.environ[ENV_HOST]

    if args.port:
        config.server.port = args.port
    elif _env_int(ENV_PORT):
        config.server.port = _env_int(ENV_PORT)  # type: ignore[assignment]

    if os.environ.get(ENV_TOKEN):
        config.server.auth_token = os.environ[ENV_TOKEN]

    broker = config.broker

    if args.broker_host:
        broker.host = args.broker_host
    elif os.environ.get(ENV_BROKER_HOST):
        broker.host = os.environ[ENV_BROKER_HOST]

    if args.broker_port:
        broker.port = args.broker_port
    elif _env_int(ENV_BROKER_PORT):
        broker.port = _env_int(ENV_BROKER_PORT)  # type: ignore[assignment]

    if args.username is not None:
        broker.username = args.username
    elif os.environ.get(ENV_BROKER_USERNAME):
        broker.username = os.environ[ENV_BROKER_USERNAME]

    if args.password is not None:
        broker.password = args.password
    elif os.environ.get(ENV_BROKER_PASSWORD):
        broker.password = os.environ[ENV_BROKER_PASSWORD]

    if args.tls:
        broker.tls = True
    elif _env_bool(ENV_BROKER_TLS):
        broker.tls = True

    if args.subscribe:
        broker.subscribe = args.subscribe
    elif os.environ.get(ENV_SUBSCRIBE):
        broker.subscribe = os.environ[ENV_SUBSCRIBE]

    if args.no_websocket:
        config.server.websocket = False

    config._make_ids()
    return config


def main(argv: list[str] | None = None) -> int:
    """Entry point of the ``mqtt-compass`` command."""
    args = build_parser().parse_args(argv)

    logging.basicConfig(level=logging.DEBUG if args.verbose else logging.INFO, format=_LOG_FORMAT)

    config_file = args.config
    if config_file == DEFAULT_CONFIG_FILE and os.environ.get(ENV_CONFIG):
        config_file = Path(os.environ[ENV_CONFIG])

    try:
        config = Config.load(config_file)
    except ValueError as err:
        print(f"Error: {err}", file=sys.stderr)
        return 2

    config = apply_arguments(config, args)

    try:
        config.broker.validate()
    except ValueError as err:
        print(f"Error: {err}", file=sys.stderr)
        return 2
    if args.write_config:
        config.save(config_file)
        print(f"The configuration was written to {config_file}.")
        return 0

    try:
        import uvicorn
    except ImportError:
        print("Error: uvicorn is not installed. Run 'pip install mqtt-compass[server]'.", file=sys.stderr)
        return 2

    app = create_app(config)
    print(f"MQTT Compass: http://{config.server.host}:{config.server.port}")
    print(f"Broker: {config.broker.host}:{config.broker.port} ({config.broker.protocol}), filter {config.broker.subscribe!r}")

    uvicorn.run(app, host=config.server.host, port=config.server.port, log_level="debug" if args.verbose else "info")
    return 0


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
