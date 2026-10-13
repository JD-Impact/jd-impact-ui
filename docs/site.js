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
    root.jdLogin.open();
    document.querySelectorAll('form').forEach(form => form.addEventListener('submit', event => {
      event.preventDefault();
      document.querySelector('[data-preview-status]').textContent = 'Formular ausgelöst.';
    }));
    document.querySelector('.jd-login__forgot').addEventListener('click', event => {
      event.preventDefault();
      document.querySelector('[data-preview-status]').textContent = 'Passwort-Link ausgewählt.';
    });
    addEventListener('message', event => {
      if (event.source !== parent || event.data !== 'jd-preview-reset') return;
      document.querySelectorAll('form').forEach(form => form.reset());
      document.querySelector('[data-preview-status]').textContent = '';
      root.jdLogin.open();
    });
    }, { once: true });
  `;
  frame.srcdoc = `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
    ${files.css.code}
    html,body{margin:0;background:transparent;min-height:100%;overflow-x:hidden;color-scheme:dark}
    main{min-height:606px;display:grid;grid-template-columns:minmax(0,1fr);place-items:center;padding:32px 20px;box-sizing:border-box}
    [data-preview-status]{position:absolute;bottom:5px;left:15px;right:15px;text-align:center;color:#bca4d8;font:10px Arial,sans-serif;margin:0}
    @media(max-width:350px){main{padding-inline:12px}}
    </style></head><body><main>${files.html.code}</main><p data-preview-status role="status" aria-live="polite"></p><script>${safeScript(files.js.code)}<\/script><script>${safeScript(previewScript)}<\/script></body></html>`;
  document.getElementById('reset-preview').addEventListener('click', () => frame.contentWindow.postMessage('jd-preview-reset', '*'));

  const canvas = document.getElementById('matrix');
  const ctx = canvas.getContext('2d', { alpha: false });
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const sourceText = files.css.code + files.js.code;
  let width, height, columns, drops, last = 0, raf = 0;
  let seed = 2048;
  const random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  function resize() {
    width = innerWidth; height = innerHeight;
    const scale = Math.min(devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.fillStyle = '#08090f'; ctx.fillRect(0, 0, width, height);
    columns = Math.ceil(width / 23);
    drops = Array.from({ length: columns }, (_, i) => ({ y: random() * height, position: Math.floor(random() * sourceText.length), speed: 20 + random() * 30, color: ['#70558b', '#365b52', '#465d74'][i % 3] }));
    if (motion.matches) { for (let i = 0; i < 28; i++) draw(.25); }
  }
  function draw(dt) {
    ctx.fillStyle = '#08090f24'; ctx.fillRect(0, 0, width, height);
    ctx.font = '10px ui-monospace, monospace';
    drops.forEach((drop, index) => {
      ctx.fillStyle = drop.color;
      const text = sourceText[drop.position % sourceText.length];
      ctx.fillText(text === '\n' ? ';' : text, index * 23, drop.y);
      drop.y += drop.speed * dt;
      drop.position++;
      if (drop.y > height + 30) drop.y = -random() * 250;
    });
  }
  function animate(time) {
    raf = requestAnimationFrame(animate);
    if (time - last < 55) return;
    draw(Math.min((time - last) / 1000 || .055, .1)); last = time;
  }
  function refreshMotion() {
    cancelAnimationFrame(raf); last = 0;
    canvas.dataset.paused = String(motion.matches || document.hidden);
    if (!motion.matches && !document.hidden) raf = requestAnimationFrame(animate);
  }
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', refreshMotion);
  motion.addEventListener('change', () => { resize(); refreshMotion(); });
  resize(); refreshMotion();
})();
