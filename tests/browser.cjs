const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../docs');
const prefix = '/estrategIA-lab/';
let checks = 0;
const check = (condition, message) => { assert.ok(condition, message); checks++; };
const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.pdf': 'application/pdf' };

async function main() {
  // External embeds are not part of these tests. No form is submitted.
  let server;
  let base = process.env.LAB_BASE_URL;
  if (!base) {
    server = http.createServer((req, res) => {
      try {
        const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (!pathname.startsWith(prefix)) { res.writeHead(404).end(); return; }
        let file = path.resolve(root, pathname.slice(prefix.length));
        if (file !== root && !file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        if (!fs.existsSync(file)) { res.writeHead(404).end(); return; }
        res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
        res.end(fs.readFileSync(file));
      } catch { res.writeHead(500).end(); }
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}${prefix}`;
  }
  const browser = await chromium.launch({ headless: true, ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const origin = new URL(base).origin;
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  await page.clock.setFixedTime(new Date('2026-10-15T12:00:00Z'));
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  try {
    for (const width of [320, 360, 390, 560, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base, { waitUntil: 'networkidle' });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Homepage overflow at ${width}px`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base, { waitUntil: 'networkidle' });
    check(await page.locator('h1').innerText() === 'estrategIA lab', 'The homepage identifies the laboratory');
    check(await page.locator('.project-card').count() === 9, 'Nine projects, including renta basica and the English archive, remain accessible');
    check(await page.locator('.english-resource').getAttribute('href') === 'https://elcontemplador.github.io/estrategia-english/', 'English reading edition link');
    check(await page.locator('#laboratorio').isVisible(), 'The laboratory context is visible before the catalogue');
    const ecosystem = await page.locator('.ecosystem').innerText();
    check(['Substack', 'ALEPH', 'estrategIA lab', 'números completos en español'].every(x => ecosystem.includes(x)), 'The relationship between the newsletter, ALEPH and the laboratory is explained');
    check(await page.locator('#archivo-ingles .project-scope').isVisible(), 'English archive scope is visible outside expandable details');
    const englishScope = await page.locator('#archivo-ingles').innerText();
    check(['artículos principales', 'números completos en español', 'tercer aniversario', 'lectores de otros países'].every(x => englishScope.includes(x)), 'English archive purpose and partial translation scope are explicit');
    check(await page.locator('#archivo-ingles img').getAttribute('src') === 'assets/english-archive-preview.webp', 'The English project has its own preview');
    check(await page.locator('#analizador-discursos a[href*="releases/tag/v0.1.1"]').count() === 1, 'Windows download is visible');
    check(await page.locator('#app-estoica a[href*="play.google.com"]').count() === 1, 'Android store link is visible');
    check(await page.locator('[data-anniversary]').isVisible(), 'October anniversary promotion');
    check(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior === 'auto'), 'Reduced motion is respected');
    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base, { waitUntil: 'networkidle' });
      for (const id of ['laboratorio', 'proyectos', 'recursos', 'equipo']) {
        await page.locator(`nav a[href="#${id}"]`).first().click();
        check(await page.evaluate(id => {
          const header = document.querySelector('header');
          const bottom = getComputedStyle(header).position === 'sticky' ? header.getBoundingClientRect().bottom : 0;
          return document.getElementById(id).querySelector('h2').getBoundingClientRect().top >= bottom;
        }, id), `Section title is not hidden at ${width}: ${id}`);
      }
      await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Homepage text at 200% does not overflow at ${width}`);
    }
    await page.clock.setFixedTime(new Date('2026-11-01T12:00:00Z'));
    await page.goto(base, { waitUntil: 'networkidle' });
    check(!await page.locator('[data-anniversary]').isVisible(), 'Anniversary promotion expires after October');
    check(await page.locator('#reto-estrategia').isVisible(), 'The game remains in the catalogue after October');
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base + 'historias/', { waitUntil: 'networkidle' });
    const data = await page.evaluate(() => window.HISTORIAS_DATA);
    check(data.stories.length >= 20, 'The existing archive must be preserved');
    check(await page.locator('.story-card').count() === data.stories.length, 'Initial archive count');
    for (const season of data.seasons) {
      await page.locator(`[data-year="${season.year}"]`).click();
      check(await page.locator('.story-card').count() === data.stories.filter(x => x.year === season.year).length, `Season ${season.year}`);
    }
    await page.locator('[data-year="all"]').click();
    for (const theme of data.themes) {
      await page.locator(`[data-theme="${theme.id}"]`).click();
      check(await page.locator('.story-card').count() === data.stories.filter(x => x.themes.includes(theme.id)).length, `Theme ${theme.id}`);
    }
    await page.locator('[data-theme="all"]').click();
    for (const story of data.stories) {
      await page.locator(`[data-open-story="${story.id}"]`).click();
      check(await page.locator('#dialog-title').innerText() === story.title && await page.locator('#story-dialog').isVisible(), `Story ${story.id}`);
      await page.keyboard.press('Escape');
      check(!await page.locator('#story-dialog').isVisible(), 'Escape closes story');
    }
    await page.goto(base + 'historias/?historia=2026-ley-todos-apoyaban');
    check(await page.locator('#story-dialog').isVisible(), 'Direct story link');
    await page.keyboard.press('Escape');
    await page.locator('[data-open-pdf]').first().click();
    check(await page.locator('#pdf-dialog').isVisible(), 'Desktop PDF reader opens');
    check((await page.locator('#pdf-reader-frame').getAttribute('src')).includes('archivo_historias_2024_2026.pdf'), 'PDF reader target');
    await page.keyboard.press('Escape');
    const pdfs = new Set(await page.locator('a[href$=".pdf"]').evaluateAll(xs => xs.map(x => x.href)));
    check(pdfs.size === 4, 'Four archive PDF downloads');
    for (const url of pdfs) {
      const response = await page.request.get(url);
      check(response.status() === 200 && (await response.body()).subarray(0, 5).toString() === '%PDF-', `PDF ${url}`);
    }

    await page.goto(base + 'que-es-la-ia/', { waitUntil: 'networkidle' });
    await page.locator('[data-completion-select]').selectOption('ayuntamiento');
    check(await page.locator('[data-completion-fragment]').innerText() === 'Un ayuntamiento puede usar IA para...', 'Completion updates');
    for (const selector of ['[data-flow="agentico"]', '[data-block="rol"]', '[data-risk="alto"]', '[data-scenario="fuente"]', '[data-claim="hallucination"]', '.flashcard']) {
      const button = page.locator(selector).first();
      await button.click();
      check(await button.getAttribute('aria-pressed') === 'true', `Selected state ${selector}`);
    }
    await page.locator('[data-block="rol"]').click();
    check(await page.locator('[data-block="rol"]').getAttribute('aria-pressed') === 'false', 'Deselected prompt block');
    check(await page.locator('[data-prompt-score]').innerText() === '0/6', 'Prompt counter');
    check(await page.locator('.flow-step').count() === 5, 'Agent flow');
    check(await page.locator('[data-risk-title]').innerText() === 'Riesgo alto', 'Risk selection');
    for (const box of await page.locator('[data-checklist] input').all()) await box.check();
    check(await page.locator('[data-checklist-progress]').innerText() === '8 de 8 preguntas marcadas', 'Checklist counter');

    // The new monograph is served below the LAB base path, with portable downloads.
    await page.goto(base);
    await page.locator('#renta-basica a[href="renta-basica/"]').click();
    await page.waitForLoadState('networkidle');
    check(page.url() === base + 'renta-basica/', 'Catalogue opens the monograph in the LAB');
    check(await page.locator('link[rel="canonical"]').getAttribute('href') === 'https://elcontemplador.github.io/estrategIA-lab/renta-basica/', 'Renta basica canonical route');
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Monograph overflow at ' + width + 'px');
    }
    check(await page.locator('#gross-value').innerText() === '96,0' && await page.locator('#balance-value').innerText() === '62,4 mil M€', 'Migrated calculator initial balance');
    await page.locator('#payment').focus();
    await page.keyboard.press('ArrowRight');
    check(await page.locator('#balance-value').innerText() === '66,3 mil M€', 'Migrated calculator remains interactive');
    await page.locator('#reset-calculator').click();
    await page.goto(base + 'renta-basica/#fuente-kela');
    check(await page.locator('#fuente-kela').isVisible(), 'Previously shared reference fragment survives migration');
    await page.locator('#fuente-kela .source-return').click();
    check(await page.locator('#cita-kela-1').evaluate(e => e === document.activeElement), 'Reference returns to the cited passage');
    await page.goto(base + 'renta-basica/#escenario-desplazamiento');
    check(await page.locator('#escenario-desplazamiento').isVisible(), 'Scenario deep link survives migration');
    for (const [file, signature] of [['renta-basica-informe.pdf', '%PDF-'], ['renta-basica-informe.md', '# Preparar la renta básica']]) {
      const response = await page.request.get(base + 'renta-basica/' + file);
      const body = await response.body();
      check(response.status() === 200 && (file.endsWith('.pdf') ? body.toString('utf8', 0, 5) === signature : body.toString('utf8').includes(signature)), 'Monograph download: ' + file);
    }
    await page.locator('.top-link').click();
    check(page.url() === base, 'Monograph provides a working return to the LAB');

    await page.goto(base + 'agora2032/', { waitUntil: 'networkidle' });
    await page.locator('[data-go="laboratorio"]').click();
    await page.locator('[data-case-choice="detener"]').click();
    check(await page.locator('#case-result').isVisible(), 'First simulation');
    await page.locator('[data-module="escuela"]').click();
    await page.locator('[data-school-choice="mixto"]').click();
    check(await page.locator('#school-result').isVisible(), 'School simulation');
    await page.locator('[data-module="computo"]').click();
    await page.locator('#simulate-allocation').click();
    check(await page.locator('#compute-result').isVisible(), 'Compute simulation');
    await page.locator('[data-module="ley"]').click();
    for (const box of await page.locator('[data-common-core]').all()) await box.check();
    await page.locator('#publish-core').click(); // Fictional simulation; no network write.
    check(await page.locator('#law-result').isVisible(), 'Law simulation');
    await page.locator('[data-module="cancion"]').click();
    await page.locator('[data-catalog="reconstruccion"]').click();
    check(await page.locator('#song-result').isVisible(), 'Song simulation');
    check(await page.locator('#progress-count').innerText() === '5', 'Five decisions completed');
    await page.reload();
    check(await page.locator('#progress-count').innerText() === '5', 'Progress survives reload');
    await page.locator('[data-route="archivo"]').click();
    for (const button of await page.locator('[data-open-archive]').all()) {
      await button.click();
      check(await page.locator('#archive-dialog').isVisible(), 'Agora dossier');
      await page.keyboard.press('Escape');
    }
    check(errors.length === 0, `JavaScript errors: ${errors.join('; ')}`);
    const nojs = await browser.newContext({ javaScriptEnabled: false });
    const plain = await nojs.newPage();
    await plain.goto(base);
    check(await plain.locator('.project-card').count() === 9, 'All projects remain accessible without JavaScript');
    check(await plain.locator('.english-resource').isVisible(), 'English edition remains accessible without JavaScript');
    check(await plain.locator('#laboratorio').isVisible() && await plain.locator('#archivo-ingles .project-scope').isVisible(), 'Editorial context and English scope remain visible without JavaScript');
    await plain.goto(base + 'renta-basica/');
    check(await plain.locator('.source-list li').count() === 36, 'Monograph sources remain readable without JavaScript');
    check(await plain.locator('#payment').isDisabled() && await plain.locator('.scenario-panel:visible').count() === 3, 'No-JavaScript reading mode remains honest and complete');
    check(await plain.locator('a[href="renta-basica-informe.pdf"]').count() > 0, 'Monograph download remains accessible without JavaScript');
    await plain.goto(base + 'que-es-la-ia/');
    const sections = plain.locator('.reveal');
    check(await sections.count() >= 12, 'Guide sections preserved');
    check(await sections.evaluateAll(xs => xs.every(x => getComputedStyle(x).opacity === '1')), 'Guide remains readable without JavaScript');
    console.log(`PASS: ${checks} browser checks (${process.env.LAB_BASE_URL ? 'published site' : 'local docs'}).`);
  } finally {
    await browser.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exit(1); });
