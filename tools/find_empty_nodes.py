"""Find the nodes with an empty name in the tree of the real broker."""

from __future__ import annotations

import json
import urllib.request

tree = json.loads(
    urllib.request.urlopen(
        "http://127.0.0.1:8088/api/brokers/127.0.0.1-1883/tree?maxValueLength=120"
    ).read()
)

leer: list[tuple[str, object]] = []
knoten = 0


def walk(nodes: list[dict]) -> None:
    global knoten
    for node in nodes:
        knoten += 1
        name = node.get("name", "")
        value = (node.get("value") or {}).get("value")
        if name.strip() in ("", "...", "..", "…") or value == "...":
            leer.append((node.get("path", ""), value))
        if node.get("children"):
            walk(node["children"])


walk(tree["children"])

print(f"Knoten gesamt: {knoten}")
print(f"Leere/'...'-Knoten: {len(leer)}")
for path, value in leer[:15]:
    print(f"   {path!r} => {value!r}")
