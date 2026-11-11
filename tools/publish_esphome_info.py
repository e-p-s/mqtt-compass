"""Publish the info payload of an ESPHome device - a helper for the manual test."""

from __future__ import annotations

import json
import time

import paho.mqtt.client as mqtt

PAYLOAD = json.dumps(
    {
        "ip": "10.0.0.24",
        "name": "demo-ac-meter",
        "version": "2024.11.3",
        "mac": "aabbccddeeff",
        "platform": "ESP32",
        "board": "wemos_d1_mini32",
        "network": "wifi",
        "project_name": "syssi.esphome-demo",
        "project_version": "2.1.0",
    }
)


def main() -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect("127.0.0.1", 1883, 60)
    client.loop_start()

    client.publish("esphome/demo-ac-meter/info", PAYLOAD, qos=0, retain=True)
    print(PAYLOAD)

    time.sleep(1)
    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    main()
