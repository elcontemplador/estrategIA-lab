'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const http=require('node:http');
const {chromium}=require('playwright');
const {default:AxeBuilder}=require('@axe-core/playwright');
const root=path.resolve(__dirname,'../docs'), catalog=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../data/memes/catalog.json'),'utf8'));
const output=path.resolve(process.env.MEMES_QA_OUTPUT||'qa/memes');fs.mkdirSync(output,{recursive:true});
let checks=0;const results=[];const check=(value,message)=>{assert.ok(value,message);checks++;results.push(message);};
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.webp':'image/webp','.ico':'image/x-icon'};
async function main(){
 const server=http.createServer((req,res)=>{try{const url=new URL(req.url,'http://localhost');if(!url.pathname.startsWith('/estrategIA-lab/'))return res.writeHead(404).end();let f=path.resolve(root,decodeURIComponent(url.pathname.slice('/estrategIA-lab/'.length)));if(!f.startsWith(root+path.sep)&&f!==root)return res.writeHead(403).end();if(fs.statSync(f).isDirectory())f=path.join(f,'index.html');res.writeHead(200,{'Content-Type':mime[path.extname(f)]||'application/octet-stream'}).end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`,base=origin+'/estrategIA-lab/memes/';
 let browser;
 try{
 browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 await context.route('**/*',route=>new URL(route.request().url()).origin===origin?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForSelector('#archive-filters:visible');
 check(await page.locator('#gallery .meme-card:visible').count()===18,'Initial gallery loads 18 pieces');
 check(await page.locator('#gallery .meme-card').count()===catalog.items.length,'Every included piece exists in server-rendered gallery');
 check(await page.locator('#result-count').innerText()==='185 memes','Correct reconciled count');
 const ids=new Set(catalog.items.map(x=>x.id));check(ids.size===185,'Unique catalogue IDs');
 for(const excluded of ['080-03','087-02','102-02','126-02','127-02'])check(!ids.has(excluded),`Sponsor image excluded: ${excluded}`);
 for(const width of [320,390,768,1024,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base);await page.waitForSelector('#archive-filters:visible');
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Gallery no overflow ${width}`);
  await page.addStyleTag({content:'html{font-size:200%!important}'});
  if(!await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)) console.log(await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth+1).map(e=>({tag:e.tagName,class:e.className,width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,text:e.textContent.slice(0,65)})).slice(0,12)));
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Gallery text 200% no overflow ${width}`);
 }
 await page.setViewportSize({width:1440,height:1000});await page.goto(base);
 await page.locator('#query').fill('87 fortalezas');await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='1 meme encontrado');
 check(await page.locator('#gallery .meme-card:visible').getAttribute('data-id')==='157-01','Search finds a phrase inside the image');
 await page.locator('#query').fill('#158');await page.waitForFunction(()=>document.querySelector('#meme-158-01').hidden===false);
 check(await page.locator('#gallery .meme-card:visible').count()===1,'Exact issue-number search');
 await page.locator('#query').fill('#159');await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='1 meme encontrado'&&!document.querySelector('#meme-159-01').hidden);
 check(await page.locator('#gallery .meme-card:visible').getAttribute('data-id')==='159-01','New issue 159 is searchable');
 check(catalog.cutoffIssue===159&&catalog.cutoffDate==='2026-10-14','Archive cutoff matches publication of issue 159');
 check(await page.locator('.scope-label').innerText()==='Números 1–159 · Imágenes completas, sin recortes','Visible issue range updated');
 check((await page.locator('#sobre-el-archivo').innerText()).includes('14 de octubre de 2026'),'Visible cutoff date updated');
 await page.locator('#query').fill('estrategIA 2');await page.waitForFunction(()=>document.querySelector('#result-count').textContent==='2 memes encontrados');
 check(await page.locator('#gallery .meme-card:visible').count()===2,'Multiple memes in one issue');
 await page.locator('#reset').click();await page.locator('#theme').selectOption('politica');await page.locator('#year').selectOption('2026');
 check(await page.locator('#gallery .meme-card:visible').count()>0,'Combined topic and year filters');
 check(await page.locator('#gallery .meme-card:visible').evaluateAll(els=>els.every(e=>e.querySelector('time').dateTime.startsWith('2026'))),'Year filter respects date');
 await page.reload();check(await page.locator('#theme').inputValue()==='politica'&&await page.locator('#year').inputValue()==='2026','Filter URL survives reload');
 await page.locator('#query').fill('zzzzsincoincidencia');await page.waitForSelector('#empty:visible');check(await page.locator('#gallery .meme-card:visible').count()===0,'Empty state');
 await page.locator('#clear-empty').click();await page.locator('#order').selectOption('antiguos');
 check(await page.locator('#gallery .meme-card:visible').first().getAttribute('data-id')==='001-01','Oldest-first order');
 await page.locator('#load-more').click();check(await page.locator('#gallery .meme-card:visible').count()===36,'Load-more appends next batch');
 const selected=await page.locator('#gallery .meme-card:visible').last().getAttribute('data-id');
 await page.locator(`#meme-${selected} a`).click();await page.waitForURL(`**/${selected}/`);
 await page.locator('[data-back]').click();await page.waitForURL('**/memes/**');
 check(await page.locator('#order').inputValue()==='antiguos'&&await page.locator('#gallery .meme-card:visible').count()===36,'Return retains sort and loaded batch');
 check(await page.locator(`#meme-${selected}`).isVisible(),'Return restores selected card');
 await page.goto(base+'159-01/');
 check(await page.locator('time').first().getAttribute('datetime')==='2026-10-14','New meme keeps actual publication date');
 check((await page.locator('.context-block').innerText()).includes('mejora recursiva'),'New meme explains the technical reference');
 check(await page.locator('.detail-actions a.button').getAttribute('href')==='https://estrategiabyaleph.substack.com/p/estrategia-159-state-of-ai-2026-estamos','New meme links to its published issue');
 await page.goto(base+'158-01/');await page.locator('#enlarge').click();check(await page.locator('#lightbox').evaluate(d=>d.open),'Accessible zoom dialog opens');
 await page.keyboard.press('Escape');check(!await page.locator('#lightbox').evaluate(d=>d.open),'Escape closes zoom');check(await page.locator('#enlarge').evaluate(e=>e===document.activeElement),'Zoom restores keyboard focus');
 await page.locator('.transcription summary').click();check((await page.locator('#transcript').innerText()).includes('comisión'),'Image transcription available');
 await page.locator('#copy-link').click();await page.waitForFunction(()=>document.getElementById('copy-status').textContent.length>0);check((await page.locator('#copy-status').innerText()).length>0,'Copy link reports result or accessible fallback');
 check((await page.locator('a.button').getAttribute('href')).includes('/p/estrategia-158-'),'Detail links to the original issue');
 for(const route of ['', '159-01/','158-01/','002-02/','034-01/','098-02/','135-01/']){
  for(const width of [390,1440]){
   await page.setViewportSize({width,height:1000});await page.goto(base+route);await page.waitForLoadState('networkidle');
   check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No overflow ${route||'gallery'} at ${width}`);
   const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
   fs.writeFileSync(path.join(output,`axe-${route.replace('/','')||'gallery'}-${width}.json`),JSON.stringify(axe.violations,null,2));
   check(axe.violations.length===0,`Axe accessibility ${route||'gallery'} at ${width}: ${axe.violations.map(v=>v.id).join(',')}`);
   if(route==='159-01/'){
    await page.locator('.detail-art img').evaluate(img=>img.decode());
    await page.screenshot({path:path.join(output,`issue-159-${width}.png`),fullPage:true});
   }
  }
 }
 // Visit every detail to detect missing content/assets and broken generation.
 await page.setViewportSize({width:390,height:844});
 for(const item of catalog.items){
  const response=await page.goto(base+item.id+'/',{waitUntil:'domcontentloaded'});check(response.status()===200,`Detail responds: ${item.id}`);
  check(await page.locator('h1').innerText()===item.title,`Correct detail title: ${item.id}`);
  await page.locator('.detail-art img').evaluate(img=>img.decode());
  check(await page.locator('.detail-art img').evaluate(img=>img.naturalWidth>0),'Image decodes: '+item.id);
  check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Detail mobile fit: '+item.id);
 }
 const plain=await browser.newContext({javaScriptEnabled:false,viewport:{width:390,height:844}}),plainPage=await plain.newPage();await plainPage.goto(base);
 check(await plainPage.locator('#gallery .meme-card:visible').count()===185,'Complete archive works without JavaScript');
 await plainPage.goto(base+'158-01/');check(await plainPage.locator('h1').isVisible(),'Direct detail works without JavaScript');await plainPage.locator('.transcription summary').click();check(await plainPage.locator('#transcript').isVisible(),'Native transcription works without JavaScript');
 check(errors.length===0,'No uncaught browser errors');await plain.close();await context.close();
 fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({status:'passed',checks,results,limitations:['Automated accessibility checks are not a complete human audit.']},null,2));console.log(`PASS: ${checks} meme-archive checks`);
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{fs.writeFileSync(path.join(output,'failure.json'),JSON.stringify({checks,error:String(error.stack)},null,2));console.error(error);process.exitCode=1;});
