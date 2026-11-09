// Nov 9 — Exercise tab batch 1: "Reps left?" after each working set (saved with the set and used by the
// progression), a "🎯 Today" target on every open card, reps −/+ steppers and a one-tap "↻ Same again".
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
  const S = (wt, r, rir) => [0, 1, 2].map(() => (rir == null ? { weight: wt, reps: r } : { weight: wt, reps: r, rir }));
  // Lat Pulldown 3 × 10–12: last time 110 × 10 with 2 reps left on every set → earns +10 lb.
  // Seated Row: last time 120 × 11, 11, 9 (no reps-left data) → "beat 11 / 11 / 9".
  const hist = [
    { date: d(9), ex: [{ type: 'Strength', min: 50, planDay: 'Pull', sets: { 'Lat Pulldown': S(105, 10), 'Seated Row': S(120, 10) } }] },
    { date: d(2), ex: [{ type: 'Strength', min: 50, planDay: 'Pull', sets: { 'Lat Pulldown': S(110, 10, 2), 'Seated Row': [{ weight: 120, reps: 11 }, { weight: 120, reps: 11 }, { weight: 120, reps: 9 }] } }] }
  ];
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = ${JSON.stringify(hist)}; exerciseGroups = {}; exerciseStations = {}; customWorkoutExercises = {}; hiddenWorkoutExercises = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Pull'; workoutSessionState = {}; showView('exercise'); renderWorkoutPlan();`);
  await sleep(60);
  const card = n => doc.querySelector(`.workout-exercise-block[data-exercise="${n}"]`);
  const rows = n => [...card(n).querySelectorAll('.set-row')];
  const target = n => (card(n).querySelector('.ex-today-target') || {}).textContent || '';

  console.log('=== 2. today\'s target on every card ===');
  check('Lat Pulldown: 2+ reps left on every set last time → "🎯 Today: go up to 120 lb × 10–12"', /🎯 Today: go up to 120 lb × 10–12 \(last time 110 lb\)/.test(target('Lat Pulldown')));
  check('and the tap-to-use chip says why', /2\+ reps left on every set at 110 lb\. Try 120 lb × 10/.test(card('Lat Pulldown').querySelector('.next-step-chip').textContent));
  check('Seated Row: "🎯 Today: 120 lb · beat 11 / 11 / 9 reps"', /🎯 Today: 120 lb · beat 11 \/ 11 \/ 9 reps/.test(target('Seated Row')));
  check('an exercise with no history: "First time: pick a weight you can lift…"', /First time: pick a weight you can lift/.test(target('Hammer Curl')));
  ev(`entries[1].ex[0].sets['Lat Pulldown'] = ${JSON.stringify(S(110, 10, 1))}; workoutSessionState = {}; renderWorkoutPlan();`); await sleep(30);
  check('with only 1 rep left last time it holds the weight: "110 lb · beat 10 / 10 / 10"', /🎯 Today: 110 lb · beat 10 \/ 10 \/ 10 reps/.test(target('Lat Pulldown')) && !card('Lat Pulldown').querySelector('.next-step-chip'));
  ev(`entries[1].ex[0].sets['Lat Pulldown'] = [{ weight: 110, reps: 8, rir: 0 }, { weight: 110, reps: 7, rir: 0 }, { weight: 110, reps: 7, rir: 0 }]; workoutSessionState = {}; renderWorkoutPlan();`); await sleep(30);
  check('to failure and short of the range last time: "110 lb again · get every set to 10+ reps"', /110 lb again · get every set to 10\+ reps/.test(target('Lat Pulldown')));

  console.log('=== 3. faster entry ===');
  click($('startPlanBtn')); await sleep(60);
  const r0 = rows('Lat Pulldown')[0];
  check('every weighted set row has reps − and + buttons', rows('Lat Pulldown').every(r => r.querySelector('.set-reps-minus') && r.querySelector('.set-reps-plus')));
  ev(`workoutSessionState['Lat Pulldown'][0].weight = '110'; workoutSessionState['Lat Pulldown'][0].reps = '10'; renderWorkoutPlan();`); await sleep(30);
  click(rows('Lat Pulldown')[0].querySelector('.set-reps-plus')); click(rows('Lat Pulldown')[0].querySelector('.set-reps-plus'));
  check('reps + twice: 10 → 12', ev(`workoutSessionState['Lat Pulldown'][0].reps`) === '12' && rows('Lat Pulldown')[0].querySelector('.set-reps-input').value === '12');
  click(rows('Lat Pulldown')[0].querySelector('.set-reps-minus'));
  check('reps −: 12 → 11', ev(`workoutSessionState['Lat Pulldown'][0].reps`) === '11');
  check('no "Same again" before any set is done', !card('Lat Pulldown').querySelector('.set-same-btn'));

  console.log('=== 1. reps left ===');
  click(rows('Lat Pulldown')[0].querySelector('.set-check-btn')); await sleep(40);
  const ask = rows('Lat Pulldown')[0].querySelector('.rir-row');
  check('checking a working set asks "Reps left?" with 0 💀 / 1 / 2 / 3+', !!ask && /Reps left\?/.test(ask.textContent) && [...ask.querySelectorAll('.rir-btn')].map(b => b.textContent).join(',') === '0 💀,1,2,3+');
  check('only on the set just checked', rows('Lat Pulldown').filter(r => r.querySelector('.rir-row')).length === 1);
  click(ask.querySelector('.rir-btn[data-rir="0"]')); await sleep(40);
  check('tapping 0 saves it and shows "💀 failure" on the set', ev(`workoutSessionState['Lat Pulldown'][0].rir`) === 0 && /💀 failure/.test(rows('Lat Pulldown')[0].querySelector('.set-rir-badge').textContent) && !rows('Lat Pulldown')[0].querySelector('.rir-row'));
  click(rows('Lat Pulldown')[0].querySelector('.set-rir-badge')); await sleep(30);
  check('tapping the badge asks again', !!rows('Lat Pulldown')[0].querySelector('.rir-row'));
  click(rows('Lat Pulldown')[0].querySelector('.rir-btn[data-rir="2"]')); await sleep(30);
  check('changed to "2 left"', ev(`workoutSessionState['Lat Pulldown'][0].rir`) === 2 && /2 left/.test(rows('Lat Pulldown')[0].querySelector('.set-rir-badge').textContent));

  console.log('=== 3. Same again ===');
  const same = rows('Lat Pulldown')[1].querySelector('.set-same-btn');
  check('the next set offers "↻ Same again"', !!same && /Same again/.test(same.textContent) && !rows('Lat Pulldown')[2].querySelector('.set-same-btn'));
  click(same); await sleep(40);
  check('one tap logs 110 × 11 as set 2 and asks reps left', ev(`workoutSessionState['Lat Pulldown'][1].done`) && ev(`workoutSessionState['Lat Pulldown'][1].weight`) == 110 && ev(`workoutSessionState['Lat Pulldown'][1].reps`) == 11 && !!rows('Lat Pulldown')[1].querySelector('.rir-row'));
  click(rows('Lat Pulldown')[1].querySelector('.rir-skip')); await sleep(30);
  check('✕ skips the question (nothing saved)', !rows('Lat Pulldown')[1].querySelector('.rir-row') && ev(`workoutSessionState['Lat Pulldown'][1].rir === undefined`));
  click(rows('Lat Pulldown')[1].querySelector('.set-check-btn')); await sleep(30);
  check('unchecking a set clears its reps left', ev(`workoutSessionState['Lat Pulldown'][1].done`) === false && ev(`workoutSessionState['Lat Pulldown'][1].rir === undefined`));

  console.log('=== saved with the workout ===');
  const g = ev(`JSON.stringify(gatherWorkoutSets()['Lat Pulldown'])`);
  check('the saved set keeps rir: 2', g === JSON.stringify([{ weight: 110, reps: 11, rir: 2 }]));
  ev(`workoutSessionState['Lat Pulldown'][0].warmup = true;`);
  check('a warm-up set never carries it', !/rir/.test(ev(`JSON.stringify(gatherWorkoutSets())`)));
  ev(`workoutSessionState['Lat Pulldown'][0].warmup = false;`);
  check('timed holds get no reps-left question', ev(`rirEligible('Plank', { done: true })`) === false);

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
