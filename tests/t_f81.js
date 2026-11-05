// Nov 4: Home's Steps ring says when the number last came from Apple Health ("as of 3:12 pm"),
// because Zepp keeps counting between Shortcut syncs.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; w.__noPreviewList = true; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, ev = s => w.eval(s), $ = id => doc.getElementById(id);
  doc.getElementById('app-main').scrollTo = () => {};
  const asOf = () => $('ringStepsAsOf');
  const vis = el => !!el && el.style.display !== 'none' && el.textContent.trim() !== '';
  // 3:12 pm local today
  const stamp = ev(`(() => { const d = new Date(); d.setHours(15, 12, 0, 0); return d.toISOString(); })()`);

  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = [{ date: todayStr(), steps: '4788', healthSyncedAt: '${stamp}' }]; showView('dashboard'); renderAll();`); await sleep(60);
  check('steps from Apple Health show "as of 3:12 pm" under Steps', vis(asOf()) && asOf().textContent === 'as of 3:12 pm' && $('ringStepsSub').nextElementSibling === asOf());
  check('the number itself is unchanged', $('ringStepsVal').textContent === '4,788');

  ev(`entries = [{ date: todayStr(), steps: '4788' }]; renderAll();`); await sleep(40);
  check('steps typed in by hand (no sync time): no "as of"', !vis(asOf()));

  ev(`entries = [{ date: todayStr(), steps: '4788', healthSyncedAt: '${ev(`(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString(); })()`)}' }]; renderAll();`); await sleep(40);
  check('a sync time from another day: no "as of"', !vis(asOf()));

  ev(`entries = []; renderAll();`); await sleep(40);
  check('no steps today: no "as of"', !vis(asOf()));
  ev(`entries = [{ date: todayStr(), steps: '5000', healthSyncedAt: '${stamp}' }]; renderAll(); renderAll();`); await sleep(40);
  check('re-rendering keeps just one label', doc.querySelectorAll('#ringStepsAsOf').length === 1 && vis(asOf()));

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
