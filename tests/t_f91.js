// Nov 14 audit, batch 2 — dates are local everywhere: Batch Log labels match the day written, the "usually a rest day"
// note names today's weekday, and 7/30/56-day windows don't stretch or shrink across a daylight-saving change.
process.env.TZ = 'America/New_York';
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; w.__noPreviewList = true; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, ev = s => w.eval(s);
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = []; pinnedFavorites = [{ desc: 'Eggs', protein: '12', cal: '140' }]; renderAll(); renderFavorites();`);
  await sleep(30);
  console.log('=== Batch Log to Multiple Days ===');
  const boxes = [...doc.querySelectorAll('.batch-day-checkbox')];
  check('14 days are offered', boxes.length === 14);
  const lab = b => b.parentElement.textContent.trim().replace(/\s+/g, ' ');
  const want = ds => { const [y, m, d] = ds.split('-').map(Number); return new w.Date(y, m - 1, d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }); };
  check('"(today)" is on today\'s real date', boxes[0].dataset.date === ev('todayStr()') && lab(boxes[0]).startsWith(want(ev('todayStr()'))) && /\(today\)/.test(lab(boxes[0])));
  check('every label matches the date it writes', boxes.every(b => lab(b).startsWith(want(b.dataset.date))));
  check('dates run one day apart with no gaps', boxes.every((b, i) => i === 0 || b.dataset.date === ev(`lbAddDays(${JSON.stringify(boxes[i - 1].dataset.date)}, 1)`)));

  console.log('=== "usually a rest day" note ===');
  const today = ev('todayStr()'), dow = ev('lbParse(todayStr()).getDay()');
  const hist = [];
  for (let k = 1; k <= 56; k++) { const ds = ev(`lbAddDays(todayStr(), -${k})`), d = ev(`lbParse(${JSON.stringify(ds)}).getDay()`); if (d !== dow) hist.push({ date: ds, ex: [{ type: 'Strength', min: 40, sets: { 'Leg Press': [{ weight: 200, reps: 10 }] } }] }); }
  ev(`entries = ${JSON.stringify(hist)};`);
  const note = ev('detectTypicalRestDay()') || '';
  const realDay = ev(`lbParse(todayStr()).toLocaleDateString('en-US', { weekday: 'long' })`);
  check(`never training on ${realDay}s gives a note that names ${realDay}`, note.startsWith(realDay + 's are usually a rest day'));
  ev(`entries = ${JSON.stringify(hist.concat([1, 2, 3, 4, 5, 6, 7, 8].map(n => ({ date: ev(`lbAddDays(todayStr(), -${7 * n})`), ex: [{ type: 'Strength', min: 40, sets: { 'Leg Press': [{ weight: 200, reps: 10 }] } }] }))))};`);
  check('training every week on this weekday: no note', !ev('detectTypicalRestDay()'));

  console.log('=== date windows across the Nov 1 clock change ===');
  ev(`window.__realToday = todayStr; todayStr = () => '2026-11-04';`);
  ev(`entries = [{ date: '2026-10-28', ex: [{ type: 'Strength', min: 40, sets: { 'Leg Press': [{ weight: 100, reps: 10 }] } }] }, { date: '2026-10-29', ex: [{ type: 'Strength', min: 40, sets: { 'Leg Press': [{ weight: 100, reps: 10 }] } }] }];`);
  const wh = ev('JSON.stringify(weeklyVolumeHistory(2))');
  check('this week = Oct 29 – Nov 4 (7 days, Oct 28 not in it)', /"startStr":"2026-10-29","endStr":"2026-11-04"/.test(wh) && JSON.parse(wh)[0].sessions === 1);
  check('last week = Oct 22 – Oct 28', /"startStr":"2026-10-22","endStr":"2026-10-28"/.test(wh) && JSON.parse(wh)[1].sessions === 1);
  check('a 6-day look-back from Nov 4 starts on Oct 29', ev('JSON.stringify(gatherRecentHealthData(6).map(e => e.date))') === '["2026-10-29"]');
  ev(`todayStr = window.__realToday;`);

  console.log('=== helpers ===');
  check('addDaysToDateStr crosses the clock change correctly', ev(`addDaysToDateStr('2026-10-31', 2)`) === '2026-11-02' && ev(`addDaysToDateStr('2026-03-07', 2)`) === '2026-03-09');
  check('no toISOString date slicing left in the app', !/toISOString\(\)\.slice\(0, 10\)/.test(html));
  check('no script errors', errors.length === 0);
  console.log(fails ? 'SOME FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
}, 2500);
