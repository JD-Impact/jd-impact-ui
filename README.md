# JD-Impact UI

Animierte UI-Komponenten mit HTML, CSS und JavaScript zum Einbauen in deine Website.

**[Vorschau öffnen und Code kopieren](https://jd-impact.github.io/jd-impact-ui/)**

Die Code-Seite zeigt die interaktive Komponente und die drei Originaldateien. Kopieren ist der Hauptweg; das ZIP-Paket bleibt zusätzlich verfügbar.

## Login Motion

Eine kompakte Login-Karte, die sich bei Hover oder Antippen öffnet. Ein dünner RGB-Rand bewegt sich um die Karte; Login und Registrierung wechseln mit einem 3D-Flip. Beide Seiten bleiben gleich breit.

- **[Login-Code als ZIP herunterladen](https://raw.githubusercontent.com/JD-Impact/jd-impact-ui/v1.0.0/downloads/jd-login-component.zip)**
- **[Einbauanleitung](components/login-motion/README.md)**
- **[Komponenten-Dateien](components/login-motion)**

<img src="assets/login-motion.png" alt="JD Login Motion: dunkle Login-Karte mit dünnem RGB-Rand" width="360">

### Einbauen

1. `login-card.css` und `login-card.js` in dein Projekt kopieren.
2. Die CSS-Datei einbinden.
3. Den Inhalt von `component.html` an der gewünschten Stelle einfügen.
4. JavaScript mit `defer` einbinden.

```html
<link rel="stylesheet" href="login-card.css">
<script src="login-card.js" defer></script>
```

Das Paket enthält eine einzelne `preview.html` zum direkten Öffnen sowie `example.html` als Einbaubeispiel mit den separaten Dateien. Die genaue Anleitung steht im Komponenten-Ordner.

### Funktionen

- Hover-Erweiterung und Bedienung durch Antippen.
- Animierter RGB-Rand und 3D-Flip.
- Getrennte HTML-, CSS- und JavaScript-Dateien, ohne Bibliotheken.
- Styles mit eigenen Klassen, die keine Elemente außerhalb der Karte verändern.
- Tastaturbedienung, Rücksicht auf reduzierte Bewegung und mehrere unabhängige Karten pro Seite.
- Normale Formulare für die Verbindung mit deinem eigenen System.

Die Komponente liefert die Optik und Effekte. Automatisch getippte Daten, künstlicher Mauszeiger und Matrix-Hintergrund gehören zur Reel-Präsentation.

## Instagram

**[@jd_impact](https://www.instagram.com/jd_impact/)** · JD-Impact

Stichwort für diese Komponente: **LOGIN**.

## Code-Seite aktualisieren

Die statische Seite liegt unter `docs/` und wird über GitHub Pages veröffentlicht. Nach Änderungen an der Login-Komponente den Inhalt der Seite mit `python scripts/build-page.py` aktualisieren. Dabei werden Code, Original-Logo und ZIP aus den vorhandenen Dateien übernommen.
