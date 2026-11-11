"""Find the topics with a strange name - a helper for the manual test."""

from __future__ import annotations

import json
import urllib.request

BROKER = "mqtt-1883"

tree = json.loads(
    urllib.request.urlopen(
        f"http://127.0.0.1:8088/api/brokers/{BROKER}/tree?maxValueLength=100000"
    ).read()
)

treffer: list[tuple[str, str]] = []
namen: dict[str, int] = {}


def walk(nodes: list[dict]) -> None:
    for node in nodes:
        name = node.get("name", "")
        namen[name] = namen.get(name, 0) + 1
        if name.strip(".") == "" and name != "":
            treffer.append((node.get("path", ""), name))
        elif set(name) == {"."}:
            treffer.append((node.get("path", ""), name))
        if node.get("children"):
            walk(node["children"])


walk(tree["children"])

print(f"Topics, deren Name nur aus Punkten besteht: {len(treffer)}")
for path, name in treffer[:12]:
    print(f"   {path!r}  Name={name!r}")

print()
print("Die Namen, die am häufigsten vorkommen:")
for name, count in sorted(namen.items(), key=lambda x: -x[1])[:12]:
    print(f"   {name!r}: {count}")
