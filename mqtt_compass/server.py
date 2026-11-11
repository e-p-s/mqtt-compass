"""The standalone web server.

Serves the web UI and a small JSON/WebSocket API on top of the
:class:`~mqtt_compass.manager.BrokerManager`.

Every endpoint that works with a broker takes the id of the broker:

    /api/brokers                  - the list of the brokers
    /api/brokers/{id}             - one broker (GET, PUT, DELETE)
    /api/brokers/{id}/tree        - the topic tree
    /api/brokers/{id}/publish     - publish a message

The old paths without the id (``/api/tree`` and so on) still work - they use the first
broker. That keeps the API of the earlier versions and the Home Assistant integration
working.
"""

from __future__ import annotations

import asyncio
import contextlib
import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException, Request, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .api import ApiResponse, BrokerSettingsIn, PublishRequest
from .broker import BrokerService
from .config import BrokerSettings, Config
from .manager import BrokerManager

_log = logging.getLogger("mqtt_compass.server")

#: Directory with the built web UI. It is created by ``npm run build`` in ``frontend/``.
STATIC_DIR = Path(__file__).parent / "static"


def create_app(config: Config, manager: BrokerManager | None = None) -> FastAPI:
    """Build the FastAPI application.

    :param config: the configuration that is used at start.
    :param manager: an already existing broker manager. A new one is created if omitted.
    """
    brokers = manager or BrokerManager(config.brokers)

    @asynccontextmanager
    async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
        await brokers.start()
        try:
            yield
        finally:
            await brokers.stop()

    app = FastAPI(
        title="MQTT Compass",
        description="A MQTT explorer with a classic object tree.",
        version="0.2.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    if config.server.allowed_origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=config.server.allowed_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    app.state.config = config
    app.state.brokers = brokers

    # The tree of a big broker is several megabytes. Compressed it is a tenth of that, and
    # a browser reads a compressed answer much faster.
    app.add_middleware(GZipMiddleware, minimum_size=1024)

    # -- helpers -----------------------------------------------------------------

    def check_auth(request: Request) -> None:
        token = config.server.auth_token
        if not token:
            return
        header = request.headers.get("authorization", "")
        supplied = header[7:] if header.lower().startswith("bearer ") else request.query_params.get("token", "")
        if supplied != token:
            raise HTTPException(status_code=401, detail="Invalid or missing token.")

    def service_of(broker_id: str) -> BrokerService:
        """Return the service of a broker or raise a 404."""
        service = brokers.get(broker_id)
        if service is None:
            raise HTTPException(status_code=404, detail=f"There is no broker with the id '{broker_id}'.")
        return service

    def first_service() -> BrokerService:
        """Return the service of the first broker - the old paths use it."""
        service = brokers.first()
        if service is None:
            raise HTTPException(status_code=404, detail="There is no broker configured.")
        return service

    def _save() -> None:
        """Write the configuration back to the file it came from."""
        path = getattr(config, "_path", None)
        if not path:
            return
        # The manager is the truth - the configuration is written from it.
        config.brokers = brokers.settings_list()
        try:
            config.save(path)
        except OSError as err:
            _log.warning("The configuration could not be written: %s", err)

    # -- the brokers ----------------------------------------------------------------

    @app.get("/api/brokers")
    async def get_brokers(request: Request) -> dict[str, Any]:
        """The list of all the brokers with their status."""
        check_auth(request)
        return {"brokers": brokers.list()}

    @app.post("/api/brokers")
    async def post_brokers(request: Request, new: BrokerSettingsIn) -> dict[str, Any]:
        """Add a new broker and connect to it."""
        check_auth(request)
        settings = _settings_from_in(new, None)
        service = await brokers.add(settings)
        _save()
        return {"ok": True, "broker": {"id": service.settings.id, "name": service.settings.name}}

    @app.get("/api/brokers/{broker_id}")
    async def get_broker(request: Request, broker_id: str) -> dict[str, Any]:
        """The settings of one broker. The password is masked."""
        check_auth(request)
        service = service_of(broker_id)
        return {
            "broker": service.settings.to_dict(with_secret=False),
            "server": {"auth_required": bool(config.server.auth_token)},
        }

    @app.put("/api/brokers/{broker_id}")
    async def put_broker(request: Request, broker_id: str, new: BrokerSettingsIn) -> ApiResponse:
        """Change the settings of a broker and reconnect it."""
        check_auth(request)
        service = brokers.get(broker_id)
        if service is None:
            raise HTTPException(status_code=404, detail=f"There is no broker with the id '{broker_id}'.")
        settings = _settings_from_in(new, service)
        await brokers.update(broker_id, settings)
        _save()
        return ApiResponse(message="Reconnected.", data={"broker": settings.to_dict(with_secret=False)})

    @app.delete("/api/brokers/{broker_id}")
    async def delete_broker(request: Request, broker_id: str) -> ApiResponse:
        """Remove a broker."""
        check_auth(request)
        if not await brokers.remove(broker_id):
            raise HTTPException(status_code=404, detail=f"There is no broker with the id '{broker_id}'.")
        _save()
        return ApiResponse(message="The broker was removed.")

    # -- the tree --------------------------------------------------------------------

    @app.get("/api/brokers/{broker_id}/tree")
    async def get_tree(request: Request, broker_id: str, maxValueLength: int | None = None) -> dict[str, Any]:
        """The complete topic tree of one broker.

        ``maxValueLength`` cuts the payload of the values. A browser delays a big answer in
        a background tab, and the tree of a broker with many topics is several megabytes.
        The full value of a topic is fetched over ``/api/brokers/{id}/value``.
        """
        check_auth(request)
        length = maxValueLength if maxValueLength and maxValueLength > 0 else None
        return service_of(broker_id).tree.snapshot(length)

    @app.get("/api/brokers/{broker_id}/value")
    async def get_value(request: Request, broker_id: str, topic: str) -> dict[str, Any]:
        """The complete value of one topic."""
        check_auth(request)
        value = service_of(broker_id).tree.value_of(topic)
        if value is None:
            raise HTTPException(status_code=404, detail=f"There is no value for the topic '{topic}'.")
        return value

    @app.get("/api/brokers/{broker_id}/status")
    async def get_status(request: Request, broker_id: str) -> dict[str, Any]:
        """The connection status of one broker."""
        check_auth(request)
        return service_of(broker_id).status()

    @app.get("/api/brokers/{broker_id}/updates")
    async def get_updates(request: Request, broker_id: str, since: int = 0) -> dict[str, Any]:
        """All changes of one broker since the given sequence number."""
        check_auth(request)
        tree = service_of(broker_id).tree
        return {"sequence": tree.sequence, "changes": tree.changes_since(since)}

    @app.post("/api/brokers/{broker_id}/publish")
    async def post_publish(request: Request, broker_id: str, message: PublishRequest) -> ApiResponse:
        """Publish a message to one broker."""
        check_auth(request)
        service = service_of(broker_id)
        try:
            mid = service.publish(message.topic, message.payload, qos=message.qos, retain=message.retain)
        except (RuntimeError, ValueError) as err:
            raise HTTPException(status_code=400, detail=str(err)) from err
        return ApiResponse(message=f"Published (mid={mid}).")

    if config.server.websocket:

        @app.websocket("/api/brokers/{broker_id}/ws")
        async def websocket_endpoint(websocket: WebSocket, broker_id: str) -> None:
            """Push the updates of the tree to the browser.

            The tree itself is fetched over REST - a browser throttles a background tab,
            and a large message would be delayed for a long time. The WebSocket carries
            only the small changes.

            The client tells with ``since`` which sequence number it already knows. The
            changes that happened in between are sent first, so that nothing is lost
            between fetching the tree and opening the WebSocket.
            """
            service = brokers.get(broker_id)
            if service is None:
                await websocket.close(code=1008)
                return

            await websocket.accept()
            queue = service.subscribe_updates()
            try:
                try:
                    since = int(websocket.query_params.get("since", "0"))
                except ValueError:
                    since = 0

                await websocket.send_json({"type": "status", "status": service.status()})

                # The changes that happened after the tree was fetched.
                for change in service.tree.changes_since(since):
                    await websocket.send_json(change)

                while True:
                    message = await queue.get()
                    await websocket.send_json(message)
            except (WebSocketDisconnect, asyncio.CancelledError):
                pass
            except Exception as err:  # pragma: no cover - defensive
                _log.debug("WebSocket closed: %s", err)
            finally:
                service.unsubscribe_updates(queue)
                with contextlib.suppress(Exception):
                    await websocket.close()

    # -- the old paths ---------------------------------------------------------------
    # They use the first broker, so that the API of the earlier versions keeps working.

    @app.get("/api/status")
    async def get_status_old(request: Request) -> dict[str, Any]:
        """The connection status of the first broker."""
        check_auth(request)
        return first_service().status()

    @app.get("/api/tree")
    async def get_tree_old(request: Request) -> dict[str, Any]:
        """The topic tree of the first broker."""
        check_auth(request)
        return first_service().tree.snapshot()

    @app.get("/api/updates")
    async def get_updates_old(request: Request, since: int = 0) -> dict[str, Any]:
        """The changes of the first broker."""
        check_auth(request)
        tree = first_service().tree
        return {"sequence": tree.sequence, "changes": tree.changes_since(since)}

    @app.get("/api/config")
    async def get_config_old(request: Request) -> dict[str, Any]:
        """The settings of the first broker."""
        check_auth(request)
        service = first_service()
        return {
            "broker": service.settings.to_dict(with_secret=False),
            "server": {"auth_required": bool(config.server.auth_token)},
        }

    @app.put("/api/config")
    async def put_config_old(request: Request, new: BrokerSettingsIn) -> ApiResponse:
        """Change the settings of the first broker."""
        check_auth(request)
        service = first_service()
        settings = _settings_from_in(new, service)
        await brokers.update(service.settings.id, settings)
        _save()
        return ApiResponse(message="Reconnected.", data={"broker": settings.to_dict(with_secret=False)})

    @app.post("/api/publish")
    async def post_publish_old(request: Request, message: PublishRequest) -> ApiResponse:
        """Publish a message to the first broker."""
        check_auth(request)
        service = first_service()
        try:
            mid = service.publish(message.topic, message.payload, qos=message.qos, retain=message.retain)
        except (RuntimeError, ValueError) as err:
            raise HTTPException(status_code=400, detail=str(err)) from err
        return ApiResponse(message=f"Published (mid={mid}).")

    if config.server.websocket:

        @app.websocket("/api/ws")
        async def websocket_endpoint_old(websocket: WebSocket) -> None:
            """Push the updates of the first broker to the browser."""
            service = first_service()
            if service is None:
                await websocket.close(code=1008)
                return

            await websocket.accept()
            queue = service.subscribe_updates()
            try:
                try:
                    since = int(websocket.query_params.get("since", "0"))
                except ValueError:
                    since = 0

                await websocket.send_json({"type": "status", "status": service.status()})
                for change in service.tree.changes_since(since):
                    await websocket.send_json(change)

                while True:
                    message = await queue.get()
                    await websocket.send_json(message)
            except (WebSocketDisconnect, asyncio.CancelledError):
                pass
            except Exception as err:  # pragma: no cover - defensive
                _log.debug("WebSocket closed: %s", err)
            finally:
                service.unsubscribe_updates(queue)
                with contextlib.suppress(Exception):
                    await websocket.close()

    # -- the web UI --------------------------------------------------------------------

    if STATIC_DIR.is_dir():
        index_file = STATIC_DIR / "index.html"

        @app.get("/")
        async def index() -> FileResponse:
            # The index must not be cached - it points to the files with the hash in their
            # name. A cached index would show the old web UI after an update.
            return FileResponse(
                index_file,
                headers={"Cache-Control": "no-cache, no-store, must-revalidate", "Pragma": "no-cache"},
            )

        app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")
    else:

        @app.get("/")
        async def index_missing() -> JSONResponse:
            return JSONResponse(
                {
                    "error": "The web UI is not built yet.",
                    "hint": "Run 'npm install && npm run build' in the 'frontend' directory.",
                },
                status_code=503,
            )

    return app


def _settings_from_in(new: BrokerSettingsIn, service: BrokerService | None) -> BrokerSettings:
    """Build the settings from the request. The password is kept if it is not sent."""
    incoming = new.model_dump()
    password = incoming.pop("password", None)
    if password is None and service is not None and incoming.get("username") == service.settings.username:
        incoming["password"] = service.settings.password
    else:
        incoming["password"] = password

    settings = BrokerSettings(**incoming)
    try:
        settings.validate()
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err)) from err
    return settings
