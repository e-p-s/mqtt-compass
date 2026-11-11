"""Publish a JSON payload for the manual test of the value editor."""

from __future__ import annotations

import json
import time

import paho.mqtt.client as mqtt

PAYLOAD = json.dumps(
    {
        "ip": "10.0.0.23",
        "dn": "SonoffDemo-AlarmStatus",
        "fn": "SonoffDemo",
        "hn": "SonoffDemo",
        "mac": "AABBCCDDEEFF",
        "md": "RGB Smart Plug",
        "ty": 0,
        "if": 0,
        "ofln": "Offline",
        "onln": "Online",
        "state": ["OFF", "ON", "TOGGLE", "HOLD"],
    }
)


def main() -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect("127.0.0.1", 1883, 60)
    client.loop_start()

    client.publish("tasmota/discovery/AABBCCDDEEFF/config", PAYLOAD, qos=0, retain=True)
    client.publish("sensor/plain", "21.5", qos=0, retain=True)
    print(PAYLOAD)

    time.sleep(1)
    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    main()
