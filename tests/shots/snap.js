// usage: node snap.js <setup.js> <selector> <out.png> [theme] [width]
const { chromium } = require('/home/claude/.npm-global/lib/node_modules/playwright');
const fs = require('fs');
(async () => {
  const [setupFile, selector, out, theme = 'dark', width = '375'] = process.argv.slice(2);
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] });
  const page = await (await browser.newContext({ viewport: { width: +width, height: +(process.env.SNAP_H || 812) }, deviceScaleFactor: 3 })).newPage();
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { window.Chart = class { constructor(){} destroy(){} update(){} }; });
  await page.goto('http://localhost:8765/app.html'); await page.waitForTimeout(1500);
  await page.evaluate((t) => { document.querySelectorAll('.modal-overlay').forEach(m => m.remove()); document.documentElement.setAttribute('data-theme', t); }, theme);
  await page.evaluate(fs.readFileSync(setupFile, 'utf-8')); await page.evaluate(() => { const n = document.getElementById('bottom-nav'); if (n) n.style.display = 'none'; });
  await page.waitForTimeout(900);
  await page.locator(selector).first().scrollIntoViewIfNeeded();
  await page.locator(selector).first().screenshot({ path: out });
  console.log('saved', out, errs.length ? 'PAGEERRORS: ' + errs.join(' | ') : '(no page errors)');
  await browser.close();
})().catch(e => { console.error('SNAP FAILED', e.message); process.exit(1); });
