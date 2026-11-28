// Injection day is a setting (default Saturday); the dose due/overdue/countdown follow it.
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
  const dow = n => ev(`(new Date().getDay() + ${n} + 7) % 7`);
  ev(`syncId='x'; window.__setDocImpl=()=>Promise.resolve(); appMode='everything'; entries=[]; null`);
  check('default injection day is Saturday', ev(`injectionDay`) === '6');
  check('Settings has an Injection day picker with 7 days', !!$('setInjectionDay') && $('setInjectionDay').options.length === 7);
  ev(`injectionDay = String(${dow(0)}); null`);
  check('injection weekday = today -> due today', ev(`todayDoseStatus().kind`) === 'due');
  ev(`injectionDay = String(${dow(-1)}); null`);
  let s1 = ev(`todayDoseStatus()`);
  check('injection weekday = yesterday -> 1 day late', s1.kind === 'overdue' && /1 day late/.test(s1.val));
  ev(`injectionDay = String(${dow(1)}); null`);
  check('injection weekday = tomorrow -> not due today', ev(`todayDoseStatus().kind`) !== 'due');
  const yest = ev(`lbAddDays(todayStr(), -1)`);
  ev(`injectionDay = String(${dow(0)}); entries=[{date:'${yest}', injection:true}]; null`);
  check('shot logged yesterday counts for a due-today cycle', ev(`todayDoseStatus().kind`) === 'done');
  ev(`injectionDay = String(${dow(-2)}); entries=[{date:'${ev(`lbAddDays(todayStr(), -2)`)}', injection:true}]; null`);
  const cd = ev(`computeNextDoseCountdown()`);
  check('countdown follows the chosen day (5 days after a 2-days-ago shot day)', cd && cd.daysUntil === 5);
  ev(`injectionDay = 'junk'; null`);
  check('bad value falls back safely (no shift)', ev(`injShiftDays()`) === 0);
  check('no script errors', errors.length === 0);
  console.log(fails ? 'FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
