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

## Demo und Reel
`index.html` lädt das echte Komponenten-Code-Paket aus einem lokalen Byte-Stream. Dieser wird für die sichtbare Demo in 16 Blöcken mit je 250 ms Abstand gelesen. Die angezeigten Bytes und Prozentwerte stammen aus diesem Stream. Beim Einbau mit `url` gibt es diese Demo-Drosselung nicht.

`reel.html` verwendet dieselbe Funktion und zeigt den tatsächlichen Komponenten-Code als JD-/RGB-Matrix-Hintergrund. „Reel abspielen“ startet einen echten Download. Escape setzt die Aufnahme zurück und bricht einen laufenden Transfer ab.

## Sichtbare Animation auch bei kleinen Dateien

Die Datei wird sofort geladen. Die Animation bleibt standardmäßig mindestens 1400 ms geöffnet, bevor die fertige Datei an den Browser übergeben wird. Der Prozentwert basiert weiterhin auf den tatsächlich geladenen Bytes. Mit `minimumDuration: 0` kannst du diese Präsentationszeit deaktivieren. Abbrechen funktioniert auch während dieser kurzen Präsentation.

`forgestart`, `forgeprogress`, `forgedownload` und `forgeerror` melden den Ablauf. `forge.setMotion(false)` pausiert Effekte; `true` schaltet sie ein.
