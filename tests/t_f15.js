const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function boot(storage) { const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; Object.entries(storage || {}).forEach(([k, v]) => w.localStorage.setItem(k, v)); } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); return dom; }
(async () => {
  let dom = boot(); await sleep(1800);
  let doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const panel = m => doc.querySelector(`.add-method-panel[data-method="${m}"]`); const shown = () => [...doc.querySelectorAll('.add-method-panel')].filter(p => p.style.display !== 'none').map(p => p.dataset.method);
  console.log('=== 1. four ways in, one at a time ===');
  check('four method tabs: Search, Describe, Photo, Label', [...doc.querySelectorAll('.add-method-chip')].map(c => c.textContent).join() === 'Search,Describe,Photo,Label');
  check('Search is showing by default and it is the only panel visible', shown().join() === 'search' && doc.querySelector('.add-method-chip.on').textContent === 'Search');
  for (const m of ['describe', 'photo', 'label', 'search']) { click(doc.querySelector(`.add-method-chip[data-add-method="${m}"]`)); check(`tapping ${m}: only its panel shows, its tab lights up`, shown().join() === m && doc.querySelector('.add-method-chip.on').dataset.addMethod === m); }
  console.log('=== 2. every control is still where the app expects it ===');
  const home = { search: ['mDesc', 'lookupBtn', 'scanBtn', 'myFoodResults'], describe: ['mealDescInput', 'estimateMealBtn', 'mealDescResults'], photo: ['photoDetailsInput', 'estimatePhotoBtn', 'photoPortionRow', 'photoEstimateResults', 'photoFileInput'], label: ['labelScanBtn', 'labelFileInput', 'labelScanResults'] };
  for (const [m, ids] of Object.entries(home)) check(`${m} panel holds ${ids.length} controls with their original ids`, ids.every(id => $(id) && panel(m).contains($(id))));
  check('the "how much did you eat" portion chips now only appear with Photo (where they apply)', panel('photo').contains($('photoPortionRow')) && !panel('search').contains($('photoPortionRow')));
  check('Review & Add (meal, servings, macros) stays shared and visible whatever tab is chosen', ['mealTypeRow', 'mServings', 'mProtein', 'mCal', 'mCarbs', 'mFat', 'addMealBtn'].every(id => $(id) && !doc.querySelector('.add-method-panel').contains($(id)) && ![...doc.querySelectorAll('.add-method-panel')].some(p => p.contains($(id)))));
  check('"Or …" wording removed (these are tabs now, not alternatives)', !/^\s*Or /i.test($('mealDescInput').closest('.field').querySelector('label').textContent.trim()) && !/^\s*Or /i.test($('photoDetailsInput').closest('.field').querySelector('label').textContent.trim()) && !/Or scan a nutrition label/.test(html));
  console.log('=== 3. remembers your choice ===');
  click(doc.querySelector('.add-method-chip[data-add-method="photo"]')); check('choice saved', w.localStorage.getItem('mounjaro-add-method') === 'photo');
  dom = boot({ 'mounjaro-add-method': 'describe' }); await sleep(1800); doc = dom.window.document; w = dom.window;
  check('relaunch opens on the last method used (Describe)', [...doc.querySelectorAll('.add-method-panel')].filter(p => p.style.display !== 'none').map(p => p.dataset.method).join() === 'describe');
  dom = boot({ 'mounjaro-add-method': 'bogus' }); await sleep(1800); doc = dom.window.document;
  check('a corrupt saved value falls back to Search', [...doc.querySelectorAll('.add-method-panel')].filter(p => p.style.display !== 'none').map(p => p.dataset.method).join() === 'search');
  console.log('=== 4. editing a logged food brings you to the right place ===');
  dom = boot(); await sleep(1800); doc = dom.window.document; w = dom.window; const ev2 = s => w.eval(s);
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  ev2(`syncId = 'x'; entries = [{ date: todayStr(), meals: [{ desc: 'Chicken Salad', mt: 'Lunch', protein: '35', cal: '400', carbs: '20', fat: '15', ts: 12345 }] }]; document.getElementById('foodDate').value = todayStr(); showAddMethod('label'); startEditMeal(todayStr(), 12345);`);
  check('startEditMeal switches to Search so the edit field is visible', [...doc.querySelectorAll('.add-method-panel')].filter(p => p.style.display !== 'none').map(p => p.dataset.method).join() === 'search' && doc.getElementById('mDesc').value === 'Chicken Salad');
  console.log('=== 5. layout details ===');
  check('meal buttons are a 4-across grid (no orphaned "Snack")', /#mealTypeRow \{ display: grid; grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/.test(html));
  check('macro steppers slimmed to 32px so the number fields get the room', /#addFoodCard \.field-row \.stepper-btn \{ width: 32px/.test(html));
  check('macro placeholders are short numbers (not clipped "e.g.")', ['mProtein', 'mCal', 'mCarbs', 'mFat'].every(id => !/e\.g/.test(doc.getElementById(id).placeholder)));
  console.log('=== Errors ==='); console.log(dom.errors.length ? dom.errors.join('\n') : '(none)');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
})(); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 50000);
