// Kettlebell exercises: in the exercise picker with the right muscle group and mode, each with a how-to card.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; w.__noPreviewList = true; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(() => {
  const w = dom.window, ev = s => w.eval(s);
  const want = { 'Kettlebell Swing': 'Hamstrings', 'Kettlebell Goblet Squat': 'Quads', 'Kettlebell Romanian Deadlift': 'Hamstrings', 'Kettlebell Single-Arm Row': 'Back',
    'Kettlebell Overhead Press': 'Shoulders', 'Turkish Get-Up': 'Core', 'Kettlebell Suitcase Carry': 'Forearms' };
  const lib = ev(`exerciseLibrary()`);
  Object.entries(want).forEach(([n, g]) => {
    const e = lib.find(x => x.name === n);
    check(`${n} is in the picker`, !!e);
    check(`${n} files under ${g} (picker and muscle map)`, e && e.group === g && ev(`muscleGroupFor(${JSON.stringify(n)})`) === g);
    const guide = ev(`exerciseGuide(${JSON.stringify(n)})`);
    check(`${n} has a how-to card`, guide && guide.setup && guide.move && guide.avoid);
    check(`${n} name is safe for page markup`, !/["'`<>&\\]/.test(n));
  });
  check('Suitcase Carry logs as lb + seconds', ev(`exerciseMode('Kettlebell Suitcase Carry')`) === 'timedLoaded');
  check('Swing logs as lb + reps', ev(`exerciseMode('Kettlebell Swing')`) === 'weighted');
  check('existing exercises untouched (Goblet Squat dumbbell still Quads)', ev(`muscleGroupFor('Goblet Squat (dumbbell)')`) === 'Quads');
  check('no script errors', errors.length === 0);
  console.log(fails ? `${fails} FAILED` : 'ALL PASSED'); process.exit(fails ? 1 : 0);
}, 2500);
