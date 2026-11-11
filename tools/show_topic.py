"""Show the payload of a topic - a helper for the manual test."""

from __future__ import annotations

import json
import sys
import urllib.parse
import urllib.request

BROKER = "mqtt-1883"
BASE = f"http://127.0.0.1:8088/api/brokers/{BROKER}"


def get(url: str) -> object:
    return json.loads(urllib.request.urlopen(url).read())


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
    tree = get(f"{BASE}/tree?maxValueLength=100000")
    node = find(tree["children"], topic)
    if not node:
        print(f"Das Topic {topic} gibt es nicht.")
        return
    value = (node.get("value") or {}).get("value")
    print(f"Topic: {topic}")
    print(f"Art  : {(node.get('value') or {}).get('kind')}")
    print("Wert:")
    try:
        print(json.dumps(json.loads(value), indent=2))
    except (json.JSONDecodeError, TypeError):
        print(repr(value))


if __name__ == "__main__":
    main()
