"""Add the new translation keys to the language files.

The script keeps the German and the English file in sync - it copies the keys of the
German file into the English one, if they are missing there.

Usage::

    python tools/i18n_sync.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
I18N = ROOT / "frontend" / "src" / "i18n"

#: The new keys with the German and the English text.
NEW_KEYS: dict[str, tuple[str, str]] = {
    "mqttc_title": ("MQTT Compass", "MQTT Compass"),
    "mqttc_settings": ("Einstellungen", "Settings"),
    "mqttc_appearance": ("Erscheinungsbild", "Appearance"),
    "mqttc_theme": ("Farben", "Colours"),
    "mqttc_themeFamily": ("Farbfamilie", "Colour family"),
    "mqttc_themeVariant": ("Variante", "Variant"),
    "mqttc_darkMode": ("Dunkel", "Dark"),
    "mqttc_lightMode": ("Hell", "Light"),
    "mqttc_resetColors": ("Farben zurücksetzen", "Reset the colours"),
    "mqttc_resetAll": ("Alles zurücksetzen", "Reset everything"),
    "mqttc_showBrands": ("Symbole der Marken zeigen", "Show the symbols of the brands"),
    "mqttc_showBrandsHelp": (
        "Topics, die zu einem bekannten Werkzeug gehören, bekommen das Symbol der Marke. "
        "Das Symbol verlinkt auf die Seite bei simpleicons.org.",
        "Topics that belong to a well known tool get the symbol of the brand. The symbol "
        "links to the page at simpleicons.org.",
    ),
    "mqttc_color_background": ("Hintergrund", "Background"),
    "mqttc_color_surface": ("Fläche", "Surface"),
    "mqttc_color_header": ("Kopfzeile", "Header"),
    "mqttc_color_text": ("Text", "Text"),
    "mqttc_color_mutedText": ("gedämpfter Text", "muted text"),
    "mqttc_color_accent": ("Akzent", "Accent"),
    "mqttc_color_onAccent": ("Text auf dem Akzent", "Text on the accent"),
    "mqttc_color_divider": ("Trennlinie", "Divider"),
    "mqttc_color_guide": ("Führungslinie", "Guide line"),
    "mqttc_color_hover": ("Maus über der Zeile", "Mouse over the row"),
    "mqttc_color_folder": ("Ordner", "Folder"),
    "mqttc_color_state": ("Wert", "Value"),
    "mqttc_color_number": ("Zahl", "Number"),
    "mqttc_color_boolean": ("Wahrheitswert", "Boolean"),
    "mqttc_color_nullValue": ("Nullwert", "Null value"),
    "mqttc_color_scrollbar": ("Bildlaufleiste", "Scroll bar"),
    "mqttc_color_online": ("verbunden", "connected"),
    "mqttc_color_offline": ("nicht verbunden", "not connected"),
}


def main() -> int:
    de_file = I18N / "de.json"
    en_file = I18N / "en.json"

    de = json.loads(de_file.read_text("utf-8"))
    en = json.loads(en_file.read_text("utf-8"))

    for key, (german, english) in NEW_KEYS.items():
        de[key] = german
        en[key] = english

    # Every key of the German file must exist in the English one.
    missing = set(de) - set(en)
    if missing:
        print(f"Im Englischen fehlen: {sorted(missing)}")
        return 1

    de_file.write_text(json.dumps(de, indent=4, ensure_ascii=False) + "\n", "utf-8")
    en_file.write_text(json.dumps(en, indent=4, ensure_ascii=False) + "\n", "utf-8")
    print(f"de: {len(de)} Schlüssel, en: {len(en)} Schlüssel")
    return 0


if __name__ == "__main__":
    sys.exit(main())
