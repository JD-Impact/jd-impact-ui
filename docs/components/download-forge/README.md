# JD — Download Forge

Ein echter Download-Button als kleine Daten-Manufaktur: Kapsel auf, Datenfragmente rein, Datei zusammenbauen, Download an den Browser übergeben und Kapsel schließen.

## In dein Projekt einbauen
1. `forge.css`, `forge.js` und `component.html` kopieren.
2. CSS einbinden: `<link rel="stylesheet" href="forge.css">`.
3. Den Inhalt von `component.html` an der gewünschten Stelle einfügen.
4. JavaScript einbinden und mit deiner Datei konfigurieren:

```html
<script src="forge.js"></script>
<script>
const forge = new DownloadForge(
  document.querySelector('[data-download-forge]'),
  { url: '/downloads/project.zip', filename: 'project.zip' }
);
</script>
```

Füge die Scripts nach dem Komponenten-HTML ein. Die Datei muss per Fetch abrufbar sein; fremde Server müssen passende CORS-Header senden. Die fertigen Bytes werden als Blob an den Browser-Download übergeben.

## Funktionen
- Fortschritt basiert auf tatsächlich gelesenen Bytes, wenn der Server `Content-Length` sendet.
- Ohne Gesamtgröße zeigt die Komponente die bereits gelesene Datenmenge.
- Abbrechen stoppt den Download über `AbortController`.
- Netzwerkfehler und HTTP-Fehler zeigen einen erneuten Versuch an.
- Tastaturbedienung, Fortschritts-ARIA und reduzierte Bewegung sind vorgesehen.
- Keine Bibliotheken oder Framework-Abhängigkeiten.

## Ereignisse und API

```js
forge.root.addEventListener('forgeprogress', event => {
  console.log(event.detail.received, event.detail.total);
});
forge.root.addEventListener('forgedownload', event => {
  console.log(event.detail.filename, event.detail.size);
});
forge.start();
forge.abort();
forge.reset(); // außerhalb eines laufenden Downloads
forge.destroy(); // beendet Animationen, Beobachter und Event-Handler
```

Mehrere Instanzen sind möglich, jeweils mit eigenem Root-Element. `forgedownload` meldet die Übergabe an den Browser, nicht die spätere Bestätigung eines Speicherdialogs.

## Fertiges Beispiel ausprobieren

`example.html` lädt dieselben Dateien `component.html`, `forge.css` und `forge.js`, aus denen die Website-Vorschau besteht. Das Komponenten-HTML ist bereits in das Beispiel eingefügt. „Download testen“ lädt die beiliegende Datei `demo-download.zip` wirklich herunter.

Starte im entpackten Ordner einen lokalen Webserver, beispielsweise mit `python -m http.server 8000`, und öffne `http://localhost:8000/example.html`. Alternativ kannst du den Ordner auf deinen Webspace hochladen. Die Datei wird per Fetch geladen, deshalb braucht das Beispiel eine HTTP- oder HTTPS-Adresse.

`preview.html` enthält HTML, CSS und JavaScript zusammen in einer Datei. Für den Beispieldownload muss `demo-download.zip` daneben liegen. Ersetze beim Einbau `url` und `filename` durch deine eigene Datei; der Button und die Animation bleiben dieselben.

Die eingebettete Website-Vorschau (`example.html?embed`) verwendet dieselbe Komponente mit `preview: true` und einem lokalen Demo-Stream: 24 Datenblöcke in etwa sechs Sekunden. So kannst du Öffnen, Fortschritt, Partikel und Abschluss in Ruhe testen. Dabei wird keine Datei an den Browser übergeben. Abbrechen und Neustarten funktionieren auch in der Vorschau. Bei Abschluss wird `forgepreviewcomplete` ausgelöst; `forgedownload` bleibt echten Downloads vorbehalten.

## Sichtbare Animation auch bei kleinen Dateien

Bei echten Downloads wird die Datei sofort geladen und an den Browser übergeben, sobald alle Bytes eingetroffen sind. Es gibt standardmäßig keine zusätzliche Mindestwartezeit. Fortschritt und Dauer folgen der tatsächlichen Datei und Verbindung. Wenn du für dein eigenes Projekt eine Mindestdauer möchtest, kannst du beispielsweise `minimumDuration: 1400` setzen. Diese Einstellung verzögert nur die Übergabe der fertigen Datei; der Prozentwert basiert weiterhin auf den tatsächlich geladenen Bytes. Abbrechen funktioniert auch während dieser optionalen Wartezeit.

`forgestart`, `forgeprogress`, `forgedownload` und `forgeerror` melden den Ablauf. `forge.setMotion(false)` pausiert Effekte; `true` schaltet sie ein.
