/* MQTT Compass panel loader - renders the integration web UI in an iframe. */
class MqttCompassPanel extends HTMLElement {
  set hass(hass) {
    if (!this._frame) {
      const frame = document.createElement("iframe");
      frame.setAttribute("src", "/api/mqtt_compass/static/index.html");
      frame.setAttribute("title", "MQTT Compass");
      frame.style.cssText =
        "border:0;width:100%;height:calc(100vh - 49px);display:block;background:var(--card-background-color,#fff)";
      this.appendChild(frame);
      this._frame = frame;
    }
  }
}
customElements.define("mqtt-compass-panel", MqttCompassPanel);
