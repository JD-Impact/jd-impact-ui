/* Copy Button — real clipboard writes with an honest manual fallback. */
class CopyButton {
  constructor(root, options = {}) {
    this.root = root; this.options = options; this.state = 'idle'; this.destroyed = false; this.operation = 0; this.timer = null;
    this.value = root.querySelector('[data-copy-value]'); this.button = root.querySelector('[data-copy-trigger]');
    this.label = root.querySelector('[data-copy-label]'); this.status = root.querySelector('[data-copy-status]');
    this.fallback = root.querySelector('[data-copy-fallback]'); this.manual = root.querySelector('[data-copy-manual]');
    this.onClick = () => this.copy(); this.button.addEventListener('click', this.onClick);
    this.reset(); root.jdCopy = this;
  }
  getText() { return String(typeof this.options.text === 'function' ? this.options.text() : this.options.text ?? this.value.textContent); }
  setText(text) { this.options.text = String(text); this.value.textContent = this.options.text; this.reset(); }
  setState(state) { this.state = state; this.root.dataset.state = state; this.button.disabled = state === 'copying'; this.root.setAttribute('aria-busy', String(state === 'copying')); }
  setMotion(enabled) { this.root.dataset.jdMotion = enabled ? 'full' : 'reduced'; }
  reset() {
    clearTimeout(this.timer); this.timer = null; this.operation++;
    this.setState('idle'); this.label.textContent = this.options.label || 'Kopieren'; this.status.textContent = ''; this.fallback.hidden = true;
  }
  async writeText(text) {
    if (navigator.clipboard?.writeText) { try { await navigator.clipboard.writeText(text); return true; } catch {} }
    const active = document.activeElement; const field = document.createElement('textarea');
    field.value = text; field.setAttribute('readonly', ''); field.style.cssText = 'position:fixed;left:0;top:0;opacity:0;pointer-events:none';
    document.body.append(field); field.focus({preventScroll:true}); field.select();
    try { return document.execCommand('copy') === true; } catch { return false; }
    finally { field.remove(); active?.focus?.({preventScroll:true}); }
  }
  async copy() {
    if (this.destroyed || this.state === 'copying') return false;
    this.reset(); const operation = this.operation;
    // Commit the idle style so a quick second click restarts the scan.
    void this.root.offsetWidth;
    this.setState('copying'); this.label.textContent = 'Kopiere …';
    let text, copied = false;
    try { text = this.getText(); copied = await this.writeText(text); } catch {}
    if (this.destroyed || operation !== this.operation) return false;
    if (copied) {
      this.setState('copied'); this.label.textContent = 'Kopiert'; this.status.textContent = 'In deiner Zwischenablage.';
      this.root.dispatchEvent(new CustomEvent('copycomplete', {bubbles:true, detail:{text}}));
      this.timer = setTimeout(() => this.reset(), this.options.resetDelay ?? 2200); return true;
    }
    this.setState('error'); this.label.textContent = 'Erneut versuchen'; this.status.textContent = 'Kopieren blockiert. Text unten markieren.';
    this.manual.value = text ?? this.value.textContent; this.fallback.hidden = false;
    this.root.dispatchEvent(new CustomEvent('copyerror', {bubbles:true})); return false;
  }
  destroy() { this.destroyed = true; this.operation++; clearTimeout(this.timer); this.button.removeEventListener('click', this.onClick); delete this.root.jdCopy; }
}
window.CopyButton = CopyButton;
