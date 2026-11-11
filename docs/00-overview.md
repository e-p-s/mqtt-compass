# Überblick

## Was das ist

Ein MQTT-Compass, der aussieht und sich benimmt wie der Objektbaum des **Compass-Admins**
— aber für MQTT-Broker. Kein Compass-Adapter, kein Electron: ein Webwerkzeug, das neben
einem Broker läuft und später als Home-Assistant-Integration nutzbar ist.

```
Browser  ──REST/WebSocket──▶  FastAPI  ──MQTT──▶  Broker
                                  │
                                  └── ein Baum je Broker, je Broker eine Verbindung
```

## Warum diese Form

| Entscheidung | Grund |
|---|---|
| **Python + FastAPI** statt Node | dieselbe Sprache wie Home Assistant. Die Integration kann den Kern (`tree.py`, `broker.py`) unverändert benutzen — er kennt kein Web-Framework. |
| **React + `@compass/gui-components`** | die Oberfläche ist 1:1 der Admin-Look, ohne ihn nachzubauen: Theme, Icons, Zeilen- und Zellenstile stammen aus dem Paket. |
| **Eigener Topic-Baum im Backend** | ein Broker mit 1900 Topics und 6 Nachrichten/s muss ohne Ruckler arbeiten. Der Baum liegt serverseitig, das Frontend bekommt nur die Zeilen, die es braucht. |
| **Eigene Virtualisierung** | `content-visibility: auto` lässt Chromium die Zeilen nicht zeichnen (und entfernt sie aus dem a11y-Baum). Eine Fensterung mit Zeilenabstand ist zuverlässig. |
| **JSON-Ordner als Paketdaten** | `pip install mqtt-compass` liefert die Oberfläche mit aus — kein Build-Schritt beim Anwender. |
| **Der Kern bleibt framework-frei** | `tree.py` und `broker.py` haben keine Ahnung von FastAPI. Die HA-Integration kopiert genau diese Dateien (`tools/sync_ha_core.py`). |

## Aufbau

```
mqtt-compass/
├── mqtt_compass/            das Python-Paket
│   ├── tree.py               der Topic-Baum + das Änderungsprotokoll   (framework-frei)
│   ├── broker.py             die Broker-Verbindung                     (framework-frei)
│   ├── manager.py            mehrere Broker                            (framework-frei)
│   ├── config.py             die Konfiguration
│   ├── api.py                die Request-/Response-Modelle
│   ├── server.py             der FastAPI-Server
│   ├── cli.py                die Kommandozeile
│   └── static/               das gebaute Frontend
├── frontend/                 React 19 + TypeScript + Vite
│   └── src/
│       ├── App.tsx           Rahmen, Kopfzeile, Dialoge
│       ├── api.ts            REST + WebSocket (+ Polling-Fallback)
│       ├── tree.ts           die Baum-Logik (Filter, Flatten, Patch)
│       ├── formatValue.ts    das Aufschlüsseln und Ändern des Payloads
│       ├── useColumnWidths.ts die Spaltenbreiten
│       ├── theme.ts          das Farbsystem (Hook + MUI-Theme)
│       ├── themes.ts         die Farbfamilien und ihre Farben
│       ├── icons.tsx         die Symbole der Oberfläche
│       ├── brands.ts         die Marken für die Symbole von simpleicons.org
│       ├── utils.ts          Zwischenablage, Farben, Stile
│       ├── i18n/             die Wörterbücher
│       └── components/       TopicTable, ValueCell, ValueDialog, FilterBar, …
├── custom_components/        die HA-Integration (HACS-konform im Wurzelverzeichnis)
├── tests/                    pytest
├── tools/                    Hilfsskripte (Test-Broker, Sync, Beispieldaten)
└── docs/                     dieses Verzeichnis
```

## Die Datenwege

**Nachricht vom Broker in die Oberfläche**

```
Broker → paho (Netzwerk-Thread) → call_soon_threadsafe → Baum → /api/ws → Browser
```

Der paho-Callback läuft in einem eigenen Thread. Deshalb wird jedes Ereignis über
`loop.call_soon_threadsafe` in die Event-Loop geholt, bevor der Baum angefasst wird.

**Der Baum: HTTP statt WebSocket**

Der Baum wird über REST geholt (`/api/brokers/{id}/tree`), nicht über den WebSocket. Der
Grund ist ein Verhalten des Browsers: **Chromium drosselt einen Hintergrund-Tab**, und eine
Antwort von mehreren Megabunden kommt dort erst nach ~30 Sekunden an. Gemessen: 4,16 MB →
30 s Wartezeit, 790 KB → sofort.

Deshalb:

| Weg | Inhalt | Größe |
|---|---|---|
| `GET /tree?maxValueLength=120` | die Struktur, die Payloads auf 120 Zeichen gekürzt | ~790 KB |
| `GET /value?topic=X` | der vollständige Wert eines Topics | klein |
| `WS /brokers/{id}/ws?since=N` | nur die Änderungen (klein) | laufend |

**Ein Payload mit Unterwerten (JSON) wird nie gekürzt** — sonst könnte der Unterbaum nicht
daraus gebaut werden. Die Art des Payloads (`object`, `array`, `number`, …) bestimmt der
Server einmalig, wenn die Nachricht eingeht, und liefert sie mit dem Baum mit. Der Client
muss die Payloads also nicht erneut parsen.

**Der WebSocket kennt die Sequence-Nummer**

Der Client holt den Baum (Sequence `S`) und öffnet danach den WebSocket mit `?since=S`. Der
Server schickt zuerst die Änderungen, die nach `S` passiert sind, und danach die laufenden.
**Zwischen dem Baum und dem WebSocket geht so nichts verloren.**

**Wertänderung aus der Oberfläche zurück zum Broker**

```
Browser → replaceInPayload() → POST /api/publish → paho → Broker
```

Bei einem JSON-Payload wird der geänderte Schlüssel in das Payload eingesetzt und das
**ganze** Payload neu publiziert — MQTT kennt kein Setzen einzelner JSON-Schlüssel. QoS und
Retain werden vom Topic übernommen, ein retained Topic bleibt also retained.

**Wenn der WebSocket nicht geht**

Die Oberfläche fragt dann im Sekundentakt nach den Änderungen (`/api/brokers/{id}/updates`).
Das ist der Fall in Home Assistant, wo das Panel in einem iframe läuft, und hinter Proxys,
die WebSockets kapten. Abschaltbar mit `--no-websocket`.

## Die API

| Endpunkt | Zweck |
|---|---|
| `GET /api/brokers` | alle Broker mit ihrem Status |
| `POST /api/brokers` | einen Broker anlegen |
| `GET/PUT/DELETE /api/brokers/{id}` | einen Broker ansehen, ändern, löschen |
| `GET /api/brokers/{id}/tree?maxValueLength=N` | der Topic-Baum, die Payloads gekürzt |
| `GET /api/brokers/{id}/value?topic=X` | der vollständige Wert eines Topics |
| `GET /api/brokers/{id}/status` | der Verbindungsstatus |
| `GET /api/brokers/{id}/updates?since=N` | die Änderungen seit N |
| `POST /api/brokers/{id}/publish` | eine Nachricht publizieren |
| `WS /api/brokers/{id}/ws?since=N` | die Live-Aktualisierungen |

Die Pfade ohne Broker-ID (`/api/tree` …) zeigen weiterhin auf den ersten Broker. Damit
bleibt die API der früheren Versionen und die HA-Integration funktionsfähig.

Die OpenAPI-Dokumentation liegt unter `/api/docs`.

## Die Datenstruktur

Ein Topic ist ein Pfad aus Segmenten. Jeder Knoten trägt den **letzten** Wert mit QoS,
Retain-Flag und Zeitstempel. Ein Knoten kann zugleich Ordner und Topic sein.

Zusätzlich hält der Baum ein **Änderungsprotokoll** mit Sequenznummern (begrenzt auf 1000
Einträge). Darüber kann ein Client nur die Änderungen seit seinem letzten Aufruf anfordern
— das ist die Grundlage für den Polling-Modus.

```json
{
  "version": 42,
  "sequence": 1874,
  "children": [
    {
      "name": "tasmota",
      "path": "tasmota",
      "children": [
        {
          "name": "config",
          "path": "tasmota/config",
          "value": {
            "value": "{\"ip\":\"10.0.0.23\"}",
            "qos": 0,
            "retain": true,
            "timestamp": 1794312843.18,
            "firstSeen": 1794312843.18,
            "size": 37
          }
        }
      ]
    }
  ]
}
```

## Das Retain-Flag

MQTT 3.1.1 §3.3.1-9 schreibt vor, dass der Broker das Retain-Flag bei weitergeleiteten
Nachrichten **immer auf 0** setzt — es ist nur bei der Retained-Wiedergabe beim Abonnieren
gesetzt. Ein Abonnent sieht daher nie, was der Publisher verwendet hat.

Der Explorer merkt sich deshalb, ob ein Topic auf dem Broker **gespeichert** ist: das Flag
wird gesetzt, aber nie gelöscht. Nur so lässt sich sinnvoll publizieren — ein Edit auf
einem retained Topic muss wieder retained publiziert werden, sonst behält der Broker den
alten Wert.

## Installation

```bash
pip install -e ".[server]"
mqtt-compass --broker-host 192.168.1.10 --broker-port 1883
```

Oder mit Docker:

```bash
docker build -t mqtt-compass .
docker run -p 8088:8088 mqtt-compass
```

Die Oberfläche läuft danach auf <http://localhost:8088>.

## Die Hausaufgaben

Für die Entwicklung:

```bash
# ein MQTT-Broker auf 127.0.0.1:1883
.venv/Scripts/python tools/dev_broker.py

# Beispiel-Topics publizieren
.venv/Scripts/python tools/publish_sample.py
```

Tests:

```bash
.venv/Scripts/pytest                    # 84 Tests
cd frontend && npx vitest run            # 90 Tests
```

## Weiterführend

- [`01-functions.md`](01-functions.md) — der Funktionskatalog der Altprojekte und unser Stand
- [`02-tasks.md`](02-tasks.md) — die Aufgabenliste mit Prioritäten und Aufwand
