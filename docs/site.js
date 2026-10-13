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
  const motionButton = document.getElementById('toggle-motion');
  let motionEnabled = true;
  const animationsEnabled = () => motionEnabled;
  const syncPreviewMotion = () => frame.contentWindow?.postMessage({ type: 'jd-preview-motion', enabled: animationsEnabled() }, '*');
  addEventListener('message', event => {
    if (event.source !== frame.contentWindow || event.data?.type !== 'jd-preview-status' || typeof event.data.text !== 'string') return;
    document.getElementById('preview-instruction').textContent = event.data.text;
  });
  frame.addEventListener('load', syncPreviewMotion);
  // The actual example from the ZIP, with the same external CSS and JS.
  frame.src = 'components/login-motion/example.html?embed=1&v=' + files.revision;
  document.getElementById('reset-preview').addEventListener('click', () => frame.contentWindow.postMessage('jd-preview-reset', '*'));
  motionButton.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    refreshMotion();
    syncPreviewMotion();
  });

  const canvas = document.getElementById('matrix');
  const flow = document.getElementById('matrix-flow');
  const ctx = canvas.getContext('2d');
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
    const gap = width < 760 ? 28 : 26;
    const fragment = document.createDocumentFragment();
    ctx.clearRect(0, 0, width, height);
    Array.from({ length: Math.ceil(width / gap) }, (_, i) => {
      const stream = {
        x: i * gap + random() * 7,
        y: random() * (height + 340),
        position: Math.floor(random() * sourceText.length),
        length: 14 + Math.floor(random() * 20),
        step: 18, font: 13,
        speed: 38 + random() * 42,
        opacity: .3 + random() * .7,
        color: ['#53ffd0', '#52caff', '#a184ff', '#ee76ef', '#ffc477'][i % 5]
      };
      createStrip(stream);
      const distance = height + stream.height;
      const duration = distance / stream.speed;
      const strip = stream.strip;
      // Fade each small strip, avoiding a moving full-screen mask layer.
      const edge = Math.abs(stream.x / width - .5) * 2;
      const opacity = stream.opacity * (width < 760 ? .7 : .9) * (.25 + .75 * Math.pow(edge, 1.8));
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
    const enabled = animationsEnabled();
    document.documentElement.dataset.jdMotion = enabled ? 'full' : 'reduced';
    motionButton.setAttribute('aria-pressed', String(enabled));
    motionButton.setAttribute('aria-label', enabled ? 'Animationen pausieren' : 'Animationen abspielen');
    motionButton.querySelector('span').textContent = enabled ? 'Animationen an' : 'Abspielen';
    motionButton.querySelector('path').setAttribute('d', enabled ? 'M8 5v14M16 5v14' : 'M8 5l11 7-11 7Z');
    const paused = String(!enabled || document.hidden);
    canvas.dataset.paused = paused;
    flow.dataset.paused = paused;
  }
  addEventListener('resize', resize, { passive: true });
  document.addEventListener('visibilitychange', refreshMotion);
  resize(); refreshMotion();
})();
