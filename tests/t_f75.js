// Machine cards: one framed card holding several exercises done on one machine, with machine totals.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.__alerts = []; w.alert = m => w.__alerts.push(m); } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, ev = s => w.eval(s), $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  w.__writes = [];
  const hist = [{ date: daysAgo(4), ex: [{ type: 'Strength', min: 50, sets: { 'Face Pull (cable)': [{ weight: 40, reps: 15 }, { weight: 40, reps: 15 }], 'Cable Curl': [{ weight: 30, reps: 12 }], 'Seated Row': [{ weight: 120, reps: 10 }] } }] }];
  ev(`syncId = 'x'; window.__setDocImpl = (ref, data) => { window.__writes.push(data); return Promise.resolve(); }; entries = ${JSON.stringify(hist)}; exerciseGroups = {}; exerciseStations = {}; customWorkoutExercises = {}; hiddenWorkoutExercises = {}; exerciseOrderOverride = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Pull'; workoutSessionState = {}; renderWorkoutPlan();`);
  await sleep(60);
  const key = ev('currentPlanKey()');
  const blocks = () => [...doc.querySelectorAll('.workout-exercise-block')].map(b => b.dataset.exercise);
  const station = () => doc.querySelector('.machine-station');
  const inStation = () => station() ? [...station().querySelectorAll('.workout-exercise-block')].map(b => b.dataset.exercise) : [];

  console.log('=== creating a machine card ===');
  check('Pull day has a "🏋 Add a machine card" button', !!$('newStationBtn') && /machine card/.test($('newStationBtn').textContent));
  click($('newStationBtn')); await sleep(40);
  check('it opens a panel: name (Cable Machine), today\'s exercises, and cable exercises to add', $('stationNameInput').value === 'Cable Machine' && doc.querySelectorAll('.station-pick').length >= 5 && [...doc.querySelectorAll('.station-pick-new')].some(c => c.value === 'Face Pull (cable)'));
  click($('stationCreateBtn')); await sleep(30);
  check('nothing ticked: it asks you to tick something', w.__alerts.some(a => /Tick at least one/.test(a)) && !station());
  doc.querySelector('.station-pick[value="Bicep Curl"]').checked = true;
  ['Face Pull (cable)', 'Straight-Arm Pulldown (cable)', 'Cable Curl'].forEach(n => { doc.querySelector(`.station-pick-new[value="${n}"]`).checked = true; });
  click($('stationCreateBtn')); await sleep(80);
  check('one framed "CABLE MACHINE" card appears', doc.querySelectorAll('.machine-station').length === 1 && /Cable Machine/.test(station().querySelector('.machine-title').textContent));
  check('it holds the 4 exercises, each with its own card and sets', ['Bicep Curl', 'Face Pull (cable)', 'Straight-Arm Pulldown (cable)', 'Cable Curl'].every(n => inStation().includes(n)) && inStation().length === 4);
  check('Cable Curl stays on the machine (not swallowed by the Bicep Curl card)', inStation().includes('Cable Curl') && !doc.querySelector('.variant-chip[data-name="Cable Curl"]'));
  check('other Pull exercises are still normal cards outside the machine', ['Lat Pulldown', 'Seated Row'].every(n => blocks().includes(n) && !inStation().includes(n)));
  check('it is saved with your settings', w.__writes.some(d => d.exerciseStations && (d.exerciseStations[key] || []).some(s => s.members.length === 4)) && w.__writes.some(d => d.customWorkoutExercises && JSON.stringify(d.customWorkoutExercises).includes('Face Pull (cable)')));

  console.log('=== totals ===');
  check('last time is shown from history (Face Pull 2×15@40 + Cable Curl 12@30 = 3 sets, 1,560 lb)', /Last time · .*3 sets · 1,560 lb/.test(station().querySelector('.machine-totals').textContent));
  ev(`workoutSessionState['Face Pull (cable)'][0].done = true; workoutSessionState['Face Pull (cable)'][0].weight = '45'; workoutSessionState['Face Pull (cable)'][0].reps = '15'; workoutSessionState['Cable Curl'][0].done = true; workoutSessionState['Cable Curl'][0].weight = '30'; workoutSessionState['Cable Curl'][0].reps = '10'; renderWorkoutPlan();`); await sleep(40);
  check('today counts sets you checked off on the machine (2 sets · 975 lb)', /Today\s*2 sets · 975 lb/.test(station().querySelector('.machine-totals').textContent));
  const saved = JSON.parse(ev('JSON.stringify(gatherWorkoutSets())'));
  check('sets are still saved under each exercise\'s own name', saved['Face Pull (cable)'] && saved['Cable Curl'] && !saved['Cable Machine']);
  ev(`workoutSessionState = {}; renderWorkoutPlan();`); await sleep(30);

  console.log('=== adding and editing ===');
  click(doc.querySelector('.station-add-btn')); await sleep(40);
  check('＋ Add lists cable exercises not on the machine yet', [...doc.querySelectorAll('.station-sugg-btn')].some(b => b.dataset.name === 'Rope Hammer Curl (cable)') && ![...doc.querySelectorAll('.station-sugg-btn')].some(b => b.dataset.name === 'Face Pull (cable)'));
  click([...doc.querySelectorAll('.station-sugg-btn')].find(b => b.dataset.name === 'Rope Hammer Curl (cable)')); await sleep(80);
  check('tapping one adds it to the machine card', inStation().includes('Rope Hammer Curl (cable)') && inStation().length === 5);
  click(doc.querySelector('.station-add-btn')); await sleep(40);
  doc.querySelector('.station-own-input').value = 'Zxqv Thing';
  click(doc.querySelector('.station-own-btn')); await sleep(40);
  check('an unknown typed name asks you to add it with its muscle first', w.__alerts.some(a => /do not recognise/.test(a)) && !inStation().includes('Zxqv Thing'));
  click(doc.querySelector('.station-edit-btn')); await sleep(40);
  doc.querySelector('.station-name-input').value = 'Matrix Cables';
  click(doc.querySelector('.station-save-btn')); await sleep(60);
  check('Edit renames the machine', /Matrix Cables/.test(station().querySelector('.machine-title').textContent));
  click(doc.querySelector('.station-edit-btn')); await sleep(40);
  click([...doc.querySelectorAll('.station-unmember-btn')].find(b => b.dataset.name === 'Bicep Curl')); await sleep(60);
  check('Take off moves an exercise back to a normal card (still on the day)', !inStation().includes('Bicep Curl') && blocks().includes('Bicep Curl'));
  ev(`renderWorkoutPlan();`); await sleep(30);
  check('the machine card survives a refresh', inStation().length === 4);
  ev(`reorderingExercises = true; renderWorkoutPlan();`); await sleep(30);
  check('in Reorder mode the cards are shown flat so they can be dragged', !station());
  ev(`reorderingExercises = false; renderWorkoutPlan();`); await sleep(30);
  if (!doc.querySelector('.station-delete-btn')) { click(doc.querySelector('.station-edit-btn')); await sleep(40); }
  click(doc.querySelector('.station-delete-btn')); await sleep(60);
  check('Remove machine card keeps all its exercises on the day (Cable Curl goes back to being a Bicep Curl button)', !station() && ['Face Pull (cable)', 'Straight-Arm Pulldown (cable)', 'Rope Hammer Curl (cable)'].every(n => blocks().includes(n)) && (blocks().includes('Cable Curl') || !!doc.querySelector('.variant-chip[data-name="Cable Curl"]')));

  console.log('=== other days ===');
  ev(`pplDayOverride = 'Push'; workoutSessionState = {}; renderWorkoutPlan();`); await sleep(40);
  check('Push day has no machine card', !station());

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
