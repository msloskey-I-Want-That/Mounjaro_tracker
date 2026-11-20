// Quick workout: an "✕ End quick workout" button sits at the top of the Workout Plan card (the old link was only at the very bottom).
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
  check('normal PPL day has no End quick workout button', !doc.querySelector('#workoutPlanBody .quick-end-top'));
  await ev(`startQuickWorkout()`); await sleep(100);
  const top = doc.querySelector('#workoutPlanBody .quick-end-top');
  check('quick workout shows the End button in the card header', !!top && /End quick workout/.test(top.textContent));
  check('the header button comes before the exercise list', !!top && !!doc.querySelector('#workoutPlanBody .quick-end-bar .quick-end-top'));
  check('the title says Quick workout', /Quick workout/.test($('workoutPlanTitle').textContent));
  click(top); await sleep(150);
  check('tapping End returns to the PPL plan', !ev('quickWorkoutOn()') && /PPL/.test($('workoutPlanTitle').textContent) && !doc.querySelector('#workoutPlanBody .quick-end-top'));
  check('no script errors', errors.length === 0);
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
})();
