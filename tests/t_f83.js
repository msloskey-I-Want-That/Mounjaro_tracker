// Nov 9 — Exercise tab batch 2: rest adapts to "reps left" (+30 s after a failure set, −15 s after an easy one),
// live "▲/▼ N lb vs last time" per card and for the session, and a stall alert with Reset / Swap fixes.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; w.__noPreviewList = true; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, ev = s => w.eval(s), $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  const d = n => ev(`lbAddDays(todayStr(), ${-n})`);
  const S = (wt, r) => [0, 1, 2].map(() => ({ weight: wt, reps: r }));
  // Lat Pulldown: 110 × 10 four sessions running → stalled. Seated Row: 110 → 125, climbing → not stalled.
  const hist = [14, 10, 6, 2].map((ago, i) => ({ date: d(ago), ex: [{ type: 'Strength', min: 50, planDay: 'Pull', sets: { 'Lat Pulldown': S(110, 10), 'Seated Row': S(110 + i * 5, 11) } }] }));
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = ${JSON.stringify(hist)}; exerciseGroups = {}; exerciseStations = {}; customWorkoutExercises = {}; hiddenWorkoutExercises = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Pull'; workoutSessionState = {}; showView('exercise'); renderWorkoutPlan();`);
  await sleep(60);
  const card = n => doc.querySelector(`.workout-exercise-block[data-exercise="${n}"]`);
  const rows = n => [...card(n).querySelectorAll('.set-row')];

  console.log('=== 6. stall alert ===');
  const box = card('Lat Pulldown').querySelector('.stall-box');
  check('Lat Pulldown (110 × 10 four times) shows "Stalled: no progress in 3 sessions"', !!box && /Stalled: no progress in 3 sessions at about 110 lb/.test(box.textContent));
  check('with two fixes: "Reset to 100 lb × 12" and "Swap exercise"', /Reset to 100 lb × 12/.test(box.querySelector('.stall-reset-btn').textContent) && !!box.querySelector('.stall-swap-btn'));
  check('the target line points at it', /or take the reset below/.test(card('Lat Pulldown').querySelector('.ex-today-target').textContent));
  check('a climbing lift (Seated Row 110 → 125) has no stall box', !card('Seated Row').querySelector('.stall-box'));
  check('the old "Stuck at …" line is gone', !/Stuck at/.test(doc.getElementById('view-exercise').textContent));
  click(box.querySelector('.stall-reset-btn')); await sleep(40);
  check('Reset fills every open set with 100 × 12', ev(`workoutSessionState['Lat Pulldown'].every(q => Number(q.weight) === 100 && Number(q.reps) === 12)`));
  check('and the box confirms it; target says "100 lb × 12, then build back up"', /Reset set: 100 lb × 12/.test(card('Lat Pulldown').querySelector('.stall-box').textContent) && /100 lb × 12, then build back up/.test(card('Lat Pulldown').querySelector('.ex-today-target').textContent));
  click(card('Lat Pulldown').querySelector('.swap-toggle-btn') ? card('Lat Pulldown').querySelector('.swap-toggle-btn') : doc.body); await sleep(10);
  ev(`workoutSessionState = {}; renderWorkoutPlan();`); await sleep(30);
  const sel = card('Lat Pulldown').querySelector('.swap-select'); if (sel) sel.style.display = 'none';
  click(card('Lat Pulldown').querySelector('.stall-swap-btn')); await sleep(20);
  check('Swap exercise opens the swap picker', card('Lat Pulldown').querySelector('.swap-select').style.display !== 'none');
  ev(`entries[3].ex[0].sets['Lat Pulldown'] = ${JSON.stringify(S(110, 12))}; workoutSessionState = {}; renderWorkoutPlan();`); await sleep(30);
  check('one better session (110 × 12) clears the stall', !card('Lat Pulldown').querySelector('.stall-box'));
  check('fewer than 4 sessions: never called a stall', ev(`stallFor('Hammer Curl', '3 × 10–12')`) === null);

  console.log('=== 5. vs last time ===');
  click($('startPlanBtn')); await sleep(60);
  check('before any set: no pace line', !$('workoutPaceLine') && !card('Seated Row').querySelector('.ex-pace'));
  ev(`workoutSessionState['Seated Row'][0].weight = '125'; workoutSessionState['Seated Row'][0].reps = '12'; renderWorkoutPlan();`); await sleep(20);
  click(rows('Seated Row')[0].querySelector('.set-check-btn')); await sleep(40);
  check('Seated Row 125 × 12 vs last 125 × 11 → card: "▲ 125 lb ahead of last time (1 set in)"', /▲ 125 lb ahead of last time\s*\(1 set in\)/.test(card('Seated Row').querySelector('.ex-pace').textContent) && card('Seated Row').querySelector('.ex-pace').classList.contains('up'));
  check('session line under "so far": "▲ 125 lb ahead of last time" with % of last time and a bar', /▲ 125 lb ahead of last time/.test($('workoutPaceLine').textContent) && /% of it so far/.test($('workoutStartFinishBlock').textContent) && !!doc.querySelector('.pace-bar'));
  check('the existing "1 set · 1,500 lb so far" line is unchanged', /1 set · 1,500 lb so far/.test($('workoutLiveLine').textContent));
  ev(`workoutSessionState['Lat Pulldown'][0].weight = '100'; workoutSessionState['Lat Pulldown'][0].reps = '10'; renderWorkoutPlan();`); await sleep(20);
  click(rows('Lat Pulldown')[0].querySelector('.set-check-btn')); await sleep(40);
  check('Lat Pulldown 100 × 10 vs 110 × 12 → "▼ 320 lb behind last time"', /▼ 320 lb behind last time/.test(card('Lat Pulldown').querySelector('.ex-pace').textContent) && card('Lat Pulldown').querySelector('.ex-pace').classList.contains('down'));
  check('session adds them up: 125 − 320 → "▼ 195 lb behind last time"', /▼ 195 lb behind last time/.test($('workoutPaceLine').textContent));

  console.log('=== 4. rest adapts to reps left ===');
  const total0 = ev('restTimerTotalSeconds');
  click(rows('Lat Pulldown')[0].querySelector('.rir-btn[data-rir="0"]')); await sleep(30);
  check('0 💀 (failure) adds 30 s to this rest', ev('restTimerTotalSeconds') === total0 + 30);
  check('and the countdown says "+30s · failure set"', /\+30s · failure set/.test((doc.querySelector('.rest-inline-note') || {}).textContent || ''));
  check('the saved rest time for the exercise is unchanged', ev(`(exerciseRestOverride || {})['Lat Pulldown'] === undefined`));
  ev(`workoutSessionState['Lat Pulldown'][1].weight = '100'; workoutSessionState['Lat Pulldown'][1].reps = '10'; renderWorkoutPlan();`); await sleep(20);
  click(rows('Lat Pulldown')[1].querySelector('.set-check-btn')); await sleep(30);
  const total1 = ev('restTimerTotalSeconds');
  check('the next set starts a fresh rest with no note', total1 === total0 && !doc.querySelector('.rest-inline-note'));
  click(rows('Lat Pulldown')[1].querySelector('.rir-btn[data-rir="3"]')); await sleep(30);
  check('3+ (easy) takes 15 s off: "−15s · easy set"', ev('restTimerTotalSeconds') === total1 - 15 && /-15s · easy set/.test(doc.querySelector('.rest-inline-note').textContent));
  click(rows('Lat Pulldown')[1].querySelector('.set-rir-badge')); await sleep(20);
  click(rows('Lat Pulldown')[1].querySelector('.rir-btn[data-rir="2"]')); await sleep(20);
  check('1 or 2 left: no change to the rest', ev('restTimerTotalSeconds') === total1 - 15 && ev('nudgeRestForEffort("x:9", 2)') === 0);
  check('the countdown is big (52 px bar)', /\.rest-inline-bar \{ height: 52px/.test([...doc.querySelectorAll('style')].map(s => s.textContent).join('')));

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
