"""Produce los descargables de la edición desde su HTML canónico, sin red ni modelos.

Requiere Playwright, PyMuPDF y Pillow. --output es la carpeta de evidencias.
"""
from pathlib import Path
from datetime import date
import argparse
import json
import re
import sys
import hashlib
import pymupdf as fitz
from PIL import Image, ImageDraw, ImageFont
from playwright.sync_api import sync_playwright

sys.stdout.reconfigure(encoding='utf-8')
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,required=True)
parser.add_argument('--browser-channel',default=None,help='Opcional: msedge para usar Microsoft Edge instalado.')
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'docs/renta-basica'
OUT=args.output
OUT.mkdir(parents=True,exist_ok=True)
ORIGIN='https://elcontemplador.github.io/estrategIA-lab/renta-basica'
HTML=(DIST/'index.html').read_text(encoding='utf-8')
METADATA=json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>',HTML,re.S).group(1))
EDITION=str(METADATA['version'])
MODIFIED=date.fromisoformat(METADATA['dateModified'])
MONTHS=('enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre')
DATE_LONG=f'{MODIFIED.day} de {MONTHS[MODIFIED.month-1]} de {MODIFIED.year}'
assert re.search(r'data-edition="(\d+)"',HTML).group(1)==EDITION, 'La edición HTML y los metadatos deben coincidir'
assert METADATA['url']==ORIGIN+'/', 'La URL canónica debe coincidir con la de las descargas'

MARKDOWN=r'''origin => {
  const skip='script,style,nav,input,button,noscript,.hero-actions,.download-links,.contents,.source-return,.scenario-tabs,.closing-actions,.visually-hidden,.table-hint,.range-extremes,.cost-bar,.key,.chain-index,.diagram-number,.scenario-letter,.stress-chain li>span,.roadmap li>span,[aria-hidden="true"]';
  const clean=s=>s.replace(/\s+/g,' ').trim();
  const blocks=new Set(['DIV','SECTION','ARTICLE','ASIDE','FIGURE','FIGCAPTION','DL']);
  function walk(n){
    if(n.nodeType===Node.TEXT_NODE)return n.textContent.replace(/\s+/g,' ');
    if(n.nodeType!==Node.ELEMENT_NODE||n.matches(skip))return '';
    const t=n.tagName;
    const inner=()=>[...n.childNodes].map(walk).join('');
    if(t==='BR')return ' ';
    if(/^H[1-6]$/.test(t))return '\n\n'+'#'.repeat(+t[1])+' '+clean(inner())+'\n\n';
    if(t==='SUMMARY')return '\n\n**'+clean(inner())+'**\n\n';
    if(t==='A'){
      let href=n.getAttribute('href')||'';
      if(n.classList.contains('cite')){
        href=document.querySelector(href+' a[href^="https"]')?.href||new URL(href,origin+'/').href;
        return ' ['+clean(n.textContent).replace(/[\[\]]/g,'')+']('+href+') ';
      }
      if(href.startsWith('#'))href=new URL(href,origin+'/').href;
      else if(!/^(https?:|mailto:)/.test(href))href=new URL(href,origin+'/').href;
      if(n.classList.contains('archive-card')){
        const h=n.querySelector('h3'),p=n.querySelector('p'),meta=n.querySelector('.archive-meta');
        return '\n\n### ['+clean(h.textContent)+']('+href+')\n\n'+clean(meta.textContent)+'\n\n'+clean(p.textContent)+'\n\n';
      }
      return ' ['+clean(inner())+']('+href+') ';
    }
    if(t==='TABLE'){
      const rows=[...n.querySelectorAll('tr')].map(tr=>'| '+[...tr.children].map(c=>clean(walk(c)).replace(/\|/g,'\\|')).join(' | ')+' |');
      rows.splice(1,0,'| '+[...n.querySelector('tr').children].map(()=>'---').join(' | ')+' |');
      const cap=n.querySelector('caption');
      return '\n\n'+(cap?clean(cap.textContent)+'\n\n':'')+rows.join('\n')+'\n\n';
    }
    if(t==='UL'||t==='OL'){
      return '\n\n'+[...n.children].filter(c=>c.tagName==='LI').map((li,i)=>{
        const prefix=t==='OL'?(i+1)+'. ':'- ';
        return prefix+walk(li).trim().replace(/\n/g,'\n    ');
      }).join('\n\n')+'\n\n';
    }
    if(t==='STRONG')return '**'+clean(inner())+'**';
    if(t==='EM')return '*'+clean(inner())+'*';
    if(t==='P')return '\n\n'+inner().trim()+'\n\n';
    if(t==='DT')return '\n\n**'+clean(inner())+':** ';
    if(t==='DD')return inner().trim()+'\n\n';
    if(t==='SMALL'||t==='OUTPUT'||n.matches('.source-meta,.source-number,.closing-label,.principle-label,.content-label'))return ' '+inner().trim()+' ';
    if(blocks.has(t)||t==='DETAILS')return '\n\n'+inner().trim()+'\n\n';
    return inner();
  }
  return walk(document.querySelector('main')).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim()+'\n';
}'''

with sync_playwright() as pw:
    browser=pw.chromium.launch(headless=True,**({'channel':args.browser_channel} if args.browser_channel else {}))
    page=browser.new_page(viewport={'width':1440,'height':1000},reduced_motion='reduce')
    page.goto((DIST/'index.html').as_uri())
    page.evaluate('document.querySelectorAll("details").forEach(e=>e.open=true)')
    markdown=page.evaluate(MARKDOWN,ORIGIN)
    expected_sources=page.locator('.source-list li a[href^="https"]').evaluate_all('(es)=>es.map(e=>e.href)')
    markdown+=f'\n---\n\nEdición {EDITION} · {DATE_LONG}. Versión completa de la [web de renta básica de estrategIA]('+ORIGIN+'/).\n'
    (DIST/'renta-basica-informe.md').write_text(markdown,encoding='utf-8')
    # Los fragmentos siguen siendo internos. Ningún enlace de descarga apunta al disco local.
    page.evaluate('''origin=>document.querySelectorAll('a[href]').forEach(a=>{const h=a.getAttribute('href');if(h&&!h.startsWith('#')&&!/^(https?:|mailto:)/.test(h))a.href=new URL(h,origin+'/').href;})''',ORIGIN)
    pdf_data=page.pdf(format='A4',print_background=False,display_header_footer=True,
        header_template='<div></div>',footer_template=f'<div style="width:100%;text-align:center;font:9px Arial;color:#62605e">estrategIA · Renta básica · Edición {EDITION} &nbsp; | &nbsp; <span class="pageNumber"></span> / <span class="totalPages"></span></div>',
        margin={'top':'15mm','bottom':'18mm','left':'15mm','right':'15mm'})
    with fitz.open(stream=pdf_data,filetype='pdf') as doc:
        doc.set_metadata({'title':'Renta básica y la era de la IA · estrategIA','author':'Fernando Nieto Lobato','subject':f'Evidencia, fiscalidad y una agenda de preparación para gobiernos. Edición {EDITION}, {MODIFIED.isoformat()}.','creator':'estrategIA · HTML canónico y Chromium'})
        doc.save(DIST/'renta-basica-informe.pdf',garbage=4,deflate=True)
    browser.close()

# La tarjeta tipográfica es un activo original ya revisado; no regenerarla al editar texto.
# Las hojas de contacto funcionan también en Linux, sin fuentes comerciales instaladas.
try:
    contact_font=ImageFont.truetype('Arial.ttf',18)
except OSError:
    try:
        contact_font=ImageFont.truetype('DejaVuSans.ttf',18)
    except OSError:
        contact_font=ImageFont.load_default()

with fitz.open(DIST/'renta-basica-informe.pdf') as doc:
    texts=[p.get_text() for p in doc]
    links={l.get('uri','') for p in doc for l in p.get_links()}
    missing_sources=[u for u in expected_sources if u not in markdown or u not in links]
    file_links=[{'page':i+1,'link':l} for i,p in enumerate(doc) for l in p.get_links() if str(l.get('uri','')).startswith('file:') or l.get('file')]
    font=contact_font
    for group in range(0,len(doc),9):
        sheet=Image.new('RGB',(1110,1665),'#DDD8D1')
        sd=ImageDraw.Draw(sheet)
        for j in range(group,min(group+9,len(doc))):
            p=doc[j]
            pix=p.get_pixmap(matrix=fitz.Matrix(0.58,0.58),alpha=False)
            im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
            col=(j-group)%3;row=(j-group)//3
            x=12+col*370;y=31+row*555
            sheet.paste(im,(x,y))
            sd.text((x,y-25),f'Página {j+1}',font=font,fill='#1E1E20')
        sheet.save(OUT/f'pdf_contacto_{group//9+1:02}.png')
    checks={'pages':len(doc),'words':sum(len(t.split()) for t in texts),'file_links':file_links,'source_links_checked':len(expected_sources),'missing_source_links':missing_sources,'pages_with_little_text':[i+1 for i,t in enumerate(texts) if len(t.split())<40],
        'full_text_sha256':hashlib.sha256('\n'.join(texts).encode()).hexdigest(),
        'assets':{p.name:{'bytes':p.stat().st_size,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for p in [DIST/'renta-basica-informe.md',DIST/'renta-basica-informe.pdf',DIST/'og.png']}}
    (OUT/'artefactos.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf-8')
    (OUT/'pdf_texto.txt').write_text('\n'.join(texts),encoding='utf-8')
assert not checks['file_links'],checks['file_links']
assert not checks['missing_source_links'],checks['missing_source_links']
print(json.dumps(checks,ensure_ascii=False,indent=2))
