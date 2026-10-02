"""Regression checks for the reading experience. Requires Playwright and PyMuPDF.

python tests/renta_basica.py --output ABSOLUTE_DIRECTORY
No network requests or mutation of the site's source files.
"""
from pathlib import Path
from html.parser import HTMLParser
from datetime import date
import argparse
import hashlib
import json
import re
import sys
import tempfile
import struct
import xml.etree.ElementTree as ET
import pymupdf as fitz
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output', type=Path)
parser.add_argument('--browser-channel',default=None)
args = parser.parse_args()
ROOT = Path(__file__).resolve().parents[1]
DIST = ROOT / 'docs/renta-basica'
OUT = args.output or Path(tempfile.mkdtemp(prefix='renta-basica-qa-'))
OUT.mkdir(parents=True, exist_ok=True)
URL = (DIST / 'index.html').as_uri()
result = {'source_sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in (DIST).iterdir() if p.is_file()}, 'checks': {}, 'viewports': [], 'errors': [], 'limitations': ['Automated checks in Chromium/Edge, not a manual screen-reader audit or a WCAG certification.']}

def check(name, condition, detail=None):
    result['checks'][name] = {'passed': bool(condition)}
    if detail is not None: result['checks'][name]['detail'] = detail

def save():
    result['passed'] = all(c['passed'] for c in result['checks'].values()) and not result['errors']
    (OUT / 'qa_result.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')

class Structure(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.hrefs, self.assets, self.external = [], [], [], []
        self.h1 = 0
        self.lang = None
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if 'id' in a: self.ids.append(a['id'])
        if tag == 'html': self.lang = a.get('lang')
        if tag == 'h1': self.h1 += 1
        if tag == 'a' and 'href' in a:
            self.hrefs.append(a['href'])
            if a['href'].startswith('https://'): self.external.append(a)
        if tag == 'script' and 'src' in a: self.assets.append(a['src'])
        if tag == 'link' and a.get('rel') == 'stylesheet': self.assets.append(a['href'])

structure = Structure()
html = (DIST / 'index.html').read_text(encoding='utf-8')
structure.feed(html)
check('single_h1_and_language', structure.h1 == 1 and structure.lang == 'es')
check('unique_ids', len(structure.ids) == len(set(structure.ids)))
broken = [h for h in structure.hrefs if h.startswith('#') and h[1:] not in structure.ids]
check('internal_links', not broken, {'count': sum(h.startswith('#') for h in structure.hrefs), 'broken': broken})
check('local_assets', all((DIST / p).is_file() for p in structure.assets))
check('external_link_isolation', all(a.get('target') != '_blank' or 'noopener' in a.get('rel', '') for a in structure.external))
check('encoding', '\ufffd' not in html)
origin='https://elcontemplador.github.io/estrategIA-lab/renta-basica'
data=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',html,re.S).group(1))
modified = date.fromisoformat(data['dateModified'])
published = date.fromisoformat(data['datePublished'])
edition = re.search(r'Edición\s+(\d+)\s*·\s*<time datetime="([^"]+)"', html)
check('article_metadata',data['@type']=='Article' and data['url']==origin+'/' and data['author']['name']=='Fernando Nieto Lobato' and published<=modified and bool(edition) and edition.group(1)==str(data['version']) and edition.group(2)==data['dateModified'])
check('sharing_metadata',all(s in html for s in ['rel="canonical" href="'+origin+'/'+'"','property="og:image" content="'+origin+'/og.png"','name="twitter:card" content="summary_large_image"']))
check('download_assets',all((DIST/p).is_file() for p in ['renta-basica-informe.pdf','renta-basica-informe.md','og.png']))
png=(DIST/'og.png').read_bytes()
check('sharing_image_size',png[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',png[16:24])==(1200,630))
sitemap=ET.fromstring((ROOT/'docs/sitemap.xml').read_text(encoding='utf-8'))
check('sitemap_and_robots',origin+'/' in [e.text for e in sitemap.iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')] and 'Sitemap: https://elcontemplador.github.io/estrategIA-lab/sitemap.xml' in (ROOT/'docs/robots.txt').read_text())
md=(DIST/'renta-basica-informe.md').read_text(encoding='utf-8')
months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
edition_label = f"Edición {data['version']}"
edition_date = f'{modified.day} de {months[modified.month-1]} de {modified.year}'
check('markdown_edition_matches_html',f'{edition_label} · {edition_date}' in md)
new_probes=['51,8','Korinek y Lockwood','American A.I. Sovereign Wealth Fund Act','En 2 minutos','Seis entregables concretos','Mapping Tax Risks','Tres vías que cumplen funciones distintas','Recursos disponibles, calendario y sostenibilidad.','Publicar supuestos y revisarlos con datos observables.','superinteligencia artificial','aceleración autosostenida','rentas económicas','antes de 2030','postrabajo','rentas altas universales','Navier–Stokes']
with fitz.open(DIST/'renta-basica-informe.pdf') as doc:
    check('pdf_edition_matches_html',edition_label in doc.metadata.get('subject','') and data['dateModified'] in doc.metadata.get('subject',''))
    published_text=re.sub(r'\s+',' ',' '.join(p.get_text() for p in doc))
    check('downloads_complete',all(p.casefold() in md.casefold() and p.casefold() in published_text.casefold() for p in new_probes),{'pages':len(doc)})
    local_links=[l for p in doc for l in p.get_links() if str(l.get('uri','')).startswith('file:') or l.get('file')]
    check('pdf_links_portable',not local_links)
    check('pdf_current_spelling','posttrabajo' not in published_text.casefold() and 'postrabajo' in published_text.casefold())
    check('pdf_current_host',not any('renta-basica.elcontemplador.chatgpt.site' in l.get('uri','') for p in doc for l in p.get_links()))

OVERFLOW = '''() => ({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>{
const r=e.getBoundingClientRect();return r.width>0&&(r.right>innerWidth+2||r.left< -2)&&!e.closest('.table-scroll,.chapter-nav,.visually-hidden');
}).map(e=>({tag:e.tagName,id:e.id,class:e.className,text:e.textContent.trim().slice(0,70)})).slice(0,15)})'''

# Element boxes can fit while an unbroken text run escapes them. Check both.
TEXT_OVERFLOW = '''() => {
const bad=[],walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
while(walker.nextNode()){
  const n=walker.currentNode,e=n.parentElement;
  if(!n.textContent.trim()||e.closest('script,style,.table-scroll,.chapter-nav,.visually-hidden,.skip'))continue;
  if(e.closest('details:not([open])')&&!e.closest('summary'))continue;
  const style=getComputedStyle(e);if(style.visibility==='hidden'||style.display==='none')continue;
  const range=document.createRange();range.selectNodeContents(n);
  if([...range.getClientRects()].some(r=>r.width>0&&r.height>0&&(r.right>innerWidth+2||r.left< -2)))bad.push({tag:e.tagName,text:n.textContent.trim().slice(0,80)});
}
return bad.slice(0,15);
}'''

def pdf_text(page, path):
    page.pdf(path=str(path), format='A4', print_background=False, margin={'top':'15mm','bottom':'15mm','left':'15mm','right':'15mm'})
    with fitz.open(path) as doc:
        text = re.sub(r'\s+', ' ', ' '.join(p.get_text() for p in doc))
        pages = len(doc)
        for label, phrase in [('prepararse', 'Dos relojes.'), ('aceleracion','Una ventana posible'), ('pilotos','Trabajo disponible'), ('respuesta','Cuando aparecen daños'), ('coste', 'Saldo por financiar'), ('escenario', 'Trabajamos con'), ('evidencia', 'estar empleado')]:
            for p in doc:
                if phrase in re.sub(r'\s+', ' ', p.get_text()):
                    p.get_pixmap(matrix=fitz.Matrix(1.3, 1.3)).save(OUT / ('print_' + label + '.png'))
                    break
    return text, pages

def wait_fragment(page, fragment):
    page.wait_for_function('(fragment)=>location.hash===fragment', arg=fragment)

def wait_fragment_focus(page, fragment, selector):
    # A completed click does not imply that the queued hashchange handler has
    # revealed the destination and assigned focus yet (notably in Linux CI).
    page.wait_for_function('''({fragment,selector})=>
      location.hash===fragment && document.querySelector(selector)===document.activeElement
    ''',arg={'fragment':fragment,'selector':selector},timeout=5000)

def click_chapter(page, fragment):
    """Click the actual sticky link, avoiding the overlaid mobile index link."""
    chapter = page.locator(f'.chapter-nav a[href="{fragment}"]')
    chapter.evaluate('''e=>{
      const strip=e.parentElement,box=e.getBoundingClientRect(),nav=strip.getBoundingClientRect();
      strip.scrollLeft+=box.left-nav.left-(nav.width-box.width)/2;
    }''')
    page.wait_for_function('''fragment=>{
      const link=document.querySelector('.chapter-nav a[href="'+fragment+'"]'),r=link.getBoundingClientRect();
      return document.elementFromPoint(r.left+r.width/2,r.top+r.height/2)?.closest('a')===link;
    }''',arg=fragment)
    box=chapter.bounding_box()
    page.mouse.click(box['x']+box['width']/2,box['y']+box['height']/2)
    wait_fragment(page,fragment)

try:
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True, **({'channel':args.browser_channel} if args.browser_channel else {}))
        addition=browser.new_page(viewport={'width':390,'height':844},reduced_motion='reduce')
        addition.goto(URL)
        check('executive_reading_length',len(addition.locator('#resumen').inner_text().split())<=450,{'words':len(addition.locator('#resumen').inner_text().split())})
        check('five_points_six_deliverables',addition.locator('.executive-points>li').count()==5 and addition.locator('.deliverables>li').count()==6)
        check('forecast_closed_by_default',not addition.locator('#aceleracion').evaluate('(e)=>e.open'))
        addition.goto(URL+'#aceleracion')
        check('forecast_deep_link_opens',addition.locator('#aceleracion').evaluate('(e)=>e.open'))
        addition.goto(URL+'#fuentes')
        addition.locator('.index-link').click()
        wait_fragment_focus(addition,'#indice','#indice summary')
        check('persistent_index_opens_and_focuses',addition.locator('#indice').evaluate('(e)=>e.open && e.querySelector("summary")===document.activeElement'))
        addition.locator('#indice a[href="#fiscalidad-ia"]').click()
        addition.wait_for_function('''()=>{
          const top=document.getElementById('fiscalidad-ia').getBoundingClientRect().top;
          return location.hash==='#fiscalidad-ia' && top>=0 && top<innerHeight;
        }''',timeout=5000)
        fiscal_y=addition.locator('#fiscalidad-ia').bounding_box()['y']
        check('index_reaches_fiscal_section',addition.evaluate('location.hash')=='#fiscalidad-ia' and 0<=fiscal_y<844)
        addition.evaluate('document.querySelectorAll("details").forEach(e=>e.open=true)')
        targets=addition.locator('.cite,.source-return,summary,.deliverables a,.contents a,.closing-actions a').evaluate_all('(es)=>es.map(e=>({text:e.textContent.trim().slice(0,50),w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})).filter(r=>r.w>0&&r.h>0&&(r.w<24||r.h<24))')
        check('improved_touch_targets',not targets,targets)
        check('verified_action_destinations',addition.locator('a[href="https://estrategiabyaleph.substack.com/subscribe"]').count()==1 and addition.locator('a[href="https://www.fernandonieto.es/contacto/"]').count()==1)
        for width in [320,390]:
            addition.set_viewport_size({'width':width,'height':844})
            captions=addition.locator('.table-scroll caption>span').evaluate_all('(es)=>es.map(e=>({left:e.getBoundingClientRect().left,right:e.getBoundingClientRect().right})).filter(r=>r.left<0||r.right>innerWidth+1)')
            check(f'all_table_captions_fit_{width}',not captions,captions)
            check(f'all_tables_have_mobile_guidance_{width}',addition.locator('.table-scroll').evaluate_all('(es)=>es.every(e=>!!e.getAttribute("aria-describedby") && !!document.getElementById(e.getAttribute("aria-describedby")))'))
            collisions=addition.evaluate('''()=>[...document.querySelectorAll('.archive-number,.source-number,.roadmap li>span,.argument-list article>span')].map(n=>{const r=document.createRange();r.selectNodeContents(n);return {text:n.textContent,gap:n.nextElementSibling.getBoundingClientRect().left-r.getBoundingClientRect().right};}).filter(n=>n.gap<8)''')
            check(f'numbering_has_clear_separation_{width}',not collisions,collisions)
        addition.close()
        for width, height in [(1440,1000),(1024,900),(800,1000),(768,1024),(720,1000),(390,844),(320,740)]:
            for scale in [100,200]:
                page = browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
                page.on('pageerror', lambda e: result['errors'].append(str(e)))
                page.goto(URL)
                if scale == 200: page.evaluate('document.documentElement.style.fontSize="200%"')
                for state in ['initial', 'expanded_maximum']:
                    if state == 'expanded_maximum':
                        page.evaluate('''() => {document.querySelectorAll('details').forEach(e=>e.open=true);for(const id of ['population','payment','recovery']){const e=document.getElementById(id);e.value=e.max;e.dispatchEvent(new Event('input',{bubbles:true}));}}''')
                        page.locator('[data-scenario="abundancia"]').click()
                    dimensions = page.evaluate(OVERFLOW)
                    dimensions['text_overflow'] = page.evaluate(TEXT_OVERFLOW)
                    entry = {'width':width,'text_percent':scale,'state':state,**dimensions}
                    result['viewports'].append(entry)
                    check(f'reflow_{width}_{scale}_{state}', dimensions['scrollWidth'] <= width+2 and not dimensions['overflow'] and not dimensions['text_overflow'], dimensions)
                if scale == 100 and width in [1440,390]:
                    page.goto(URL)
                    for anchor in ['inicio','resumen','cambio-trabajo','prepararse','proteger-personas','evidencia','limites-pilotos','aceleracion','coste','fiscalidad-ia','postescasez','transicion','respuesta-rapida','seguir','fuentes']:
                        page.locator('#'+anchor).evaluate('(e)=>e.scrollIntoView({block:"start"})')
                        page.wait_for_timeout(50)
                        page.screenshot(path=str(OUT / f'{width}_{anchor}.png'))
                if scale == 200 and width in [320,800]:
                    page.locator('#idea').evaluate('(e)=>e.scrollIntoView({block:"start"})')
                    page.screenshot(path=str(OUT / f'{width}_text200.png'))
                page.close()

        page = browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
        page.on('pageerror', lambda e: result['errors'].append(str(e)))
        page.goto(URL)
        for label, values, expected in [('minimum',(1,200,0),('2,4','0,0 mil M€','2,4 mil M€')),('maximum',(60,1600,70),('1152,0','806,4 mil M€','345,6 mil M€')),('middle',(30,950,45),('342,0','153,9 mil M€','188,1 mil M€'))]:
            for id, val in zip(['population','payment','recovery'], values):
                page.locator('#'+id).evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));}',str(val))
            actual = tuple(page.locator('#'+id).inner_text().replace('.', '') for id in ['gross-value','recovered-value','balance-value'])
            check('calculator_'+label, actual == expected, {'actual':actual,'expected':expected})
        page.locator('#reset-calculator').click()
        check('calculator_reset', page.locator('#gross-value').inner_text() == '96,0' and page.locator('#balance-value').inner_text() == '62,4 mil M€')
        check('calculator_mobile_summary_reset',page.locator('#balance-preview').inner_text()==page.locator('#balance-value').inner_text() and page.locator('#gross-preview').inner_text()=='96,0 mil M€')
        page.locator('#payment').focus()
        page.keyboard.press('ArrowRight')
        page.wait_for_timeout(300)
        check('calculator_keyboard_and_status', page.locator('#payment').input_value() == '850' and '66,3' in page.locator('#calculator-status').inner_text() and page.locator('.calculator-results').get_attribute('aria-live') is None)
        check('calculator_mobile_summary_live',page.locator('#balance-preview').inner_text()=='66,3 mil M€' and page.locator('#gross-preview').inner_text()=='102,0 mil M€')
        page.locator('#reset-calculator').click()

        tabs = page.locator('.scenario-tabs')
        page.get_by_role('tab').first.focus()
        page.keyboard.press('End')
        check('tabs_end',page.locator('#escenario-abundancia').is_visible() and page.locator('#tab-abundancia').evaluate('(e)=>e===document.activeElement'))
        page.keyboard.press('ArrowRight')
        check('tabs_wrap',page.locator('#escenario-complemento').is_visible() and page.locator('[role="tab"][aria-selected="true"]').count()==1 and page.locator('[role="tab"][tabindex="0"]').count()==1)
        page.keyboard.press('ArrowLeft')
        check('tabs_backward', page.locator('#escenario-abundancia').is_visible())
        page.set_viewport_size({'width':390,'height':844})
        page.wait_for_timeout(60)
        page.locator('#tab-abundancia').focus()
        page.keyboard.press('ArrowDown')
        check('tabs_vertical', tabs.get_attribute('aria-orientation')=='vertical' and page.locator('#escenario-complemento').is_visible())
        focus_style=page.locator('.scenario-button.active').evaluate('''e=>{
          const s=getComputedStyle(e),rgb=v=>v.match(/[\\d.]+/g).slice(0,3).map(Number);
          const lum=a=>{const c=a.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4});return .2126*c[0]+.7152*c[1]+.0722*c[2]};
          const a=lum(rgb(s.outlineColor)),b=lum(rgb(s.backgroundColor));
          return {focused:e.matches(':focus-visible'),width:parseFloat(s.outlineWidth),style:s.outlineStyle,contrast:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
        }''')
        check('selected_tab_focus_contrast',focus_style['focused'] and focus_style['width']>=2 and focus_style['style']!='none' and focus_style['contrast']>=3,focus_style)
        page.screenshot(path=str(OUT/'selected_tab_focus.png'))
        page.goto(URL+'#escenario-desplazamiento')
        check('scenario_deep_link', page.locator('#escenario-desplazamiento').is_visible() and page.locator('.scenario-panel:visible').count()==1)

        page.set_viewport_size({'width':1440,'height':1000})
        page.goto(URL)
        citation=page.locator('#cita-kela-1')
        citation.focus()
        page.keyboard.press('Enter')
        wait_fragment_focus(page,'#fuente-kela','#fuente-kela')
        check('citation_destination_focus',page.locator('#fuente-kela').evaluate('(e)=>e===document.activeElement'))
        page.go_back()
        page.wait_for_timeout(60)
        check('citation_history_focus',citation.evaluate('(e)=>e===document.activeElement'))
        position=page.evaluate('scrollY')
        page.keyboard.press('Tab')
        check('citation_history_tab_continuity',abs(page.evaluate('scrollY')-position)<1000)
        citation.focus()
        page.keyboard.press('Enter')
        page.locator('#fuente-kela .source-return').click()
        wait_fragment_focus(page,'#cita-kela-1','#cita-kela-1')
        check('citation_return_focus',citation.evaluate('(e)=>e===document.activeElement'))
        page.goto(URL+'#fuente-oecd')
        page.locator('#fuente-oecd .source-return').click()
        wait_fragment_focus(page,'#cita-oecd-1','#cita-oecd-1')
        check('return_opens_details',page.locator('#cita-oecd-1').is_visible() and page.locator('#cita-oecd-1').evaluate('(e)=>e===document.activeElement'))
        check('all_sources_have_return',page.locator('.source-list li').count()==36 and page.locator('.source-return').count()==36)
        page.goto(URL+'#prepararse')
        page.wait_for_timeout(60)
        check('readiness_chapter_active',page.locator('.chapter-nav a.active').get_attribute('href')=='#prepararse')
        page.locator('.readiness-links a[href="#aceleracion"]').click()
        page.wait_for_timeout(60)
        check('acceleration_access',page.locator('.chapter-nav a.active').get_attribute('href')=='#ia' and page.locator('#aceleracion').bounding_box()['y']>=0)
        page.locator('#cita-rsi2026-1').click()
        page.locator('#fuente-rsi2026 .source-return').click()
        wait_fragment_focus(page,'#cita-rsi2026-1','#cita-rsi2026-1')
        check('new_reference_return',page.locator('#cita-rsi2026-1').evaluate('(e)=>e===document.activeElement'))
        # Reading can move far from a fragment already present in the URL.
        # Back must restore the new citation and position, not the older fragment.
        for width,height in [(1440,1000),(390,844)]:
            history_page=browser.new_page(viewport={'width':width,'height':height},reduced_motion='reduce')
            history_page.on('pageerror', lambda e: result['errors'].append(str(e)))
            for original_hash in ['#cita-kela-1','#fuente-amodei2026','#escenario-complemento']:
                history_page.goto(URL+original_hash)
                history_page.locator('#cita-imf-3').focus()
                before_y=history_page.evaluate('scrollY')
                history_page.keyboard.press('Enter')
                wait_fragment(history_page,'#fuente-imf')
                history_page.go_back()
                wait_fragment(history_page,original_hash)
                history_page.wait_for_timeout(100)
                restored=history_page.evaluate('''()=>({y:scrollY,active:document.activeElement.id,top:document.activeElement.getBoundingClientRect().top,nav:document.querySelector('.chapter-nav').getBoundingClientRect().height})''')
                history_page.keyboard.press('Tab')
                after_tab=history_page.evaluate('scrollY')
                check(f'history_anchored_{width}_{original_hash[1:]}',restored['active']=='cita-imf-3' and abs(restored['y']-before_y)<5 and restored['top']>=restored['nav'] and abs(after_tab-before_y)<height,{'before_y':before_y,'restored':restored,'after_tab_y':after_tab})
            history_page.goto(URL+'#cita-kela-1')
            history_page.locator('#tab-desplazamiento').click()
            history_page.locator('#cita-transicionagi-escenario').focus()
            history_page.keyboard.press('Enter')
            history_page.go_back()
            history_page.wait_for_timeout(100)
            check(f'history_restores_scenario_{width}',history_page.locator('#escenario-desplazamiento').is_visible() and history_page.locator('#cita-transicionagi-escenario').evaluate('(e)=>e===document.activeElement'))
            history_page.goto(URL+'#cita-transicionagi-escenario')
            check(f'citation_reveals_scenario_{width}',history_page.locator('#escenario-desplazamiento').is_visible())
            for return_mode in ['browser_back','return_link']:
                history_page.goto(URL+'#cita-amodei2026-1')
                history_page.locator('#cita-kela-1').focus()
                history_page.keyboard.press('Enter')
                if return_mode == 'browser_back': history_page.go_back()
                else: history_page.locator('#fuente-kela .source-return').click()
                history_page.wait_for_timeout(100)
                history_page.locator('#respuesta-rapida').evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})')
                before_y=history_page.evaluate('scrollY')
                previous_hash=history_page.evaluate('location.hash')
                click_chapter(history_page,'#idea')
                history_page.go_back()
                wait_fragment(history_page,previous_hash)
                history_page.wait_for_timeout(100)
                after_y=history_page.evaluate('scrollY')
                history_page.keyboard.press('Tab')
                after_tab=history_page.evaluate('scrollY')
                check(f'history_after_reading_{width}_{return_mode}',abs(after_y-before_y)<5 and abs(after_tab-before_y)<height,{'before':before_y,'after':after_y,'after_tab':after_tab})
            for fragment,selector in [('#idea','.chapter-nav a[href="#idea"]'),('#inicio','.footer a[href="#inicio"]:not(.wordmark)')]:
                history_page.goto(URL+fragment)
                history_page.locator('#respuesta-rapida').evaluate('e=>e.scrollIntoView({block:"center",behavior:"instant"})')
                history_page.locator(selector).click()
                history_page.wait_for_timeout(50)
                target_top=history_page.locator(fragment).bounding_box()['y']
                check(f'link_same_fragment_{width}_{fragment[1:]}',0<=target_top<height,{'target_top':target_top})
            history_page.close()
        faq=page.locator('.faq details').first
        faq.locator('summary').focus()
        page.keyboard.press('Enter')
        check('faq_keyboard',faq.get_attribute('open') is not None)

        page.set_viewport_size({'width':320,'height':740})
        page.goto(URL)
        page.evaluate('document.documentElement.style.fontSize="200%"')
        check('skip_hidden_unfocused',page.locator('.skip').bounding_box()['y']+page.locator('.skip').bounding_box()['height']<=0)
        page.locator('.skip').focus()
        check('skip_visible_focused',page.locator('.skip').bounding_box()['y']>=0)
        page.keyboard.press('Enter')
        page.locator('#fuentes').evaluate('(e)=>e.scrollIntoView({block:"start"})')
        page.wait_for_timeout(80)
        check('chapter_current_visible',page.locator('.chapter-nav a.active').get_attribute('href')=='#fuentes' and page.locator('.chapter-nav a.active').evaluate('(e)=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}'))

        page.set_viewport_size({'width':1440,'height':1000})
        page.goto(URL)
        before=page.locator('details').evaluate_all('(es)=>es.map(e=>e.open)')
        printed,pages=pdf_text(page,OUT/'reading_print.pdf')
        after=page.locator('details').evaluate_all('(es)=>es.map(e=>e.open)')
        probes=['La reforma de activación','No se descuentan sanidad','No por sí sola.','Esta página es una síntesis de investigación','La demanda de trabajo','Producimos mucho más','Fórmulas:','error estándar de 1,7','Principal cuestión de diseño','Cuantía, fiscalidad y prestaciones conservadas.','Acceso efectivo, trámites y retirada de la ayuda al aumentar ingresos.','Periodicidad del pago y personas fuera del sistema tributario.','Oferta suficiente, calidad y acceso territorial.']
        probes += ['Dos relojes.', 'No hace falta acertar el año', '2028 para Daniel Kokotajlo y 2032 para Eli Lifland', 'una aceleración autosostenida siguen sin estar demostradas', 'ninguna activación por un anuncio de AGI', 'The Economics of Recursive Self-Improvement']
        probes += ['Permitir que el trabajo cambie.', 'Trabajo disponible', 'qué ocurre si las empresas necesitan muchas menos horas humanas', 'garantía estable y una demanda de trabajo', 'Cuando aparecen daños', 'La singularidad como hipótesis', 'Scenarios for the Transition to AGI']
        check('print_complete',all(probe.casefold() in printed.casefold() for probe in probes),{'pages':pages,'words':len(printed.split()),'probes':{p:p.casefold() in printed.casefold() for p in probes}})
        check('print_skip_absent','Saltar al contenido' not in printed)
        check('print_restores_details',before==after)
        page.emulate_media(media='print')
        colours=page.locator('.balance-row strong,.calculator-results .eyebrow,.scenario-title h3,.scenario-section .cite,.diagram-annotation p').evaluate_all('(es)=>es.map(e=>getComputedStyle(e).color)')
        check('print_text_contrast',all(c in ['rgb(30, 30, 32)','rgb(157, 34, 53)'] for c in colours),colours)
        page.close()

        nojs=browser.new_page(viewport={'width':390,'height':844},java_script_enabled=False)
        nojs.goto(URL)
        check('nojs_content',nojs.locator('h1').is_visible() and nojs.locator('.scenario-panel:visible').count()==3)
        check('nojs_controls',nojs.locator('#payment').is_disabled() and nojs.locator('#reset-calculator').is_disabled() and not nojs.locator('.scenario-tabs').is_visible())
        check('nojs_calculation',nojs.locator('#gross-value').inner_text()=='96,0' and nojs.locator('#balance-value').inner_text()=='62,4 mil M€')
        nojs.set_viewport_size({'width':1440,'height':1000})
        nojs_printed,nojs_pages=pdf_text(nojs,OUT/'reading_print_nojs.pdf')
        check('nojs_print_complete',all(p.casefold() in nojs_printed.casefold() for p in probes),{'pages':nojs_pages,'probes':{p:p.casefold() in nojs_printed.casefold() for p in probes}})
        check('nojs_print_skip_absent','Saltar al contenido' not in nojs_printed)
        nojs.close()
        browser.close()
except Exception as exc:
    result['errors'].append(type(exc).__name__+': '+str(exc))
finally:
    save()
    print(json.dumps({'passed':result['passed'],'checks':len(result['checks']),'failed':{k:v for k,v in result['checks'].items() if not v['passed']},'errors':result['errors'],'result':str(OUT/'qa_result.json')},ensure_ascii=False,indent=2))
raise SystemExit(0 if result['passed'] else 1)
