# JD-Impact · Instagram-Veröffentlichung

Stand: Vorbereitung. Die Zernio-Verbindung in Make und der tatsächliche API-Durchlauf fehlen noch. Es wurde kein Reel auf Instagram veröffentlicht und keine DM-Automation aktiviert.

## Ablauf nach der einmaligen Verbindung

1. Freigegebenes Reel, Cover, Caption, Stichwörter und Code-Link in einem Release-Manifest erfassen.
2. Die öffentlich abrufbaren Mediendateien unter `docs/reels/<komponente>/<version>/` bereitstellen. Alternativ ist künftig der dokumentierte Zernio-Medienupload möglich; Freigabelinks aus Cloud-Laufwerken funktionieren nicht.
3. In Zernio das eigene Instagram-Konto `jd_impact` mit Posting-, Kommentar- und Nachrichtenrechten verbinden.
4. Den API-Schlüssel ausschließlich in der sicheren Make-Verbindung hinterlegen. Keine Schlüssel in Git, JSON-Dateien oder Chat speichern.
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

Der Entwurf nutzt einen stabilen Idempotency-Key aus Zielkonto, Medien und Caption. Vorbereitung bei unklarer Antwort nicht blind neu ausführen: zuerst vorhandenen Entwurf und gebundene Regeln in Zernio/Make prüfen und vorhandene IDs verwenden. Nach einem Teilfehler wird der bestehende Entwurf weiterverwendet. Die Make-Verbindung und die Ausführung müssen mit echten API-Antworten getestet werden, bevor die Automatisierung als fertig gilt.

## Kostenquelle und technische Quellen

Am 19.10.2026 nennt Zernio zwei kostenlose Konten und 10.000 gesendete Nachrichten pro Monat; Make nennt im Free-Tarif 1.000 Credits. Den tatsächlichen Kontotarif und Verbrauch vor Aktivierung prüfen. Keine kostenpflichtigen Upgrades oder automatischen Nachkäufe einrichten.

- https://zernio.com/pricing
- https://www.make.com/pricing
- https://docs.zernio.com/posts/create-post
- https://docs.zernio.com/posts/update-post
- https://docs.zernio.com/comment-automations/create-comment-automation
- https://docs.zernio.com/comment-automations/update-comment-automation
- https://docs.zernio.com/platforms/instagram
- https://zernio.com/rebrand
