# JD-Impact — Copy Button

Ein Kopier-Button mit Scan-Licht direkt auf dem Button, Clipboard-zu-Haken-Animation und echter Rückmeldung. Keine Bibliotheken.

## Einbauen

1. `copy-button.css` im Seitenkopf laden.
2. `component.html` an deiner gewünschten Stelle einfügen. Den Text im unsichtbaren Element `data-copy-value` ersetzen.
3. Nach dem HTML JavaScript laden und initialisieren:

```html
<script src="copy-button.js"></script>
<script>
const copy = new CopyButton(document.querySelector('[data-jd-copy]'));
</script>
```

Du kannst den Text später mit `copy.setText('Dein neuer Text')` ändern oder über `{text: () => deinText}` dynamisch aus deinem Projekt lesen. Jede Instanz bekommt ihr eigenes Root-Element.

## Echte Clipboard-Funktion

Der Text wird sofort über die Clipboard-API kopiert; der Scan verzögert das Kopieren nicht. Der Haken erscheint erst bei Erfolg. Für die Clipboard-API verwende HTTPS oder localhost. Wenn ein Browser sie blockiert, versucht die Komponente die ältere Kopierfunktion und bietet bei einem Fehlschlag ein sichtbares Textfeld zum manuellen Kopieren an. Es erscheint keine falsche Erfolgsmeldung.

## Beispiel

Starte im entpackten Ordner beispielsweise `python -m http.server 8000` und öffne `http://localhost:8000/example.html`. Unter „Anderen Text ausprobieren“ kannst du eigenen Text testen. `preview.html` enthält dieselbe Komponente in einer Datei.

## API

`copy.copy()` liefert ein Promise mit dem tatsächlichen Ergebnis. `copy.reset()` setzt die Darstellung zurück; `copy.setMotion(false)` reduziert die Animationen. `copy.destroy()` entfernt Listener und Timer. Mit `resetDelay` kannst du die Anzeigedauer der Bestätigung einstellen (Standard: 2200 ms).

`copycomplete` enthält den tatsächlich kopierten Text unter `event.detail.text`. `copyerror` meldet einen fehlgeschlagenen Kopierversuch. Tastaturbedienung, Live-Rückmeldung und reduzierte Bewegung sind enthalten.
