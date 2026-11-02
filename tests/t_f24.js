const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  const norm = s => s.replace(/\s+/g, ' ').trim();
  ev(`window.ds = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
      window.SET = (o) => o; syncId = 'x'; window.__setDocImpl = () => Promise.resolve();
      window.HIST = () => [
        { date: ds(3), ex: [{ type: 'Strength', ts: Date.now() - 3 * 864e5, min: 40, sets: {
          'Plank': [{ weight: 0, secs: 40, timed: true }, { weight: 0, secs: 45, timed: true }, { weight: 0, secs: 30, timed: true, warmup: true }],
          'Hanging Knee Raise': [{ weight: 0, reps: 10, bodyweight: true }, { weight: 0, reps: 12, bodyweight: true }],
          'Farmers Carry (dumbbells)': [{ weight: 25, secs: 40, timed: true }, { weight: 30, secs: 50, timed: true }],
          'Leg Press': [{ weight: 200, reps: 10 }, { weight: 220, reps: 12 }] } }] },
        { date: ds(10), ex: [{ type: 'Strength', ts: Date.now() - 10 * 864e5, min: 40, sets: {
          'Plank': [{ weight: 0, secs: 35, timed: true }, { weight: 0, secs: 40, timed: true }], 'Hanging Knee Raise': [{ weight: 0, reps: 8, bodyweight: true }, { weight: 0, reps: 9, bodyweight: true }],
          'Farmers Carry (dumbbells)': [{ weight: 25, secs: 40, timed: true }], 'Leg Press': [{ weight: 200, reps: 10 }] } }] },
        { date: ds(17), ex: [{ type: 'Strength', ts: Date.now() - 17 * 864e5, min: 40, sets: {
          'Plank': [{ weight: 0, secs: 30, timed: true }], 'Hanging Knee Raise': [{ weight: 0, reps: 7, bodyweight: true }],
          'Farmers Carry (dumbbells)': [{ weight: 20, secs: 35, timed: true }], 'Leg Press': [{ weight: 180, reps: 10 }] } }] } ];`);
  console.log('=== 1. the plan ===');
  const plan = d => ev(`WORKOUT_PLAN_PPL.${d}.map(e => e.name + ' | ' + e.sets)`);
  check('Push gains Cable Crunch (3 × 12–15) at the end', plan('Push').length === 5 && plan('Push')[4] === 'Cable Crunch | 3 × 12–15');
  check('Pull gains Hammer Curl, Reverse Curl, Wrist Curl and Reverse Wrist Curl after the Bicep Curl', plan('Pull').slice(3).join() === 'Bicep Curl | 3 × 12–15,Hammer Curl | 3 × 12–15,Reverse Curl | 3 × 12–15,Wrist Curl (dumbbell) | 3 × 12–15,Reverse Wrist Curl (dumbbell) | 2 × 15–20');
  check('Legs keeps Plank and adds Hanging Knee Raise and Farmers Carry', plan('Legs').slice(4).join() === 'Plank | 3 × 30–45 sec,Hanging Knee Raise | 3 × 10–15,Farmers Carry (dumbbells) | 3 × 40–60 sec');
  check('nothing else in the plan changed (the original 13 exercises are all still there)', ['Chest Press (machine)', 'Shoulder Press (machine)', 'Pec Deck (machine)', 'Triceps Pushdown (cable)', 'Lat Pulldown', 'Seated Row', 'Reverse Fly (machine)', 'Bicep Curl', 'Leg Press', 'Leg Extension (machine)', 'Leg Curl (machine)', 'Calf Raise (machine)', 'Plank'].every(n => ev(`[...WORKOUT_PLAN_PPL.Push, ...WORKOUT_PLAN_PPL.Pull, ...WORKOUT_PLAN_PPL.Legs].some(e => e.name === ${JSON.stringify(n)})`)));
  check('no exercise name contains an apostrophe (names travel through page markup)', ev(`[...WORKOUT_PLAN_PPL.Push, ...WORKOUT_PLAN_PPL.Pull, ...WORKOUT_PLAN_PPL.Legs].every(e => !/['"]/.test(e.name))`));
  console.log('=== 2. muscle groups ===');
  const grp = n => ev(`muscleGroupFor(${JSON.stringify(n)})`);
  check('the new exercises map as intended', grp('Cable Crunch') === 'Core' && grp('Hanging Knee Raise') === 'Core' && grp('Wrist Curl (dumbbell)') === 'Forearms' && grp('Reverse Wrist Curl (dumbbell)') === 'Forearms' && grp('Farmers Carry (dumbbells)') === 'Forearms');
  check('wrist curls are Forearms, NOT swallowed by the generic "curl" -> Biceps rule', grp('Seated Wrist Curl') === 'Forearms' && grp('Reverse Curl') === 'Forearms' && grp('Hammer Curl') === 'Biceps' && grp('Preacher Curl (machine)') === 'Biceps' && grp('Bicep Curl') === 'Biceps');
  check('leg curls, calf raises and the other existing rules are untouched', grp('Leg Curl (machine)') === 'Hamstrings' && grp('Calf Raise (machine)') === 'Calves' && grp('Lat Pulldown') === 'Back' && grp('Chest Press (machine)') === 'Chest');
  check('other grip and ab moves a custom exercise might use are recognised', grp('Dead Hang') === 'Forearms' && grp('Farmer Walk') === 'Forearms' && grp("Captain's Chair Knee Raise") === 'Core' && grp('Sit-up') === 'Core' && grp('Russian Twist') === 'Core' && grp('Ab Crunch (machine)') === 'Core');
  console.log('=== 3. which kind of set ===');
  const mode = n => ev(`exerciseMode(${JSON.stringify(n)})`);
  check('Plank = timed; Hanging Knee Raise = bodyweight; Farmers Carry = timed with a load', mode('Plank') === 'timed' && mode('Hanging Knee Raise') === 'bodyweight' && mode('Farmers Carry (dumbbells)') === 'timedLoaded');
  check('every ordinary lift stays weighted', ['Chest Press (machine)', 'Leg Press', 'Wrist Curl (dumbbell)', 'Cable Crunch', 'Bicep Curl', 'Calf Raise (machine)'].every(n => mode(n) === 'weighted'));
  ev(`customWorkoutExercises = { Push: [{ name: 'Wall Sit', sets: '3 × 30 sec', rest: 60 }, { name: 'Sled Drag', sets: '3 × 20 sec', rest: 60 }, { name: 'Zottman Curl', sets: '3 × 12', rest: 60 }] }`);
  check('a custom exercise whose target says "sec" is timed; with "sled/carry" in the name it also takes a load', mode('Wall Sit') === 'timed' && mode('Sled Drag') === 'timedLoaded' && mode('Zottman Curl') === 'weighted');
  ev(`customWorkoutExercises = {}`);
  check('swapped-in names are recognised by name too (Dead Hang timed, Push-up bodyweight)', mode('Dead Hang') === 'timed' && mode('Push-up') === 'bodyweight');
  console.log('=== 4. what gets saved ===');
  ev(`workoutSessionState = {
    'Plank': [{ weight: '', reps: '45', done: true }, { weight: '', reps: '40', done: true }, { weight: '', reps: '30', done: true, warmup: true }, { weight: '', reps: '35', done: false }, { weight: '', reps: '', done: true }],
    'Hanging Knee Raise': [{ weight: '', reps: '12', done: true }, { weight: '', reps: '0', done: true }],
    'Farmers Carry (dumbbells)': [{ weight: '25', reps: '50', done: true }, { weight: '', reps: '40', done: true }],
    'Leg Press': [{ weight: '200', reps: '10', done: true }, { weight: '', reps: '10', done: true }, { weight: '200', reps: '', done: true }, { weight: '210', reps: '8', done: false }] }`);
  const saved = ev('gatherWorkoutSets()');
  check('Plank: seconds saved as timed sets with no weight (these used to be thrown away)', JSON.stringify(saved.Plank.map(s => [s.secs, s.timed, s.weight, s.warmup || false])) === JSON.stringify([[45, true, 0, false], [40, true, 0, false], [30, true, 0, true]]));
  check('only finished sets with a real value count (an unchecked set and a blank one are dropped)', saved.Plank.length === 3);
  check('Hanging Knee Raise: reps saved as bodyweight sets; a 0-rep set is dropped', JSON.stringify(saved['Hanging Knee Raise']) === JSON.stringify([{ weight: 0, reps: 12, bodyweight: true }]));
  check('Farmers Carry: weight + seconds; with no weight entered it saves as an unloaded timed set', JSON.stringify(saved['Farmers Carry (dumbbells)']) === JSON.stringify([{ weight: 25, secs: 50, timed: true }, { weight: 0, secs: 40, timed: true }]));
  check('ordinary lifts behave exactly as before: needs weight AND reps; incomplete or unchecked sets dropped', JSON.stringify(saved['Leg Press']) === JSON.stringify([{ weight: 200, reps: 10 }]));
  ev(`workoutSessionState = { 'Plank': [{ weight: '', reps: '45', done: false }] }`);
  check('nothing finished -> nothing saved', ev('gatherWorkoutSets()') === null);
  console.log('=== 5. how they read ===');
  const f = (s, sep) => ev(`fmtSet(${JSON.stringify(s)}${sep ? ', ' + JSON.stringify(sep) : ''})`);
  check('history chips: "45s", "25×50s", "BW×12", and an ordinary set is still "70×12"', f({ weight: 0, secs: 45, timed: true }) === '45s' && f({ weight: 25, secs: 50, timed: true }) === '25×50s' && f({ weight: 0, reps: 12, bodyweight: true }) === 'BW×12' && f({ weight: 70, reps: 12 }) === '70×12');
  check('the AI-summary spelling uses "x"', f({ weight: 25, secs: 50, timed: true }, 'x') === '25x50s' && f({ weight: 70, reps: 12 }, 'x') === '70x12');
  const p = s => ev(`fmtPrevSet(${JSON.stringify(s)})`);
  check('the "last …" text in a set row: "45 s", "25 lb × 50 s", "12 reps", "70 lb × 10"', p({ secs: 45, timed: true, weight: 0 }) === '45 s' && p({ weight: 25, secs: 50, timed: true }) === '25 lb × 50 s' && p({ weight: 0, reps: 12, bodyweight: true }) === '12 reps' && p({ weight: 70, reps: 10 }) === '70 lb × 10');
  ev(`entries = HIST()`);
  ev(`showExerciseHistory('Plank')`); const hm = () => norm($('exerciseHistoryModal').textContent);
  check('the Plank history lists each set as seconds (and warm-ups marked W)', /40s/.test(hm()) && /45s/.test(hm()) && /W · 30s/.test(hm()) && !/undefined|NaN|0×/.test(hm()));
  check('...with a best-time trend in sec instead of an empty "best weight" chart', /\d+–\d+ sec/.test(hm()) && !/Estimated 1RM/.test(hm()));
  ev(`showExerciseHistory('Hanging Knee Raise')`);
  check('Knee Raise: reps trend, sets as "BW×12"', /7–12 reps/.test(hm()) && /BW×12/.test(hm()) && !/undefined|NaN/.test(hm()));
  ev(`showExerciseHistory('Farmers Carry (dumbbells)')`);
  check('Farmers Carry: heaviest-carry trend in lb, sets as "30×50s"', /20–30 lb/.test(hm()) && /30×50s/.test(hm()));
  ev(`showExerciseHistory('Leg Press')`);
  check('an ordinary lift is unchanged: weight trend, 1RM block, "220×12"', /180–220 lb/.test(hm()) && /220×12/.test(hm()) && !!doc.querySelector('.e1rm-block'));
  console.log('=== 6. the set row on screen ===');
  const rowHtml = (name, st, prev) => { const d = doc.createElement('div'); d.innerHTML = ev(`renderSetRowHtml(${JSON.stringify(name)}, 0, ${JSON.stringify(st)}, ${JSON.stringify(prev || null)}, '#5CE6C0')`); return d; };
  let r = rowHtml('Plank', { weight: '', reps: '45', done: false, warmup: false }, { weight: 0, secs: 40, timed: true });
  check('Plank row: no weight box, the box is in seconds, and last time reads "40 s"', !r.querySelector('.set-weight-input') && !r.querySelector('.set-weight-group') && r.querySelector('.set-row').classList.contains('no-weight') && r.querySelector('.set-reps-field .unit').textContent === 'sec' && /last 40 s/.test(r.querySelector('.set-prev').textContent));
  r = rowHtml('Hanging Knee Raise', { weight: '', reps: '12', done: false, warmup: false }, { weight: 0, reps: 10, bodyweight: true });
  check('Knee Raise row: no weight box, reps, "last 10 reps"', !r.querySelector('.set-weight-input') && r.querySelector('.set-reps-field .unit').textContent === 'reps' && /last 10 reps/.test(r.querySelector('.set-prev').textContent));
  r = rowHtml('Farmers Carry (dumbbells)', { weight: '25', reps: '50', done: false, warmup: false }, { weight: 25, secs: 40, timed: true });
  check('Farmers Carry row: weight box AND a seconds box, "last 25 lb × 40 s"', !!r.querySelector('.set-weight-input') && !r.querySelector('.set-row').classList.contains('no-weight') && r.querySelector('.set-reps-field .unit').textContent === 'sec' && /last 25 lb × 40 s/.test(r.querySelector('.set-prev').textContent));
  r = rowHtml('Leg Press', { weight: '200', reps: '10', done: false, warmup: false }, { weight: 200, reps: 10 });
  check('an ordinary lift row is exactly as before: weight box, "reps", "last 200 lb × 10"', !!r.querySelector('.set-weight-group') && r.querySelector('.set-reps-field .unit').textContent === 'reps' && /last 200 lb × 10/.test(r.querySelector('.set-prev').textContent) && !r.querySelector('.set-row').classList.contains('no-weight'));
  check('the layout gives the seconds/reps box the room when there is no weight box', /\.set-row\.no-weight \.set-reps-field \{ flex: 1 1 auto; \}/.test(html));
  console.log('=== 7. a real Legs day, end to end ===');
  ev(`workoutPlanMode = 'ppl'; pplDayOverride = 'Legs'; workoutSessionState = {}; entries = HIST(); renderWorkoutPlan();`);
  const row = (n, i) => doc.querySelector(`.set-row[data-exercise="${n}"][data-set-idx="${i}"]`);
  check('all 7 Legs exercises are on screen', ['Leg Press', 'Leg Extension (machine)', 'Leg Curl (machine)', 'Calf Raise (machine)', 'Plank', 'Hanging Knee Raise', 'Farmers Carry (dumbbells)'].every(n => !!row(n, 0)));
  check('Plank starts pre-filled from last time (seconds, not "undefined")', row('Plank', 0).querySelector('.set-reps-input').value === '40' && row('Plank', 1).querySelector('.set-reps-input').value === '45' && !row('Plank', 0).querySelector('.set-weight-input'));
  check('Farmers Carry is pre-filled with last time\'s weight and seconds', row('Farmers Carry (dumbbells)', 0).querySelector('.set-weight-input').value === '25' && row('Farmers Carry (dumbbells)', 0).querySelector('.set-reps-input').value === '40');
  check('Knee Raise pre-filled with last time\'s reps', row('Hanging Knee Raise', 0).querySelector('.set-reps-input').value === '10');
  const rin = (n, i, v) => { const el = row(n, i).querySelector('.set-reps-input'); el.value = v; el.dispatchEvent(new w.Event('input', { bubbles: true })); };
  rin('Plank', 0, '50'); click(row('Plank', 0).querySelector('.set-check-btn'));
  rin('Hanging Knee Raise', 0, '14'); click(row('Hanging Knee Raise', 0).querySelector('.set-check-btn'));
  const win = row('Farmers Carry (dumbbells)', 0).querySelector('.set-weight-input'); win.value = '35'; win.dispatchEvent(new w.Event('input', { bubbles: true })); rin('Farmers Carry (dumbbells)', 0, '55'); click(row('Farmers Carry (dumbbells)', 0).querySelector('.set-check-btn'));
  const lp = row('Leg Press', 0); lp.querySelector('.set-weight-input').value = '230'; lp.querySelector('.set-weight-input').dispatchEvent(new w.Event('input', { bubbles: true })); rin('Leg Press', 0, '12'); click(row('Leg Press', 0).querySelector('.set-check-btn'));
  check('checking sets off works on rows with no weight box (and the rest timer starts)', row('Plank', 0).classList.contains('done') && ev('restTimerEndTime') != null);
  ev(`restTimerContext = { exerciseName: 'Plank', setIdx: 0 }; focusNextSetInput();`);
  check('after a rest, focus goes to the next Plank set\'s seconds box (there is no weight box to focus)', doc.activeElement === row('Plank', 1).querySelector('.set-reps-input'));
  ev(`stopRestTimer()`);
  ev(`window.__saved = null; writeEx = (d, list) => { window.__saved = { d, list }; return Promise.resolve(); }; document.getElementById('exDate').value = todayStr();`);
  await ev(`logExercise('Strength', 30, '', '')`); await sleep(40);
  const item = ev('window.__saved') && ev('window.__saved.list.find(x => x.type === "Strength")');
  check('Finish Workout (the real save path) stores every kind of set', !!item && item.sets.Plank[0].secs === 50 && item.sets.Plank[0].timed === true && item.sets['Hanging Knee Raise'][0].reps === 14 && item.sets['Hanging Knee Raise'][0].bodyweight === true && item.sets['Farmers Carry (dumbbells)'][0].weight === 35 && item.sets['Farmers Carry (dumbbells)'][0].secs === 55 && item.sets['Leg Press'][0].weight === 230);
  console.log('=== 8. they cannot corrupt PRs, charts, badges, 1RM or progression ===');
  ev(`entries = HIST()`);
  check('no "best weight" for a plank or knee raise, and no PR-hint crash on a row without a weight box', ev(`bestWeightForExercise('Plank')`) === null && ev(`bestWeightForExercise('Hanging Knee Raise')`) === null && (() => { try { ev(`updatePRProximityHint(document.querySelector('.set-row[data-exercise="Plank"]'))`); return true; } catch (e) { return false; } })());
  const prNames = ev(`allExercisePRs().map(p => p.name)`);
  check('PR Hall of Fame lists real lifts only (no plank, knee raise or carry rows like "0 lb × undefined")', prNames.includes('Leg Press') && !prNames.some(n => ['Plank', 'Hanging Knee Raise', 'Farmers Carry (dumbbells)'].includes(n)));
  const hist = n => ev(`fullExerciseHistory(${JSON.stringify(n)})`);
  check('exercise history carries no weight-based "best" for the new kinds, but does for Leg Press', hist('Plank').every(h => h.bestWeight === null) && hist('Hanging Knee Raise').every(h => h.bestWeight === null) && hist('Leg Press').every(h => h.bestWeight > 0));
  check('1RM trend ignores them; Leg Press still has one', ev(`oneRepMaxTrend(fullExerciseHistory('Plank'))`).length === 0 && ev(`oneRepMaxTrend(fullExerciseHistory('Farmers Carry (dumbbells)'))`).length === 0 && ev(`oneRepMaxTrend(fullExerciseHistory('Leg Press'))`).length === 3);
  check('progression engine sees no sessions for them (so no bogus "try 5 lb" hint, plateau flag, or auto-bump)', ev(`recentWorkingSetsFor('Plank', 3).length`) === 0 && ev(`recentWorkingSetsFor('Hanging Knee Raise', 3).length`) === 0 && ev(`recentWorkingSetsFor('Farmers Carry (dumbbells)', 3).length`) === 0 && ev(`suggestedSetValues('Hanging Knee Raise', '3 × 10–15')`) === null && ev(`progressionHintFor('Hanging Knee Raise', '3 × 10–15')`) === null && !ev(`plateauHintFor('Hanging Knee Raise')`) && !ev(`plateauHintFor('Plank')`));
  check('...while a real lift still has its sessions', ev(`recentWorkingSetsFor('Leg Press', 3).length`) === 3);
  const volWith = ev(`totalSessionWeight(entries[0].ex[0].sets)`);
  check('session volume counts lifted weight only (Leg Press 200×10 + 220×12 = 4,640), not seconds', volWith === 4640);
  const prSets = { 'Plank': [{ weight: 0, secs: 120, timed: true }], 'Leg Press': [{ weight: 400, reps: 10 }] };
  const sessionPRs = ev(`detectSessionPRs(${JSON.stringify(prSets)})`);
  check('a record-length plank is not a "PR"; a real record lift still is', Array.isArray(sessionPRs) && sessionPRs.some(p => p.exercise === 'Leg Press' && p.weight === 400 && p.previous === 220) && !sessionPRs.some(p => p.exercise === 'Plank'));
  const prSnapshot = () => ev(`(() => { const b = computeBadgeData(); return { totalPRs: b.totalPRs }; })()`);
  const before = prSnapshot();
  ev(`entries = HIST().map(e => ({ ...e, ex: e.ex.map(x => ({ ...x, sets: { 'Leg Press': x.sets['Leg Press'] } })) }))`);
  const after = prSnapshot();
  check(`badge PR count (${before.totalPRs}) is identical with or without all the plank/carry/knee-raise sets (before the fix a plank would add one every session)`, typeof before.totalPRs === 'number' && before.totalPRs === after.totalPRs && before.totalPRs >= 1);
  check('the weight-progress chart can be built for them without error', (() => { try { w.Chart = class { constructor() {} destroy() {} update() {} }; ev(`renderWeightProgressChart('Plank')`); ev(`renderWeightProgressChart('Hanging Knee Raise')`); return true; } catch (e) { console.log('   ', e.message); return false; } })());
  ev(`entries = HIST()`);
  console.log('=== 9. the AI summary ===');
  const rows = ev(`gatherRecentHealthData(120)`); const newest = rows.find(r => r.date === ev('ds(3)'));
  const lines = newest.strength_sets.join(' | ');
  check('planks as seconds, knee raises as BWxreps, carries as weightxseconds; warm-up left out', /Plank: 40s, 45s(?!, 30s)/.test(lines) && /Hanging Knee Raise: BWx10, BWx12/.test(lines) && /Farmers Carry \(dumbbells\): 25x40s, 30x50s/.test(lines));
  check('ordinary lifts unchanged ("Leg Press: 200x10, 220x12")', /Leg Press: 200x10, 220x12/.test(lines));
  check('the AI is told how to read them', /BWxreps/.test(ev('AI_DATA_LEGEND')) && /timed holds\/carries as seconds/.test(ev('AI_DATA_LEGEND')) && /strength_sets lists each exercise as weightxreps/.test(ev('AI_DATA_LEGEND')));
  console.log('=== 10. the muscle map ===');
  check('Forearms is a tracked group with a 6-sets/week goal', ev('MUSCLE_MAP_GROUPS').includes('Forearms') && ev(`muscleGoalFor('Forearms')`) === 6 && ev('MUSCLE_MAP_GROUPS.length') === 11);
  ev(`entries = [{ date: ds(1), ex: [{ type: 'Strength', ts: Date.now() - 864e5, sets: { 'Wrist Curl (dumbbell)': [{ weight: 15, reps: 12 }, { weight: 15, reps: 12 }, { weight: 15, reps: 11 }], 'Plank': [{ weight: 0, secs: 45, timed: true }, { weight: 0, secs: 40, timed: true }], 'Cable Crunch': [{ weight: 40, reps: 12 }], 'Farmers Carry (dumbbells)': [{ weight: 30, secs: 40, timed: true }] } }] }]; muscleMapMode = 'volume'; muscleMapSelected = null; showView('history'); renderMuscleMap();`);
  const st = ev('muscleStats()');
  check('Forearms count wrist curls + the carry (3 + 1 = 4 sets)', st.Forearms.sets === 4);
  check('Core now counts planks and crunches (2 + 1 = 3 sets) — it used to read 0 because timed sets were never saved', st.Core.sets === 3);
  const map = $('muscleMap');
  check('the figure has Forearms shapes on both the front and the back (4 in all)', map.querySelectorAll('[data-muscle="Forearms"]').length === 4 && map.querySelector('[data-musclechip="Forearms"]').textContent.includes('4/6'));
  check('forearm shapes light up (not the neutral gray)', [...map.querySelectorAll('[data-muscle="Forearms"]')].every(s => s.getAttribute('fill') === 'var(--teal)'));
  ev(`entries = []; renderMuscleMap();`);
  check('with nothing logged, Forearms shows among the muscles not hit yet', /Not hit yet|No strength sessions/.test(map.textContent));
  console.log('=== 11. swapping ===');
  const swaps = (n, today) => ev(`suggestSwapsFor(${JSON.stringify(n)}, ${JSON.stringify(today || [])}).map(s => s.name)`);
  check('swapping Wrist Curl offers the other grip work (not itself)', swaps('Wrist Curl (dumbbell)').includes('Farmers Carry (dumbbells)') && swaps('Wrist Curl (dumbbell)').includes('Dead Hang') && !swaps('Wrist Curl (dumbbell)').includes('Wrist Curl (dumbbell)'));
  check('swapping Plank offers Hanging Knee Raise', swaps('Plank').includes('Hanging Knee Raise'));
  check('...but not something already in today\'s plan', !swaps('Plank', ['Hanging Knee Raise']).includes('Hanging Knee Raise'));
  console.log('=== 12. the old display code is gone ===');
  check('no spot still prints a set as weight×reps unconditionally', !/\$\{s\.weight\}×\$\{s\.reps\}|\$\{set\.weight\}×\$\{set\.reps\}|\$\{s\.weight\}x\$\{s\.reps\}/.test(html));
  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 70000);
