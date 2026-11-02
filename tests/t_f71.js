// Automatic exercise grouping: the same movement on different equipment becomes ONE card with a button per version.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.__alerts = []; w.alert = m => { w.__alerts.push(m); }; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

  console.log('=== same-movement matching ===');
  const base = n => ev(`variantBase(${JSON.stringify(n)})`);
  check('"Lat Pulldowns" matches "Lat Pulldown"', base('Lat Pulldowns') === base('Lat Pulldown'));
  check('"Seated Lat Pull-Down (Cable)" matches too', base('Seated Lat Pull-Down (Cable)') === base('Lat Pulldown'));
  check('"Plate Loaded Lat Pulldown" matches too', base('Plate Loaded Lat Pulldown') === base('Lat Pulldown'));
  check('"Wrist Curl" and "Reverse Wrist Curl" stay different', base('Wrist Curl') !== base('Reverse Wrist Curl'));
  check('"Seated Calf Raise" and "Standing Calf Raise" stay different', base('Seated Calf Raise') !== base('Standing Calf Raise'));
  check('"Hammer Curl" and "Bicep Curl" stay different', base('Hammer Curl') !== base('Bicep Curl'));
  check('"Seated Row" and "Lat Pulldown" stay different', base('Seated Row') !== base('Lat Pulldown'));
  check('"Leg Press" keeps its double s', base('Leg Press') === 'leg press');
  const curls = ['Bicep Curl', 'Dependent Curl', 'Incline Dumbbell Curl', 'Cable Curl Straight Bar', 'Cable Curl Bent Bar', 'Preacher Curl', 'EZ Bar Curl'];
  check('all biceps curls are one movement (incline, cable straight/bent bar, preacher, EZ bar...)', curls.every(n => ev(`autoGroupBase(${JSON.stringify(n)})`) === 'bicep curl'));
  check('Hammer / Reverse / Wrist / Reverse Wrist / Leg Curl stay their own exercises', ['Hammer Curl', 'Reverse Curl', 'Wrist Curl', 'Reverse Wrist Curl', 'Leg Curl (machine)', 'Seated Leg Curl', 'Lying Leg Curl'].every(n => ev(`autoGroupBase(${JSON.stringify(n)})`) !== 'bicep curl'));
  const ab = n => ev(`autoGroupBase(${JSON.stringify(n)})`);
  check('auto: "Lat Pulldown (Cable)" joins "Lat Pulldown"', ab('Lat Pulldown (Cable)') === ab('Lat Pulldown'));
  check('auto: a + Variation like "Leg Press (low and narrow)" keeps its own card', ab('Leg Press (low and narrow)') !== ab('Leg Press'));

  // Mike's case: plate-loaded "Lat Pulldown" (95) and machine "Lat Pulldowns" (130) are both on Pull day;
  // a cable "Seated Lat Pulldown Cable" (115) is only in his history.
  const hist = [
    { date: daysAgo(9), ex: [{ type: 'Strength', min: 50, sets: { 'Seated Lat Pulldown Cable': [{ weight: 115, reps: 10 }, { weight: 115, reps: 10 }] } }] },
    { date: daysAgo(5), ex: [{ type: 'Strength', min: 50, sets: { 'Lat Pulldowns': [{ weight: 130, reps: 12 }, { weight: 130, reps: 12 }] } }] },
    { date: daysAgo(2), ex: [{ type: 'Strength', min: 50, sets: { 'Lat Pulldown': [{ weight: 95, reps: 15 }, { weight: 95, reps: 15 }], 'Seated Row': [{ weight: 120, reps: 10 }] } }] }
  ];
  w.__writes = [];
  ev(`syncId = 'x'; window.__setDocImpl = (ref, data) => { window.__writes.push(data); return Promise.resolve(); }; entries = ${JSON.stringify(hist)}; exerciseGroups = {}; customWorkoutExercises = { Pull: [{ name: 'Lat Pulldowns', sets: '3 × 10' }] }; hiddenWorkoutExercises = {}; exerciseOrderOverride = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Pull'; workoutSessionState = {}; renderWorkoutPlan();`);
  await sleep(60);
  const key = ev('currentPlanKey()');
  const blocks = () => [...doc.querySelectorAll('.workout-exercise-block')].map(b => b.dataset.exercise);
  const lpCards = () => blocks().filter(n => /pulldown/i.test(n));
  const chips = () => [...doc.querySelectorAll('.variant-chip')];

  console.log('=== one card, three buttons ===');
  check('Pull day shows ONE lat pulldown card (was two)', lpCards().length === 1);
  check('the card offers all three versions, including the one only in history', ['Lat Pulldown', 'Lat Pulldowns', 'Seated Lat Pulldown Cable'].every(n => chips().some(c => c.dataset.name === n)) && chips().length === 3);
  check('the cable version is labelled "Cable"', chips().find(c => c.dataset.name === 'Seated Lat Pulldown Cable').textContent.startsWith('Cable'));
  check('each button shows its own last weight (95 / 130 / 115)', /95 lb/.test(chips().find(c => c.dataset.name === 'Lat Pulldown').textContent) && /130 lb/.test(chips().find(c => c.dataset.name === 'Lat Pulldowns').textContent) && /115 lb/.test(chips().find(c => c.dataset.name === 'Seated Lat Pulldown Cable').textContent));
  check('Seated Row is not pulled into the group', blocks().includes('Seated Row'));
  check('the grouping was saved to settings', w.__writes.some(d => d.exerciseGroups && Array.isArray(d.exerciseGroups[key]) && d.exerciseGroups[key].some(g => g.variants.length === 3)));

  const body = doc.querySelector('.workout-exercise-block .variant-row').parentElement;
  check('the version buttons sit at the top of the card, above the sets row', body.firstElementChild.classList.contains('variant-row') && /Which one today\?/.test(body.firstElementChild.textContent));
  check('the buttons are big (at least 58px tall, 15px text)', chips().every(c => /min-height:58px/.test(c.getAttribute('style')) && /font-size:15px/.test(c.getAttribute('style'))));
  console.log('=== picking a version ===');
  click(chips().find(c => c.dataset.name === 'Seated Lat Pulldown Cable')); await sleep(60);
  check('tapping Cable switches the card to the cable version', lpCards()[0] === 'Seated Lat Pulldown Cable' && chips().find(c => c.dataset.name === 'Seated Lat Pulldown Cable').classList.contains('on'));
  const cardText = doc.querySelector('.workout-exercise-block[data-exercise="Seated Lat Pulldown Cable"]').textContent;
  check('its rows show the cable version\'s own last time (115)', /last 115 lb/.test(cardText) && !/last 130 lb/.test(cardText));
  ev(`workoutSessionState['Seated Lat Pulldown Cable'][0].done = true; workoutSessionState['Seated Lat Pulldown Cable'][0].weight = '120'; workoutSessionState['Seated Lat Pulldown Cable'][0].reps = '10';`);
  const saved = JSON.parse(ev('JSON.stringify(gatherWorkoutSets())'));
  check('a logged set is saved under the cable version\'s own name', saved && saved['Seated Lat Pulldown Cable'] && saved['Seated Lat Pulldown Cable'][0].weight === 120 && !saved['Lat Pulldowns']);
  ev(`renderWorkoutPlan();`); await sleep(40);
  check('after a set is done, the other buttons are locked', chips().filter(c => c.classList.contains('locked')).length === 2);
  ev(`workoutSessionState = {}; renderWorkoutPlan();`); await sleep(40);

  console.log('=== naming the buttons ===');
  click(doc.querySelector('.variant-rename-btn')); await sleep(40);
  const inputs = [...doc.querySelectorAll('.variant-rename-input')];
  check('Rename opens a box per version, showing each one\'s last weight', inputs.length === 3 && /last 95 lb/.test(doc.querySelector('.variant-rename-panel').textContent));
  inputs.find(i => i.dataset.name === 'Lat Pulldown').value = 'Plate-loaded';
  inputs.find(i => i.dataset.name === 'Lat Pulldowns').value = 'Machine <b>';
  click(doc.querySelector('.variant-rename-save')); await sleep(60);
  check('buttons now read Plate-loaded / Machine / Cable', chips().find(c => c.dataset.name === 'Lat Pulldown').textContent.startsWith('Plate-loaded') && chips().find(c => c.dataset.name === 'Lat Pulldowns').textContent.startsWith('Machine') && chips().find(c => c.dataset.name === 'Seated Lat Pulldown Cable').textContent.startsWith('Cable'));
  check('unsafe characters are stripped from names', !doc.querySelector('.variant-chip b') && ev(`exerciseGroups._labels['Lat Pulldowns']`) === 'Machine b');
  check('names are saved to settings', w.__writes.some(d => d.exerciseGroups && d.exerciseGroups._labels && d.exerciseGroups._labels['Lat Pulldown'] === 'Plate-loaded'));
  check('exercise history names are unchanged (nothing renamed)', ev(`entries.some(e => e.ex.some(x => x.sets['Lat Pulldowns']))`));

  console.log('=== card title, card name, x per version ===');
  const titleOf = () => doc.querySelector('.workout-exercise-block .variant-row').closest('.workout-exercise-block').querySelector('.exercise-card-title').textContent;
  check('a grouped card is titled with the group name ("Lat Pulldown")', titleOf() === 'Lat Pulldown');
  click(chips().find(c => c.dataset.name === 'Seated Lat Pulldown Cable')); await sleep(50);
  check('the title stays the same when another version is picked', titleOf() === 'Lat Pulldown');
  click(doc.querySelector('.variant-rename-btn')); await sleep(40);
  doc.querySelector('.variant-card-name-input').value = 'Back Pulldown';
  click(doc.querySelector('.variant-rename-save')); await sleep(60);
  check('Rename > Card name renames the card', titleOf() === 'Back Pulldown' && w.__writes.some(d => d.exerciseGroups && (d.exerciseGroups[key] || []).some(g => g.label === 'Back Pulldown')));
  check('renaming the card does not touch the history names', ev(`entries.some(e => e.ex.some(x => x.sets['Lat Pulldown']))`));
  check('every version button has its own x', doc.querySelectorAll('.variant-chip .variant-remove-btn').length === 3);
  click(doc.querySelector('.variant-remove-btn[data-name="Seated Lat Pulldown Cable"]')); await sleep(80);
  check('x removes just that version (2 buttons left, still one card)', chips().length === 2 && !chips().some(c => c.dataset.name === 'Seated Lat Pulldown Cable') && lpCards().length === 1);
  check('the x did not switch the card to the removed version', lpCards()[0] !== 'Seated Lat Pulldown Cable');
  ev(`renderWorkoutPlan();`); await sleep(40);
  check('a removed history-only version stays removed', chips().length === 2);
  click(doc.getElementById('undoToastBtn')); await sleep(80);
  check('Undo brings the version back', chips().length === 3);
  click(doc.querySelector('.variant-remove-btn[data-name="Lat Pulldowns"]')); await sleep(80);
  ev(`renderWorkoutPlan();`); await sleep(40);
  check('removing a version you added (Lat Pulldowns) also stays removed, even though it is in history', chips().length === 2 && !chips().some(c => c.dataset.name === 'Lat Pulldowns'));
  click(doc.getElementById('showAddExerciseBtn')); doc.getElementById('newExerciseName').value = 'Lat Pulldowns'; doc.getElementById('newExerciseSets').value = '3 × 10'; click(doc.getElementById('saveNewExerciseBtn')); await sleep(80);
  check('adding it again by typing its name brings it back', chips().some(c => c.dataset.name === 'Lat Pulldowns') && chips().length === 3);
  ev(`workoutSessionState = {}; renderWorkoutPlan();`); await sleep(40);

  console.log('=== Ungroup is remembered ===');
  click(doc.querySelector('.variant-ungroup-btn')); await sleep(60);
  check('Ungroup shows the two Pull-day versions as separate cards again', lpCards().length === 2 && lpCards().includes('Lat Pulldown') && lpCards().includes('Lat Pulldowns'));
  ev(`renderWorkoutPlan();`); await sleep(40);
  check('it does not regroup itself on the next screen refresh', lpCards().length === 2);
  check('the Ungroup choice is saved', w.__writes.some(d => d.exerciseGroups && d.exerciseGroups._ungrouped && Array.isArray(d.exerciseGroups._ungrouped[key])));

  console.log('=== curls ===');
  ev(`exerciseGroups = {}; pplDayOverride = 'Pull'; customWorkoutExercises = { Pull: [{ name: 'Incline Dumbbell Curl', sets: '3 × 10' }, { name: 'Cable Curl Straight Bar', sets: '3 × 10' }] }; entries = entries.concat([{ date: '${daysAgo(3)}', ex: [{ type: 'Strength', min: 40, sets: { 'Dependent Curl': [{ weight: 25, reps: 10 }], 'Cable Curl Bent Bar': [{ weight: 50, reps: 12 }] } }] }]); workoutSessionState = {}; renderWorkoutPlan();`); await sleep(60);
  const curlCards = blocks().filter(n => /curl/i.test(n) && !/hammer|reverse|wrist/i.test(n));
  const curlChips = [...doc.querySelectorAll('.workout-exercise-block[data-exercise="' + curlCards[0] + '"] .variant-chip')].map(c => c.dataset.name);
  check('Pull day shows ONE biceps curl card', curlCards.length === 1);
  check('it has a button for each curl version (5)', ['Bicep Curl', 'Incline Dumbbell Curl', 'Cable Curl Straight Bar', 'Dependent Curl', 'Cable Curl Bent Bar'].every(n => curlChips.includes(n)) && curlChips.length === 5);
  check('Hammer, Reverse and Wrist curls keep their own cards', ['Hammer Curl', 'Reverse Curl', 'Wrist Curl', 'Reverse Wrist Curl'].filter(n => ev(`WORKOUT_PLAN_PPL.Pull.some(e => e.name === ${JSON.stringify(n)})`)).every(n => blocks().includes(n)));
  check('labels keep what tells them apart: Incline Dumbbell / Cable Straight Bar / Cable Bent Bar / Dependent', (() => { const L = n => doc.querySelector('.variant-chip[data-name="' + n + '"] .variant-chip-name').textContent; return L('Incline Dumbbell Curl') === 'Incline Dumbbell' && L('Cable Curl Straight Bar') === 'Cable Straight Bar' && L('Cable Curl Bent Bar') === 'Cable Bent Bar' && L('Dependent Curl') === 'Dependent'; })());
  check('the two cable curls get different labels', (() => { const c = [...doc.querySelectorAll('.variant-chip')]; const a = c.find(x => x.dataset.name === 'Cable Curl Straight Bar'), b = c.find(x => x.dataset.name === 'Cable Curl Bent Bar'); return a && b && a.querySelector('.variant-chip-name').textContent !== b.querySelector('.variant-chip-name').textContent; })());

  console.log('=== chest presses ===');
  const presses = ['Chest Press (machine)', 'Incline Chest Press Smith Machine', 'Supine Chest Press', 'Decline Chest Press Plate Loaded', 'Incline Bench Press MTS Machine', 'Incline Chest Press (Smith machine)', 'Bench Press', 'Incline Dumbbell Press'];
  check('all chest presses are one movement', presses.every(n => ev(`autoGroupBase(${JSON.stringify(n)})`) === 'chest press'));
  check('shoulder, overhead, leg presses and close-grip bench stay separate', ['Shoulder Press (machine)', 'Overhead Press (Smith machine)', 'Leg Press', 'Close Grip Bench Press', 'Dumbbell Shoulder Press'].every(n => ev(`autoGroupBase(${JSON.stringify(n)})`) !== 'chest press'));
  ev(`exerciseGroups = {}; pplDayOverride = 'Push'; customWorkoutExercises = { Push: [{ name: 'Supine Chest Press', sets: '3 × 10' }] }; entries = entries.concat([{ date: '${daysAgo(4)}', ex: [{ type: 'Strength', min: 40, sets: { 'Incline Chest Press Smith Machine': [{ weight: 95, reps: 10 }], 'Decline Chest Press Plate Loaded': [{ weight: 90, reps: 10 }], 'Incline Bench Press MTS Machine': [{ weight: 70, reps: 10 }] } }] }]); workoutSessionState = {}; renderWorkoutPlan();`); await sleep(60);
  const pressCards = blocks().filter(n => /press/i.test(n) && !/shoulder/i.test(n));
  const PL = n => { const c = doc.querySelector('.variant-chip[data-name="' + n + '"] .variant-chip-name'); return c ? c.textContent : null; };
  check('Push day shows ONE chest press card, titled Chest Press', pressCards.length === 1 && doc.querySelector('.workout-exercise-block[data-exercise="' + pressCards[0] + '"] .exercise-card-title').textContent === 'Chest Press');
  check('buttons: Machine / Supine / Incline Smith Machine / Decline Plate Loaded / Incline MTS Machine', PL('Chest Press (machine)') === 'Machine' && PL('Supine Chest Press') === 'Supine' && PL('Incline Chest Press Smith Machine') === 'Incline Smith Machine' && PL('Decline Chest Press Plate Loaded') === 'Decline Plate Loaded' && PL('Incline Bench Press MTS Machine') === 'Incline MTS Machine');
  check('Shoulder Press keeps its own card', blocks().includes('Shoulder Press (machine)'));
  ev(`entries = entries.filter(e => !e.ex.some(x => x.sets && x.sets['Incline Chest Press Smith Machine'])); customWorkoutExercises = {}; exerciseGroups = {};`);

  console.log('=== + Add another version on the card ===');
  ev(`entries = entries.filter(e => !e.ex.some(x => x.sets && x.sets['Seated Lat Pulldown Cable'])); exerciseGroups = {}; pplDayOverride = 'Pull'; customWorkoutExercises = { Pull: [{ name: 'Lat Pulldowns', sets: '3 × 10' }] }; hiddenWorkoutExercises = {}; workoutSessionState = {}; renderWorkoutPlan();`); await sleep(60);
  const lpChips = () => [...doc.querySelectorAll('.variant-chip')].filter(c => /pulldown/i.test(c.dataset.name)).map(c => c.dataset.name);
  check('start: the lat pulldown card has no cable button', !lpChips().some(n => /cable/i.test(n)));
  const addTile = doc.querySelector('.variant-add-tile');
  check('the grouped card has a big "+ Add" tile', !!addTile && /Add/.test(addTile.textContent));
  click(addTile); await sleep(40);
  doc.querySelector('.variant-add-input').value = 'cable';
  click(doc.querySelector('.variant-add-save')); await sleep(80);
  const cableChip = doc.querySelector('.variant-chip[data-name="Lat Pulldown (Cable)"]');
  check('typing "cable" adds a "Cable" button to the same card', !!cableChip && cableChip.querySelector('.variant-chip-name').textContent === 'Cable' && lpCards().length === 1);
  check('the new version is picked, ready to log', cableChip.classList.contains('on') && lpCards()[0] === 'Lat Pulldown (Cable)');
  check('it is saved to the day (survives a refresh)', ev(`(customWorkoutExercises[currentPlanKey()] || []).some(e => e.name === 'Lat Pulldown (Cable)')`) && w.__writes.some(d => d.customWorkoutExercises && JSON.stringify(d.customWorkoutExercises).includes('Lat Pulldown (Cable)')));
  ev(`renderWorkoutPlan();`); await sleep(40);
  check('after a refresh it is still one card with three buttons', lpCards().length === 1 && lpChips().length === 3);
  click(doc.querySelector('.variant-add-tile')); await sleep(40);
  doc.querySelector('.variant-add-input').value = 'Cable';
  click(doc.querySelector('.variant-add-save')); await sleep(80);
  check('adding "Cable" again does not make a duplicate', lpChips().length === 3 && ev(`(customWorkoutExercises[currentPlanKey()] || []).filter(e => e.name === 'Lat Pulldown (Cable)').length`) === 1);
  click(doc.querySelector('.variant-add-tile')); await sleep(40);
  click(doc.querySelector('.variant-add-save')); await sleep(40);
  check('Add with an empty box does nothing', lpChips().length === 3);
  ev(`variantAddOpen = null; customWorkoutExercises = {}; exerciseGroups = {}; renderWorkoutPlan();`);

  console.log('=== other days are untouched ===');
  for (const day of ['Push', 'Legs']) {
    ev(`pplDayOverride = ${JSON.stringify(day)}; workoutSessionState = {}; renderWorkoutPlan();`); await sleep(40);
    const builtIn = JSON.parse(ev(`JSON.stringify(WORKOUT_PLAN_PPL[${JSON.stringify(day)}].map(e => e.name))`));
    check(`${day}: every built-in exercise still has its own card, no buttons added`, builtIn.every(n => blocks().includes(n)) && chips().length === 0);
  }
  check('the Quick workout list is never auto-grouped', ev(`autoGroupVariants(QUICK_KEY, [{ name: 'Lat Pulldown' }, { name: 'Lat Pulldowns' }])`) === false);

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
