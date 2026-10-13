"""Refresh the static JD page from the actual, reusable component source."""
from pathlib import Path
import base64
import hashlib
import json
import re
import shutil
import subprocess
import sys

root = Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, str(root / 'scripts' / 'build-component.py')], check=True)
component = root / 'components' / 'login-motion'
destination = root / 'docs'
destination.mkdir(exist_ok=True)
sources = {
    key: {'name': filename, 'code': (component / filename).read_text()}
    for key, filename in [
        ('html', 'component.html'), ('css', 'login-card.css'), ('js', 'login-card.js')
    ]
}
sources['revision'] = hashlib.sha256((component / 'example.html').read_bytes()).hexdigest()[:12]
sources.update(id='login-motion',preview='components/login-motion/example.html',archive='downloads/jd-login-component.zip',archiveName='jd-login-component.zip')
(destination / 'source.js').write_text(
    '/* Generated from components/login-motion. Run scripts/build-page.py to refresh. */\n'
    'window.JD_SOURCES = ' + json.dumps(sources, ensure_ascii=False).replace('<', '\\u003c') + ';\n'
)
logo = re.search(r'data:image/jpeg;base64,([^"\s]+)', (component / 'preview.html').read_text())
if not logo:
    raise SystemExit('Original JD logo is missing from the component preview.')
(destination / 'jd-logo.jpg').write_bytes(base64.b64decode(logo.group(1)))
(destination / 'downloads').mkdir(exist_ok=True)
shutil.copyfile(root / 'downloads' / 'jd-login-component.zip', destination / 'downloads' / 'jd-login-component.zip')
shutil.copytree(component, destination / 'components' / 'login-motion', dirs_exist_ok=True)
(destination / '.nojekyll').touch()
print('JD page refreshed: exact HTML/CSS/JS, original logo and component ZIP.')
