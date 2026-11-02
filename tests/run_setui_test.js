const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_setui_test.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true });
dom.window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
const errors = [];
dom.window.addEventListener('error', (e) => errors.push(e.message + ' | ' + (e.error && e.error.stack ? e.error.stack.split('\n')[1] : '')));
const click = (el) => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
const ok = (label, cond) => console.log((cond ? 'PASS ' : 'FAIL ') + label);
let fails = 0; const check = (label, cond) => { if (!cond) fails++; ok(label, cond); };

setTimeout(async () => {
  const doc = dom.window.document;
  const block = (name) => [...doc.querySelectorAll('.workout-exercise-block')].find(b => b.dataset.exercise === name);
  const rows = (name) => [...block(name).querySelectorAll('.set-row')];
  dom.window.eval(`
    workoutPlanMode = 'ppl'; pplDayOverride = 'Push';
    entries = [{ date: '2026-09-28', ex: [{ type: 'Strength', planDay: 'Push',
      sets: { 'Chest Press (machine)': [{weight:50,reps:12},{weight:60,reps:12},{weight:70,reps:12}] } }] }];
    workoutSessionState = {}; workoutNotesState = {}; workoutVariationState = {}; todaysSwaps = {};
    document.getElementById('exDate').value = todayStr();
    renderWorkoutPlan();
  `);

  console.log('=== 1. Card layout: clutter collapsed into one action row ===');
  const chest = block('Chest Press (machine)');
  check('action row exists', !!chest.querySelector('.exercise-action-row'));
  check('variation pill present', !!chest.querySelector('.variation-toggle-btn'));
  check('superset / swap / note buttons present', !!chest.querySelector('.superset-pair-toggle-btn') && !!chest.querySelector('.swap-toggle-btn') && !!chest.querySelector('.exercise-note-toggle-btn'));
  check('old stacked variation row gone', !chest.querySelector('.exercise-variation-row'));
  check('old column header row gone', !/SET\s*PREVIOUS/i.test(chest.textContent));
  check('old "0/3" text badge gone', !/0\/3/.test(chest.querySelector('div').textContent));
  const segs = chest.querySelectorAll('.progress-seg');
  check('3 progress segments, none filled', segs.length === 3 && chest.querySelectorAll('.progress-seg.on').length === 0);
  check('variation panel hidden by default', chest.querySelector('.exercise-variation-panel').style.display === 'none');

  console.log('\n=== 2. Variation pill -> panel -> selection ===');
  check('variation button is icon-only (no wide text pill)', !chest.querySelector('.variation-toggle-btn .pill-text'));
  check('progress bar is its own full-width row, outside the title row', !!chest.querySelector(':scope > .progress-segs'));
  check('action row stays on one line: left text is truncating, not wrapping', dom.window.getComputedStyle(chest.querySelector('.exercise-sets-target')).whiteSpace === 'nowrap');
  click(chest.querySelector('.variation-toggle-btn'));
  check('tapping pill opens panel', chest.querySelector('.exercise-variation-panel').style.display !== 'none');
  click(chest.querySelector('.exercise-variation-chip[data-option="high"]'));
  const chest2 = block('Chest Press (machine)');
  check('state saved', dom.window.eval(`workoutVariationState['Chest Press (machine)']`) === 'high');
  check('panel collapsed after choosing', chest2.querySelector('.exercise-variation-panel').style.display === 'none');
  check('sets target stays short', chest2.querySelector('.exercise-sets-target').textContent === '3×10–12');
  check('chosen option + target muscle shown in an untruncated caption', (chest2.querySelector('.variation-caption') || {textContent: ''}).textContent.includes('High / Incline') && chest2.querySelector('.variation-caption').textContent.includes('Upper Chest'));
  check('button gets the active ring', chest2.querySelector('.variation-toggle-btn').classList.contains('on'));
  click(chest2.querySelector('.variation-toggle-btn'));
  check('reopened panel shows the target muscle', chest2.querySelector('.exercise-variation-panel').textContent.includes('Targets: Upper Chest'));
  click(chest2.querySelector('.variation-toggle-btn'));

  console.log('\n=== 3. Superset / swap pickers hidden until tapped ===');
  const ss = chest2.querySelector('.superset-pair-select');
  check('superset select hidden', ss.style.display === 'none');
  click(chest2.querySelector('.superset-pair-toggle-btn'));
  check('superset select shows on tap', ss.style.display !== 'none');
  check('swap select hidden then shows', chest2.querySelector('.swap-select').style.display === 'none' && (click(chest2.querySelector('.swap-toggle-btn')), chest2.querySelector('.swap-select').style.display !== 'none'));
  const noteWrap = chest2.querySelector('.exercise-note-wrap');
  check('note hidden then shows', noteWrap.style.display === 'none' && (click(chest2.querySelector('.exercise-note-toggle-btn')), noteWrap.style.display !== 'none'));

  console.log('\n=== 4. Set row structure ===');
  const r = rows('Chest Press (machine)');
  check('3 set rows', r.length === 3);
  check('row has top line + main line', !!r[0].querySelector('.set-row-top') && !!r[0].querySelector('.set-row-main'));
  check('muted "last" text shows previous numbers', r[2].querySelector('.set-prev').textContent.includes('70 lb × 12'));
  check('steppers present', !!r[0].querySelector('.set-weight-minus') && !!r[0].querySelector('.set-weight-plus'));

  console.log('\n=== 5. Weight steppers ===');
  const w0 = () => rows('Chest Press (machine)')[0];
  w0().querySelector('.set-weight-input').value = '70';
  dom.window.eval(`workoutSessionState['Chest Press (machine)'][0].weight = '70'`);
  click(w0().querySelector('.set-weight-plus'));
  check('+ adds 5', w0().querySelector('.set-weight-input').value === '75' && dom.window.eval(`workoutSessionState['Chest Press (machine)'][0].weight`) === '75');
  click(w0().querySelector('.set-weight-minus')); click(w0().querySelector('.set-weight-minus'));
  check('− subtracts 5 each tap', w0().querySelector('.set-weight-input').value === '65');
  w0().querySelector('.set-weight-input').value = '2';
  dom.window.eval(`workoutSessionState['Chest Press (machine)'][0].weight = '2'`);
  click(w0().querySelector('.set-weight-minus'));
  check('never goes below 0', w0().querySelector('.set-weight-input').value === '0');
  w0().querySelector('.set-weight-input').value = '';
  dom.window.eval(`workoutSessionState['Chest Press (machine)'][0].weight = ''`);
  click(w0().querySelector('.set-weight-plus'));
  check('empty field seeds from last session (set 1 was 50) then adds 5', w0().querySelector('.set-weight-input').value === '55');

  console.log('\n=== 6. PR chip logic (your screenshot scenario: best ever = 70) ===');
  const chip = (i) => rows('Chest Press (machine)')[i].querySelector('.pr-proximity-hint');
  const setW = (i, v) => { const inp = rows('Chest Press (machine)')[i].querySelector('.set-weight-input'); inp.value = v; inp.dispatchEvent(new dom.window.Event('input', { bubbles: true })); };
  setW(0, '70');
  check('70 lb (a TIE) is NOT "PR pace", and shows nothing at all (it is just noise on every pre-filled row)', !chip(0).classList.contains('pr-pace') && chip(0).style.display === 'none');
  setW(0, '75');
  check('75 lb beats it -> gold PR pace chip', chip(0).classList.contains('pr-pace') && chip(0).textContent.includes('PR pace'));
  setW(0, '60');
  check('60 lb -> "10 lb to PR"', chip(0).textContent === '10 lb to PR' && !chip(0).classList.contains('pr-pace'));
  setW(0, '50');
  check('50 lb (20 below) shows nothing: far from a PR is not worth a label', chip(0).style.display === 'none');
  setW(0, '');
  check('empty weight hides chip', chip(0).style.display === 'none');
  rows('Chest Press (machine)')[1].querySelector('.set-number-toggle').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  check('warm-up set has no PR chip at all', !rows('Chest Press (machine)')[1].querySelector('.pr-proximity-hint'));

  console.log('\n=== 7. Checking a set: fill, segment, pop animation ===');
  setW(0, '70');
  dom.window.eval(`workoutSessionState['Chest Press (machine)'][0].reps = '12'`);
  click(rows('Chest Press (machine)')[0].querySelector('.set-check-btn'));
  const after = rows('Chest Press (machine)')[0];
  check('row marked done', after.classList.contains('done'));
  check('check button pops on the render it was ticked', after.querySelector('.set-check-btn').classList.contains('set-just-done'));
  check('one progress segment filled', block('Chest Press (machine)').querySelectorAll('.progress-seg.on').length === 1);
  dom.window.eval('renderWorkoutPlan();');
  check('later re-render does NOT replay the pop', !rows('Chest Press (machine)')[0].querySelector('.set-check-btn').classList.contains('set-just-done'));
  click(rows('Chest Press (machine)')[0].querySelector('.set-check-btn'));
  check('un-checking clears done + segment', !rows('Chest Press (machine)')[0].classList.contains('done') && block('Chest Press (machine)').querySelectorAll('.progress-seg.on').length === 0);

  console.log('\n=== 8. All sets done -> card completes ===');
  dom.window.eval(`
    workoutSessionState['Chest Press (machine)'].forEach(s => { s.done = true; s.weight = s.weight || 60; s.reps = s.reps || 10; });
    renderWorkoutPlan();`);
  const done = block('Chest Press (machine)');
  check('card gets completed class + glow', done.classList.contains('workout-exercise-done') && done.style.boxShadow.includes('22px'));
  check('all segments filled', done.querySelectorAll('.progress-seg.on').length === done.querySelectorAll('.progress-seg').length);
  check('no redundant checkmark emoji crowding the title', !done.querySelector('.exercise-zoom-btn').textContent.includes('✅'));

  console.log('\n=== 9. Add / remove set still work ===');
  dom.window.eval(`workoutSessionState['Chest Press (machine)'].forEach(s => s.done = false); renderWorkoutPlan();`);
  click(block('Chest Press (machine)').querySelector('.add-set-btn'));
  check('add set -> 4 rows, 4 segments', rows('Chest Press (machine)').length === 4 && block('Chest Press (machine)').querySelectorAll('.progress-seg').length === 4);
  click(rows('Chest Press (machine)')[3].querySelector('.set-remove-btn'));
  check('remove set -> back to 3', rows('Chest Press (machine)').length === 3);

  console.log('\n=== 10. Variation save only covers exercises actually performed ===');
  dom.window.eval(`
    workoutSessionState = { 'Chest Press (machine)': [{ weight: 70, reps: 12, done: true, warmup: false }] };
    workoutVariationState = { 'Chest Press (machine)': 'high', 'Triceps Pushdown (cable)': 'rope' };
    writeEx = (date, exArr) => { window.__saved = exArr[exArr.length - 1]; return Promise.resolve(); };`);
  await dom.window.eval(`logExercise('Strength', 30, '', '')`);
  const saved = dom.window.eval('window.__saved');
  check('performed exercise variation saved', saved.exerciseVariations && saved.exerciseVariations['Chest Press (machine)'] === 'high');
  check('never-performed exercise variation NOT saved', !saved.exerciseVariations['Triceps Pushdown (cable)']);

  console.log('\n=== 11. Focus-next-set selector still resolves ===');
  dom.window.eval(`workoutSessionState = {}; workoutVariationState = {}; renderWorkoutPlan();`);
  check('.set-row[...] .set-weight-input found', !!doc.querySelector(`.set-row[data-exercise="Chest Press (machine)"][data-set-idx="1"] .set-weight-input`));

  console.log('\n=== Errors ===');
  errors.forEach(e => console.log(' -', e));
  console.log(errors.length ? '' : '(none)');
  console.log(fails ? `\n${fails} CHECK(S) FAILED` : '\nALL CHECKS PASSED');
  process.exit(0);
}, 2000);
setTimeout(() => process.exit(1), 20000);
