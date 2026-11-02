const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const doc = dom.window.document; const w = dom.window; const ev = s => w.eval(s);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ev(`window.ds = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };`);
  ev(`entries = [
    { date: ds(4), ex: [{ type: 'Strength', min: 50, effort: 4, planDay: 'Push',
        sets: { 'Chest Press (machine)': [{ weight: 40, reps: 12, warmup: true }, { weight: 70, reps: 12 }, { weight: 75, reps: 10 }, { weight: 75, reps: 10 }],
                'Pec Deck (machine)': [{ weight: 60, reps: 12 }, { weight: 60, reps: 11 }],
                'Leg Press': [{ weight: 100, reps: 15 }] },
        exerciseVariations: { 'Leg Press': 'Wide stance', 'Pec Deck (machine)': { weird: true } },
        notes: { 'Chest Press (machine)': 'left shoulder felt tight ${'x'.repeat(150)}' } }] },
    { date: ds(3), ex: [{ type: 'Treadmill', min: 30, dist: 2 }] },
    { date: ds(2), ex: [{ type: 'Strength', min: 20, sets: { 'Plank': [{ weight: 0, reps: 60 }], 'Squat': 'garbage', 'Curl': [{ weight: 25, reps: 10, warmup: true }], 'Row': [null, { weight: 'x', reps: 5 }] } }] },
    { date: ds(1), weight: '223' } ]`);
  const rows = ev('gatherRecentHealthData(120)'); const R = n => rows.find(r => r.date === ev(`ds(${n})`));
  console.log('=== 1. what the AI sees of a strength session ===');
  check('one compact line per exercise, working sets only (warm-up left out)', JSON.stringify(R(4).strength_sets.slice(0, 2).map(s => s.split(' — ')[0])) === JSON.stringify(['Chest Press (machine): 70x12, 75x10, 75x10', 'Pec Deck (machine): 60x12, 60x11']));
  check('the Push/Pull/Legs day is attached', R(4).workout_day === 'Push');
  check('a variation shows in brackets (and an odd non-text one is ignored, not "[object Object]")', R(4).strength_sets[2] === 'Leg Press [Wide stance]: 100x15' && !R(4).strength_sets.join('').includes('object'));
  check('exercise notes come through, capped at 100 characters', /— note: left shoulder felt tight/.test(R(4).strength_sets[0]) && R(4).strength_sets[0].split('— note: ')[1].length === 100);
  check("the existing summary line is unchanged (still 'Strength 50min (effort 4/5)')", R(4).exercise === 'Strength 50min (effort 4/5)');
  check('a cardio-only day gets no strength key', !('strength_sets' in R(3)) && R(3).exercise === 'Treadmill 30min 2mi');
  check('a day with no workout gets none either', !('strength_sets' in R(1)));
  console.log('=== 2. odd data cannot break it ===');
  check('zero-weight, non-array, null and non-numeric sets are skipped without throwing', !('strength_sets' in R(2)) || R(2).strength_sets.length === 0);
  check('an exercise with only warm-ups produces no line', !(R(2).strength_sets || []).some(l => l.startsWith('Curl')));
  const many = ev(`(() => { const sets = {}; for (let i = 0; i < 15; i++) sets['Exercise ' + i] = Array.from({ length: 14 }, () => ({ weight: 50, reps: 10 })); entries = [{ date: ds(1), ex: [{ type: 'Strength', sets }] }]; const r = gatherRecentHealthData(120)[0]; return { n: r.strength_sets.length, sets: r.strength_sets[0].split(', ').length }; })()`);
  check('bounded: at most 12 exercises a day and 10 sets each', many.n === 12 && many.sets === 10);
  console.log('=== 3. Ask and Weekly Insights get it ===');
  ev(`entries = [ { date: ds(3), weight: '224', glucose: '131', ex: [{ type: 'Strength', min: 45, effort: 3, planDay: 'Push', sets: { 'Chest Press (machine)': [{ weight: 70, reps: 12 }, { weight: 75, reps: 10 }] } }] },
               { date: ds(2), weight: '223.4', glucose: '145', ex: [{ type: 'Strength', min: 45, effort: 4, planDay: 'Pull', sets: { 'Seated Row': [{ weight: 120, reps: 12 }] } }] }, { date: ds(1), weight: '223' } ]; anthropicKey = 'sk-test';`);
  let sent = null; w.fetch = async (url, opts) => { sent = JSON.parse(opts.body); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'You added 5 lb to bench.' }] }) }; };
  doc.getElementById('aiAskInput').value = 'am I progressing on chest press?'; click(doc.getElementById('aiAskBtn')); await sleep(80);
  const p = sent.messages[0].content;
  check('the prompt carries the per-set lines', /"strength_sets":\["Chest Press \(machine\): 70x12, 75x10"\]/.test(p) && /"strength_sets":\["Seated Row: 120x12"\]/.test(p));
  check('and the legend explains them', /strength_sets lists each exercise as weightxreps/.test(p) && /warm-up sets are left out/.test(p));
  check('glucose is still there alongside', /"glucose_fasting_mgdl":"145"/.test(p));
  check('the "Based on" line now also counts workouts', /Based on 3 days of logs · 2 with glucose readings · 2 with strength sets/.test(doc.getElementById('aiAskResults').innerHTML));
  ev(`entries = [ { date: ds(5), glucose: '150', ex: [{ type: 'Strength', min: 45, planDay: 'Push', sets: { 'Chest Press (machine)': [{ weight: 70, reps: 12 }] } }] }, { date: ds(3), glucose: '131', weight: '224' }, { date: ds(2), glucose: '145', weight: '223.4' }, { date: ds(1), weight: '223' } ]`);
  sent = null; await ev('generateWeeklyInsights(false)');
  check('weekly insights sees the sets too', !!sent && /Chest Press \(machine\): 70x12/.test(sent.messages[0].content));
  console.log('=== 4. size ===');
  const sz = ev(`(() => { const out = []; for (let i = 0; i < 120; i++) { if (i % 2) continue; out.push({ date: ds(i), ex: [{ type: 'Strength', min: 50, effort: 3, planDay: 'Push', sets: { 'Chest Press (machine)': [{ weight: 70, reps: 12 }, { weight: 75, reps: 10 }, { weight: 75, reps: 10 }], 'Pec Deck (machine)': [{ weight: 60, reps: 12 }, { weight: 60, reps: 12 }], 'Shoulder Press (machine)': [{ weight: 50, reps: 10 }, { weight: 50, reps: 10 }, { weight: 50, reps: 9 }], 'Triceps Pushdown (cable)': [{ weight: 40, reps: 12 }, { weight: 40, reps: 12 }], 'Lateral Raise': [{ weight: 15, reps: 12 }, { weight: 15, reps: 12 }] } }] }); } entries = out; const a = JSON.stringify(gatherRecentHealthData(120)); const b = a.replace(/"strength_sets":\\[[^\\]]*\\],?/g, ''); return a.length - b.length; })()`);
  check(`60 workouts of five exercises add only ~${Math.round(sz / 1000)}k characters (about ${Math.round(sz / 4000)}k tokens)`, sz > 0 && sz < 25000);
  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2000); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 30000);
