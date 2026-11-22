// Walks give each leg muscle 1 set of credit per walking day on the muscle map; Apple Health walks count from 2 miles.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; w.__noPreviewList = true;
      w.localStorage.setItem('mounjaro-sync-id', 'x'); w.__settingsData = {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {}; } });
  const errors = []; dom.window.addEventListener('error', e => errors.push(e.message)); await sleep(2300);
  const w = dom.window, doc = w.document, ev = s => w.eval(s), $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); workoutPlanMode = 'ppl'; entries = []; renderWorkoutPlan();`);
  const T = ev(`todayStr()`);
  ev(`syncId='x'; entries = [{ date: '${T}', ex: [{ type: 'Walk', dist: '3', min: '55' }] }]; null`);
  let st = ev(`JSON.stringify(muscleStats())`); st = JSON.parse(st);
  check('Quads get 1 walk credit set this week', st.Quads.sets === 1 && st.Quads.walkCredit === 1);
  check('Hamstrings and Calves too', st.Hamstrings.sets === 1 && st.Calves.sets === 1);
  check('Chest is untouched', st.Chest.sets === 0);
  ev(`entries = [{ date: '${T}', ex: [{ type: 'Walk', dist: '3', min: '55' }, { type: 'Dog Walk', dist: '1.5', min: '30' }] }]; null`);
  st = JSON.parse(ev(`JSON.stringify(muscleStats())`));
  check('two walks the same day still earn only 1', st.Quads.sets === 1);
  ev(`entries = [{ date: '${T}', ex: [{ type: 'Walk', dist: '0.4', min: '8' }] }]; null`);
  st = JSON.parse(ev(`JSON.stringify(muscleStats())`));
  check('a short stroll earns nothing', st.Quads.sets === 0);
  ev(`entries = [{ date: '${T}', distanceMi: 2.1 }]; null`);
  st = JSON.parse(ev(`JSON.stringify(muscleStats())`));
  check('Apple Health 2.1 miles with no walk logged counts', st.Quads.sets === 1);
  ev(`entries = [{ date: '${T}', distanceMi: 1.8 }]; null`);
  st = JSON.parse(ev(`JSON.stringify(muscleStats())`));
  check('Apple Health 1.8 miles does not', st.Quads.sets === 0);
  ev(`entries = [{ date: '${T}', ex: [{ type: 'Walk', dist: '3', min: '55' }] }]; null`);
  check('weekly strength volume / balance stay strength-only', ev(`muscleSetsLastDays(14).counts.Quads || 0`) === 0);
  check('no script errors', errors.length === 0);
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
