(() => {
  const files = window.JD_SOURCES;
  const tabs = [...document.querySelectorAll('[data-code-file]')];
  const code = document.getElementById('source-code');
  const status = document.getElementById('copy-status');
  const manual = document.getElementById('manual-copy');
  const manualCode = document.getElementById('manual-code');
  let selected = 'html';

  function renderLine(line) {
    const fragment = document.createDocumentFragment();
    const pattern = /(\/\/.*$|\/\*.*?\*\/|<!--.*?-->)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(?:const|let|class|return|if|else|new|this|true|false|function|async|await|document|window|inert|type|method|name|data)\b)|(\b\d+(?:\.\d+)?\b)/g;
    let previous = 0;
    for (const match of line.matchAll(pattern)) {
      fragment.append(document.createTextNode(line.slice(previous, match.index)));
      const token = document.createElement('span');
      token.className = ['token-comment', 'token-string', 'token-keyword', 'token-number'][match.slice(1).findIndex(value => value !== undefined)];
      token.textContent = match[0];
      fragment.append(token);
      previous = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(line.slice(previous)));
    return fragment;
  }

  function chooseFile(key, focus = false) {
    selected = key;
    const file = files[key];
    tabs.forEach(tab => {
      const active = tab.dataset.codeFile === key;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      if (active && focus) tab.focus();
    });
    document.getElementById('source-panel').setAttribute('aria-labelledby', `tab-${key}`);
    document.getElementById('source-panel').scrollTop = 0;
    document.getElementById('source-panel').scrollLeft = 0;
    document.getElementById('filename').textContent = file.name;
    const lines = file.code.split('\n');
    document.getElementById('line-count').textContent = `${lines.length} ZEILEN`;
    const fragment = document.createDocumentFragment();
    lines.forEach((line, index) => {
      const row = document.createElement('span');
      row.className = 'code-line';
      row.append(renderLine(line));
      fragment.append(row);
      if (index < lines.length - 1) fragment.append(document.createTextNode('\n'));
    });
    code.replaceChildren(fragment);
    status.textContent = 'Datei auswählen, kopieren, einbauen.';
    status.classList.remove('success');
    if (!manual.hidden) manualCode.value = file.code;
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => chooseFile(tab.dataset.codeFile));
    tab.addEventListener('keydown', event => {
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); chooseFile(tabs[next].dataset.codeFile, true); }
    });
  });

  function markCode() {
    manualCode.focus({ preventScroll: true });
    manualCode.select();
    manualCode.setSelectionRange(0, manualCode.value.length);
  }

  document.getElementById('copy-code').addEventListener('click', async () => {
    const file = files[selected];
    let copied = false;
    try {
      if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(file.code); copied = true; }
    } catch {}
    if (!copied) {
      manual.hidden = false;
      manualCode.value = file.code;
      markCode();
      try { copied = document.execCommand('copy'); } catch {}
    }
    if (copied) {
      manual.hidden = true;
      status.textContent = `${file.name} kopiert. Viel Spaß beim Einbauen!`;
      status.classList.add('success');
      document.getElementById('copy-code').focus({ preventScroll: true });
    } else {
      status.textContent = 'Code markiert — über das Textmenü kopieren.';
      status.classList.remove('success');
      manual.scrollIntoView({ block: 'nearest', behavior: 'auto' });
    }
  });
  document.getElementById('manual-mark').addEventListener('click', markCode);
  chooseFile('html');

  const frame = document.getElementById('component-preview');
  const safeScript = source => source.replace(/<\/script/gi, '<\\/script');
  const previewScript = `
    addEventListener('DOMContentLoaded', () => {
    const root = document.querySelector('[data-jd-login]');
    const report = text => parent.postMessage({ type: 'jd-preview-status', text }, '*');
    const updateHint = () => report(root.dataset.mode === 'closed'
      ? 'Hover über „Anmelden“ oder antippen. Dann beginnt die Animation.'
      : root.dataset.mode === 'register'
        ? 'Mit „Login“ zurückdrehen. Die eingegebenen Werte bleiben erhalten.'
        : '„Registrieren“ dreht die Karte. Escape klappt sie wieder ein.');
    new MutationObserver(updateHint).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
    updateHint();
    document.querySelectorAll('form').forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      report('Formular ausgelöst. Hier in der Vorschau werden keine Daten gesendet.');
    }));
    document.querySelector('.jd-login__forgot').addEventListener('click', event => {
      event.preventDefault();
      report('Passwort-Link ausgewählt. Das Ziel bestimmst du in deinem Projekt.');
    });
    addEventListener('message', event => {
      if (event.source !== parent || event.data !== 'jd-preview-reset') return;
      document.querySelectorAll('form').forEach(form => form.reset());
      root.jdLogin.close();
      updateHint();
    });
    }, { once: true });
  `;
  frame.srcdoc = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    ${files.css.code}
    html,body{margin:0;background:transparent;min-height:100%;overflow-x:hidden;color-scheme:dark}
    main{min-height:606px;display:grid;grid-template-columns:minmax(0,1fr);place-items:center;padding:32px 20px;box-sizing:border-box}
    @media(max-width:350px){main{padding-inline:12px}}
    </style></head><body><main>${files.html.code}</main><script>${safeScript(files.js.code)}<\/script><script>${safeScript(previewScript)}<\/script></body></html>`;
  addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.data?.type !== 'jd-preview-status' || typeof event.data.text !== 'string') return;
    document.getElementById('preview-instruction').textContent = event.data.text;
  });
  document.getElementById('reset-preview').addEventListener('click', () => frame.contentWindow.postMessage('jd-preview-reset', '*'));

  const canvas = document.getElementById('matrix');
  const flow = document.getElementById('matrix-flow');
  const ctx = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sourceText = (files.html.code + files.css.code + files.js.code).replace(/\s+/g, ' ');
  let width, height, scale;
  let seed = 2048;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  // Render the original characters once at native device resolution. CSS
  // transforms move the small strips without repainting a full 4K canvas.
  function createStrip(stream) {
    const strip = document.createElement('canvas');
    const length = stream.length * stream.step;
    strip.width = Math.ceil(22 * scale);
    strip.height = Math.ceil((length + 12) * scale);
    const ink = strip.getContext('2d');
    ink.scale(scale, scale);
    ink.font = `${stream.font}px ui-monospace, SFMono-Regular, Consolas, monospace`;
    ink.textAlign = 'center';
    for (let row = 0; row < stream.length; row++) {
      ink.globalAlpha = Math.pow((row + 1) / stream.length, 1.8);
      ink.fillStyle = stream.color;
      const character = sourceText[(stream.position + row) % sourceText.length];
      ink.fillText(character, 11, (row + 1) * stream.step);
    }
    ink.globalAlpha = .95;
    ink.fillStyle = '#e6dfff';
    ink.fillText(sourceText[(stream.position + stream.length - 1) % sourceText.length], 11, length);
    stream.strip = strip;
    stream.height = length + 12;
  }
  function resize() {
    width = innerWidth; height = innerHeight;
    // Native device pixels, including 3840×2160. The memory guard only
    // applies above 32 megapixels (for unusually large/zoomed displays).
    scale = Math.min(devicePixelRatio || 1, Math.sqrt(32000000 / (width * height)));
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const gap = width < 760 ? 30 : 28;
    const fragment = document.createDocumentFragment();
    ctx.clearRect(0, 0, width, height);
    Array.from({ length: Math.ceil(width / gap) }, (_, i) => {
      const stream = {
        x: i * gap + random() * 7,
        y: random() * (height + 340),
        position: Math.floor(random() * sourceText.length),
        length: 9 + Math.floor(random() * 19),
        step: 17, font: 12,
        speed: 28 + random() * 44,
        opacity: .3 + random() * .7,
        color: ['#a78bfa', '#67d9ba', '#7bafff', '#b890df'][i % 4]
      };
      createStrip(stream);
      const distance = height + stream.height;
      const duration = distance / stream.speed;
      const strip = stream.strip;
      // Fade each small strip, avoiding a moving full-screen mask layer.
      const edge = Math.abs(stream.x / width - .5) * 2;
      const opacity = stream.opacity * (width < 760 ? .32 : .5) * (.08 + .92 * Math.pow(edge, 2.2));
      strip.className = 'matrix-stream';
      strip.style.cssText = `left:${stream.x}px;top:${-stream.height}px;width:22px;height:${stream.height}px;opacity:${opacity};--fall-distance:${distance}px;--fall-duration:${duration}s;--fall-delay:${-random() * duration}s`;
      fragment.append(strip);
      // A sharp, complete still frame for reduced-motion preferences.
      ctx.globalAlpha = stream.opacity;
      ctx.drawImage(strip, stream.x, stream.y - stream.height, 22, stream.height);
    });
    ctx.globalAlpha = 1;
    flow.replaceChildren(fragment);
    refreshMotion();
  }
  function refreshMotion() {
    const paused = String(motion.matches || document.hidden);
    canvas.dataset.paused = paused;
    flow.dataset.paused = paused;
  }
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', refreshMotion);
  motion.addEventListener('change', () => { resize(); refreshMotion(); });
  resize(); refreshMotion();
})();
