"""Render all component pages from the accepted Login page layout."""
from pathlib import Path
import json
import re

root = Path(__file__).resolve().parents[1]
template = (root / 'templates/component-page.html').read_text()
pages = json.loads((root / 'templates/component-pages.json').read_text())
fields = set(re.findall(r'\{\{(\w+)\}\}', template))
for filename, content in pages.items():
    missing = fields - content.keys()
    if missing:
        raise SystemExit(f'{filename}: missing layout fields {sorted(missing)}')
    # The checked-in catalog contains trusted HTML for component-specific copy.
    document = re.sub(r'\{\{(\w+)\}\}', lambda match: content[match[1]], template)
    (root / 'docs' / filename).write_text(document)
print('Component pages rendered from one shared JD layout.')
