// Nov 11 — timed sets: when rest ends and the next set is timed (farmers carry, plank…), the big timer opens by itself.
// Same exercise: "Get ready" 5-4-3-2-1 then it starts; a different exercise: big ▶ START, no countdown. "Not yet" closes it.
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
  const FC = 'Farmers Carry (dumbbells)';
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = []; exerciseGroups = {}; exerciseStations = {}; customWorkoutExercises = {}; hiddenWorkoutExercises = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Legs'; workoutSessionState = {}; showView('exercise'); renderWorkoutPlan();`);
  await sleep(40); click($('startPlanBtn')); await sleep(40);
  const big = () => $('setTimerBig'), shown = () => big().style.display === 'flex';
  const row = (n, i) => doc.querySelector(`.set-row[data-exercise="${n}"][data-set-idx="${i}"]`);
  const endRest = () => ev(`restTimerEndTime = Date.now() - 10; updateRestTimerDisplay();`);
  check('the Legs plan has Farmers Carry, a timed exercise', ev(`isTimedExercise('${FC}')`) && !ev(`isTimedExercise('Leg Press')`));

  console.log('=== same exercise: countdown, then it runs ===');
  ev(`collapsedExercises.clear(); workoutSessionState['${FC}'][0].weight = '40'; workoutSessionState['${FC}'][0].reps = '55'; renderWorkoutPlan();`); await sleep(20);
  click(row(FC, 0).querySelector('.set-check-btn')); await sleep(30);
  check('checking set 1 starts the rest', ev('restTimerEndTime != null'));
  endRest(); await sleep(250);
  check('rest over → big screen opens by itself for set 2', shown() && /Farmers Carry \(dumbbells\) · set 2/.test($('stbLabel').textContent));
  check('it counts down "Get ready… starts by itself" with ▶ START NOW and Not yet', /^[1-5]$/.test($('stbTime').textContent) && /Get ready/.test($('stbUnit').textContent) && $('stbStop').textContent === '▶ START NOW' && $('stbHide').textContent === 'Not yet');
  check('shows the goal', /Goal: 40–60 sec/.test($('stbGoal').textContent));
  check('the keyboard is not opened under it (no input focused)', !(doc.activeElement && doc.activeElement.matches && doc.activeElement.matches('input')));
  await sleep(5300);
  check('after 5 seconds the set-2 timer is running', ev(`setStopwatch && setStopwatch.exercise === '${FC}' && setStopwatch.idx === 1`) && $('stbStop').textContent === '■ STOP' && !ev('getReady'));
  click($('stbStop')); await sleep(40);
  check('STOP logs set 2 and starts the next rest (the loop continues hands-free)', ev(`workoutSessionState['${FC}'][1].done`) && ev('restTimerEndTime != null') && !shown());

  console.log('=== START NOW and Not yet ===');
  endRest(); await sleep(250);
  check('rest over again → countdown for set 3', shown() && /set 3/.test($('stbLabel').textContent) && !!ev('getReady'));
  click($('stbStop')); await sleep(30);
  check('▶ START NOW starts set 3 at once', ev(`setStopwatch && setStopwatch.idx === 2`) && !ev('getReady'));
  ev('stopSetStopwatch()'); ev(`workoutSessionState['${FC}'][2].done = false; workoutSessionState['${FC}'][1].done = true; renderWorkoutPlan(); restTimerContext = { exerciseName: '${FC}', setIdx: 1 }; restTimerEndTime = Date.now() + 1000; restTimerTotalSeconds = 60;`);
  endRest(); await sleep(250);
  click($('stbHide')); await sleep(30);
  check('Not yet closes it and nothing starts', !shown() && !ev('getReady') && !ev('setStopwatch'));
  await sleep(5200);
  check('…and it stays closed', !shown() && !ev('setStopwatch'));
  check('the small ▶ Start still works afterwards', (() => { click(row(FC, 2).querySelector('.set-timer-btn')); return !!ev('setStopwatch') && $('stbStop').textContent === '■ STOP'; })());
  ev('stopSetStopwatch()');

  console.log('=== moving on to a timed exercise: START, no countdown ===');
  const next = ev(`(() => { const names = Object.keys(workoutSessionState); const i = names.indexOf('${FC}'); return i > 0 ? names[i - 1] : null; })()`);
  check('there is an exercise just before Farmers Carry', !!next);
  ev(`workoutSessionState['${FC}'].forEach(q => q.done = false); const prev = workoutSessionState['${next}']; prev.forEach((q, i) => { q.done = i < prev.length - 1; }); renderWorkoutPlan(); restTimerContext = { exerciseName: '${next}', setIdx: prev.length - 1 }; prev[prev.length - 1].done = true; restTimerEndTime = Date.now() + 1000; restTimerTotalSeconds = 60;`);
  endRest(); await sleep(250);
  check('rest after the last set of the previous exercise → big ▶ START for Farmers Carry set 1', shown() && /set 1/.test($('stbLabel').textContent) && $('stbStop').textContent === '▶ START' && $('stbTime').textContent === '▶');
  await sleep(5300);
  check('no countdown: it waits for you', !ev('setStopwatch') && !!ev('getReady'));
  click($('stbStop')); await sleep(30);
  check('▶ START starts it', ev(`setStopwatch && setStopwatch.exercise === '${FC}' && setStopwatch.idx === 0`));
  ev('stopSetStopwatch()');

  console.log('=== not for regular sets ===');
  ev(`getReadyClose(); bigTimerClose(); const lp = workoutSessionState['Leg Press'] ? 'Leg Press' : Object.keys(workoutSessionState).find(n => !isTimedExercise(n)); window.__lp = lp; workoutSessionState[lp].forEach(q => q.done = false); workoutSessionState[lp][0].done = true; renderWorkoutPlan(); restTimerContext = { exerciseName: lp, setIdx: 0 }; restTimerEndTime = Date.now() + 1000; restTimerTotalSeconds = 60;`);
  endRest(); await sleep(250);
  check('rest before a normal weighted set: no big screen', !shown() && !ev('getReady'));

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
