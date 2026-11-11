"""Search the payloads for a strange key - a helper for the manual test."""

from __future__ import annotations

import json
import urllib.request

BROKER = "mqtt-1883"

tree = json.loads(
    urllib.request.urlopen(
        f"http://127.0.0.1:8088/api/brokers/{BROKER}/tree?maxValueLength=100000"
    ).read()
)

treffer: list[tuple[str, str, object]] = []


def walk(nodes: list[dict]) -> None:
    for node in nodes:
        value = (node.get("value") or {}).get("value")
        if value:
            try:
                parsed = json.loads(value)
            except (json.JSONDecodeError, TypeError):
                parsed = None
            if isinstance(parsed, dict):
                for key, item in parsed.items():
                    if key.strip(".") == "" and key:
                        treffer.append((node["path"], key, item))
            elif isinstance(parsed, list):
                for index, item in enumerate(parsed):
                    if isinstance(item, dict):
                        for key, sub in item.items():
                            if key.strip(".") == "" and key:
                                treffer.append((node["path"], f"[{index}].{key}", sub))
        if node.get("children"):
            walk(node["children"])


walk(tree["children"])

print(f"Schluessel, die nur aus Punkten bestehen: {len(treffer)}")
for path, key, item in treffer[:15]:
    print(f"   {path}  ->  {key!r} = {str(item)[:60]!r}")
