'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const engines = require('playwright');
const root = path.resolve(__dirname, '../docs');
const prefix = '/estrategIA-lab/';
const outputArg = process.argv.indexOf('--output');
const output = path.resolve(outputArg < 0 ? 'qa/renta-basica-navigation' : process.argv[outputArg + 1]);
const results = [];

// Let the browser finish fragment navigation, the application's two animation
// frames and focus scrolling before inspecting positions. Reading scrollY
// immediately after Tab can falsely distinguish WebKit's native tab behaviour.
async function settle(page) {
  await page.evaluate(() => new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }));
  await page.waitForTimeout(150);
}
async function state(page) {
  return page.evaluate(() => ({
    scroll: scrollY,
    focus: {
      tag: document.activeElement.tagName,
      id: document.activeElement.id,
      href: document.activeElement.getAttribute('href'),
      text: document.activeElement.textContent.trim()
    }
  }));
}
async function chapterPoint(page) {
  const chapter = page.locator('.chapter-nav a[href="#idea"]');
  // Scrolling the article schedules an active-chapter update, which can move
  // this horizontal strip on its next animation frame. Let that finish before
  // positioning the pointer; Linux WebKit can deliver the scroll event later.
  await settle(page);
  let point;
  let hit;
  for (let attempt = 0; attempt < 5; attempt++) {
    await chapter.evaluate(element => {
      const box = element.getBoundingClientRect();
      const nav = element.parentElement;
      const navBox = nav.getBoundingClientRect();
      nav.scrollTo({left: nav.scrollLeft + box.left - navBox.left - (navBox.width - box.width) / 2, behavior: 'instant'});
    });
    await settle(page);
    const box = await chapter.boundingBox();
    assert.ok(box, 'The chapter link has a visible bounding box');
    point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    hit = await page.evaluate(({x, y}) => document.elementFromPoint(x, y)?.closest('a')?.hash, point);
    if (hit !== '#idea') continue;
    // Verify the exact same pointer position remains over the link after any
    // pending scroll handlers. Do not force clicks through the index overlay.
    await settle(page);
    hit = await page.evaluate(({x, y}) => document.elementFromPoint(x, y)?.closest('a')?.hash, point);
    if (hit === '#idea') return point;
  }
  assert.equal(hit, '#idea', 'The actual click hits La idea stably, including underneath the mobile index overlay');
  return point;
}
async function trial(browser, url, engine, width, mode) {
  const context = await browser.newContext({viewport: {width, height: 900}, reducedMotion: 'reduce'});
  const origin = new URL(url).origin;
  await context.route('**/*', route => new URL(route.request().url()).origin === origin ? route.continue() : route.abort());
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const result = {engine, width, mode};
  try {
    await page.goto(url + '#cita-amodei2026-1', {waitUntil: 'networkidle'});
    await page.locator('#cita-kela-1').focus();
    await page.keyboard.press('Enter');
    await page.waitForURL('**/#fuente-kela');
    await settle(page);
    assert.equal((await state(page)).focus.id, 'fuente-kela', 'Keyboard citation navigation focuses its source');
    if (mode === 'browser-back') {
      await page.goBack();
    } else {
      await page.locator('#fuente-kela .source-return').click();
    }
    await settle(page);
    assert.equal((await state(page)).focus.id, 'cita-kela-1', 'Returning from a source focuses the exact cited passage');
    await page.locator('#respuesta-rapida').evaluate(element => element.scrollIntoView({block: 'center', behavior: 'instant'}));
    const point = await chapterPoint(page);
    const departure = await state(page);
    const oldHash = new URL(page.url()).hash;
    await page.mouse.click(point.x, point.y);
    await page.waitForURL('**/#idea');
    await settle(page);
    await page.goBack();
    await page.waitForURL(candidate => candidate.hash === oldHash);
    await page.waitForFunction(() => history.state?.rentaScroll === null);
    await settle(page);
    const restored = await state(page);
    assert.ok(Math.abs(restored.scroll - departure.scroll) < 3, 'Back restores the reading position, not the old fragment or citation');
    assert.equal(restored.focus.href, '#idea', 'Back returns focus to the chapter link used to leave');
    await page.keyboard.press('Tab');
    await settle(page);
    const afterTab = await state(page);

    // A fresh page provides the native baseline at precisely the same position
    // and focused link. WebKit on Windows skips links with ordinary Tab. Compare
    // equivalent journeys instead of assuming every browser tabs through links.
    const baseline = await context.newPage();
    await baseline.goto(url, {waitUntil: 'networkidle'});
    await baseline.locator('.chapter-nav a[href="#idea"]').evaluate((element, y) => {
      element.focus({preventScroll: true});
      window.scrollTo({top: y, behavior: 'instant'});
    }, restored.scroll);
    await chapterPoint(baseline);
    await baseline.keyboard.press('Tab');
    await settle(baseline);
    const nativeTab = await state(baseline);
    assert.deepEqual(afterTab.focus, nativeTab.focus, 'Tab after Back follows the same native focus order as a fresh page');
    assert.ok(Math.abs(afterTab.scroll - nativeTab.scroll) < 5, 'Tab after Back scrolls like the native baseline');
    assert.deepEqual(errors, [], 'No application errors during navigation');
    Object.assign(result, {passed: true, departure, restored, afterTab, nativeTab});
    await baseline.close();
  } catch (error) {
    Object.assign(result, {passed: false, error: error.message});
    await page.screenshot({path: path.join(output, `${engine}-${width}-${mode}.png`)}).catch(() => {});
  } finally {
    results.push(result);
    await context.close();
  }
}
async function main() {
  fs.mkdirSync(output, {recursive: true});
  let server;
  let base = process.env.LAB_BASE_URL;
  if (!base) {
    server = http.createServer((request, response) => {
      try {
        const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
        if (!pathname.startsWith(prefix)) {response.writeHead(404).end(); return;}
        let file = path.resolve(root, pathname.slice(prefix.length));
        if (file !== root && !file.startsWith(root + path.sep)) {response.writeHead(403).end(); return;}
        if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, 'index.html');
        if (!fs.existsSync(file)) {response.writeHead(404).end(); return;}
        const mime = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp'};
        response.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'});
        response.end(fs.readFileSync(file));
      } catch {response.writeHead(500).end();}
    });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    base = `http://127.0.0.1:${server.address().port}${prefix}`;
  }
  try {
    for (const engine of ['chromium', 'firefox', 'webkit']) {
      let browser;
      try {
        browser = await engines[engine].launch({headless: true});
        for (const width of [390, 1440]) {
          for (const mode of ['browser-back', 'return-link']) {
            await trial(browser, new URL('renta-basica/', base).href, engine, width, mode);
          }
        }
      } catch (error) {results.push({engine, passed: false, error: error.message});}
      finally {if (browser) await browser.close();}
    }
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(output, 'results.json'), JSON.stringify(results, null, 2) + '\n');
  }
  const failures = results.filter(result => !result.passed);
  console.log(`${results.length - failures.length}/${results.length} navigation cases passed (Chromium, Firefox, WebKit).`);
  if (failures.length) {console.error(JSON.stringify(failures, null, 2)); process.exitCode = 1;}
}
main().catch(error => {console.error(error); process.exitCode = 1;});
