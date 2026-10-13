"""Build the downloadable examples and ZIP from one component source."""
from pathlib import Path
import base64
import hashlib
import re
import zipfile

root = Path(__file__).resolve().parents[1]
component = root / 'components' / 'login-motion'
logo_file = root / 'docs' / 'jd-logo.jpg'
if logo_file.exists():
    logo = base64.b64encode(logo_file.read_bytes()).decode()
else:
    logo = re.search(r'data:image/jpeg;base64,([^"\s]+)', (component / 'preview.html').read_text()).group(1)
html = (component / 'component.html').read_text()
css = (component / 'login-card.css').read_text()
js = (component / 'login-card.js').read_text()

host_css = '''
html{color-scheme:dark}body{margin:0;background:#050609;color:#f4f5f7;font-family:Arial,Helvetica,sans-serif}
.page-stage{min-height:100svh;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr);place-items:center;padding:100px 20px 80px}
.page-brand{position:absolute;top:24px;left:32px;width:46px;height:64px;overflow:hidden;mix-blend-mode:screen;pointer-events:none}
.page-brand img{position:absolute;left:50%;top:50%;width:148px;height:148px;max-width:none;transform:translate(-50%,-50%)}
.page-motion{position:absolute;top:38px;right:28px;border:1px solid #b9a0ff30;background:#b9a0ff0c;color:#c8b6e9;border-radius:999px;padding:10px 14px;font:11px Arial,sans-serif;cursor:pointer}
.page-note{position:absolute;bottom:26px;left:20px;right:20px;text-align:center;color:#8991a0;font-size:10px;line-height:1.6;margin:0}
body[data-embed]{background:transparent}body[data-embed] .page-stage{padding:20px}
body[data-embed] .page-brand,body[data-embed] .page-note,body[data-embed] .page-motion{display:none}
@media(max-width:350px){.page-stage{padding-inline:12px}}
'''
helper = '''
if (new URLSearchParams(location.search).has('embed')) document.body.dataset.embed = '';
addEventListener('DOMContentLoaded', () => {
  const root = document.querySelector('[data-jd-login]');
  const note = document.querySelector('.page-note');
  const toggle = document.querySelector('.page-motion');
  const report = text => {
    note.textContent = text;
    if (parent !== window) parent.postMessage({ type: 'jd-preview-status', text }, '*');
  };
  const hint = () => report(root.dataset.mode === 'closed'
    ? 'Hover über „Anmelden“ oder antippen. Dann beginnt die Animation.'
    : root.dataset.mode === 'register'
      ? 'Mit „Login“ zurückdrehen. Die Karte bleibt an derselben Stelle.'
      : '„Registrieren“ dreht die Karte. Escape klappt sie wieder ein.');
  new MutationObserver(hint).observe(root, { attributes: true, attributeFilter: ['data-mode'] });
  let enabled = true;
  const applyMotion = enabled => {
    root.dataset.jdMotion = enabled ? 'full' : 'reduced';
    toggle.setAttribute('aria-pressed', String(enabled));
    toggle.textContent = enabled ? 'Animationen an' : 'Animationen abspielen';
  };
  applyMotion(enabled);
  toggle.addEventListener('click', () => { enabled = !enabled; applyMotion(enabled); });
  document.querySelectorAll('form').forEach(form => form.addEventListener('submit', event => {
    event.preventDefault();
    report('Formular ausgelöst. Hier in der Vorschau werden keine Daten gesendet.');
  }));
  document.querySelector('.jd-login__forgot').addEventListener('click', event => {
    event.preventDefault(); report('Passwort-Link ausgewählt. Das Ziel bestimmst du in deinem Projekt.');
  });
  addEventListener('message', event => {
    if (event.source !== parent) return;
    if (event.data === 'jd-preview-reset') {
      document.querySelectorAll('form').forEach(form => form.reset());
      root.jdLogin.close(); hint();
    }
    if (event.data?.type === 'jd-preview-motion' && typeof event.data.enabled === 'boolean') { enabled = event.data.enabled; applyMotion(enabled); }
  });
  hint();
}, { once: true });
'''

def script(source):
    return re.sub(r'</script', r'<\/script', source, flags=re.I)

for filename, standalone in [('example.html', False), ('preview.html', True)]:
    css_revision = hashlib.sha256(css.encode()).hexdigest()[:12]
    js_revision = hashlib.sha256(js.encode()).hexdigest()[:12]
    styles = '<style>' + css + '</style>' if standalone else f'<link rel="stylesheet" href="login-card.css?v={css_revision}">'
    core_script = '<script>' + script(js) + '</script>' if standalone else f'<script src="login-card.js?v={js_revision}"></script>'
    document = f'''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>JD — Login Motion</title>{styles}<style>{host_css}</style></head><body>
<div class="page-brand"><img src="data:image/jpeg;base64,{logo}" alt="JD-Impact"></div>
<button class="page-motion" type="button" aria-pressed="true">Animationen an</button>
<main class="page-stage">{html}</main>
<p class="page-note" role="status" aria-live="polite"></p>
{core_script}<script>{script(helper)}</script></body></html>
'''
    (component / filename).write_text(document)

archive = root / 'downloads' / 'jd-login-component.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED) as zipped:
    for name in ['component.html', 'login-card.css', 'login-card.js', 'README.md', 'example.html', 'preview.html']:
        entry = zipfile.ZipInfo('jd-login-component/' + name, date_time=(2026, 10, 13, 0, 0, 0))
        entry.compress_type = zipfile.ZIP_DEFLATED
        entry.external_attr = 0o644 << 16
        zipped.writestr(entry, (component / name).read_bytes())
with zipfile.ZipFile(archive) as zipped:
    assert zipped.testzip() is None
print('Examples and ZIP built from the same HTML/CSS/JS.')
