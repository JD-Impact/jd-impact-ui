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
    document.getElementById('filename').dataset.folder = files.id;
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
  frame.src = files.preview + '?embed=1&v=' + files.revision;
  document.getElementById('reset-preview').addEventListener('click', () => frame.contentWindow.postMessage('jd-preview-reset', '*'));
  motionButton.addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    refreshMotion();
    syncPreviewMotion();
  });

  function refreshMotion() {
    document.documentElement.dataset.jdMotion = motionEnabled ? 'full' : 'reduced';
    motionButton.setAttribute('aria-pressed', String(motionEnabled));
    motionButton.setAttribute('aria-label', motionEnabled ? 'Animationen pausieren' : 'Animationen abspielen');
    motionButton.querySelector('span').textContent = motionEnabled ? 'Animationen an' : 'Abspielen';
    motionButton.querySelector('path').setAttribute('d', motionEnabled ? 'M8 5v14M16 5v14' : 'M8 5l11 7-11 7Z');
    packageForge?.setMotion(motionEnabled);
    document.dispatchEvent(new CustomEvent('jd-motion', {detail:{enabled:motionEnabled}}));
  }
  const mount = document.querySelector('#download-zone [data-download-forge]');
  const packageForge = mount ? new DownloadForge(mount, {url:files.archive,filename:files.archiveName,label:'ZIP herunterladen',minimumDuration:0}) : null;
  mount?.addEventListener('forgestart', () => {
    document.getElementById('download-zone').classList.add('is-active');
    const promo=document.querySelector('.download-crosspromo');
    promo.inert=false;promo.setAttribute('aria-hidden','false');
  });
  const fallback=document.getElementById('direct-zip');if(fallback){fallback.href=files.archive;fallback.download=files.archiveName;}
  refreshMotion();
})();
