"""Replace the ioBroker helpers in the frontend with the own ones.

The script is a one way street - it changes the source files of the web UI in place.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FRONTEND = ROOT / "frontend" / "src"

#: The replacements per file. The key is the path relative to `frontend/src`.
REPLACEMENTS: dict[str, list[tuple[str, str]]] = {
    "components/TopicTable.tsx": [
        (
            "import { IconClosed, IconOpen, IconState, Utils, type IobTheme, type ThemeType } "
            "from '@compass/gui-components';",
            "import { IconClosed, IconOpen, IconState } from '../icons';\n"
            "import { copyToClipboard, getStyle, invertColor } from '../utils';",
        ),
        (
            "import { useColumnWidths, type ColumnDef } from '../useColumnWidths';",
            "import { useColumnWidths, type ColumnDef } from '../useColumnWidths';\n"
            "import type { ThemeColors } from '../themes';",
        ),
        ("IobTheme", "Theme"),
        ("Utils.getStyle(", "getStyle("),
        ("Utils.invertColor(", "invertColor("),
        ("Utils.copyToClipboard(", "copyToClipboard("),
    ],
    "components/ValueCell.tsx": [],
    "components/FilterBar.tsx": [],
    "components/BrokerSelect.tsx": [],
    "components/ValueDialog.tsx": [],
    "App.tsx": [],
}


def rewrite(path: Path, pairs: list[tuple[str, str]]) -> bool:
    """Apply the replacements to one file."""
    text = path.read_text("utf-8")
    original = text
    for old, new in pairs:
        text = text.replace(old, new)
    if text == original:
        return False
    path.write_text(text, "utf-8")
    return True


def main() -> int:
    changed = 0
    for name, pairs in REPLACEMENTS.items():
        path = FRONTEND / name
        if not path.is_file():
            print(f"  {name} fehlt")
            continue
        if rewrite(path, pairs):
            changed += 1
            print(f"  {name} wurde geändert")
    print(f"{changed} Dateien wurden geändert.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
