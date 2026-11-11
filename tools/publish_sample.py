"""Publish some topics to a broker - a helper for the manual test."""

from __future__ import annotations

import argparse
import json
import random
import time

import paho.mqtt.client as mqtt


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--host", default="localhost")
    parser.add_argument("--port", type=int, default=1883)
    parser.add_argument("--count", type=int, default=20)
    parser.add_argument("--interval", type=float, default=1.0)
    args = parser.parse_args()

    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
    client.connect(args.host, args.port, 60)
    client.loop_start()

    topics = [
        "home/office/temperature",
        "home/office/humidity",
        "home/livingroom/temperature",
        "home/livingroom/lamp/state",
        "home/kitchen/temperature",
        "home/kitchen/fridge/power",
        "garden/soil/moisture",
        "garden/weather/temperature",
        "sensors/0/temp",
        "sensors/0/hum",
        "sensors/1/temp",
        "Compass/mqtt/0/connected",
        "Compass/mqtt/0/info/connection",
    ]

    print(f"Publishing to {args.host}:{args.port} ...")
    for index in range(args.count):
        topic = topics[index % len(topics)]
        payload = json.dumps({"value": round(random.uniform(10, 30), 2), "ts": int(time.time() * 1000)})
        client.publish(topic, payload, qos=0, retain=True)
        print(f"  {topic} = {payload}")
        time.sleep(args.interval)

    client.loop_stop()
    client.disconnect()


if __name__ == "__main__":
    main()
