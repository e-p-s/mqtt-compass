"""Rename the project everywhere: MQTT Compass -> MQTT Compass, Compass -> neutral.

The script rewrites the source files in place. It is idempotent - running it twice does
not change anything.

Usage::

    python tools/rename.py
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

#: The folders that are searched.
FOLDERS = ["mqtt_compass", "tests", "tools", "custom_components", "frontend/src", "frontend/tests"]

#: The files that are searched (in the root of the project).
FILES = [
    "pyproject.toml",
    "README.md",
    "Dockerfile",
    "docker-compose.yml",
    "docs/00-overview.md",
    "docs/01-functions.md",
    "docs/02-tasks.md",
]

#: The suffixes of the files that are rewritten.
SUFFIXES = {".py", ".ts", ".tsx", ".json", ".md", ".html", ".css", ".yml", ".yaml", ".toml", ".txt"}

#: The replacements. The order matters - the longer names come first.
REPLACEMENTS: list[tuple[str, str]] = [
    # -- the name of the product -------------------------------------------------
    ("MQTT Compass", "MQTT Compass"),
    ("MQTT Compass", "MQTT Compass"),
    ("MQTT-Compass", "MQTT-Compass"),
    ("mqtt-compass", "mqtt-compass"),
    ("mqtt_compass", "mqtt_compass"),
    ("MQTT_COMPASS", "MQTT_COMPASS"),
    ("mqttc_", "mqttc_"),
    ("MQTTCompass", "MQTTCompass"),
    # -- the Compass hints ------------------------------------------------------
    ("@compass/gui-components", "@compass/gui-components"),
    ("a classic object tree", "a classic object tree"),
    ("Klassiker-Oberfläche", "Klassiker-Oberfläche"),
    ("classic admin", "classic admin"),
    ("classic admin look", "classic admin look"),
    ("classic object tree", "classic object tree"),
    ("classic object browser", "classic object browser"),
    ("the MQTT specification", "the MQTT specification"),
    ("a classic admin", "a classic admin"),
    ("Compass", "Compass"),
    ("COMPASS", "COMPASS"),
]

#: The comments that are replaced as a whole.
COMMENT_REPLACEMENTS: list[tuple[str, str]] = [
    (
        "The handling is taken over unchanged from Compass: the theme name is stored in the\n"
        " * local storage under `App.themeName`, `Utils.toggleTheme()` switches between the light and\n"
        " * the dark variant of the current theme family and `Theme()` builds the MUI theme.",
        "The name of the theme is stored in the local storage. Every theme family has a dark\n"
        " * and a light variant - the switch in the header changes between them.",
    ),
]


def rewrite(path: Path) -> bool:
    """Rewrite one file. Returns `True` when something was changed."""
    try:
        text = path.read_text("utf-8")
    except (OSError, UnicodeDecodeError):
        return False

    original = text

    for old, new in COMMENT_REPLACEMENTS:
        text = text.replace(old, new)

    for old, new in REPLACEMENTS:
        text = text.replace(old, new)

    if text == original:
        return False

    path.write_text(text, "utf-8")
    return True


def main() -> int:
    changed: list[str] = []

    for folder in FOLDERS:
        base = ROOT / folder
        if not base.is_dir():
            continue
        for path in base.rglob("*"):
            if not path.is_file() or path.suffix not in SUFFIXES:
                continue
            # The build output and the caches are not touched.
            if any(part in {"node_modules", "__pycache__", "static", ".pytest_cache"} for part in path.parts):
                continue
            if rewrite(path):
                changed.append(str(path.relative_to(ROOT)))

    for name in FILES:
        path = ROOT / name
        if path.is_file() and rewrite(path):
            changed.append(name)

    for name in changed:
        print(f"  {name}")

    print(f"{len(changed)} files were changed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
