// Walks count as leg work on the muscle map (recovery, details, stretch picks) but never as sets.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, ev = s => w.eval(s);
  const day = n => ev(`lbAddDays(todayStr(), ${-n})`);
  const now = Date.now(), H = 3600000;
  const set = list => ev(`entries = ${JSON.stringify(list)}; entries.sort((a, b) => a.date.localeCompare(b.date));`);
  const stats = () => JSON.parse(ev(`JSON.stringify(muscleStats(Date.now()))`));

  console.log('=== a 3.2 mile walk two hours ago ===');
  set([{ date: day(0), ex: [{ type: 'Walk', min: 62, dist: '3.2', ts: now - 2 * H }] }]);
  let st = stats();
  check('Quads, Hamstrings and Calves show as recovering', ['Quads', 'Hamstrings', 'Calves'].every(g => st[g].recovery.state === 'recovering'));
  check('about a day of recovery for 3 miles (~25h total, ~23h left)', Math.round(st.Quads.recovery.recH) === 25 && st.Quads.recovery.hoursLeft > 22 && st.Quads.recovery.hoursLeft < 24);
  check('upper body is untouched', ['Chest', 'Back', 'Biceps', 'Core'].every(g => st[g].recovery.state === 'none'));
  check('weekly sets stay at 0 (a walk is not sets)', st.Quads.sets === 0 && st.Calves.weeks.every(v => v === 0));
  check('balance / volume counts ignore walks', ev(`muscleSetsLastDays(7).counts.Quads`) === 0);
  const det = ev(`muscleDetailHtml(muscleStats(Date.now()).Quads, 'recovery')`);
  check('tapping Quads shows the walk ("🚶 Walk · 3.2 mi · 62 min")', det.includes('🚶 Walk · 3.2 mi · 62 min') && /until recovered/.test(det));
  check('it says walks count toward recovery, not sets', det.includes('Walks count toward recovery, not weekly sets.'));
  check('"Stretch what I trained" now includes the legs', JSON.parse(ev(`JSON.stringify(recTargets().muscles)`)).includes('Quads'));
  check('recovery map paints the legs (amber)', !!ev(`musclePaint(muscleStats(Date.now()).Quads, 'recovery')`));

  console.log('=== what counts ===');
  set([{ date: day(0), ex: [{ type: 'Dog Walk', min: 10, dist: '0.4', ts: now - H }] }]);
  check('a short dog walk (0.4 mi) does not count', stats().Quads.recovery.state === 'none');
  set([{ date: day(0), ex: [{ type: 'Walk', min: 30, ts: now - H }] }]);
  check('a 30-minute walk with no distance counts', stats().Quads.recovery.state === 'recovering');
  set([{ date: day(0), ex: [{ type: 'Bike', min: 40, dist: '8', ts: now - H }] }]);
  st = stats();
  check('a bike ride counts for Quads and Calves, not Hamstrings', st.Quads.recovery.state === 'recovering' && st.Calves.recovery.state === 'recovering' && st.Hamstrings.recovery.state === 'none');
  set([{ date: day(0), ex: [{ type: 'Hiking', min: 180, dist: '8', ts: now - H }] }]);
  check('a long hike needs longer (up to 48h)', stats().Quads.recovery.recH === 48);
  set([{ date: day(3), ex: [{ type: 'Walk', min: 60, dist: '3', ts: now - 72 * H }] }]);
  st = stats();
  check('3 days later the legs are ready (green)', st.Quads.recovery.state === 'ready');

  console.log('=== Apple Health distance ===');
  set([{ date: day(0), distanceMi: 4.1 }]);
  st = stats();
  check('4.1 mi from Apple Health with no walk logged counts as a walk', st.Quads.walks.length === 1 && st.Quads.walks[0].cardio.type === 'Health');
  check('it is labelled as Apple Health walking', ev(`muscleDetailHtml(muscleStats(Date.now()).Quads, 'recovery')`).includes('Walking (Apple Health) · 4.1 mi'));
  set([{ date: day(0), distanceMi: 1.8 }]);
  check('an ordinary day (1.8 mi of steps) does not count', stats().Quads.walks.length === 0);
  set([{ date: day(0), distanceMi: 4.1, ex: [{ type: 'Walk', min: 62, dist: '3.2', ts: now - 2 * H }] }]);
  check('a logged walk is not counted twice with the Health distance', stats().Quads.walks.length === 1 && stats().Quads.walks[0].cardio.type === 'Walk');

  console.log('=== 20,000+ steps ===');
  set([{ date: day(0), steps: 21400 }]);
  st = stats();
  check('21,400 steps (no distance, no walk logged) counts as a walk', st.Quads.walks.length === 1 && st.Quads.recovery.state === 'recovering');
  check('it is shown with the steps and an estimated ~10.2 mi', ev(`muscleDetailHtml(muscleStats(Date.now()).Quads, 'recovery')`).includes('Walking (Apple Health) · 21,400 steps · 10.2 mi'));
  check('a big step day gets a longer recovery (~48h)', st.Quads.recovery.recH === 48);
  set([{ date: day(0), steps: 12000 }]);
  check('12,000 steps with no distance does not count', stats().Quads.walks.length === 0);
  set([{ date: day(0), steps: 22000, distanceMi: 9.6, ex: [{ type: 'Walk', min: 30, dist: '1.5', ts: now - 3 * H }] }]);
  st = stats();
  check('a 1.5 mi walk logged on a 22k-step day: the whole day counts (9.6 mi), not just the walk', st.Quads.walks.length === 2 && st.Quads.recovery.cardio.cardio.type === 'Health' && st.Quads.recovery.recH === 48);
  set([{ date: day(0), steps: 20500, distanceMi: 4.3, ex: [{ type: 'Walk', min: 70, dist: '4', ts: now - 3 * H }] }]);
  check('a 20k day that is mostly the logged walk is not double counted', stats().Quads.walks.length === 1);

  console.log('=== lifting still wins when it is longer ===');
  set([{ date: day(0), ex: [{ type: 'Strength', min: 60, ts: now - H, sets: { 'Leg Press': [{ weight: 200, reps: 10 }, { weight: 200, reps: 10 }, { weight: 200, reps: 10 }, { weight: 200, reps: 10 }] } }, { type: 'Walk', min: 40, dist: '2', ts: now - H }] }]);
  st = stats();
  check('leg day + a 2 mile walk: the longer lifting window is shown', st.Quads.recovery.recH >= 48 && st.Quads.sets === 4);
  check('Calves (walk only) still show the walk', st.Calves.recovery.state === 'recovering' && st.Calves.recovery.recH === 20);

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
