// Exercise tab simplified (Nov 1): plan first + open, This week 3 numbers + More, one-line preview before Start
// (Start opens the first), slim Exercise card (past activity behind a button), no gym check-in (cardio counts
// toward the weekly goal), AI Coach collapsed, one day header.
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
  const shown = el => { let e = el; while (e && e !== doc.body) { if (w.getComputedStyle(e).display === 'none') return false; e = e.parentElement; } return !!el; };
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  const d = n => ev(`lbAddDays(todayStr(), ${-n})`);
  check('no startup error from the reposition step', !w.__repoErr);
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = [{ date: '${d(6)}', ex: [{ type: 'Strength', min: 50, planDay: 'Pull', sets: { 'Lat Pulldown': [{ weight: 110, reps: 12 }, { weight: 105, reps: 12 }] } }] }]; exerciseGroups = {}; exerciseStations = {}; customWorkoutExercises = {}; hiddenWorkoutExercises = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Pull'; workoutSessionState = {}; showView('exercise'); renderWorkoutPlan();`);
  await sleep(80);
  const kids = [...$('view-exercise').children].map(c => c.id).filter(Boolean);
  const blocks = () => [...doc.querySelectorAll('.workout-exercise-block')];
  const open = b => b.querySelector('.exercise-body') && b.querySelector('.exercise-body').style.display !== 'none';

  console.log('=== 1. plan first, open; This week smaller ===');
  check('Workout Plan comes right after the date, before This week', kids.indexOf('workoutPlanCard') < kids.indexOf('weekRecapCard') && kids[1] === 'workoutPlanCard');
  check('Workout Plan is open by default', $('workoutPlanCardContent').style.display !== 'none');
  ev(`renderWeekRecap()`); await sleep(20);
  const tiles = () => [...$('weekRecapGrid').children].filter(shown).length;
  check('This week shows 3 numbers, with More for the rest', tiles() === 3 && /More/.test($('weekRecapMoreBtn').textContent));
  click($('weekRecapMoreBtn')); await sleep(20);
  check('More shows all of them; Less hides them again', tiles() === 6 && /Less/.test($('weekRecapMoreBtn').textContent));
  click($('weekRecapMoreBtn'));

  console.log('=== 2. one line per exercise before Start ===');
  check('before Start every exercise is one line (no set rows showing)', blocks().length >= 5 && blocks().every(b => !open(b)));
  const lpSum = blocks().find(b => b.dataset.exercise === 'Lat Pulldown').querySelector('.exercise-collapsed-summary');
  check('the line shows the target and last weight ("3×10–12 · last 110 lb · tap to open")', /last 110 lb · tap to open/.test(lpSum.textContent));
  click(lpSum); await sleep(40);
  check('tapping the line opens that exercise', open(blocks().find(b => b.dataset.exercise === 'Lat Pulldown')));
  ev(`collapsedExercises.add('Lat Pulldown'); renderWorkoutPlan();`); await sleep(20);
  click($('startPlanBtn')); await sleep(60);
  const bs = blocks();
  check('Start opens only the first exercise; the rest stay one line', open(bs[0]) && bs.slice(1).every(b => !open(b)));
  ev(`workoutStartedAt = null; setWorkoutFullscreen(false); renderWorkoutPlan();`);

  console.log('=== 3. slim Exercise card ===');
  check('one-tap buttons are visible (Quick workout, Walk...)', shown($('quickWalkBody')) && /Walk/.test($('quickWalkBody').textContent));
  check('everything else is behind "Log a past activity"', shown($('exManualToggle')) && !shown($('exManualBlock')) && !!$('exTypeRow').closest('#exManualBlock') && !!$('workoutDescInput').closest('#exManualBlock'));
  click($('exManualToggle')); await sleep(20);
  check('tapping it opens the form', shown($('exManualBlock')) && shown($('exMin')));
  click($('exManualToggle')); await sleep(20);
  $('cancelExEditBtn').style.display = ''; await sleep(20);
  check('editing a logged activity opens the form by itself', shown($('exManualBlock')));
  $('cancelExEditBtn').style.display = 'none';
  check('logged activities stay visible outside it', !$('exList').closest('#exManualBlock'));
  ev(`appMode = 'exercise'; applyAppMode();`); await sleep(20);
  check('Workouts-only mode (Stacy): no toggle, the form is just there', !shown($('exManualToggle')) && shown($('exMin')));
  ev(`appMode = 'full'; applyAppMode();`);

  console.log('=== 4. no gym check-in; cardio counts ===');
  check('the "Check in at the gym" button is gone', !shown($('gymCheckinBtn')));
  ev(`gymVisits = []; weeklyGoalStretch = false; entries = [{ date: todayStr(), ex: [{ type: 'Walk', min: 45, dist: '2.2', ts: Date.now() }] }];`);
  check('a 2.2 mi walk today counts as a day toward the weekly goal', ev('goalDaysSoFar()') === 1);
  ev(`entries = [{ date: todayStr(), ex: [{ type: 'Dog Walk', min: 8, dist: '0.3', ts: Date.now() }] }];`);
  check('a short dog walk does not', ev('goalDaysSoFar()') === 0);

  console.log('=== 5. AI Coach collapsed; 6. one day header ===');
  check('AI Coach starts collapsed', $('aiCoachCardContent').style.display === 'none');
  check('the small "PULL DAY · N sessions" line is gone (the plan hero names the day)', [...doc.querySelectorAll('#workoutPlanCard .plan-day-head')].every(el => !shown(el)) && /Pull/i.test(doc.querySelector('#todayWorkout .tw-title').textContent));
  check('the Push / Pull / Legs chips are still there to switch days', doc.querySelectorAll('.ppl-day-chip').length === 3);

  check('startup moved the activity chips and timer above Describe without errors', !errors.length && $('exTypeRow').nextElementSibling === $('exTimerBar') && $('exTimerBar').nextElementSibling === $('workoutDescBlock'));
  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
