// Exercise cards: last 3 sessions trend, live sets + lb line during a workout, auto-advance after the last set.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, ev = s => w.eval(s), $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  doc.getElementById('app-main').scrollTo = () => {}; let scrolled = []; w.HTMLElement.prototype.scrollIntoView = function () { scrolled.push(this.dataset && this.dataset.exercise); };
  const d = n => ev(`lbAddDays(todayStr(), ${-n})`);
  const S = (wt, r) => [{ weight: wt, reps: r }, { weight: wt, reps: r }];
  const hist = [[12, 100], [8, 105], [4, 110], [16, 95]].map(([ago, wt]) => ({ date: d(ago), ex: [{ type: 'Strength', min: 50, planDay: 'Pull', sets: { 'Lat Pulldown': S(wt, 12), 'Seated Row': S(130 - (ago > 10 ? 0 : 10), 10) } }] }));
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = ${JSON.stringify(hist)}.sort((a, b) => a.date.localeCompare(b.date)); exerciseGroups = {}; exerciseStations = {}; customWorkoutExercises = {}; hiddenWorkoutExercises = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Pull'; workoutSessionState = {}; renderWorkoutPlan();`);
  await sleep(60);
  const card = n => doc.querySelector(`.workout-exercise-block[data-exercise="${n}"]`);

  console.log('=== last 3 sessions ===');
  const lp = card('Lat Pulldown').querySelector('.ex-trend');
  check('Lat Pulldown shows its last 3 top weights, oldest to newest: 100 → 105 → 110 lb ▲', lp && /Last 3:\s*100 → 105 → 110 lb\s*▲/.test(lp.textContent));
  const sr = card('Seated Row').querySelector('.ex-trend');
  check('Seated Row going down is marked ▼ (130 → 120 → 120)', sr && /130 → 120 → 120 lb\s*▼/.test(sr.textContent));
  check('an exercise with no history shows no trend line', !card('Hammer Curl').querySelector('.ex-trend'));

  console.log('=== live line ===');
  click($('startPlanBtn')); await sleep(60);
  check('once started: "0 sets · 0 lb so far"', /0 sets · 0 lb so far/.test(($('workoutLiveLine') || {}).textContent || ''));
  const rows = [...card('Lat Pulldown').querySelectorAll('.set-row')];
  rows.forEach(r => { r.querySelector('input[type="number"], .set-weight-input') ; });
  ev(`workoutSessionState['Lat Pulldown'].forEach(q => { q.weight = '110'; q.reps = '12'; })`);
  click(card('Lat Pulldown').querySelector('.set-check-btn')); await sleep(60);
  check('after one set: "1 set · 1,320 lb so far" and last time shown', /1 set · 1,320 lb so far/.test($('workoutLiveLine').textContent) && /Last time:/.test($('workoutStartFinishBlock').textContent));

  console.log('=== auto-advance (already built, kept) ===');
  const n = ev(`workoutSessionState['Lat Pulldown'].length`);
  for (let i = 1; i < n; i++) { const b = [...card('Lat Pulldown').querySelectorAll('.set-row')].find(r => !r.classList.contains('done')).querySelector('.set-check-btn'); click(b); await sleep(40); }
  check('finishing the last set collapses Lat Pulldown and jumps to the next exercise', ev(`collapsedExercises.has('Lat Pulldown')`) && scrolled.includes('Seated Row'));

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
