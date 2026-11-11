# Aufgabenliste

Alle offenen und erledigten Aufgaben des Projekts. Die Katalog-Nummern (A1.1, B.4 …)
verweisen auf `01-functions.md`.

## Prioritäten

| P | Bedeutung |
|---|---|
| **P1** | Muss — ohne das ist das Werkzeug nicht benutzbar |
| **P2** | Soll — deutlich mehr Nutzen |
| **P3** | Kann — Komfort, Ausbau |

## Aufwand

| Größe | Bedeutung |
|---|---|
| **S** | bis ~2 h |
| **M** | ~1 Tag |
| **L** | mehrere Tage |

---

# 1. Laufende Aufgaben

| # | Aufgabe | P | Aufwand | Fortschritt |
|---|---|---|---|---|
| **T1** | **HA-Integration gegen eine Instanz testen** | P1 | M | Code steht und ist auf die neuen Endpunkte umgestellt, nie ausgeführt |

## T1 — Home Assistant testen

**Warum:** Die Integration ist implementiert, aber nie ausgeführt.

**Noch zu tun:**
- [ ] HA-Instanz bereitstellen (Docker oder VM)
- [ ] `custom_components/mqtt_compass` nach `/config/custom_components` kopieren
- [ ] Config-Flow durchlaufen, Broker eintragen
- [ ] Panel als iframe-Karte einbinden, prüfen, ob der Token aus dem localStorage gelesen wird
- [ ] Prüfen, ob der Polling-Pfad (`/api/mqtt_compass/brokers/{id}/updates`) sauber läuft
- [x] `hacs.json` vervollständigen (liegt im Wurzelverzeichnis, Repository-URL gesetzt)
- [ ] Bekannte Grenzen dokumentieren

---

# 2. Offene Aufgaben aus dem Katalog

## 2.1 Verbindung

| # | Aufgabe | P | Aufwand | Notiz |
|---|---|---|---|---|
| T4 | WebSocket-Transport für den Broker (`ws://`, `wss://`) | P2 | M | paho unterstützt es, die URL-Bildung fehlt |
| T5 | Mehrere Subscriptionen je Broker statt einem Filter | P2 | S | die Filterliste je Broker |
| T6 | Client-Zertifikate über einen Dateidialog statt über Pfade | P3 | M | braucht einen Datei-Upload im Browser |
| T7 | Reconnect mit Zustandserhalt sauberer trennen | P3 | S | paho verbindet selbst neu, die Anzeige muss das abbilden |

## 2.2 Topic-Baum

| # | Aufgabe | P | Aufwand | Notiz |
|---|---|---|---|---|
| T8 | Tastaturnavigation im Baum (↑ ↓ ← →) | P2 | M | in der Alt-App in `visibleTreeTraversal.ts` |
| T9 | Topic löschen (Entf, rekursiv, mit Bestätigung) | P2 | M | leeres Payload mit Retain |
| T10 | Live-Aktualisierung pausieren | P2 | M | der Puffer liegt im Backend schon vor |
| T11 | Einstellbare Auto-Expand-Grenze | P3 | S | |
| T12 | Sortierung der Themen (a–z, #Messages, #Topics) | P3 | S | **teilweise erledigt** — die Spalten lassen sich sortieren, eine feste Themenreihenfolge gibt es noch nicht |
| T13 | Zähler je Knoten (Topics/Messages) statt nur in der Kopfzeile | P3 | S | die Zähler müssen vom Backend kommen |

## 2.3 Payload und Historie

| # | Aufgabe | P | Aufwand | Notiz |
|---|---|---|---|---|
| T14 | **Nachrichtenhistorie je Topic** | P2 | L | Ringpuffer im Backend, Anzeige im Explorer. Der natürliche nächste Schritt — der Diff setzt sie voraus. |
| T15 | Diff gegen die vorherige Nachricht | P3 | M | setzt T14 voraus |
| T16 | Diff gegen eine ausgewählte Nachricht | P3 | M | setzt T14 voraus |
| T17 | JSON-Syntaxhervorhebung im Payload | P3 | S | Prism wie in der Alt-App |
| T18 | **Sparkplug B dekodieren** | P3 | L | `sparkplug_b.proto` + protobufjs; für Tasmota/ESPHome nicht nötig |
| T19 | Payload-Editor mit (raw/xml/json-Modus) statt einfachem Feld | P3 | M | Ace oder CodeMirror |

## 2.4 Filter

| # | Aufgabe | P | Aufwand | Notiz |
|---|---|---|---|---|
| T20 | Aufklappgrenze abhängig von der Trefferzahl | P3 | S | |
| T21 | Tastaturfokus der Suche bei beliebiger Eingabe | P3 | S | |

## 2.5 Publizieren

| # | Aufgabe | P | Aufwand | Notiz |
|---|---|---|---|---|
| T22 | Publish-Historie (letzte 8, wiederherstellbar) | P3 | S | |
| T23 | Ctrl/Cmd+Enter zum Senden | P3 | S | |

## 2.6 Oberfläche

| # | Aufgabe | P | Aufwand | Notiz |
|---|---|---|---|---|
| T24 | Bestätigungsdialog für gefährliche Aktionen | P2 | S | nötig, sobald T9 (Löschen) kommt |
| T25 | Broker-Statistik aus `$SYS` anzeigen | P3 | M | `$SYS/broker/#` abonnieren |
| T26 | Update-Hinweis | P3 | M | GitHub-Releases-API |
| T27 | Zeitzone und Zahlenformat getrennt vom Browser-Locale | P3 | S | |

## 2.7 Betrieb und Werkzeuge

| # | Aufgabe | P | Aufwand | Notiz |
|---|---|---|---|---|
| T28 | **Diagnose-Seite** aus dem Compass-Muster | P2 | M | Versionen, Broker-Status, Zertifikate, Pfade, ein „Kopieren"-Knopf für den Support |
| T29 | `CHANGELOG.md` nach dem Compass-Muster pflegen | P2 | S | je Änderung ein Eintrag, Version mit Datum |
| T30 | CI-Pipeline (Test + Build + Docker-Image) | P2 | M | pytest + vitest + Build |
| T31 | Windows-Dienst-Installation | P3 | M | WinSW, wie im Compass-Master |
| T32 | Update-Prüfung gegen die eigene Version | P3 | S | die Version steht an zwei Stellen |
| T33 | Speicherleck-Test | P3 | M | wie `leakTest.ts` in der Alt-App |
| T34 | Bildschirmtests | P3 | L | Playwright |

---

# 3. Erledigte Aufgaben

| # | Aufgabe | Katalog | Erledigt am | Tests |
|---|---|---|---|---|
| E1 | Topic-Baum mit Live-Werten | A2.1, A2.2 | 10.11.2026 | `test_tree.py`, `tree.test.ts` |
| E2 | Broker-Verbindung (TCP, 3.1/3.1.1/5.0, QoS, TLS, mTLS) | A1.1–A1.8 | 10.11.2026 | `test_broker.py` |
| E3 | Publish mit QoS und Retain | A5.1 | 10.11.2026 | `test_server.py` |
| E4 | Volltextsuche über Topic und Payload | A4.1, A4.2 | 10.11.2026 | `tree.test.ts` |
| E5 | MQTT-Topic-Filter mit Validierung | A4.3 | 10.11.2026 | `test_config.py` |
| E6 | Filter „nur mit Wert" / „nur retained" / „nur JSON" | A4.4, A4.5 | 10.11.2026 | `tree.test.ts` |
| E7 | JSON-Aufschlüsselung mit Typ-Erkennung | A3.2, A3.3 | 10.11.2026 | `formatValue.test.ts` |
| E8 | Payload als Unterbaum | A2.13 | 10.11.2026 | `tree.test.ts` |
| E9 | Wert im Baum ändern | A3.14 | 10.11.2026 | `replaceInPayload.test.ts` |
| E10 | Spaltenbreiten anpassbar | A2.14, C.8 | 10.11.2026 | `useColumnWidths.test.ts` |
| E11 | Schnellfilter über die obersten Topics | A2.15 | 10.11.2026 | `tree.test.ts` |
| E12 | Compass-Admin-Optik (Theme, Icons, Zeilenstile) | C.1, C.2 | 10.11.2026 | – |
| E13 | Kopieren von Topic und Wert | A3.11 | 10.11.2026 | – |
| E14 | Dialog mit Rohpayload und Kopierknopf | A3.15 | 10.11.2026 | – |
| E15 | WebSocket mit Polling-Fallback | C.9 | 10.11.2026 | – |
| E16 | Change-Log mit Sequenznummern | C.10 | 10.11.2026 | `test_tree.py` |
| E17 | Retain-Erkennung nach MQTT 3.3.1-9 | C.12 | 10.11.2026 | `test_tree.py` |
| E18 | Docker-Image und Compose-Datei | B.2 | 10.11.2026 | – |
| E19 | Paketinstallation über pip | B.1 | 10.11.2026 | – |
| E20 | Virtualisierung bei vielen Topics | A2.11 | 10.11.2026 | – |
| E21 | Broker-Konfiguration über die Oberfläche | A1.1 | 10.11.2026 | `test_server.py` |
| E22 | API-Token (Bearer oder Query) | – | 10.11.2026 | `test_server.py` |
| E23 | **Mehrere Broker anlegen, ändern, löschen und umschalten** | A1.11, A1.12, C.7 | 10.11.2026 | `test_server.py` |
| E24 | Cache-Control für die index.html | – | 10.11.2026 | – |
| E25 | **Sprachumschaltung Deutsch/Englisch mit Flagge** | A7.3, C.11 | 10.11.2026 | – |
| E26 | **Kleine Baumantwort (gekürzte Payloads) + `/value` für den vollen Wert** | – | 10.11.2026 | `test_server.py` |
| E27 | **GZip im Server** | – | 10.11.2026 | – |
| E28 | **Payload-Art kommt vom Server** (`object`/`array`/`number`/…) | – | 10.11.2026 | `test_server.py` |
| E29 | **Rechtsklick auf eine Zeile: Pfad kopieren** | – | 11.11.2026 | – |
| E30 | **Spalten sortieren (auf-/absteigend)** | – | 11.11.2026 | `sortFilter.test.ts` |
| E31 | **Spalten filtern (Menü mit Werten und Checkboxen)** | – | 11.11.2026 | `sortFilter.test.ts` |
| E32 | **Zeilen ohne Namen bzw. mit einem Namen aus nur Punkten werden ausgeblendet** | – | 11.11.2026 | `sortFilter.test.ts` |
| E33 | **Umbenennung auf MQTT Compass** — Paket, CLI, Konfiguration, API-Prefixe; die ioBroker-Hinweise sind aus dem Quelltext entfernt | – | 11.11.2026 | – |
| E34 | **Eigenes Theme-System statt `@iobroker/gui-components`** — vier Farbfamilien (Graphite, Marine, Sand, Mint) je dunkel/hell, auswählbar im Kopfzeilen-Menü | – | 11.11.2026 | `themes.test.ts` |
| E35 | **Theme-Editor in den Einstellungen** — jede einzelne Farbe änderbar, in `localStorage` gespeichert, mit Zurücksetzen | – | 11.11.2026 | `themes.test.ts` |
| E36 | **Eigene Symbole im Material-Stil** (`icons.tsx`) und eigene Übersetzungen (Deutsch/Englisch) | – | 11.11.2026 | – |
| E37 | **Marken-Symbole für bekannte Topics** (optional, in den Einstellungen) — simpleicons.org, nur auf der ersten Ebene, mit Link auf die Seite der Marke | – | 11.11.2026 | `brands.test.ts` |
| E38 | **HACS-taugliche Struktur** — `custom_components/` und `hacs.json` im Wurzelverzeichnis, gebautes Frontend eingecheckt | – | 11.11.2026 | – |

---

# 4. Bekannte Fehler und Stolpersteine

Diese Dinge haben beim Bauen Zeit gekostet und sollten nicht wiederholt werden.

| Thema | Was passiert war | Wie es gelöst wurde |
|---|---|---|
| `content-visibility: auto` | Chromium hat die Zeilen **nicht gezeichnet** und aus dem a11y-Baum entfernt | eigene Virtualisierung mit Zeilenabstand und Fensterung |
| Decode-Cache zu klein | 1000 Einträge bei 1893 Topics — der Cache wurde ständig geleert | 5000 Einträge mit Verdrängung des ältesten |
| `flatten` dekodierte alle Payloads | bei 6 Nachrichten/s 14 Long-Tasks (max. 112 ms) | die Payload-Art wird einmal beim Eintreffen bestimmt (`kind`), dekodiert wird nur noch Sichtbares |
| Retain-Flag ging verloren | der Broker setzt es bei weitergeleiteten Nachrichten auf 0 (MQTT 3.3.1-9) | das Flag wird nur gesetzt, nie gelöscht |
| **Chromium drosselt Hintergrund-Tabs** | eine 4-MB-Antwort kam erst nach **30 s** an, die Oberfläche blieb leer | die Antwort klein halten: GZip + gekürzte Payloads (790 KB) → sofort da; der volle Wert kommt über `/value` |
| `response.json()` bei 4 MB | der Stream-Leser hängt im Hintergrund-Tab | `response.text()` + `JSON.parse` |
| Null-Byte im Quelltext | `PAYLOAD_SEPARATOR = '\0'` machte die Datei binär | Escape-Sequenz `\u0000` |
| Veraltetes `index.html` im Browser-Cache | nach einem Update war die alte Oberfläche sichtbar | `Cache-Control: no-cache` für die index.html |
| `onCommit` mit veraltetem State | der Wert wurde in einem Zustand einen Schritt zu alt übernommen | der Editor übergibt den Text direkt |
| `raw` war der Eintrag statt des Payloads | beim Ändern eines JSON-Werts ging die Änderung verloren | `raw` = das ganze Payload, `entryRaw` = der Eintrag |
| **Der Spaltenfilter zerstörte die Struktur** | die Ordner verschwanden, weil sie selbst nicht zum Filter passten | der Filter läuft wie der Textfilter über den Baum: ein Knoten bleibt, wenn ein Kind passt |
| **Der Sync scheiterte am laufenden Server** | `rmtree` auf einen Ordner, dessen Dateien gerade ausgeliefert werden → „Zugriff verweigert" | die Dateien einzeln überschreiben statt den Ordner zu löschen |
| Der Pfad einer Payload-Zeile | `topic key` (mit Leerzeichen) statt `topic/key` | der Pfad ist jetzt `topic/key` — das ist auch das, was kopiert wird |

---

# 5. Teststand

| Bereich | Testdatei | Tests |
|---|---|---|
| Baum, Konfiguration, Broker, Server, CLI | `tests/test_*.py` | 87 |
| Baum-Logik, Wertformat, Spaltenbreiten, Filter, Sortierung, JSON-Ersetzen | `frontend/tests/*.test.ts` | 105 |
| Farbfamilien und Themen-Auflösung | `frontend/tests/themes.test.ts` | 16 |
| Marken der Topics (simpleicons) | `frontend/tests/brands.test.ts` | 13 |
| **Summe** | | **221** |

Zusätzlich geprüft: End-to-End gegen den echten Broker (1861 Topics, 6 Nachrichten/s,
0 Long-Tasks, der Baum ist sofort sichtbar) und die Broker-Verifikation nach einem
Wertwechsel.
