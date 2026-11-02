const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function boot(storage) { const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; Object.entries(storage || {}).forEach(([k, v]) => w.localStorage.setItem(k, v)); } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); return dom; }
(async () => {
  let dom = boot(); await sleep(1800); let doc = dom.window.document, w = dom.window; let ev = s => w.eval(s);
  console.log('=== 1. collapsed by default, in every plan style ===');
  for (const mode of ['ppl', 'split', 'other']) {
    ev(`workoutPlanMode = '${mode}'; entries = []; renderWorkoutPlan();`);
    const tip = doc.getElementById('planTip');
    check(`${mode}: a single "ⓘ How this works" line, closed`, !!tip && tip.open === false && tip.querySelector('summary').textContent === 'ⓘ How this works');
    check(`${mode}: the explanation text is inside it (nothing lost)`, /Check off each set as you finish it — a rest timer starts automatically/.test(tip.querySelector('.plan-tip-body').textContent));
  }
  ev(`workoutPlanMode = 'ppl'; renderWorkoutPlan();`);
  check('the PPL version still names the next day ("moves to … Day once you do")', /moves to \w+ Day once you do/.test(doc.getElementById('planTip').textContent) || /Check off each set/.test(doc.getElementById('planTip').textContent));
  check('no loose copy of the blurb is left outside the tip', !/Sore, tired/.test(doc.getElementById('workoutPlanBody').textContent.replace(doc.getElementById('planTip').textContent, '')));
  console.log('=== 2. remembers if you open it ===');
  const tip = () => doc.getElementById('planTip');
  tip().open = true; tip().dispatchEvent(new w.Event('toggle'));
  check('opening it is saved', w.localStorage.getItem('mounjaro-plan-tip-open') === '1');
  ev('renderWorkoutPlan();');
  check('it stays open through re-renders (e.g. every time you check off a set)', tip().open === true);
  tip().open = false; tip().dispatchEvent(new w.Event('toggle'));
  ev('renderWorkoutPlan();');
  check('closing it is saved and sticks', w.localStorage.getItem('mounjaro-plan-tip-open') === '0' && tip().open === false);
  dom = boot({ 'mounjaro-plan-tip-open': '1' }); await sleep(1800); doc = dom.window.document; w = dom.window; ev = s => w.eval(s);
  ev(`workoutPlanMode = 'ppl'; entries = []; renderWorkoutPlan();`);
  check('a fresh launch opens it if you left it open', doc.getElementById('planTip').open === true);
  console.log('=== Errors ==='); console.log(dom.errors.length ? dom.errors.join('\n') : '(none)');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
})(); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 40000);
