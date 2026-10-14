"""Publish examples, source views and archives from the reusable components."""
from pathlib import Path
import base64, hashlib, json, re, shutil, subprocess, sys, zipfile

root = Path(__file__).resolve().parents[1]
docs = root / 'docs'
subprocess.run([sys.executable, str(root / 'scripts/build-layout.py')], check=True)
subprocess.run([sys.executable, str(root / 'scripts/build-page.py')], check=True)
logo = base64.b64encode((docs / 'jd-logo.jpg').read_bytes()).decode()
catalog = [
    ('download-forge', 'forge.css', 'forge.js', 'forge-source.js', 'jd-download-forge-component.zip'),
    ('theme-switch', 'theme-switch.css', 'theme-switch.js', 'switch-source.js', 'jd-theme-switch-component.zip'),
]
host = '''html{color-scheme:dark}body{margin:0;background:#08090f;color:#f2effa;font-family:Arial,sans-serif}
.page-stage{min-height:100svh;display:grid;grid-template-columns:minmax(0,1fr);place-items:center;padding:80px 20px;box-sizing:border-box}
.page-brand{position:absolute;top:24px;left:24px;width:38px;height:52px;overflow:hidden}.page-brand img{width:120px;height:120px;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);mix-blend-mode:screen}
.page-note{position:absolute;bottom:24px;left:20px;right:20px;text-align:center;font-size:11px;color:#9685a7;line-height:1.6}
body[data-embed]{background:transparent}body[data-embed] .page-stage{padding:20px}body[data-embed] .page-brand,body[data-embed] .page-note{display:none}
.theme-example{text-align:center;display:grid;justify-items:center;gap:32px;width:100%;max-width:380px}.theme-example h2{font:500 26px Arial,sans-serif;letter-spacing:-1px;margin:0}.theme-surface{padding:24px;width:100%;border:1px solid #bea1ff22;border-radius:18px;background:#14111c;display:grid;gap:16px;text-align:left}.theme-surface small{font-size:10px;letter-spacing:2px;color:#ac99c8}.theme-surface p{font-size:14px;margin:0;color:#d6c7e6}.theme-surface span{display:block;width:75%;height:5px;border-radius:4px;background:#bea1ff40}
html[data-theme="light"] body{background:#f3eee5;color:#352a44}html[data-theme="light"] .theme-surface{background:#fffaf0;border-color:#bdac9244}html[data-theme="light"] .theme-surface p{color:#665773}html[data-theme="light"] .theme-surface small{color:#947aaa}html[data-theme="light"] body[data-embed]{background:#f3eee5}
'''

def safe_script(text):
    return re.sub(r'</script', r'<\/script', text, flags=re.I)

def archive(path, files):
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as zipped:
        for file in files:
            entry = zipfile.ZipInfo(file.parent.name + '/' + file.name, date_time=(2026, 10, 13, 0, 0, 0))
            entry.compress_type = zipfile.ZIP_DEFLATED
            entry.external_attr = 0o644 << 16
            zipped.writestr(entry, file.read_bytes())

for slug, css_name, js_name, source_name, zip_name in catalog:
    folder = root / 'components' / slug
    html = (folder / 'component.html').read_text()
    css = (folder / css_name).read_text()
    js = (folder / js_name).read_text()
    extra = []
    if slug == 'download-forge':
        sample = folder / 'demo-download.zip'
        with zipfile.ZipFile(sample, 'w', zipfile.ZIP_DEFLATED) as z:
            entry=zipfile.ZipInfo('JD-Impact.txt',date_time=(2026,10,13,0,0,0));entry.compress_type=zipfile.ZIP_DEFLATED
            z.writestr(entry, 'Download Forge: Dieser echte Beispieldownload wurde mit HTML, CSS und JavaScript geladen.\n')
        extra.append(sample)
        content = html
        initialize = '''const preview=document.body.hasAttribute('data-embed');
const previewLoad=signal=>{
  let timer,cleanup=()=>{};
  const chunkSize=256*1024,chunkCount=24;
  const body=new ReadableStream({
    start(controller){
      let sent=0;
      const stop=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort)};
      const abort=()=>{stop();controller.error(new DOMException('Abgebrochen','AbortError'))};
      cleanup=stop;
      const next=()=>{
        if(signal.aborted){abort();return}
        controller.enqueue(new Uint8Array(chunkSize));sent++;
        if(sent===chunkCount){stop();controller.close()}else timer=setTimeout(next,250);
      };
      signal.addEventListener('abort',abort,{once:true});
      if(signal.aborted)abort();else timer=setTimeout(next,250);
    },
    cancel(){cleanup()}
  });
  return new Response(body,{headers:{'Content-Length':String(chunkSize*chunkCount)}});
};
const instance=new DownloadForge(root,preview
  ? {preview:true,load:previewLoad,filename:'vorschau.zip',label:'Animation testen',minimumDuration:0}
  : {url:'demo-download.zip',filename:'jd-forge-demo.zip',label:'Download testen',minimumDuration:0});'''
        root_selector = '[data-download-forge]'
        reset = "instance.abort(); if(instance.state!=='loading')instance.reset();"
        motion = 'instance.setMotion(event.data.enabled);'
        hint = 'Animation testen: sechs Sekunden Vorschau, ohne Dateidownload.'
        events = "root.addEventListener('forgepreviewcomplete',()=>report('Vorschau abgeschlossen. Es wurde keine Datei heruntergeladen.'));root.addEventListener('forgedownload',()=>report('Die Beispieldatei wurde an den Browser übergeben.'));"
    else:
        content = '<div class="theme-example"><h2>Ein Klick. Zwei Looks.</h2>' + html + '<div class="theme-surface"><small>DEIN INTERFACE</small><p>Ein neuer Look. Derselbe Code.</p><span></span><span></span></div></div>'
        initialize = "const instance=root.jdThemeSwitch; const initialTheme=instance.getTheme();"
        root_selector = '[data-theme-switch]'
        reset = "instance.setTheme(initialTheme,{persist:false});"
        motion = 'instance.setMotion(event.data.enabled);'
        hint = 'Klicken, ziehen oder Pfeiltasten benutzen. Der Look wechselt wirklich.'
        events = "root.addEventListener('themechange',event=>report(event.detail.theme==='dark'?'Dunkler Modus.':'Heller Modus.'));"
    hint_expression = "'" + hint + "'"
    if slug == 'download-forge':
        hint_expression = 'preview ? ' + hint_expression + " : 'Download testen lädt die beiliegende Beispieldatei wirklich herunter.'"
    helper = f'''if(new URLSearchParams(location.search).has('embed'))document.body.dataset.embed='';
addEventListener('DOMContentLoaded',()=>{{const root=document.querySelector('{root_selector}');{initialize}
const report=text=>{{document.querySelector('.page-note').textContent=text;if(parent!==window)parent.postMessage({{type:'jd-preview-status',text}},'*')}};
{events}
addEventListener('message',event=>{{if(event.source!==parent)return;if(event.data==='jd-preview-reset'){{{reset}report({hint_expression})}}if(event.data?.type==='jd-preview-motion'){{{motion}}}}});report({hint_expression});
}},{{once:true}});'''
    for name, standalone in [('example.html', False), ('preview.html', True)]:
        css_ref = '<style>' + css + '</style>' if standalone else f'<link rel="stylesheet" href="{css_name}?v={hashlib.sha256(css.encode()).hexdigest()[:12]}">'
        js_ref = '<script>' + safe_script(js) + '</script>' if standalone else f'<script src="{js_name}?v={hashlib.sha256(js.encode()).hexdigest()[:12]}"></script>'
        document = f'''<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>JD — {slug}</title>{css_ref}<style>{host}</style></head><body><div class="page-brand"><img src="data:image/jpeg;base64,{logo}" alt="JD-Impact"></div><main class="page-stage">{content}</main><p class="page-note" role="status" aria-live="polite"></p>{js_ref}<script>{safe_script(helper)}</script></body></html>'''
        (folder / name).write_text(document)
    files = [folder / name for name in ['component.html', css_name, js_name, 'README.md', 'example.html', 'preview.html']] + extra
    archive(root / 'downloads' / zip_name, files)
    shutil.copyfile(root / 'downloads' / zip_name, docs / 'downloads' / zip_name)
    shutil.copytree(folder, docs / 'components' / slug, dirs_exist_ok=True)
    sources = {key: {'name': name, 'code': (folder / name).read_text()} for key, name in [('html', 'component.html'), ('css', css_name), ('js', js_name)]}
    sources.update(id=slug,preview=f'components/{slug}/example.html',archive='downloads/'+zip_name+'?v='+hashlib.sha256((root/'downloads'/zip_name).read_bytes()).hexdigest()[:12],archiveName=zip_name,revision=hashlib.sha256((folder/'example.html').read_bytes()).hexdigest()[:12])
    (docs / source_name).write_text('window.JD_SOURCES = '+json.dumps(sources,ensure_ascii=False).replace('<',r'<')+';\n')

forge = (root / 'components/download-forge/component.html').read_text().replace('>Download</span>', '>ZIP herunterladen</span>')
for page in ['login.html', 'download.html', 'switch.html']:
    file = docs / page
    content = file.read_text()
    promo = '<strong>Möchtest du auch diese Animation haben?</strong><a href="download.html#code">Download Forge zum Einbauen <span aria-hidden="true">→</span></a>' if page != 'download.html' else '<strong>Dein nächster Effekt wartet schon.</strong><a href="index.html#components">Alle Komponenten entdecken <span aria-hidden="true">→</span></a>'
    widget = f'''<!-- JD-DOWNLOAD-START --><section class="download-zone" id="download-zone" aria-label="Komponenten-Paket herunterladen"><div class="download-heading"><p class="eyebrow">DAS GANZE PAKET</p><h3>Eine ZIP. Alles drin.</h3><p>HTML, CSS, JavaScript und ein fertiges Einbaubeispiel.</p></div><div class="download-mount">{forge}</div><div class="download-crosspromo" aria-hidden="true" inert><div>{promo}</div></div></section><!-- JD-DOWNLOAD-END -->'''
    content = re.sub(r'<!-- JD-DOWNLOAD-START -->.*?<!-- JD-DOWNLOAD-END -->', lambda _: widget, content, flags=re.S)
    file.write_text(content)
matrix = ''
for slug, css_name, js_name in [('login-motion','login-card.css','login-card.js'),('download-forge','forge.css','forge.js'),('theme-switch','theme-switch.css','theme-switch.js')]:
    folder = root / 'components' / slug
    matrix += '\n'.join((folder/name).read_text() for name in ['component.html',css_name,js_name])
(docs/'matrix-source.js').write_text('window.JD_MATRIX_SOURCE = '+json.dumps(matrix,ensure_ascii=False).replace('<',r'<')+';\n')
print('Three reusable components, exact examples, archives, code views and shared download widgets built.')
