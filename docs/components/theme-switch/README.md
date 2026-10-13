# Magnetic Theme Switch

Eine wiederverwendbare Hell-/Dunkel-Komponente: klicken, ziehen oder mit Leertaste / Pfeiltasten bedienen. Der Knopf bewegt sich über Federphysik; die Auswahl wird im Browser gespeichert.

## Direkt ausprobieren
- `example.html`: komplette Demo mit echtem Theme-Wechsel.
- `preview.html`: dieselbe Demo als einzelne HTML-Datei.

## In dein Projekt einbauen
1. `theme-switch.css` und `theme-switch.js` in dein Projekt kopieren.
2. CSS einbinden: `<link rel="stylesheet" href="theme-switch.css">`.
3. Den Inhalt von `component.html` an der gewünschten Stelle einfügen.
4. JavaScript mit `<script src="theme-switch.js" defer></script>` einbinden.
5. Die Farben deiner Seite an `html[data-theme]` anbinden:

```css
:root {
  --background: #f4efe5;
  --foreground: #342a24;
}
:root[data-theme="dark"] {
  --background: #090a12;
  --foreground: #eee9fa;
}
body {
  background: var(--background);
  color: var(--foreground);
  transition: background .4s, color .4s;
}
```

Die Komponente setzt `data-theme="light"` oder `data-theme="dark"` auf dem HTML-Element. Ohne gespeicherte Auswahl nutzt sie die Systemeinstellung. Ohne verfügbaren Local Storage funktioniert das Umschalten weiterhin. Eine Switch-Komponente pro Seite ist vorgesehen.

## Eigene Reaktionen anbinden

```js
const toggle = document.querySelector('[data-theme-switch]');
toggle.addEventListener('themechange', event => {
  console.log(event.detail.theme); // "light" oder "dark"
});
// Nach der Initialisierung auch programmatisch nutzbar:
toggle.jdThemeSwitch.setTheme('dark');
```


Die Vorlage startet mit Animationen. Entferne `data-jd-motion="full"`, um die Systemeinstellung für reduzierte Bewegung zu übernehmen. `toggle.jdThemeSwitch.setMotion(false)` pausiert die Federbewegung.
