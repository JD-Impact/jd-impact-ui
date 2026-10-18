/* Order Truck — a reusable visual confirmation. No payment or order is created here. */
class OrderTruck {
  constructor(root, options = {}) {
    this.root = root; this.options = options; this.state = 'idle'; this.operation = 0; this.destroyed = false;
    this.button = root.querySelector('[data-order-trigger]'); this.label = root.querySelector('[data-order-label]');
    this.status = root.querySelector('[data-order-status]'); this.success = root.querySelector('[data-order-success]');
    this.initialLabel = this.label.innerHTML; this.timer = null;
    this.onClick = () => this.run(); this.button.addEventListener('click', this.onClick);
    root.jdOrderTruck = this; this.reset();
  }
  setState(state) {
    this.state = state; this.root.dataset.state = state;
    this.button.disabled = (['pending','running'].includes(state) || (state === 'complete' && Boolean(this.options.confirm)));
    this.root.setAttribute('aria-busy', String(['pending','running'].includes(state)));
  }
  setMotion(enabled) {
    this.root.dataset.jdMotion = enabled ? 'full' : 'reduced';
    if (!enabled && this.state === 'running') { clearTimeout(this.timer); this.finish?.(); }
  }
  reset() {
    clearTimeout(this.timer); this.operation++; this.setState('idle');
    this.label.innerHTML = this.initialLabel; this.status.textContent = ''; this.button.removeAttribute('aria-label');
  }
  async run() {
    if (this.destroyed || ['pending','running'].includes(this.state) || (this.state === 'complete' && this.options.confirm)) return false;
    this.reset(); const operation = this.operation; let result;
    if (this.options.confirm) {
      this.setState('pending'); this.label.textContent = 'Wird bestätigt …';
      try { result = await this.options.confirm(); if (result === false) throw Error('Order rejected'); }
      catch {
        if (this.destroyed || operation !== this.operation) return false;
        this.setState('error'); this.label.textContent = 'Erneut versuchen ↗';
        this.status.textContent = 'Bestellung nicht bestätigt. Bitte erneut versuchen.';
        this.root.dispatchEvent(new CustomEvent('ordererror', {bubbles:true})); return false;
      }
    }
    if (this.destroyed || operation !== this.operation) return false;
    this.success.textContent = 'Bestellung bestätigt';
    this.status.textContent = ''; void this.root.offsetWidth; this.setState('running');
    this.root.dispatchEvent(new CustomEvent('orderanimationstart', {bubbles:true}));
    const reduced = this.root.dataset.jdMotion === 'reduced' || matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.finish = () => {
      if (this.destroyed || operation !== this.operation) return;
      this.setState('complete'); this.status.textContent = '';
      this.button.setAttribute('aria-label', 'Bestellung bestätigt');
      this.root.dispatchEvent(new CustomEvent('ordercomplete', {bubbles:true, detail:{demo:!this.options.confirm, result}}));
    };
    this.timer = setTimeout(this.finish, reduced ? 100 : 8200);
    return true;
  }
  destroy() { this.destroyed = true; this.operation++; clearTimeout(this.timer); this.button.removeEventListener('click', this.onClick); delete this.root.jdOrderTruck; }
}
window.OrderTruck = OrderTruck;
