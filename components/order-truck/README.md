# Order Truck · JD-Impact

Ein Bestell-Button: LKW kommt mit geschlossener Heckklappe an, hält, öffnet und senkt die Ladebühne. Das Paket rollt auf die Bühne, wird angehoben und in den Laderaum geschoben. Die Heckklappe schließt sich; erst dann fährt der LKW los. Keine Bibliotheken.

## Ausprobieren

`example.html` im Browser öffnen. `preview.html` ist dieselbe Komponente als einzelne HTML-Datei. Ohne `confirm` läuft nur eine Demo, es wird nichts gekauft.

## Einbauen

1. `order-truck.css` laden.
2. `component.html` an der gewünschten Stelle einfügen.
3. `order-truck.js` laden und initialisieren:

```html
<script src="order-truck.js"></script>
<script>
const order = new OrderTruck(document.querySelector('[data-order-truck]'), {
  confirm: async () => {
    // Hier dein eigenes Bestellsystem aufrufen und die Antwort prüfen.
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({cartId: 'DEIN_WARENKORB'})
    });
    if (!response.ok) throw new Error('Bestellung nicht bestätigt');
    return response.json();
  }
});
</script>
```

Die Animation startet erst, wenn `confirm` erfolgreich aufgelöst wurde. Ablehnen/Fehler zeigt „Erneut versuchen“. Das Beispiel ersetzt keine Bezahlung oder Shop-Logik. Die LKW-Szene ist eine visuelle Bestellbestätigung, kein tatsächlicher Versandstatus.

`order.reset()` setzt den Effekt zurück, `order.setMotion(false)` reduziert Bewegung, `order.destroy()` entfernt Listener und Timer. Events: `orderanimationstart`, `ordercomplete` (`detail.demo`, `detail.result`), `ordererror`. Während der Bestätigung und Animation werden weitere Klicks blockiert. Die reine Vorschau ist nach Abschluss direkt erneut anklickbar. Mit `confirm` bleibt eine bestätigte Bestellung gesperrt, damit kein zweiter Kauf ausgelöst wird. Reset verwirft verspätete UI-Antworten, storniert aber keine bereits an deinen Server gesendete Bestellung.

Breite über `.jd-order`, Akzentfarbe über `--order-accent` anpassen. Tastatur und reduzierte Bewegung sind berücksichtigt.
