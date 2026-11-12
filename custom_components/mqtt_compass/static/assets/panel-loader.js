/* MQTT Compass panel loader - renders the integration web UI in an iframe.
 *
 * The web UI inside the iframe needs an access token for the REST API. Home Assistant
 * 2026 does not expose `hassTokens` in the local storage of the window any more, so the
 * token travels the official way: the panel element owns the `hass` object (with the live
 * connection of Home Assistant) and pushes `hass.auth.data.access_token` into the iframe
 * with `postMessage` - on every update of `hass`, on load of the frame and whenever the
 * iframe asks for a fresh token (after an API answer with 401).
 */
class MqttCompassPanel extends HTMLElement {
  set hass(hass) {
    if (!this._frame) {
      const frame = document.createElement("iframe");
      frame.setAttribute("src", "/api/mqtt_compass/static/index.html");
      frame.setAttribute("title", "MQTT Compass");
      frame.style.cssText =
        "border:0;width:100%;height:calc(100vh - 49px);display:block;background:var(--card-background-color,#fff)";
      frame.addEventListener("load", () => this._post(hass));
      this.appendChild(frame);
      this._frame = frame;
    }
    this._hass = hass;
    this._post(hass);
  }

  /** Push the current access token into the iframe. */
  _post(hass) {
    const token = hass && hass.auth && hass.auth.data && hass.auth.data.access_token;
    if (token && this._frame && this._frame.contentWindow) {
      this._frame.contentWindow.postMessage(
        { type: "mqtt_compass_token", token },
        window.location.origin
      );
    }
  }

  connectedCallback() {
    this._onMessage = event => {
      if (
        event.origin === window.location.origin &&
        event.data &&
        event.data.type === "mqtt_compass_token_request"
      ) {
        this._post(this._hass);
      }
    };
    window.addEventListener("message", this._onMessage);
  }

  disconnectedCallback() {
    if (this._onMessage) {
      window.removeEventListener("message", this._onMessage);
    }
  }
}
customElements.define("mqtt-compass-panel", MqttCompassPanel);
