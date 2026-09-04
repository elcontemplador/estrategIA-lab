"""Check the publishable tree without contacting external services."""
import json
import re
import subprocess
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit

ROOT = Path(__file__).resolve().parents[1] / 'docs'
SITE = 'https://elcontemplador.github.io/estrategIA-lab/'
errors = []

class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids, self.routes, self.refs = set(), set(), []
        self.duplicates = []
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if a.get('id'):
            if a['id'] in self.ids:
                self.duplicates.append(a['id'])
            self.ids.add(a['id'])
        if a.get('data-view'):
            self.routes.add(a['data-view'])
        for key in ('href', 'src', 'poster'):
            if a.get(key):
                self.refs.append(a[key])
        if a.get('srcset'):
            self.refs.extend(x.strip().split()[0] for x in a['srcset'].split(','))

pages = {p.relative_to(ROOT).as_posix(): Page(p.read_text(encoding='utf-8')) for p in ROOT.rglob('*.html')}
for required in ('index.html', 'historias/index.html', 'que-es-la-ia/index.html', 'agora2032/index.html', '404.html', '.nojekyll'):
    if not (ROOT / required).is_file():
        errors.append(f'Missing page: {required}')

def check_ref(origin, ref):
    url = urljoin(urljoin(SITE, origin), ref)
    if not url.startswith(SITE):
        return
    parts = urlsplit(url)
    rel = unquote(parts.path[len(urlsplit(SITE).path):])
    target = ROOT / rel
    if target.is_dir():
        target /= 'index.html'
    if not target.is_file():
        errors.append(f'{origin}: missing resource {ref}')
    elif parts.fragment and target.suffix == '.html':
        dest = pages[target.relative_to(ROOT).as_posix()]
        if unquote(parts.fragment) not in dest.ids | dest.routes:
            errors.append(f'{origin}: missing fragment {ref}')

for name, page in pages.items():
    errors.extend(f'{name}: duplicate id {i}' for i in page.duplicates)
    for ref in page.refs:
        check_ref(name, ref)
for css in ROOT.rglob('*.css'):
    for ref in re.findall(r'url\([\s\"\']*([^\)\"\']+)', css.read_text(encoding='utf-8')):
        check_ref(css.relative_to(ROOT).as_posix(), ref.strip())
for elem in ET.parse(ROOT / 'sitemap.xml').iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc'):
    check_ref('sitemap.xml', elem.text)
manifest = json.loads((ROOT / 'site.webmanifest').read_text(encoding='utf-8'))
for icon in manifest.get('icons', []):
    check_ref('site.webmanifest', icon['src'])
for name in ('historias_veraniegas_2024.pdf', 'historias_veraniegas_2025.pdf', 'historias_veraniegas_2026.pdf', 'archivo_historias_2024_2026.pdf'):
    p = ROOT / 'historias' / 'descargas' / name
    if not p.is_file() or p.read_bytes()[:5] != b'%PDF-':
        errors.append(f'Missing or invalid PDF: {name}')
for script in ROOT.rglob('*.js'):
    run = subprocess.run(['node', '--check', str(script)], capture_output=True, text=True)
    if run.returncode:
        errors.append(run.stderr)
if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} HTML pages; internal HTML/CSS/manifest/sitemap references; four PDFs; JavaScript syntax.')
