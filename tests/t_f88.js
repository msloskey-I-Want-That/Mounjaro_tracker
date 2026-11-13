// Nov 12 — Settings > Screens > "Workout: bigger current exercise" (off by default). Marks the exercise + set you are on.
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
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = []; exerciseGroups = {}; exerciseStations = {}; customWorkoutExercises = {}; hiddenWorkoutExercises = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Legs'; workoutSessionState = {}; showView('exercise'); renderWorkoutPlan();`);
  await sleep(40); click($('startPlanBtn')); await sleep(40);
  const blocks = () => [...doc.querySelectorAll('#workoutPlanBody .workout-exercise-block')];
  const cur = () => doc.querySelectorAll('#workoutPlanBody .ex-current');
  const curSet = () => doc.querySelectorAll('#workoutPlanBody .set-current');

  check('the setting exists in Settings > Screens, default Off', !!doc.querySelector('[data-panelpref="bigCurrent"]') && !doc.body.classList.contains('big-current'));
  check('exactly one exercise is marked current: the first one', cur().length === 1 && cur()[0] === blocks()[0]);
  check('exactly one set is marked current: set 1 of it', curSet().length === 1 && curSet()[0].dataset.setIdx === '0' && cur()[0].contains(curSet()[0]));

  console.log('=== turn it on / off ===');
  click(doc.querySelector('[data-panelpref="bigCurrent"][data-val="1"]')); await sleep(40);
  check('On: body gets big-current and the chip shows On', doc.body.classList.contains('big-current') && doc.querySelector('[data-panelpref="bigCurrent"][data-val="1"]').classList.contains('on'));
  check('On: the setting is saved with the other screen choices', ev(`panelPrefs.bigCurrent === true`));
  check('On: all sets of the current exercise are still on screen', cur()[0].querySelectorAll('.set-row').length >= 3);
  click(doc.querySelector('[data-panelpref="bigCurrent"][data-val="0"]')); await sleep(40);
  check('Off: back to the original layout', !doc.body.classList.contains('big-current') && ev(`panelPrefs.bigCurrent === false`));
  click(doc.querySelector('[data-panelpref="bigCurrent"][data-val="1"]')); await sleep(40);

  console.log('=== the current set moves along ===');
  const ex0 = blocks()[0].dataset.exercise, n0 = blocks()[0].querySelectorAll('.set-row').length;
  const row = (e, i) => doc.querySelector(`.set-row[data-exercise="${e}"][data-set-idx="${i}"]`);
  ev(`workoutSessionState['${ex0}'][0].weight = '100'; workoutSessionState['${ex0}'][0].reps = '10'; renderWorkoutPlan();`); await sleep(20);
  click(row(ex0, 0).querySelector('.set-check-btn')); await sleep(40);
  check('after checking set 1, set 2 is the current set', curSet().length === 1 && curSet()[0].dataset.setIdx === '1');
  check('the same exercise stays current while it is in progress', cur().length === 1 && cur()[0].dataset.exercise === ex0);
  click(row(ex0, 0).querySelector('.set-check-btn')); await sleep(40);
  check('un-checking set 1 makes it the current set again', curSet()[0].dataset.setIdx === '0');
  for (let i = 0; i < n0; i++) { ev(`workoutSessionState['${ex0}'][${i}].weight = '100'; workoutSessionState['${ex0}'][${i}].reps = '10'; renderWorkoutPlan();`); await sleep(10); click(row(ex0, i).querySelector('.set-check-btn')); await sleep(30); }
  check('when every set is done, the next exercise becomes current', cur().length === 1 && cur()[0].dataset.exercise !== ex0 && blocks()[0].classList.contains('workout-exercise-done'));

  console.log('=== equipment picker folds behind ⋯ once a set is done ===');
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const hist = [
    { date: daysAgo(9), ex: [{ type: 'Strength', min: 50, sets: { 'Seated Lat Pulldown Cable': [{ weight: 115, reps: 10 }, { weight: 115, reps: 10 }] } }] },
    { date: daysAgo(5), ex: [{ type: 'Strength', min: 50, sets: { 'Lat Pulldowns': [{ weight: 130, reps: 12 }, { weight: 130, reps: 12 }] } }] },
    { date: daysAgo(2), ex: [{ type: 'Strength', min: 50, sets: { 'Lat Pulldown': [{ weight: 95, reps: 15 }, { weight: 95, reps: 15 }] } }] }
  ];
  ev(`entries = ${JSON.stringify(hist)}; exerciseGroups = {}; customWorkoutExercises = { Pull: [{ name: 'Lat Pulldowns', sets: '3 × 10' }] }; hiddenWorkoutExercises = {}; exerciseOrderOverride = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Pull'; workoutSessionState = {}; bigVariantsOpen = new Set(); renderWorkoutPlan();`); await sleep(60);
  const vrow = doc.querySelector('.workout-exercise-block .variant-row');
  check('a grouped card with equipment buttons is on the plan', !!vrow);
  if (vrow) {
    const nm = vrow.closest('.workout-exercise-block').dataset.exercise;
    check('nothing done yet: the picker stays open so you can choose equipment', !vrow.closest('.workout-exercise-block').classList.contains('variants-folded') && !doc.querySelector('.big-more-btn'));
    ev(`workoutSessionState['${nm}'][0].weight = '120'; workoutSessionState['${nm}'][0].reps = '10'; renderWorkoutPlan();`); await sleep(20);
    click(row(nm, 0).querySelector('.set-check-btn')); await sleep(40);
    const b2 = doc.querySelector(`.workout-exercise-block[data-exercise="${nm}"]`);
    check('set done: that card is current, picker folded, ⋯ button shown', b2.classList.contains('ex-current') && b2.classList.contains('variants-folded') && !!b2.querySelector('.big-more-btn'));
    click(b2.querySelector('.big-more-btn')); await sleep(20);
    check('tapping ⋯ shows the picker again (and the button goes away)', !b2.classList.contains('variants-folded') && !b2.querySelector('.big-more-btn'));
    click(doc.querySelector('[data-panelpref="bigCurrent"][data-val="0"]')); await sleep(40);
    check('Off: the picker is never hidden', !doc.querySelector('.workout-exercise-block.variants-folded') || !doc.body.classList.contains('big-current'));
  }

  check('no script errors', errors.length === 0);
  console.log(fails ? 'SOME FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
}, 2500);
