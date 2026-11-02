const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true });
dom.window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
setTimeout(() => {
  const doc = dom.window.document; const ev = s => dom.window.eval(s);
  const setup = `
    window.S = (n, extra = {}) => Array.from({ length: n }, () => Object.assign({ weight: 70, reps: 10 }, extra));
    window.day = off => { const d = new Date(); d.setDate(d.getDate() - off); return d.toISOString().slice(0, 10); };
    window.__mk = (off, sets, type = 'Strength') => ({ date: day(off), ex: [{ type, ts: 1, sets }] });`;
  ev(setup);
  console.log('=== 1. counting ===');
  ev(`entries = [
    __mk(1, { 'Chest Press (machine)': S(3), 'Pec Deck (machine)': S(2) }),
    __mk(2, { 'Chest Press (machine)': [...S(2), ...S(2, { warmup: true })] }),
    __mk(3, { 'Hammer Strength MTS Row': S(4), 'Totally Unknown Move': S(5) }),
    __mk(6, { 'Leg Press': S(3) }),
    __mk(7, { 'Leg Press': S(9) }),
    __mk(9, { 'Bicep Curl': S(9) }),
    __mk(1, { 'Lat Pulldown': S(9) }, 'Cardio') ];`);
  const r = ev(`muscleSetsLastDays(7)`);
  check('chest = 3 + 2 + 2 (warm-ups excluded)', r.counts.Chest === 7);
  check('a custom exercise is placed by keyword (Row -> Back)', r.counts.Back === 4);
  check('an exercise the mapping cannot place is left out, not guessed', Object.values(r.counts).reduce((a, b) => a + b, 0) === 7 + 4 + 3);
  check('6 days ago is inside the window', r.counts.Quads === 3);
  check('7 days ago is outside it (window is exactly 7 days incl. today)', r.counts.Quads !== 12);
  check('older sessions ignored', r.counts.Biceps === 0);
  check('non-strength entries ignored', true && ev(`muscleSetsLastDays(7).counts.Back`) === 4);
  check('session count reflects only strength sessions in the window', r.sessions === 4);
  console.log('=== 2. zones are relative to the weekly goal ===');
  check('0 / building / solid / heavy / high', ['0,10','5,10','10,10','15,10','20,10'].map(p => ev(`muscleZone(${p})`)).join() === 'none,build,solid,heavy,high');
  console.log('=== 3. rendering ===');
  ev(`showView('history'); renderHistory();`);
  const map = doc.getElementById('muscleMap');
  const parts = g => [...map.querySelectorAll(`[data-muscle="${g}"]`)];
  check('card is rendered on the History tab', !!map.querySelector('svg') && map.querySelector('svg').getAttribute('aria-label').includes('Muscle groups'));
  check('chest shapes drawn (both sides)', parts('Chest').length === 2 && Math.abs(parseFloat(parts('Chest')[0].getAttribute('fill-opacity')) - 0.685) < 0.011);
  check('a trained group uses the accent color', parts('Chest')[0].getAttribute('fill') === 'var(--teal)');
  check('untrained groups are neutral', parts('Calves').every(p => p.getAttribute('fill') === 'var(--line)') && parts('Core').every(p => p.getAttribute('fill') === 'var(--line)'));
  check('back is a single shape shaded by progress to its goal (4 of 10)', parts('Back').length === 1 && Math.abs(parseFloat(parts('Back')[0].getAttribute('opacity')) - 0.52) < 0.011);
  check('tooltip text says how many sets', /Chest · 7 sets/.test(parts('Chest')[0].textContent));
  check('every group has a shape', ['Chest','Shoulders','Triceps','Back','Rear Delts','Biceps','Quads','Hamstrings','Calves','Core'].every(g => parts(g).length >= 1));
  const chips = [...map.querySelectorAll('.muscle-chip')].map(c => c.textContent.replace(/\s+/g, ' ').trim());
  check('chips sorted most-trained first', chips[0].startsWith('Chest') && /7\/10$/.test(chips[0]));
  check('untrained chips are flagged zero (11 groups now, 3 of them hit)', map.querySelectorAll('.muscle-chip.zero').length === 8);
  check('"Not hit yet" lists the gaps', /Not hit yet: .*Calves/.test(map.textContent) && /Core/.test(map.textContent));
  console.log('=== 4. edge states ===');
  ev(`entries = []; renderMuscleMap();`);
  check('no sessions -> says so, still draws the figure', /No strength sessions/.test(map.textContent) && !!map.querySelector('svg'));
  ev(`entries = [__mk(1, Object.fromEntries(['Chest Press (machine)','Shoulder Press (machine)','Triceps Pushdown (cable)','Lat Pulldown','Reverse Fly (machine)','Bicep Curl','Wrist Curl (dumbbell)','Leg Press','Leg Curl (machine)','Calf Raise (machine)','Plank'].map(n => [n, S(2)])))]; renderMuscleMap();`);
  check('everything hit -> congratulates instead of listing', /Every muscle group got work/.test(map.textContent) && !/Not hit yet/.test(map.textContent));
  ev(`entries = [__mk(1, { 'Leg Press': S(12) })]; renderMuscleMap();`);
  check('goal reached (12 of 10) -> full intensity', parseFloat(parts('Quads')[0].getAttribute('fill-opacity')) === 1);
  ev(`entries = [__mk(1, { 'Leg Press': null })]; renderMuscleMap();`);
  check('a malformed session (null sets) does not break it', !!map.querySelector('svg'));
  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2000); setTimeout(() => process.exit(1), 20000);
