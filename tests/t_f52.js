const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; w.localStorage.setItem('mounjaro-sync-id', 'x'); w.__settingsData = {}; } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); await sleep(2000);
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  console.log('=== protein goal follows everywhere ===');
  ev(`userProteinGoal = 150; renderRings({ protein: '75' }, 0, 0, 7500)`);
  check('the ring label says the real goal', $('ringProteinSub').textContent === 'Protein · goal 150g');
  const circ = ev('RING_CIRC.protein'); const off = parseFloat($('ringProteinArc').style.strokeDashoffset);
  check('75 g of a 150 g goal fills the ring exactly halfway', Math.abs(off - circ * 0.5) < 0.5);
  ev(`userProteinGoal = 100; renderRings({ protein: '75' }, 0, 0, 7500)`);
  check('and with the default 100 g, 75 g is three quarters', Math.abs(parseFloat($('ringProteinArc').style.strokeDashoffset) - circ * 0.25) < 0.5 && $('ringProteinSub').textContent === 'Protein · goal 100g');
  ev(`userProteinGoal = 150; entries = []; updateStats()`);
  check('the stat card with no data says "goal: 150g daily"', /goal: 150g daily/.test($('scProteinSub').textContent));
  const pair = ev(`CORRELATION_PAIRS.find(p => /protein/.test(p.sentence(1, 2)))`);
  check('the protein/resting-HR pattern uses the goal as its split and in its sentence', ev(`CORRELATION_PAIRS.find(p => /protein, resting/.test(p.sentence(1, 2))).splitThreshold`) === 150 && /150g\+ protein/.test(ev(`CORRELATION_PAIRS.find(p => /protein, resting/.test(p.sentence(1, 2))).sentence(1, 2)`)));
  ev(`entries = [{ date: todayStr(), protein: '160' }]; renderWeeklySummary()`);
  const tbl = [...doc.querySelectorAll('th')].map(t => t.textContent).filter(t => /g Days/.test(t));
  check('the weekly table header names the goal (≥150g Days)', tbl.length >= 1 && tbl.every(t => t === '≥150g Days'));
  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
