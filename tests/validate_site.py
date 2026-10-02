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
for required in ('index.html', 'historias/index.html', 'que-es-la-ia/index.html', 'agora2032/index.html', 'renta-basica/index.html', '404.html', '.nojekyll'):
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
# Migration regression: canonical route, complete downloadable edition and spelling.
article = ROOT / 'renta-basica'
html = (article / 'index.html').read_text(encoding='utf-8')
md = (article / 'renta-basica-informe.md').read_text(encoding='utf-8')
expected = SITE + 'renta-basica/'
metadata = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S).group(1))
edition = re.search(r'data-edition="(\d+)"', html).group(1)
if metadata['url'] != expected or metadata['mainEntityOfPage'] != expected or ('rel="canonical" href="' + expected + '"') not in html:
    errors.append('Renta basica canonical URL must point to its LAB route')
if metadata['version'] != edition or f'Edición {edition}' not in md:
    errors.append('Renta basica HTML and Markdown editions must agree')
for name, text in [('HTML', html), ('Markdown', md)]:
    if 'posttrabajo' in text.casefold() or 'postrabajo' not in text.casefold():
        errors.append(f'Renta basica {name}: spelling must be postrabajo')
    if 'renta-basica.elcontemplador.chatgpt.site' in text:
        errors.append(f'Renta basica {name}: stale publication URL')
pdf = article / 'renta-basica-informe.pdf'
if not pdf.is_file() or pdf.read_bytes()[:5] != b'%PDF-':
    errors.append('Missing or invalid renta basica PDF')
source_urls = re.findall(r'<li id="fuente-[^"]+".*?<a href="(https[^"]+)"', html, re.S)
if len(source_urls) != 36 or not all(u in md for u in source_urls):
    errors.append('Renta basica Markdown must retain all 36 sources')

for script in ROOT.rglob('*.js'):
    run = subprocess.run(['node', '--check', str(script)], capture_output=True, text=True)
    if run.returncode:
        errors.append(run.stderr)
if errors:
    raise SystemExit('\n'.join(errors))
print(f'PASS: {len(pages)} HTML pages; internal HTML/CSS/manifest/sitemap references; five PDFs; renta basica edition and sources; JavaScript syntax.')
