"""The web UI of the Home Assistant integration.

The panel is the same web UI that the standalone server uses. It is built from the manifest
of the build, so that the hashed file names of the assets do not have to be known here.
"""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from homeassistant.components.http import HomeAssistantView

from .const import API_PREFIX

_log = logging.getLogger(__name__)

#: The folder with the built web UI.
STATIC_DIR = Path(__file__).parent / "static"


class PanelView(HomeAssistantView):
    """The HTML of the panel."""

    url = f"{API_PREFIX}/static/index.html"
    name = f"api:mqtt_compass:panel"
    requires_auth = True

    async def get(self, request) -> Any:
        """Return the HTML of the panel."""
        from aiohttp import web

        return web.Response(
            text=build_panel_html(),
            content_type="text/html",
            headers={"Cache-Control": "no-cache, no-store, must-revalidate"},
        )


def build_panel_html() -> str:
    """Build the HTML of the panel from the manifest of the build."""
    manifest_file = STATIC_DIR / ".vite" / "manifest.json"
    script = "assets/index.js"
    css: list[str] = []

    if manifest_file.is_file():
        try:
            manifest = json.loads(manifest_file.read_text("utf-8"))
            entry = manifest.get("index.html", {})
            script = entry.get("file", script)
            css = entry.get("css", [])
        except (json.JSONDecodeError, OSError):
            _log.warning("The manifest of the web UI could not be read.")

    css_links = "\n".join(f'<link rel="stylesheet" href="./{name}">' for name in css)
    return f"""<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>MQTT Compass</title>
        <script>
            // The panel is served by Home Assistant, so the API is below the integration.
            window.MQTT_COMPASS_API = '{API_PREFIX}';
        </script>
        {css_links}
    </head>
    <body>
        <div id="root"></div>
        <script type="module" src="./{script}"></script>
    </body>
</html>
"""
