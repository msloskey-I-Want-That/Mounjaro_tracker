const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.__alerts = []; w.alert = m => { w.__alerts.push(m); }; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = []; customWorkoutExercises = {}; hiddenWorkoutExercises = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Legs'; workoutSessionState = {}; renderWorkoutPlan();`);
  const blocks = () => [...doc.querySelectorAll('.workout-exercise-block')].map(b => b.dataset.exercise);
  const add = async (n, s) => { click($('showAddExerciseBtn')); $('newExerciseName').value = n; $('newExerciseSets').value = s || '3 × 10'; click($('saveNewExerciseBtn')); await sleep(40); };

  console.log('=== Set stopwatch ===');
  const names = () => [...doc.querySelectorAll('.workout-exercise-block')].map(b => b.dataset.exercise);
  const FC = 'Farmers Carry (dumbbells)';
  let found = names().includes(FC);
  for (const mode of ['fullbody', 'split', 'ppl']) {
    if (found) break;
    for (const day of [undefined, 'Pull', 'Push', 'Legs', 'A', 'B']) {
      try { ev(`workoutPlanMode = '${mode}'; ${day ? `pplDayOverride = '${day}'; splitDayOverride = '${day}';` : ''} renderWorkoutPlan();`); } catch (e) {}
      await sleep(20); if (names().includes(FC)) { found = true; break; }
    }
  }
  check('found a day with Farmers Carry', found);
  const row0 = () => [...doc.querySelectorAll('.set-row')].find(r => r.dataset.exercise === FC && r.dataset.setIdx === '0');
  check('a timed set has a start button; a weighted lift does not', !!row0().querySelector('.set-timer-btn') && !doc.querySelector('.set-row:not([data-exercise="' + FC + '"]) .set-timer-btn[data-x]'));
  click(row0().querySelector('.set-timer-btn')); await sleep(1400);
  check('while running the button is a stop button and seconds count up', row0().querySelector('.set-timer-btn').classList.contains('running') && Number(row0().querySelector('.set-reps-input').value) >= 1);
  click(row0().querySelector('.set-timer-btn')); await sleep(60);
  const secs = Number(row0().querySelector('.set-reps-input').value);
  check('stopping freezes the seconds in the box', !row0().querySelector('.set-timer-btn').classList.contains('running') && secs >= 1 && secs <= 3);
  await sleep(1300);
  check('...and they stay frozen', Number(row0().querySelector('.set-reps-input').value) === secs);
  check('the seconds are saved to the set', ev(`workoutSessionState[${JSON.stringify(FC)}][0].reps`) === String(secs));
  click(row0().querySelector('.set-timer-btn')); await sleep(300);
  click([...doc.querySelectorAll('.set-row')].find(r => r.dataset.exercise === FC && r.dataset.setIdx === '1').querySelector('.set-timer-btn')); await sleep(60);
  check('starting set 2 stops set 1', !row0().querySelector('.set-timer-btn').classList.contains('running'));
  click(row0().querySelector('.set-check-btn')); await sleep(60);
  check('marking a set done hides its timer button', !row0().querySelector('.set-timer-btn'));
  ev('stopSetStopwatch()');
  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
