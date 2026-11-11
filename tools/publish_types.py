"""Publish a few payloads of different types - a helper for the manual test."""

from __future__ import annotations

import json
import time

import paho.mqtt.client as mqtt

MESSAGES = [
    ("types/zahl", "42.75"),
    ("types/boolean", "true"),
    ("types/text", "ON"),
    ("types/verschachtelt", json.dumps({"sensor": {"id": 7, "name": "Wohnzimmer"}, "unit": "C", "ok": True})),
    ("types/array", "[1,2,3]"),
    ("types/null", "null"),
]


def main() -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect("127.0.0.1", 1883, 60)
    client.loop_start()

    for topic, payload in MESSAGES:
        client.publish(topic, payload, qos=0, retain=True)
        print(f"  {topic} = {payload}")

    time.sleep(1)
    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    main()
