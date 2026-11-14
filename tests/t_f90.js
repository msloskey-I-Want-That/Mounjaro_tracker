// Nov 14 audit, batch 1 — names from food databases, saved foods and exercises are shown as text (never run as HTML);
// new sync IDs use the secure generator; ?sync= is cleared from the address bar.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/?sync=abc123&steps=6200', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; w.__noPreviewList = true; w.__pwned = 0; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, ev = s => w.eval(s), $ = id => doc.getElementById(id);
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  check('?sync= is gone from the address bar', !/sync=/.test(w.location.href));
  check('the sync ID from the link was still picked up', ev('urlProvidedSyncId') === 'abc123');
  const bad = '<img src=x onerror="window.__pwned=1">';
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = [{ date: todayStr(), food: ${JSON.stringify(bad)}, meals: [{ desc: 'Subway 6" Turkey', mt: 'Lunch', protein: '30', cal: '400', ts: 1 }] }]; renderAll();`);
  await sleep(30);

  console.log('=== food database results ===');
  ev(`renderLookupResults([{ name: ${JSON.stringify(bad)}, brand: ${JSON.stringify(bad)}, source: 'Open Food Facts', protein100: 10, carbs100: 5, cal100: 100 }], '')`);
  const lr = doc.querySelector('#lookupResults .lr-name');
  check('a product name with HTML shows as text', !!lr && lr.textContent === bad && !doc.querySelector('#lookupResults img'));
  check('brand shows as text too', doc.querySelector('#lookupResults .lr-brand').textContent.includes('<img'));

  console.log('=== saved foods ===');
  ev(`pinnedFavorites = [{ desc: 'Subway 6" Turkey', protein: '30', cal: '400' }, { desc: ${JSON.stringify(bad)}, protein: '5' }]; pinnedRecipes = [{ name: ${JSON.stringify(bad)}, protein: '20', servings: 1, items: [] }]; renderFavorites();`);
  await sleep(20);
  const pin = doc.querySelector('[data-pin="0"]');
  check('a favorite with a " in its name keeps its full name', !!pin && pin.dataset.desc === 'Subway 6" Turkey' && pin.textContent.includes('Subway 6" Turkey'));
  check('no image was injected by a favorite or recipe name', !doc.querySelector('[data-pin] img, [data-recipe] img'));
  check('the bad favorite name is shown as text', doc.querySelector('[data-pin="1"]').textContent.includes('<img'));
  ev(`document.getElementById('mDesc').value = 'img'; renderMyFoodMatches();`);
  check('"my foods" matches show names as text', !doc.querySelector('#myFoodResults img'));

  console.log('=== History, old free-text food ===');
  ev(`showView('history');`); await sleep(40);
  check('no image injected anywhere in History', !doc.querySelector('#view-history img[src="x"]'));

  console.log('=== exercise names ===');
  ev(`customWorkoutExercises = { Pull: [{ name: 'Cable Row "wide"', sets: '3 × 10' }] }; workoutPlanMode = 'ppl'; pplDayOverride = 'Pull'; workoutSessionState = {}; showView('exercise'); renderWorkoutPlan();`); await sleep(40);
  const blk = [...doc.querySelectorAll('.workout-exercise-block')].find(b => /Cable Row/.test(b.dataset.exercise || ''));
  check('an old exercise name with quotes keeps its whole name on the card', !!blk && blk.dataset.exercise === 'Cable Row "wide"');
  const started = $('startPlanBtn'); if (started) { started.click(); await sleep(40); }
  const row = doc.querySelector('.set-row[data-exercise="Cable Row \\"wide\\""]');
  check('its set rows carry the same full name', !!row);

  console.log('=== sync IDs ===');
  const ids = Array.from({ length: 5 }, () => ev('genUUID()'));
  check('new sync IDs are UUIDs', ids.every(i => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(i)) && new Set(ids).size === 5);
  check('IDs come from the secure generator', /randomUUID|getRandomValues/.test(ev('genUUID.toString()')));

  check('nothing injected ran', w.__pwned === 0);
  check('no script errors', errors.length === 0);
  console.log(fails ? 'SOME FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
}, 2500);
