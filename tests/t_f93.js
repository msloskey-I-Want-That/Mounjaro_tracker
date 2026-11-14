// Nov 14 audit, batch 4 — removing a day's last meal clears its old totals; a ?sync= link asks before switching
// accounts; History search, the Food favorite ✕ and the muscle-map header have 44 px tap areas.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

function load(url, storedId, confirmAnswer, prompts) {
  return new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url, pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
      w.confirm = () => { prompts.n++; return confirmAnswer; }; w.alert = () => {}; w.__noPreviewList = true;
      if (storedId) w.localStorage.setItem('mounjaro-sync-id', storedId);
    } });
}

(async () => {
  console.log('=== sync link ===');
  let p = { n: 0 }; let d = load('https://example.com/?sync=NEWID', 'OLDID', false, p); await sleep(2500);
  check('different account in the link: asks first', p.n === 1);
  check('Cancel keeps the current account', d.window.localStorage.getItem('mounjaro-sync-id') === 'OLDID');
  d.window.close();
  p = { n: 0 }; d = load('https://example.com/?sync=NEWID', 'OLDID', true, p); await sleep(2500);
  check('OK switches to the link account', d.window.localStorage.getItem('mounjaro-sync-id') === 'NEWID' && p.n === 1);
  d.window.close();
  p = { n: 0 }; d = load('https://example.com/?sync=OLDID', 'OLDID', false, p); await sleep(2500);
  check('same account in the link (your Shortcut): no prompt, still works', p.n === 0 && d.window.localStorage.getItem('mounjaro-sync-id') === 'OLDID');
  d.window.close();
  p = { n: 0 }; d = load('https://example.com/?sync=FIRST', null, false, p); await sleep(2500);
  check('a fresh phone takes the link account without a prompt', p.n === 0 && d.window.localStorage.getItem('mounjaro-sync-id') === 'FIRST');
  d.window.close();

  console.log('=== last meal removed ===');
  const errors = [];
  p = { n: 0 }; d = load('https://example.com/', null, true, p);
  d.window.addEventListener('error', e => errors.push(e.message));
  await sleep(2500);
  const w = d.window, ev = s => w.eval(s), doc = w.document;
  const writes = []; w.__setDocImpl = (ref, data) => { writes.push(data); return Promise.resolve(); };
  ev(`syncId = 'x'; entries = [{ date: '2026-11-10', meals: [{ ts: 1, desc: 'Eggs', mt: 'Breakfast', protein: '20', cal: '150' }], protein: '20', calories: '150' }, { date: '2026-11-11', protein: '90' }]; renderAll();`);
  await ev(`deleteMeal('2026-11-10', 1)`);
  const e10 = ev(`entries.find(e => e.date === '2026-11-10')`);
  check('totals cleared locally after the last meal is removed', !e10.protein && !e10.calories);
  check('cleared in the saved copy too', writes.length && writes[0].protein === '' && writes[0].calories === '');
  writes.length = 0;
  await ev(`writeMeals('2026-11-11', [])`);
  check('a day with typed-in totals and no meals is left alone', ev(`entries.find(e => e.date === '2026-11-11').protein`) === '90' && writes[0].protein === undefined);
  writes.length = 0;
  ev(`entries = [{ date: '2026-11-12', meals: [{ ts: 1, desc: 'A', mt: 'Lunch', protein: '10', cal: '100' }, { ts: 2, desc: 'B', mt: 'Lunch', protein: '5', cal: '50' }] }]; renderAll();`);
  await ev(`deleteMeal('2026-11-12', 1)`);
  check('removing one of two meals recalculates totals', writes[0].protein === '5' && writes[0].calories === '50');

  console.log('=== tap areas ===');
  const html2 = html;
  check('History search row is at least 44 px tall', /\.history-search \{ min-height: 44px/.test(html2));
  check('muscle-map header is at least 44 px tall', /\.mm-header \{[^}]*min-height: 44px/.test(html2));
  check('Food favorite ✕ has a 44 px area', /#favFoods \[data-pin-remove\] \{[^}]*min-width: 44px; min-height: 44px/.test(html2));
  check('no script errors', errors.length === 0);
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED');
  process.exit(fails ? 1 : 0);
})();
