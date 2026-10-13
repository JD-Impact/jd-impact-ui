# JD Login Motion

Animierte Login-/Registrierungs-Optik mit Hover-Erweiterung, dünnem RGB-Rand, 3D-Flip und modernem Checkbox-Design. Reines HTML, CSS und JavaScript, ohne Bibliotheken.

## Dateien

- `component.html`: ausschließlich die Login-Karte zum Kopieren.
- `login-card.css`: Komponenten-Styles mit eigenen `jd-login`-Klassen.
- `login-card.js`: Hover, Öffnen, Schließen, Flip und Tastaturbedienung.
- `example.html`: vollständiges Einbaubeispiel mit den separaten Dateien.
- `preview.html`: dieselbe Vorschau als einzelne HTML-Datei zum direkten Öffnen.

Die ursprünglichen Reel-Effekte wie Code-Matrix, automatisches Tippen und künstlicher Mauszeiger gehören zur Reel-Präsentation. Sie sind nicht Teil des einbaubaren Komponenten-Codes.

## In eine Website einbauen

1. `login-card.css` und `login-card.js` in dein Projekt kopieren.
2. Im `<head>` die CSS-Datei laden:

```html
<link rel="stylesheet" href="login-card.css">
```

3. Den Inhalt von `component.html` dort einfügen, wo die Karte stehen soll.
4. Die JavaScript-Datei laden:

```html
<script src="login-card.js" defer></script>
```

Die Karte initialisiert sich automatisch. Kopiere das vollständige HTML inklusive `jd-login-stage`: Dieser Rahmen reserviert den Platz für die Animation, damit deine Seite nicht beim Öffnen oder Flip verrutscht. Er ist bis zu 400 Pixel breit und normalerweise 660 Pixel hoch. Auf schmalen Bildschirmen passt er sich der verfügbaren Breite an. Login und Registrierung sind gleich breit; die Registrierung wächst nach unten, während ihre Oberkante am selben Platz bleibt.

## Eigene Formulare verbinden

Wir liefern Optik und Effekte. Die Formulare nutzen normale HTML-Formularfelder und normale `submit`-Events. Das Komponenten-JavaScript fängt das Absenden nicht ab.

Passe die beiden `action`-Attribute und den Passwort-Link an deine vorhandenen Routen an:

```html
<form data-login-form="login" method="post" action="/deine-login-route">
<form data-login-form="register" method="post" action="/deine-registrierungs-route">
<a class="jd-login__forgot" href="/deine-passwort-route">Passwort vergessen?</a>
```

Das sind einzelne Zeilen innerhalb des vorhandenen Snippets, keine zusätzlichen Formulare. Die ausgelieferten `/login`, `/register` und `/forgot-password` sind Beispiel-Routen.

Feldnamen: Login `username`, `password`, optional `remember`; Registrierung `username`, `email`, `password`. Eine nicht angehakte Checkbox wird wie üblich nicht mitgesendet. Passe Namen bei Bedarf an dein System an und ergänze dessen weitere Formularfelder.

Wenn dein Projekt Formulare bereits über JavaScript verarbeitet, binde deinen vorhandenen Submit-Handler direkt an `[data-login-form="login"]` bzw. `[data-login-form="register"]`. Beispielsweise:

```js
const card = document.querySelector('[data-jd-login]');
const form = card.querySelector('[data-login-form="login"]');
form.addEventListener('submit', event => {
  event.preventDefault();
  const fields = new FormData(form);
  // Hier deinen vorhandenen Formular-Handler mit fields aufrufen.
});
```

Keine Zugangsdaten werden von der Komponente gespeichert, automatisch eingefügt oder selbst an einen Server geschickt. Beim normalen Absenden sendet der Browser die Formularfelder an deine konfigurierte `action`-Route.

## Texte und Design anpassen

Überschriften, Beschriftungen, Platzhalter und Links stehen in `component.html`. Farben und Abstände stehen in `login-card.css`. Die Karte vergrößert ihre Höhe bei zusätzlichen oder längeren Formularinhalten automatisch.

Die Komponenten-Styles ändern keine allgemeinen Seiten-, Button- oder Überschriften-Styles außerhalb der Karte. Lade die Komponentendatei nach allgemeinen CSS-Resets. Bestehende Host-Styles mit höherer Spezifität oder `!important` können weiterhin Vorrang haben.

## Bedienung

- Desktop: Hover öffnet den Login. Ohne Fokus schließt er nach Verlassen mit kurzer Verzögerung.
- Smartphone: Antippen öffnet den Login.
- Registrieren / Login: Wechsel zwischen den beiden Seiten mit 3D-Flip.
- Escape: Karte schließen, Fokus auf den Öffnen-Button zurückgeben.
- Formularwerte bleiben beim Schließen und Wiederöffnen erhalten.
- Passwortmanager-Autofill und normale Browser-Formularprüfung sind aktiviert.
- Inaktive Formularseiten sind für Tastatur und Screenreader ausgeblendet.
- Bei reduzierter Bewegung werden die Animationen deaktiviert.
- In den Vorschauen kannst du sie über „Animationen abspielen“ ausdrücklich einschalten. In deinem Projekt folgt die Komponente standardmäßig der Systemeinstellung. Optional erlaubt `data-jd-motion="full"` am Element mit `data-jd-login` Animationen; `data-jd-motion="reduced"` pausiert sie.

## Mehrere Karten und dynamische Inhalte

Mehrere Karten auf derselben Seite sind möglich. IDs und Label-Verknüpfungen werden pro Karte erzeugt. Später eingefügte Karten initialisierst du selbst:

```js
const root = document.querySelector('[data-jd-login]');
const card = new JDLoginCard(root);
card.open();
card.setMode('register', { focus: true });
card.close();
// Beim Entfernen einer Karte aus der Seite:
card.destroy();
```

Die automatisch initialisierte Instanz erreichst du über `root.jdLogin`. In React, Vue oder ähnlichen Frameworks die Instanz nach dem Rendern initialisieren und beim Entfernen `destroy()` aufrufen; es handelt sich um eine Vanilla-JavaScript-Komponente.

## Vorschau

`example.html` und `preview.html` verhindern ausschließlich in ihrem Beispiel-Script das Absenden und zeigen „Formular ausgelöst“. Das verhindert eine Navigation zu den Beispiel-Routen beim lokalen Ausprobieren. Dieser Vorschau-Handler gehört nicht in dein echtes Projekt; der eigentliche Komponenten-Code enthält ihn nicht.

Die Website-Vorschau lädt genau die `example.html`, `login-card.css` und `login-card.js` aus diesem Paket. Der Parameter `?embed=1` blendet lediglich das Logo und die Bedienleiste der Beispielseite aus. Er verändert die Karte nicht.
