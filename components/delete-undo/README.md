# Delete Undo · Reel-Vorschau

Die mittig platzierte Karte zerknüllt sich zu Papier. Erst dann erscheint im selben Bereich der Papierkorb und fängt sie auf. Rückgängig spielt den Ablauf zurück und setzt dieselbe Karte wieder ein. Der Matrix-Hintergrund und der Mauszeiger gehören nur zur Reel-Präsentation.

Diese Komponente ist die erste interaktive Vorschau für Reel 004. Die beiden Aktionen funktionieren bereits mit echten DOM-Elementen. Die Gestaltung ist noch zur Ansicht.

CSS laden, `component.html` einfügen und danach `delete-undo.js` laden:

```js
const control = new DeleteUndo(document.querySelector('[data-delete-undo-root]'));
```

Methoden: `remove()`, `undo()`, `reset()` und `setMotion(true/false)`. Die Events `itemremoved` und `itemrestored` liefern das betroffene Element in `event.detail.element`. Wiederholte Klicks während einer Animation werden ignoriert. Die Komponente verwendet die Web Animations API und keine Bibliotheken.

Die vollständige, eigenständig öffnende Reel-Vorschau steht unter `docs/reels/delete-undo/preview/reel.html`. Mit `?autoplay=1` startet der geführte Ablauf. `python scripts/build-delete-preview.py` baut die Vorschau aus den drei Originaldateien; deren Inhalt speist auch den Matrix-Hintergrund.
