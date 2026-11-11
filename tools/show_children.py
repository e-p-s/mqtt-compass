"""Show the children of a topic - a helper for the manual test."""

from __future__ import annotations

import json
import sys
import urllib.request

BROKER = "127.0.0.1-1883"
BASE = f"http://127.0.0.1:8088/api/brokers/{BROKER}"


def find(nodes: list[dict], path: str) -> dict | None:
    for node in nodes:
        if node["path"] == path:
            return node
        if node.get("children"):
            found = find(node["children"], path)
            if found:
                return found
    return None


def main() -> None:
    topic = sys.argv[1] if len(sys.argv) > 1 else "valetudo/SmallQuestionableDuck"
    tree = json.loads(urllib.request.urlopen(f"{BASE}/tree?maxValueLength=100000").read())
    node = find(tree["children"], topic)
    if not node:
        print(f"Das Topic {topic} gibt es nicht.")
        return
    print(f"Topic: {topic}   Wert: {(node.get('value') or {}).get('value')!r}")
    for child in node.get("children", []):
        value = (child.get("value") or {})
        print(f"  - {child['name']!r}  Art={value.get('kind')}  Wert={str(value.get('value'))[:70]!r}")
        for kind in child.get("children", []):
            print(f"      * {kind['name']!r}  Art={(kind.get('value') or {}).get('kind')}")


if __name__ == "__main__":
    main()
