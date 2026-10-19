# JD-Impact · Instagram-Veröffentlichung

Stand: Das Order-Truck-Reel wurde am 19.10.2026 auf [@jd_impact veröffentlicht](https://www.instagram.com/reel/Dep_6RiCkQ1/). Video, Cover, Caption und eigener Code-Kommentar sind geprüft. Die gebundene ORDER-/BESTELLEN-Regel ist aktiv und beantwortet passende Kommentare sowie eingehende Stichwort-DMs. Eine tatsächliche Zustellung an einen externen Empfänger wurde noch nicht ausgelöst. Das Anpinnen des Kommentars unterstützt die Instagram-API nicht; das erfolgt in Instagram. Make bleibt optional.

## Direkter Ablauf mit Zernio

`scripts/zernio_instagram.py` verwendet die offizielle REST-API mit der Python-Standardbibliothek. Es läuft ausschließlich außerhalb des Browsers. Keine zusätzlichen Pakete nötig. Der Schlüssel kommt aus `ZERNIO_API_KEY` oder einer privaten Datei außerhalb des Repositories (`--api-key-file`). `.env`-Dateien sind von Git ausgeschlossen. Einen im Chat geteilten Schlüssel nach der Einrichtung ersetzen.

```bash
# Voraussetzung: ZERNIO_API_KEY über die private Laufzeitkonfiguration setzen.
python scripts/zernio_instagram.py accounts
python scripts/zernio_instagram.py prepare
python scripts/zernio_instagram.py status
```

`prepare` prüft zuerst das aktive Instagram-Konto und dessen Rechte, erstellt ausschließlich einen Entwurf und bindet die pausierte Regel an genau diesen Beitrag. Es verwendet dasselbe Release-Manifest wie der Make-Generator, einschließlich Video, Cover, Caption, Stichwörtern und Code-Link. Der Entwurf wird nach dem Schreiben erneut gelesen; eine gekürzte DM-Button-Beschriftung berücksichtigt Metas Limit von 20 Zeichen.

IDs und Wiederaufnahmestatus liegen standardmäßig in `../jd-instagram-setup/<releaseId>.state.json` mit Dateirechten 0600, außerhalb des öffentlichen Repositories. Mit `--state-dir` lässt sich ein anderer privater Ordner wählen. Den Ordner bei Umzügen mitnehmen; für regelmäßigen Betrieb einen dauerhaften privaten Datenträger und einen Secret Store verwenden. Der Veröffentlichungsstatus enthält keinen API-Schlüssel.

Wiederholte Vorbereitung verwendet vorhandene IDs. Nach einem Fehler beim Erstellen der Regel bleibt der Entwurf erhalten; vor einem erneuten Regel-Schreibaufruf werden bereits passende Regeln gesucht. Ein geändertes Release darf den alten Status nicht überschreiben. Gleichzeitige CLI-Aufrufe für dasselbe Release werden gesperrt.

Erst nach der Freigabe des konkreten Reels veröffentlichen:

```bash
python scripts/zernio_instagram.py publish --confirm-publish order-truck-v4
```

Dieser Schritt prüft das gespeicherte Zielkonto, den Entwurf, das Cover und die gebundene Regel erneut, aktiviert die DM-Regel und veröffentlicht anschließend den vorhandenen Entwurf. `publishing`, `partial` oder `failed` sind keine erfolgreiche Veröffentlichung. Ein erneuter Aufruf veröffentlicht einen Beitrag in diesen Zuständen nicht nochmals; den bestehenden Beitrag mit `status` prüfen. Erfolg erfordert `published` und einen Instagram-Permalink. Die Veröffentlichung und der eigene erste Kommentar wurden live geprüft. Für den Test der tatsächlichen DM-Zustellung muss ein Empfänger selbst das Stichwort kommentieren oder senden.

Tests mit lokaler HTTP-API, ohne Instagram-Aufrufe:

```bash
python -m unittest discover -s scripts -p 'test_*.py'
```

## Optionale Make-Variante

1. Freigegebenes Reel, Cover, Caption, Stichwörter und Code-Link in einem Release-Manifest erfassen.
2. Die öffentlich abrufbaren Mediendateien unter `docs/reels/<komponente>/<version>/` bereitstellen. Alternativ ist künftig der dokumentierte Zernio-Medienupload möglich; Freigabelinks aus Cloud-Laufwerken funktionieren nicht.
3. In Zernio das eigene Instagram-Konto `jd_impact` mit Posting-, Kommentar- und Nachrichtenrechten verbinden.
4. Für diese Variante den API-Schlüssel ausschließlich in der sicheren Make-Verbindung hinterlegen. Keine Schlüssel in Git, öffentlichen JSON-Dateien oder Chat speichern.
5. Über die Make-Verbindung die tatsächliche Account-ID, Profile-ID und Kontoberechtigungen lesen und `jd_impact` eindeutig zuordnen.
6. `scripts/prepare-instagram-release.py` erzeugt daraus die beiden Make-Workflows und die Eingaben für das konkrete Release. Die Verbindungs-ID kommt aus Make, Account-/Profile-ID aus Zernio. Die erzeugte Datei mit diesen privaten Konfigurationswerten außerhalb des Repositories speichern.
7. Die Workflows über die Make-Tools speichern und die Modulkonfiguration sowie echte API-Antworten prüfen. Der universelle Make-Knoten verwendet noch den kompatiblen Namen `make-nodes-late` und die alte Basis-URL `getlate.dev/api/v1`.

## Zwei aufeinanderfolgende Aufrufe

**Vorbereiten:** Erstellt einen unveröffentlichten Reel-Entwurf und eine pausierte, ausdrücklich an dessen Zernio-Post-ID gebundene Kommentar-DM-Regel. Die Make-Ausgaben enthalten beide IDs. Videos, Texte und URLs sind bereits vollständig in den Release-Daten enthalten.

**Veröffentlichen:** Nur mit den zusammengehörigen, geprüften IDs aus dem ersten Aufruf starten. Aktiviert zuerst die gebundene DM-Regel und veröffentlicht erst danach genau den vorhandenen Entwurf. Fehler beim Aktivieren stoppen vor der Veröffentlichung. Ein `published`-Status und der Instagram-Permalink bestätigen den Abschluss; HTTP 200 allein reicht nicht. Bei `publishing` den bestehenden Post weiter abfragen, keinen neuen anlegen.

Die Workflows werden vom Generator zunächst deaktiviert angelegt. Der erste echte Test erfolgt nach Kontoverbindung als Entwurf ohne Veröffentlichung. Einen Kommentar-/DM-Test erst nach ausdrücklicher Freigabe auslösen. Vor dem späteren Veröffentlichen müssen das konkrete Video, Caption und Zielkonto feststehen.

## Regeln für Code-DMs

- ORDER und BESTELLEN sind die Stichwörter des aktuellen Order-Truck-Reels; künftige Komponenten erhalten eigene Stichwörter und Links.
- Ganze Wörter statt beliebiger Teilzeichenfolgen vergleichen.
- Der Link führt direkt zur passenden Komponentenseite. Auch direkt eingehende Stichwort-DMs werden beantwortet.
- Öffentliche Antworten erst nach erfolgreicher privater Nachricht senden.
- Jede Person erhält die Nachricht pro Auslöser einmal. Keine Follow-Pflicht und kein vorgeschalteter Klick.
- Keine zusätzlichen Likes, gelöschten Kommentare oder Tracking-Weiterleitungen einrichten.

## Wiederaufnahme bei Fehlern

Der Entwurf nutzt einen stabilen Idempotency-Key aus Zielkonto, Medien und Caption. Vorbereitung bei unklarer Antwort nicht blind neu ausführen: zuerst vorhandenen Entwurf und gebundene Regeln in Zernio/Make prüfen und vorhandene IDs verwenden. Nach einem Teilfehler wird der bestehende Entwurf weiterverwendet. Die optionale Make-Verbindung ist weiterhin ausstehend und wurde nicht im Echtbetrieb getestet; der direkte Ablauf oben wurde mit einem Entwurf geprüft.

## Kostenquelle und technische Quellen

Die geprüfte Zernio-Dokumentation nennt zwei kostenlose Konten und 10.000 gesendete Nachrichten pro Monat; Make nennt im Free-Tarif 1.000 Credits. Beim Einrichtungstest meldete die Zernio-API Zugriff, null bisherige Ausgaben und deaktivierte automatische Upgrades. Keine kostenpflichtigen Upgrades oder automatischen Nachkäufe einrichten. Späteren Tarif und Verbrauch vor Aktivierung prüfen.

- https://zernio.com/pricing
- https://zernio.com/agent-quickstart.md
- https://www.make.com/pricing
- https://docs.zernio.com/posts/create-post
- https://docs.zernio.com/posts/update-post
- https://docs.zernio.com/comment-automations/create-comment-automation
- https://docs.zernio.com/comment-automations/update-comment-automation
- https://docs.zernio.com/platforms/instagram
- https://zernio.com/rebrand
