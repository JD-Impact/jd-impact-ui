# Order Truck · JD-Impact

Ein Bestell-Button: LKW kommt an, Paket fährt über die Rampe ins offene Heck, Rolltor schließt sich, Licht geht an und der LKW fährt los. Keine Bibliotheken.

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

`order.reset()` setzt den Effekt zurück, `order.setMotion(false)` reduziert Bewegung, `order.destroy()` entfernt Listener und Timer. Events: `orderanimationstart`, `ordercomplete` (`detail.demo`, `detail.result`), `ordererror`. Während der Bestätigung und Animation werden weitere Klicks blockiert. Reset verwirft verspätete UI-Antworten, storniert aber keine bereits an deinen Server gesendete Bestellung.

Breite über `.jd-order`, Akzentfarbe über `--order-accent` anpassen. Die SVG-Verlaufs-ID `jd-truck-metal` beim mehrfachen Einfügen pro Instanz eindeutig umbenennen. Tastatur und reduzierte Bewegung sind berücksichtigt.
