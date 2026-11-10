// Nov 9 — set-row numbers are never cut off: slimmer steppers leave room for "142.5", and fitSetNumber() shrinks
// any value that still doesn't fit its box (measured with the box's real font). The real-browser check across
// phone widths is shots/fit.js (Playwright); this suite checks the rules and the wiring.
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
  const css = [...doc.querySelectorAll('style')].map(s => s.textContent).join('\n');

  console.log('=== room for the numbers ===');
  check('steppers are slim (28 px weight, 26 px reps) and the check is 40 px', /\.set-step-btn \{ width: 28px; height: 44px;/.test(css) && /\.set-reps-minus, \.set-reps-plus \{ width: 26px; \}/.test(css) && /\.set-check-btn \{ height: 44px; width: 40px; \}/.test(css));
  check('the weight box never gets narrower than 56 px', /\.set-weight-group \.set-field \{ min-width: 56px; \}/.test(css));
  check('reps buttons sit a little apart from the weight +', /\.set-reps-minus \{ margin-left: 5px; \}/.test(css));

  console.log('=== auto-fit ===');
  // jsdom has no layout or canvas: give the box a width and a fake measurer (8 px per character at 18 px).
  ev(`_fitCanvas = { font: '', measureText(t) { const px = parseFloat(this.font.split(' ')[1]) || 18; return { width: String(t).length * 8 * px / 18 }; } };`);
  const box = doc.createElement('div'); box.className = 'set-field'; const inp = doc.createElement('input'); inp.className = 'set-weight-input'; box.appendChild(inp); doc.body.appendChild(box);
  Object.defineProperty(inp, 'clientWidth', { get: () => 40 });
  inp.value = '130'; ev('fitSetNumber')(inp);
  check('"130" (24 px) fits a 40 px box: font left alone', inp.style.fontSize === '');
  inp.value = '142.5'; ev('fitSetNumber')(inp);
  const fs1 = parseFloat(inp.style.fontSize);
  check(`"142.5" (40 px) in the same box shrinks to fit (${inp.style.fontSize})`, fs1 > 10 && fs1 < 18 && 5 * 8 * fs1 / 18 <= 40 - 4);
  inp.value = '12'; inp.dispatchEvent(new w.Event('input', { bubbles: true }));
  check('typing a shorter number puts the font back', inp.style.fontSize === '');
  inp.value = '1000000000'; ev('fitSetNumber')(inp);
  check('never below 10 px', parseFloat(inp.style.fontSize) === 10);
  box.remove();

  console.log('=== wired into the workout screen ===');
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = []; exerciseGroups = {}; exerciseStations = {}; customWorkoutExercises = {}; hiddenWorkoutExercises = {}; workoutPlanMode = 'ppl'; pplDayOverride = 'Pull'; workoutSessionState = {}; showView('exercise'); renderWorkoutPlan();`);
  await sleep(40); click($('startPlanBtn')); await sleep(40);
  let calls = 0; const orig = ev('fitSetNumber'); w.fitSetNumber = el => { calls++; return orig(el); };
  ev('renderWorkoutPlan()'); await sleep(20);
  check('every render fits every number box', calls >= doc.querySelectorAll('.set-field input').length && calls > 0);
  calls = 0; click(doc.querySelector('.set-weight-plus')); click(doc.querySelector('.set-reps-plus'));
  check('the weight and reps steppers re-fit the box they change', calls >= 2);
  w.fitSetNumber = orig;

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
