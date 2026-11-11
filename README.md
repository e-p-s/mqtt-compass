# MQTT Compass

Ein MQTT-Broker-Browser mit einem klassischen Objektbaum — als eigenständiges Werkzeug,
ohne Abhängigkeit von einer Plattform.

Die Oberfläche ist ein Eigenbau auf Basis von **MUI 9** und **React 19**: eigener
Objektbaum mit Führungslinien, eigene Symbole im Material-Stil, eigene Übersetzungen
(Deutsch/Englisch) und ein eigenes Farbsystem mit vier Farbfamilien. Jede Familie hat
eine dunkle und eine helle Variante — und jede einzelne Farbe lässt sich in den
Einstellungen ändern.

## Dokumentation

| Dokument | Inhalt |
|---|---|
| [`docs/00-overview.md`](docs/00-overview.md) | Architektur, Datenwege, API, Design-Entscheidungen |
| [`docs/01-functions.md`](docs/01-functions.md) | Funktionskatalog der Altprojekte und unser Stand |
| [`docs/02-tasks.md`](docs/02-tasks.md) | Aufgabenliste mit Prioritäten, Aufwand und erledigten Punkten |

## Was es kann

- **Topic-Baum** mit Auf-/Zuklappen — wie ein Objektbaum, mit Führungslinien, die die
  Ebene einer Zeile zeigen
- **Farben** — vier Familien (Graphite, Marine, Sand, Mint), jede mit dunkler und heller
  Variante. Im Menü der Kopfzeile wird schnell gewechselt, in den Einstellungen lässt
  sich **jede Farbe einzeln** ändern; die Änderungen bleiben im Browser gespeichert.
- **Symbole der Marken** — optional. Topics, die zu einem bekannten Werkzeug gehören
  (`homeassistant`, `tasmota`, `esphome`, `zigbee2mqtt`, …), bekommen das Symbol der
  Marke von [simpleicons.org](https://simpleicons.org/) und verlinken auf die Seite
  dort. Abschaltbar in den Einstellungen.
- **Spaltenbreiten anpassbar** — ein Handle am rechten Rand einer Spalte verändert deren
  Breite, die Spalten dahinter wandern mit und behalten ihre Breite. Wird die Tabelle
  breiter als das Fenster, erscheint eine horizontale Scrollbar. Ein Doppelklick auf das
  Handle setzt die Breiten zurück, gespeichert wird in `localStorage`.
- **Spalten sortieren und filtern** — ein Klick auf die Spaltenüberschrift sortiert auf- oder
  absteigend, das Filtersymbol daneben öffnet ein Menü mit den Werten der Spalte (Suchfeld
  und Checkboxen), wie bei einer Datentabelle.
- **Werte werden aufgeschlüsselt** — ein JSON-Payload wird nicht als Textkette gezeigt,
  sondern in seine Unterwerte zerlegt. Die Unterwerte stehen als **echter Unterbaum** unter
  dem Topic: `moisture` → `value: 24.94`, `ts: 1794312843779`. Verschachtelte Objekte
  lassen sich weiter aufklappen (`sensor` → `id`, `name`). Zahlen, boolesche und `null`
  werden erkannt. Der Tooltip zeigt das ganze Payload formatiert, ein Klick öffnet einen
  Dialog mit der aufgeschlüsselten Struktur und dem Rohwert. Ein Kopier-Knopf liegt auf
  dem Wert.
- **Live-Werte** — jede Nachricht aktualisiert die Zeile sofort (WebSocket, mit Polling-Fallback)
- **Filter** — Volltextsuche über Topic *und* Wert, MQTT-Topic-Filter (`home/#`), „nur mit Wert“,
  „nur retained“, „nur JSON“ (nur Topics mit Objekt- oder Array-Payload)
- **Schnellfilter** — die obersten Topics des Brokers werden zu Schaltflächen, mit der Anzahl
  der Einträge darunter. So ist ein Klick im Topic `homeassistant` (bei einem Broker mit
  1300 Discovery-Topics), in `tele` (Tasmota) oder in `zigbee2mqtt` — die Liste entsteht
  aus dem Broker selbst und passt sich automatisch an.
- **Publishen** direkt aus der Zeile heraus (Topic, Payload, QoS, Retain)
- **Rechtsklick auf eine Zeile** — ein Menü mit „Pfad kopieren", „Wert kopieren" und
  „Auf … publizieren". Bei einem Unterwert des Payloads ist der Pfad
  `topic/Schlüssel`, z. B. `valetudo/SmallQuestionableDuck/CurrentStatisticsCapability/$properties`.
- **Werte ändern** — der Wert eines Topics lässt sich direkt in der Zeile überschreiben
  (Enter bestätigt, Esc bricht ab). Bei einem JSON-Payload wird der geänderte Schlüssel in
  das Payload eingesetzt und das **ganze** Payload neu publiziert — MQTT kennt kein Setzen
  einzelner JSON-Schlüssel. QoS und Retain werden vom Topic übernommen, ein retained Topic
  bleibt also retained.
- **Broker-Settings** in der Oberfläche änderbar, mit Reconnect — inkl. TLS und
  SCRAM/MQTT-5-Unterstützung des Clients
- **MQTT 3.1 / 3.1.1 / 5.0**, QoS 0/1/2, Retain, `client_id`, Wildcard-Filter
- **Virtualisierung** — auch Broker mit zehntausend Topics bleiben flüssig

## Installation

```bash
pip install -e ".[server]"
mqtt-compass --broker-host 192.168.1.10 --broker-port 1883
```

Die Weboberfläche läuft danach auf <http://localhost:8088>.

### Mit Docker

```bash
docker build -t mqtt-compass .
docker run -p 8088:8088 mqtt-compass
```

## Konfiguration

Die Konfiguration liegt in `mqtt-compass.json` im Arbeitsverzeichnis:

```json
{
  "broker": {
    "host": "localhost",
    "port": 1883,
    "username": null,
    "password": null,
    "tls": false,
    "subscribe": "#",
    "qos": 0,
    "protocol": "3.1.1"
  },
  "server": {
    "host": "0.0.0.0",
    "port": 8088,
    "auth_token": null,
    "websocket": true
  }
}
```

`mqtt-compass --write-config` legt die Datei mit den aktuellen Werten an. Alle Einstellungen
lassen sich auch zur Laufzeit über die Oberfläche ändern.

### Optionen

| Option | Bedeutung |
|---|---|
| `-c, --config` | Pfad der Konfigurationsdatei (Standard: `mqtt-compass.json`) |
| `--host`, `--port` | Adresse und Port des Webservers |
| `--broker-host`, `--broker-port` | Adresse und Port des Brokers |
| `--username`, `--password` | Zugangsdaten für den Broker |
| `--tls` | TLS für die Broker-Verbindung |
| `--subscribe` | Topic-Filter, der beobachtet wird (Standard: `#`) |
| `--no-websocket` | Keinen WebSocket anbieten — die UI fragt stattdessen im Sekundentakt nach |
| `--write-config` | Konfiguration schreiben und beenden |
| `-v, --verbose` | Jede Nachricht loggen |

### Umgebungsvariablen

Für den Betrieb im Container sind die Einstellungen auch per Umgebung setzbar. Die
Vorrangfolge ist: Argument, dann Umgebungsvariable, dann Konfigurationsdatei.

| Variable | Bedeutung |
|---|---|
| `MQTT_COMPASS_CONFIG` | Pfad der Konfigurationsdatei |
| `MQTT_COMPASS_HOST`, `MQTT_COMPASS_PORT` | Adresse und Port des Webservers |
| `MQTT_COMPASS_TOKEN` | Token, den die API verlangt |
| `MQTT_COMPASS_BROKER_HOST`, `MQTT_COMPASS_BROKER_PORT` | Adresse und Port des Brokers |
| `MQTT_COMPASS_BROKER_USERNAME`, `MQTT_COMPASS_BROKER_PASSWORD` | Zugangsdaten |
| `MQTT_COMPASS_BROKER_TLS` | TLS verwenden |
| `MQTT_COMPASS_SUBSCRIBE` | Topic-Filter |

### Zugriffsschutz

Mit `server.auth_token` verlangt die API einen Bearer-Token. Der Token kann als Query-Parameter
übergeben werden: `http://localhost:8088/?token=DEIN_TOKEN`.

## API

| Endpunkt | Zweck |
|---|---|
| `GET /api/status` | Verbindungsstatus und Zähler |
| `GET /api/tree` | Der komplette Topic-Baum |
| `GET /api/updates?since=N` | Die Änderungen seit der Sequenznummer N |
| `GET /api/config` | Die Broker-Einstellungen (Passwort maskiert) |
| `PUT /api/config` | Einstellungen ändern und neu verbinden |
| `POST /api/publish` | Eine Nachricht publizieren |
| `WS /api/ws` | Live-Aktualisierungen (zuerst der ganze Baum, danach die Änderungen) |

Die OpenAPI-Dokumentation liegt unter <http://localhost:8088/api/docs>.

### WebSocket oder Polling?

Normalerweise nutzt die UI den WebSocket — die Updates kommen sofort. Hinter einem Proxy,
der WebSockets kappt, kann der WebSocket mit `--no-websocket` abgeschaltet werden. Die UI
fragt dann stattdessen im Sekundentakt nach den Änderungen (`/api/updates`) und verhält sich
sonst gleich.

## Aufbau

```
mqtt-compass/
├── mqtt_compass/            # das Python-Paket
│   ├── tree.py               # der Topic-Baum (framework-frei)
│   ├── broker.py             # die Broker-Verbindung (framework-frei)
│   ├── config.py             # die Konfiguration
│   ├── api.py                # die Request-/Response-Modelle
│   ├── server.py             # der FastAPI-Server
│   ├── cli.py                # die Kommandozeile
│   └── static/               # das gebaute Frontend
├── frontend/                 # React + TypeScript + Vite
│   └── src/
│       ├── App.tsx           # Rahmen, Toolbar, Dialoge
│       ├── theme.ts          # das Farbsystem (Hook + MUI-Theme)
│       ├── themes.ts         # die Farbfamilien und ihre Farben
│       ├── icons.tsx         # die Symbole der Oberfläche
│       ├── brands.ts         # die Marken für die Symbole von simpleicons.org
│       ├── utils.ts          # Zwischenablage, Farben, Stile
│       ├── api.ts            # REST + WebSocket (+ Polling-Fallback)
│       ├── tree.ts           # die Baum-Logik (Filter, Flatten, Patch)
│       ├── formatValue.ts    # das Aufschlüsseln des Payloads
│       ├── useColumnWidths.ts # die Spaltenbreiten
│       └── components/
│           ├── TopicTable.tsx    # die Tabelle mit dem Objektbaum
│           ├── ValueCell.tsx     # die Wertzelle mit Tooltip und Kopier-Knopf
│           ├── ValueDialog.tsx   # der Dialog mit dem ganzen Payload
│           ├── FilterBar.tsx     # die Filterzeile
│           ├── PublishDialog.tsx # der Publish-Dialog
│           ├── ThemeMenu.tsx     # der schnelle Wechsel der Farben
│           ├── ThemeEditor.tsx   # der Editor der Farben in den Einstellungen
│           └── SettingsDialog.tsx
├── custom_components/        # die Home-Assistant-Integration (HACS-tauglich)
│   └── mqtt_compass/
│       ├── core/             # Kopie des Kerns (siehe Sync-Skript)
│       ├── static/           # das gebaute Frontend (mit eingecheckt, HACS baut nicht)
│       ├── config_flow.py    # die Einrichtung in der Oberfläche
│       └── panel.py          # das Panel im Seitenband
├── tests/                    # pytest
└── tools/                    # Hilfsskripte
```

**Der Kern ist framework-frei.** `tree.py` und `broker.py` kennen weder FastAPI noch Home
Assistant — deshalb kann die Home-Assistant-Integration dieselben Dateien benutzen. Ein
Sync-Skript hält die Kopie in der Integration aktuell:

```bash
python tools/sync_ha_core.py          # aktualisieren
python tools/sync_ha_core.py --check  # nur prüfen (für CI)
```

## Entwicklung

Das Repository ist das kanonische Projekt. Für die Arbeit an einem Rechner empfiehlt sich
ein lokaler Klon — `venv` und `node_modules` sollten **lokal** liegen (auf gemappten
Netzlaufwerken sind Tausende kleiner Dateien zu langsam):

```bash
git clone <dieses-Repo> mqtt-compass-dev
cd mqtt-compass-dev

# Backend
python -m venv ../mqtt-compass-venv
../mqtt-compass-venv/bin/pip install -e ".[server,dev]"

# Frontend
cd frontend
npm install
npm test
npm run build     # baut nach ../mqtt_compass/static
```

Änderungen im Klon ganz normal mit `git commit` und `git push`.

Für lokale Tests ohne echten Broker gibt es einen Mini-Broker (mit dem venv):

```bash
../mqtt-compass-venv/bin/python tools/dev_broker.py       # Broker auf 127.0.0.1:1883
../mqtt-compass-venv/bin/python tools/publish_sample.py   # Beispiel-Topics publizieren
```

## Home Assistant

Die Integration liegt in `custom_components/mqtt_compass/` — im Repository-Wurzelverzeichnis,
damit HACS sie findet. Das gebaute Frontend ist eingecheckt, weil HACS nicht baut.

### Über HACS

1. Dieses Repository als benutzerdefiniertes Repository in HACS hinzufügen
   (Kategorie: *Integration*)
2. *MQTT Compass* installieren
3. Home Assistant **vollständig neu starten** (Neuladen reicht nicht)
4. *Einstellungen* → *Geräte & Dienste* → *Integration hinzufügen* → *MQTT Compass*
5. Adresse, Port und Zugangsdaten des Brokers eintragen

### Von Hand

`custom_components/mqtt_compass/` nach `/config/custom_components/` kopieren und
Home Assistant vollständig neu starten.

### Das Panel

Das Panel erscheint im Seitenband. Wer es lieber auf einem Dashboard hat: die Oberfläche
ist auch als iframe-Karte nutzbar.

```yaml
type: iframe
url: /api/mqtt_compass/static/index.html
aspect_ratio: 1.6
```

Die Integration öffnet eine **eigene** MQTT-Verbindung: die MQTT-Integration von Home Assistant
kann nur die konfigurierten Topics abonnieren, ein Explorer muss aber alles sehen, was der
Broker kennt. Genutzt wird nur lesend — bis jemand im Panel eine Nachricht publiziert.

**Status:** Die Integration ist implementiert und seit v0.1.7 gegen Home Assistant 2026.11
live getestet (Panel im Seitenband, Broker-Verbindung, Publish). Die Live-Aktualisierungen
laufen im Panel über Polling (`/api/mqtt_compass/updates`), weil das Panel-iframe keinen
eigenen WebSocket öffnet. Die Authentifizierung liest das Panel aus dem Local Storage des
übergeordneten Fensters (gleiche Origin).

### Nächste Schritte

- [x] `hacs.json` für die Installation über HACS (liegt im Wurzelverzeichnis)
- [x] Die Integration gegen eine laufende HA-Instanz testen (HA 2026.11, v0.1.7)
- [x] Ein echtes Panel-Plugin (`panel_custom`) statt der iframe-Karte (seit v0.1.2)
- [ ] Topic-Liste als JSON/YAML exportieren
- [ ] Wertehistorie (die Anbindung an `recorder` fehlt noch)

## Bekannte Grenzen

- Der Explorer speichert nur den **letzten** Wert je Topic, keine Historie.
- Broker mit QoS-2-Nachrichten werden unterstützt, aber der Explorer bestätigt sie nicht
  gesondert — paho erledigt das automatisch.
- Binäre Payloads werden als UTF-8 Text angezeigt und können dabei kaputt gehen.

## Lizenz

MIT
