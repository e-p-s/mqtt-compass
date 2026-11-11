# Funktionskatalog

Dieses Dokument vergleicht die Funktionalität der beiden Altprojekte mit dem Stand des
Projekts `mqtt-compass` (Python + React). Es ist die Referenz für den Umfang.

## Die beiden Quellprojekte

| Projekt | Art | Rolle für uns |
|---|---|---|
| `d:\code\MQTT-Explorer-0.4.0-beta4` | Electron-App (React 16 + Material-UI 4 + Node/TypeScript), der frühere MQTT-Explorer von mqtt-explorer.com | **Funktionslieferant.** Definiert, was ein MQTT-Browser können muss. |
| `d:\code\ioBroker-master` | Installer-/Wartungs-Tooling für ioBroker (Bash + `@iobroker/install`) | **Musterlieferant.** Liefert die Betriebs-, Diagnose- und Release-Konventionen. |

Der ioBroker-Master enthält **keinen MQTT-Code**. Er liefert stattdessen:
das Installations- und Dienstmuster, das Diagnose-Werkzeug (`diag.sh`), die
Versions-Pflege (`versions.json`), die Docker-Auslieferung (`docker.sh`) und die
Konventionen für Changelog, Versionierung und Release.

## Status-Zeichen

| Zeichen | Bedeutung |
|---|---|
| ✅ | Umgesetzt und getestet |
| 🔄 | Umgesetzt, aber bewusst vereinfacht oder in der Form verändert |
| ⬜ | Noch offen |
| ➖ | Bewusst nicht übernommen — Begründung steht bei der Funktion |

---

# Teil A — Funktionen aus MQTT-Explorer 0.4.0-beta4

## A.1 Verbindung

| # | Funktion | Quelle | Status | Anmerkung |
|---|---|---|---|---|
| A1.1 | Verbindung zu einem Broker aufbauen | `backend/src/DataSource/MqttSource.ts` | ✅ | `mqtt_compass/broker.py` |
| A1.2 | Protokolle MQTT 3.1 / 3.1.1 / 5.0 | `MqttSource.ts` | ✅ | `BrokerSettings.protocol` |
| A1.3 | QoS 0/1/2 für die Subscription | `MqttSource.ts` | ✅ | `BrokerSettings.qos` |
| A1.4 | Benutzername / Passwort | `MqttSource.ts` | ✅ | im Klartext in der Konfiguration, Passwort maskiert in der API |
| A1.5 | TLS / SSL | `MqttSource.ts` | ✅ | `BrokerSettings.tls` |
| A1.6 | Server-CA, Client-Zertifikat, Client-Key (mTLS) | `Certificates.tsx` | 🔄 | Pfade statt Datei-Auswahl über den Dateidialog (Electron) |
| A1.7 | Zertifikatsprüfung abschaltbar | `ConnectionSettings.tsx` | ✅ | `tls_insecure` |
| A1.8 | MQTT-Client-ID setzen | `AdvancedConnectionSettings.tsx` | ✅ | `BrokerSettings.client_id` |
| A1.9 | Automatischer Reconnect | `MqttSource.ts` | 🔄 | paho reconnectet selbst; die Verbindung wird nicht neu aufgebaut |
| A1.10 | Verbindungsstatus (online / connecting / offline) | `ConnectionHealthIndicator.tsx` | ✅ | farbige LED im Kopf |
| A1.11 | **Mehrere Verbindungsprofile** anlegen, speichern, auswählen | `ConnectionManager.ts` | 🔄 | Backend fertig (`manager.py`), **Frontend offen** → A1.12 |
| A1.12 | Brokerwechsel in der Oberfläche | `ProfileList/` | ⬜ | in Arbeit: `BrokerManager` vorhanden, Auswahl fehlt |
| A1.13 | Zusätzliche Subscriptions je Broker | `Subscriptions.tsx` | 🔄 | ein Filter je Broker (`subscribe`), keine Liste mehrerer Filter |
| A1.14 | WebSocket-Transport (`ws://`, `wss://`) | `ConnectionOptions.ts` | ⬜ | das Backend kann TCP; WebSocket-Broker fehlen |
| A1.15 | Standard-Verbindungen (mqtt.eclipse.org, test.mosquitto.org) | `ConnectionOptions.ts` | ➖ | ein Werkzeug für die eigene Infrastruktur, keine Demo-Nötigkeit |
| A1.16 | Migration alter Konfigurationen | `migrations/Connection.ts` | 🔄 | das alte Format `broker: {...}` wird gelesen, das neue `brokers: [...]` geschrieben |
| A1.17 | Konfigurations-Migration nach Version | `ConfigMigrator.ts` | ➖ | die Konfiguration ist versioniert, aber ohne Migrations-Engine |

## A.2 Topic-Baum

| # | Funktion | Quelle | Status | Anmerkung |
|---|---|---|---|---|
| A2.1 | Hierarchischer Baum, Segment pro `/` | `Tree/` | ✅ | `mqtt_compass/tree.py` |
| A2.2 | Auf-/Zuklappen | `TreeNode/` | ✅ | zwei Ebenen: Topic-Zweig und Payload-Zweig |
| A2.3 | Auto-Expand bis zu einer Grenze | `useIsAllowedToAutoExpandState.tsx` | 🔄 | die erste Ebene wird automatisch geöffnet, eine einstellbare Grenze fehlt |
| A2.4 | Metadaten „N Topics, M Messages" je Knoten | `TreeNodeTitle.tsx` | 🔄 | die Anzahl steht in der Kopfzeile, nicht je Knoten |
| A2.5 | Inline-Wert-Vorschau | `TreeNodeTitle.tsx` | ✅ | die Wertzelle zeigt den Wert (gekürzt durch die Spaltenbreite) |
| A2.6 | Blink-Animation bei neuer Nachricht | `useAnimationToIndicateTopicUpdate.tsx` | ✅ | `valueUpdated`-Animation, 1,2 s |
| A2.7 | Tastaturnavigation (↑ ↓ ← →) | `Tree/index.tsx` | ⬜ | |
| A2.8 | Topic löschen (Entf/Backspace, rekursiv) | `useDeleteKeyCallback.tsx` | ⬜ | |
| A2.9 | Pausieren der Live-Aktualisierung | `PauseButton.tsx` | ⬜ | |
| A2.10 | Themen-Sortierung (a–z, #Messages, #Topics) | `sortedNodes.tsx` | ⬜ | |
| A2.11 | Virtualisierung / Performance bei vielen Topics | `TreeNodeSubnodes.tsx` | ✅ | eigene Virtualisierung, 3.900 Zeilen ohne Ruckler (23 ms) |
| A2.12 | Breadcrumb-Pfad zum Topic | `Topic.tsx` | ⬜ | der volle Pfad steht im Tooltip |
| A2.13 | **Payload als Unterbaum aufklappen** | — | ✅ | **eigene Neuerung.** JSON-Unterwerte erscheinen als Zeilen im Baum |
| A2.14 | Spaltenbreiten anpassbar | `TreeTable` in Compass | ✅ | eigener Resizer, Breiten bleiben erhalten |
| A2.15 | Schnellfilter über die obersten Topics | — | ✅ | **eigene Neuerung.** Die Liste entsteht aus dem Broker |

## A.3 Payload-Darstellung

| # | Funktion | Quelle | Status | Anmerkung |
|---|---|---|---|---|
| A3.1 | Wert anzeigen | `ValueRenderer.tsx` | ✅ | |
| A3.2 | JSON formatiert anzeigen | `ValueRenderer.tsx` | ✅ | `formatValue.ts` |
| A3.3 | Typ-Erkennung (Zahl, Boolean, `null`, Text, Objekt, Array) | — | ✅ | **eigene Neuerung**, Zahlen ohne Locale-Trenner |
| A3.4 | Diff gegen die vorherige Nachricht | `CodeDiff/` | ⬜ | |
| A3.5 | Diff gegen eine ausgewählte Nachricht | `CodeDiff/`, `compareMessage` | ⬜ | |
| A3.6 | JSON-Syntaxhervorhebung | `CodeDiff/` (Prism) | ⬜ | |
| A3.7 | Zeilenguttern mit +/- und Diff-Zähler | `Gutters.tsx` | ⬜ | |
| A3.8 | **Sparkplug B dekodieren** | `backend/src/Model/sparkplugb.ts` | ⬜ | protobufjs + `sparkplug_b.proto` |
| A3.9 | Nachrichtenhistorie je Topic (letzte 100) | `MessageHistory.tsx` | ⬜ | |
| A3.10 | QoS, Retain, Message-ID, Empfangszeitpunkt anzeigen | `ValuePanel.tsx` | ✅ | als Spalten QoS / Retain / Changed |
| A3.11 | Topic und Wert kopieren | `helper/Copy.tsx` | ✅ | mit Compass-Symbol und Rückmeldung |
| A3.12 | Ctrl+A im Codeblock | `handleTextSelectWithCtrlA.ts` | ➖ | im Explorer gibt es keinen Codeblock |
| A3.13 | Statistik je Knoten (Messages, Subtopics) | `NodeStats.tsx` | 🔄 | die Zähler stehen in der Kopfzeile |
| A3.14 | Wert im Baum **ändern** | — | ✅ | **eigene Neuerung.** Bei JSON wird das ganze Payload neu publiziert |
| A3.15 | Rohpayload anzeigen und kopieren | `HistoryDrawer.tsx` | ✅ | Dialog mit der aufgeschlüsselten Struktur und dem Rohwert |

## A.4 Suche und Filter

| # | Funktion | Quelle | Status | Anmerkung |
|---|---|---|---|---|
| A4.1 | Volltextsuche über Topic **und** Payload | `SearchBar.tsx` | ✅ | |
| A4.2 | Der Filter wirkt live auf neue Nachrichten | `Settings.ts` (`nodeFilter`) | ✅ | die Filterung läuft im Frontend bei jedem Update |
| A4.3 | MQTT-Topic-Filter (`home/#`) | — | ✅ | inkl. Validierung nach MQTT-Spezifikation |
| A4.4 | Filter „nur mit Wert" / „nur retained" | — | ✅ | |
| A4.5 | Filter „nur JSON" | — | ✅ | **eigene Neuerung** |
| A4.6 | Automatische Aufklappgrenze abhängig von der Trefferzahl | `Settings.ts` | ⬜ | |
| A4.7 | Löschen-Button für die Suche | `SearchBar.tsx` | ✅ | |
| A4.8 | Tastaturfokus der Suche bei beliebiger Eingabe | `SearchBar.tsx` | ⬜ | |

## A.5 Publizieren

| # | Funktion | Quelle | Status | Anmerkung |
|---|---|---|---|---|
| A5.1 | Nachricht publizieren (Topic, Payload, QoS, Retain) | `Publish.tsx` | ✅ | |
| A5.2 | Payload-Editor mit raw/xml/json-Modus | `Editor.tsx` | 🔄 | ein einfaches Mehrzeilenfeld statt Ace |
| A5.3 | JSON formatieren vor dem Publizieren | `Publish.tsx` | 🔄 | der Explorer formatiert JSON automatisch beim Anzeigen |
| A5.4 | Ctrl/Cmd+Enter zum Senden | `Publish.tsx` | ⬜ | |
| A5.5 | Publish-Historie (letzte 8, wiederherstellbar) | `PublishHistory.tsx` | ⬜ | |
| A5.6 | Retained-Topic löschen | `DeleteSelectedTopicButton.tsx` | ⬜ | |
| A5.7 | Rekursives Löschen aller Subtopics | `RecursiveTopicDeleteButton.tsx` | ⬜ | |

## A.6 Diagramme und Historie

| # | Funktion | Quelle | Status | Anmerkung |
|---|---|---|---|---|
| A6.1 | Live-Plot im Wert-Panel | `TopicPlot.tsx` | ⬜ | |
| A6.2 | Chart-Panel mit mehreren Diagrammen | `ChartPanel/` | ⬜ | |
| A6.3 | Chart aus einem JSON-Property hinzufügen | `ChartPreview.tsx` | ⬜ | |
| A6.4 | Chart-Einstellungen (Y-Bereich, Zeitbereich, Interpolation, Größe, Farbe) | `ChartSettings/` | ⬜ | |
| A6.5 | Chart-Persistenz je Verbindung | `Charts.ts` | ⬜ | |
| A6.6 | Wert-Plottbarkeit (bool → 0/1, „on"/„off") | `CodeDiff/util.tsx` | ⬜ | |

## A.7 Oberfläche und Bedienung

| # | Funktion | Quelle | Status | Anmerkung |
|---|---|---|---|---|
| A7.1 | Theme hell/dunkel | `theme.ts` | ✅ | **alle** Compass-Themes inklusive `HA` |
| A7.2 | Themewechsel im Kopf | `Settings.tsx` | ✅ | `ToggleThemeMenu` aus `@compass/gui-components` |
| A7.3 | **Sprachumschaltung** | — | 🔄 | **eigene Neuerung.** Deutsch und Englisch, Flagge im Kopf; die Oberfläche ist noch nicht verdrahtet |
| A7.4 | Suchfeld in der Kopfzeile | `TitleBar.tsx` | ✅ | in der Filterleiste |
| A7.5 | Aufklappen/Zuklappen aller | — | ✅ | |
| A7.6 | Spaltenbreiten anpassbar | — | ✅ | |
| A7.7 | Benachrichtigungen (Snackbar) | `Notification.tsx` | ✅ | |
| A7.8 | Bestätigungsdialog | `ConfirmationDialog.tsx` | ⬜ | |
| A7.9 | Fehlerdialog mit Neustart | `ErrorBoundary.tsx` | ➖ | eine Weboberfläche hat keinen Neustart-Bedararf |
| A7.10 | Update-Hinweis mit Download | `UpdateNotifier.tsx` | ⬜ | |
| A7.11 | Broker-Statistik (`$SYS`) | `BrokerStatistics.tsx` | ⬜ | |
| A7.12 | Zeit-/Zahlenformatierung je Locale | `TimeLocale.tsx` | 🔄 | die Uhrzeiten folgen dem Browser-Locale |
| A7.13 | Zoom (Strg +/−/0) | `MenuTemplate.ts` | ➖ | eine Weboberfläche zoomt den Browser |
| A7.14 | Einstellungen-Drawer | `SettingsDrawer/` | 🔄 | die Einstellungen liegen im Broker-Dialog |

## A.8 Technische Funktionen

| # | Funktion | Quelle | Status | Anmerkung |
|---|---|---|---|---|
| A8.1 | Weboberfläche (Browser) | — | ✅ | das ist unser Ziel, statt einer Electron-App |
| A8.2 | Electron-Desktop-App | `src/electron.ts` | ➖ | die HA-Integration und Docker sind der Verteilweg |
| A8.3 | Windows-Store-Paket (appx) | `package.ts` | ➖ | |
| A8.4 | macOS-/Linux-Pakete | `package.ts` | ➖ | Docker deckt Linux ab |
| A8.5 | Automatische Updates | `autoUpdater.ts` | ⬜ | |
| A8.6 | Konfiguration dauerhaft speichern | `ConfigStorage.ts` (lowdb) | ✅ | JSON-Datei |
| A8.7 | Ringpuffer für die Nachrichtenhistorie | `RingBuffer.ts` | ⬜ | |
| A8.8 | Batch-Verarbeitung der Nachrichten (300 ms) | `Tree.ts` | 🔄 | die Aktualisierungen laufen sofort, die Virtualisierung fängt die Last ab |
| A8.9 | Automatisierte UI-Tests | `src/spec/` | 🔄 | 90 Vitest-Tests, aber keine Bildschirmtests |
| A8.10 | Speicherleck-Test | `leakTest.ts` | ⬜ | |
| A8.11 | Demo-Video-Automatisierung | `demoVideo.ts` | ⬜ | |

---

# Teil B — Funktionen aus ioBroker-master

Dieses Projekt enthält keinen MQTT-Code. Seine Funktionen sind Betriebsfunktionen, die wir
als Muster übernommen haben — oder bewusst nicht.

| # | Funktion | Quelle | Status | Anmerkung |
|---|---|---|---|---|
| B.1 | Installation über ein Paketmanager-Modell (pip) | `lib-npx/` | ✅ | `pip install mqtt-compass[server]` |
| B.2 | Docker-Auslieferung | `docker.sh`, `Dockerfile` | ✅ | `Dockerfile`, `docker-compose.yml` |
| B.3 | Windows-Dienst | `install/windows/` | ⬜ | der Explorer läuft als Dienst auf dem Compass-Host |
| B.4 | Systemdiagnose | `diag.sh` | ⬜ | **offen** — sinnvolle Übernahme: eine Diagnose-Seite im Explorer |
| B.5 | Reparaturlauf (`fix_installation.sh`) | `fix_installation.sh` | ➖ | der Explorer hat keinen Installationszustand, der repariert werden müsste |
| B.6 | Node.js-Aktualisierung | `node-update.sh` | ➖ | der Explorer braucht kein Node.js zur Laufzeit |
| B.7 | Versions-Pflege an einer Stelle | `versions.json` | 🔄 | die Version steht in `pyproject.toml` und im Frontend |
| B.8 | Changelog je Änderung, Version mit Datum | `CLAUDE_*.md` | 🔄 | `CHANGELOG.md` wird noch geführt |
| B.9 | Volltext-TUI mit Tastatureingabe | `tui_*` | ➖ | die Oberfläche ist eine Weboberfläche |
| B.10 | Shellcheck in der CI | `.github/workflows/test.yml` | ➖ | kein Shellcode im Projekt |
| B.11 | `iob`-Wrapper-Befehl | `installer.sh` | ➖ | ein einzelnes Kommando `mqtt-compass` genügt |
| B.12 | Redis als Zustandsspeicher | `installer_library.sh` | ➖ | der Explorer hält den Zustand im Speicher |
| B.13 | Stabile Pfade statt Systempfade | `get_platform_params()` | 🔄 | Konfiguration neben der Anwendung, Pfad über die CLI |
| B.14 | Verbindung mit `127.0.0.1` statt `0.0.0.0` | `install/windows/` | ✅ | Standard ist `127.0.0.1`, `0.0.0.0` muss ausdrücklich gewählt werden |

---

# Teil C — Funktionen, die nur dieses Projekt kennt

Diese Funktionen gibt es in keinem der beiden Altprojekte. Sie sind das Ergebnis der
Anforderung „die GUI des Compass-Admins, aber für MQTT".

| # | Funktion | Status | Anmerkung |
|---|---|---|---|
| C.1 | Aufbau in der Compass-Admin-Optik (`@compass/gui-components`, MUI 9) | ✅ | Theme, Icons, Zeilen- und Zellenstile aus dem Admin übernommen |
| C.2 | Compass-Themes inklusive `HA` | ✅ | `Utils.toggleTheme()`, Speicherung unter `App.themeName` |
| C.3 | Payload-Aufschlüsselung mit Typ-Erkennung | ✅ | `formatValue.ts` |
| C.4 | Payload als Unterbaum | ✅ | |
| C.5 | Wert im Baum ändern, JSON-Schlüssel erhalten | ✅ | `replaceInPayload()` |
| C.6 | Schnellfilter über die obersten Topics des Brokers | ✅ | |
| C.7 | Mehrere Broker mit Umschalten | 🔄 | Backend fertig, Frontend offen → A1.12 |
| C.8 | Spaltenbreiten mit den folgenden Spalten wandern mit | ✅ | |
| C.9 | WebSocket **oder** Polling | ✅ | `--no-websocket` für Proxy-Umgebungen, HA nutzt den Polling |
| C.10 | Change-Log mit Sequenznummern | ✅ | `/api/updates?since=N` |
| C.11 | Deutsch und Englisch | 🔄 | Wörterbücher angelegt, Oberfläche noch nicht verdrahtet → A7.3 |
| C.12 | Retain-Erkennung nach MQTT-Spezifikation (3.3.1-9) | ✅ | das Flag wird nur gesetzt, nie gelöscht |
| C.13 | Home-Assistant-Integration | 🔄 | Code steht, noch nicht gegen eine HA-Instanz getestet |

---

# Teil D — Bewusste Abweichungen

| Thema | Altprojekt | Hier | Warum |
|---|---|---|---|
| Sprache der Oberfläche | hart kodiertes Englisch | Deutsch als Standard, Englisch wählbar | Anforderung des Nutzers |
| Technologie | Electron + React 16 + Node | FastAPI + Python, React 19 + Vite | HA-Integration ohne Electron nutzbar, ein Prozess statt drei |
| Zustand | Redux + immutable | React-State + `useMemo` | der Baum ist eine Baumstruktur, kein flacher Store |
| Payload-Darstellung | Sidebar mit Diff und Verlauf | direkte Aufschlüsselung im Baum | die Anforderung „Unterwerte als Unterbaum" |
| Installation | Electron-Installer + Windows-Store | pip + Docker | Serverbetrieb auf dem Compass-Host |
| Zertifikate | Datei-Auswahl über den Electron-Dialog | Pfad in der Konfiguration | ohne Electron kein Dateidialog |
| Persistenz | lowdb im Electron-`userData` | JSON-Datei neben der Anwendung | ohne Electron simpler |
| Aktualisierung | GitHub-Releases-API + electron-updater | — | als Weboberfläche Aufgabe des Betreibers |

---

# Teil E — Was NICHT übernommen wurde und warum

| Funktion | Altprojekt | Grund |
|---|---|---|
| Sparkplug-B-Dekodierung | `sparkplugb.ts` | Aufwand (Protobuf, 170 Zeilen Proto-Definition) gegen den Nutzen — für einen Tasmota-/ESPHome-Broker nicht gebraucht. **Als Aufgabe vermerkt.** |
| Diagramme | `ChartPanel/` | hoher Aufwand (react-vis, 8 Einstellungsdialoge), Nutzen unklar. Die Historie ist der natürlichere nächste Schritt. |
| Diff-Ansicht | `CodeDiff/` | setzt die Nachrichtenhistorie voraus. Erst die Historie, dann der Diff. |
| Electron-Shell | `src/electron.ts` | widerspricht der Zielsetzung „Integration in Home Assistant". |
| Telemetrie | `tracking.ts`, `bugtracking.ts` | war im Altprojekt bereits auskommentiert; wird nicht wiederbelebt. |
| Update-Check | `UpdateNotifier.tsx` | ohne Electron gibt es keinen Auto-Update-Mechanismus. |
| Demo-Video-Automation | `src/spec/demoVideo.ts` | nette Marketing-Idee, kein Produktmerkmal. |

---

# Teil F — Auf einen Blick

| Bereich | Altprojekt | Hier | Fortschritt |
|---|---|---|---|
| Verbindung | 17 Funktionen | 17 | 12 ✅, 4 🔄, 1 ⬜ |
| Topic-Baum | 15 Funktionen | 15 (+3 eigene) | 13 ✅, 2 🔄, 3 ⬜ |
| Payload | 15 Funktionen | 15 (+2 eigene) | 9 ✅, 2 🔄, 6 ⬜ |
| Suche/Filter | 8 Funktionen | 8 (+1 eigene) | 7 ✅, 1 ⬜ |
| Publizieren | 7 Funktionen | 7 (+1 eigene) | 3 ✅, 2 🔄, 3 ⬜ |
| Diagramme | 6 Funktionen | 6 | 0 ✅, 6 ⬜ |
| Oberfläche | 14 Funktionen | 14 (+2 eigene) | 7 ✅, 3 🔄, 3 ⬜ |
| Technik | 11 Funktionen | 11 (+4 eigene) | 6 ✅, 3 🔄, 2 ⬜ |
| Compass-Muster | 14 Funktionen | 14 | 6 ✅, 4 🔄, 1 ⬜, 3 ➖ |

**Offen sind 24 Funktionen** — sie stehen in `02-tasks.md` mit Priorität und Aufwand.
