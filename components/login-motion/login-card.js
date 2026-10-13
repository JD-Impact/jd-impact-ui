/* JD Login Motion: UI and effects. Forms submit normally to your own endpoints. */
(() => {
  let instanceCount = 0;

  class JDLoginCard {
    constructor(root) {
      if (root.jdLogin) return root.jdLogin;
      this.root = root;
      this.opener = root.querySelector('[data-login-open]');
      this.panels = [...root.querySelectorAll('[data-login-panel]')];
      this.faces = [...root.querySelectorAll('[data-login-face]')];
      this.mode = 'closed';
      this.closeTimer = null;
      this.focusTimer = null;
      this.events = new AbortController();
      const id = `jd-login-${++instanceCount}`;

      root.querySelectorAll('[data-login-field]').forEach(input => {
        input.id = `${id}-${input.dataset.loginField}`;
        const label = root.querySelector(`[data-login-label="${input.dataset.loginField}"]`);
        if (label) label.htmlFor = input.id;
      });
      this.panels.forEach(panel => { panel.id = `${id}-${panel.dataset.loginPanel}`; });
      this.opener.setAttribute('aria-controls', `${id}-login`);

      const on = (element, event, listener) => element.addEventListener(event, listener, { signal: this.events.signal });
      on(root, 'pointerenter', event => {
        clearTimeout(this.closeTimer);
        if (event.pointerType === 'mouse' && this.mode === 'closed') this.open();
      });
      on(root, 'pointerleave', event => {
        if (event.pointerType !== 'mouse') return;
        this.scheduleClose();
      });
      on(root, 'pointermove', event => {
        const bounds = root.getBoundingClientRect();
        root.style.setProperty('--jd-login-mx', `${(event.clientX - bounds.left) / bounds.width * 100}%`);
        root.style.setProperty('--jd-login-my', `${(event.clientY - bounds.top) / bounds.height * 100}%`);
      });
      on(this.opener, 'click', () => this.open({ focus: true }));
      root.querySelectorAll('[data-login-switch]').forEach(button => {
        on(button, 'click', () => this.setMode(button.dataset.loginSwitch, { focus: true }));
      });
      on(root, 'focusin', () => clearTimeout(this.closeTimer));
      on(root, 'focusout', () => this.scheduleClose());
      on(root, 'keydown', event => {
        if (event.key === 'Escape' && this.mode !== 'closed') {
          event.preventDefault();
          this.close({ focus: true });
        }
      });

      this.observer = new ResizeObserver(() => this.measure());
      this.panels.forEach(panel => this.observer.observe(panel));
      root.jdLogin = this;
      this.sync();
      this.measure();
    }

    measure() {
      this.panels.forEach(panel => {
        const mode = panel.dataset.loginPanel;
        const minimum = mode === 'login' ? 446 : 536;
        this.root.style.setProperty(`--jd-login-${mode}-height`, `${Math.max(minimum, Math.ceil(panel.scrollHeight))}px`);
      });
    }

    sync() {
      const open = this.mode !== 'closed';
      const register = this.mode === 'register';
      this.root.dataset.mode = this.mode;
      this.root.classList.toggle('jd-login--open', open);
      this.root.classList.toggle('jd-login--register', register);
      this.opener.setAttribute('aria-expanded', String(open));
      this.opener.inert = open;
      this.opener.tabIndex = open ? -1 : 0;
      this.panels.forEach(panel => {
        const active = panel.dataset.loginPanel === this.mode;
        panel.inert = !active;
        panel.setAttribute('aria-hidden', String(!active));
      });
      this.faces.forEach(face => {
        const active = face.dataset.loginFace === 'login' ? !register : register;
        face.inert = !active;
        face.setAttribute('aria-hidden', String(!active));
      });
    }

    setMode(mode, { focus = false } = {}) {
      if (!['closed', 'login', 'register'].includes(mode)) return;
      clearTimeout(this.closeTimer);
      clearTimeout(this.focusTimer);
      this.mode = mode;
      this.sync();
      this.measure();
      if (focus) {
        if (mode === 'closed') this.opener.focus();
        else {
          const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
          this.focusTimer = setTimeout(() => {
            this.root.querySelector(`[data-login-panel="${mode}"] input`)?.focus({ preventScroll: true });
          }, reduceMotion ? 0 : 950);
        }
      }
    }

    open(options) { this.setMode('login', options); }
    close(options) { this.setMode('closed', options); }

    scheduleClose() {
      clearTimeout(this.closeTimer);
      this.closeTimer = setTimeout(() => {
        if (this.mode === 'login' && !this.root.matches(':hover') && !this.root.contains(document.activeElement)) this.close();
      }, 1200);
    }

    destroy() {
      clearTimeout(this.closeTimer);
      clearTimeout(this.focusTimer);
      this.events.abort();
      this.observer.disconnect();
      this.close();
      delete this.root.jdLogin;
    }
  }

  window.JDLoginCard = JDLoginCard;
  const initialize = () => document.querySelectorAll('[data-jd-login]').forEach(root => new JDLoginCard(root));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initialize, { once: true });
  else initialize();
})();
