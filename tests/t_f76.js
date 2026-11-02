// Food tab, Nov 1: Add Food pop-up with search first + icon row + one-tap picks, one water control, one photo
// button, What fits hidden when empty, Appetite on the Log tab, fiber end to end, protein plan line, weekly summary.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.__alerts = []; w.alert = m => w.__alerts.push(m); } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, ev = s => w.eval(s), $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const shown = el => { let e = el; while (e && e !== doc.body) { if (w.getComputedStyle(e).display === 'none') return false; e = e.parentElement; } return !!el; };
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  const day = n => ev(`dateStrShift(todayStr(), ${-n})`);
  w.__writes = [];
  const meals = (n, list) => ({ date: day(n), meals: list.map((m, i) => ({ mt: 'Lunch', ts: 1000 + i, ...m })), water: 48 });
  ev(`syncId = 'x'; window.__setDocImpl = (ref, data) => { window.__writes.push(data); return Promise.resolve(); }; userProteinGoal = 100;`);
  ev(`entries = ${JSON.stringify([
    meals(9, [{ desc: 'Chicken breast', protein: '40', cal: '220', carbs: '0', fat: '5' }, { desc: 'Rice', protein: '4', cal: '200', carbs: '45', fat: '1' }]),
    meals(8, [{ desc: 'Chicken breast', protein: '40', cal: '220', carbs: '0', fat: '5' }]),
    meals(3, [{ desc: 'Chicken breast', protein: '40', cal: '220', carbs: '0', fat: '5' }, { desc: 'Oatmeal', protein: '10', cal: '300', carbs: '54', fat: '6', fiber: '8' }]),
    meals(1, [{ desc: 'Protein shake', protein: '60', cal: '320', carbs: '10', fat: '4', fiber: '2' }, { desc: 'Chicken breast', protein: '40', cal: '220', carbs: '0', fat: '5' }])
  ])}.sort((a, b) => a.date.localeCompare(b.date)); pinnedFavorites = [{ desc: 'Greek yogurt', protein: '20', cal: '120', carbs: '8', fat: '0' }];`);
  ev(`document.getElementById('foodDate').value = todayStr(); showView('food'); renderMealList();`); await sleep(80);

  console.log('=== Add Food ===');
  const card = $('addFoodCard');
  check('Add Food starts as a big "+ Add food" bar (pop-up closed)', card.classList.contains('af-collapsed') && $('addFoodCardContent').style.display === 'none');
  click(card.querySelector('.form-section-title')); await sleep(40);
  check('tapping it opens the pop-up', !card.classList.contains('af-collapsed') && card.classList.contains('entry-popup-fullscreen'));
  check('one row of 6 icon buttons replaces the two rows of chips', doc.querySelectorAll('#foodQuickActions .fqa').length === 6 && !shown($('foodTabRow')) && !shown($('addMethodRow')));
  check('search is first and selected', shown($('mDesc')) && doc.querySelector('.fqa[data-fqa="search"]').classList.contains('on'));
  click(doc.querySelector('.fqa[data-fqa="describe"]')); await sleep(30);
  check('Describe icon switches to the describe box', shown($('mealDescInput')) && !shown($('mDesc')) && doc.querySelector('.fqa[data-fqa="describe"]').classList.contains('on'));
  click(doc.querySelector('.fqa[data-fqa="favorites"]')); await sleep(30);
  check('Favorites icon shows your favorites', shown($('favFoods')) && doc.querySelector('.fqa[data-fqa="favorites"]').classList.contains('on'));
  click(doc.querySelector('.fqa[data-fqa="search"]')); await sleep(30);
  check('Search icon brings the search box back', shown($('mDesc')));
  const picks = [...doc.querySelectorAll('#foodQuickPicks .fqp')].map(b => b.textContent);
  check('one-tap picks under search: your favorite + foods you eat often', picks.some(t => /Greek yogurt/.test(t)) && picks.some(t => /Chicken breast/.test(t)));
  ev(`setMealType('Snack')`);
  click([...doc.querySelectorAll('#foodQuickPicks .fqp')].find(b => /Greek yogurt/.test(b.textContent))); await sleep(60);
  check('tapping a pick adds it to the chosen meal', ev(`mealsForDate(todayStr()).some(m => m.desc === 'Greek yogurt' && m.mt === 'Snack')`));

  console.log('=== fiber + adding from the form ===');
  ev(`setMealType('Lunch')`);
  $('mDesc').value = 'Lentil soup'; $('mProtein').value = '18'; $('mCal').value = '300'; $('mCarbs').value = '40'; $('mFat').value = '4'; $('mFiber').value = '12';
  $('mDesc').dispatchEvent(new w.Event('input', { bubbles: true }));
  click($('addMealBtn')); await sleep(120);
  const soup = JSON.parse(ev(`JSON.stringify(mealsForDate(todayStr()).find(m => m.desc === 'Lentil soup') || null)`));
  check('fiber is saved with the meal', soup && Number(soup.fiber) === 12);
  check('after + Add to Day the pop-up closes so you see your log', card.classList.contains('af-collapsed') && !card.classList.contains('entry-popup-fullscreen'));
  check('the meal row shows "12g fiber"', /12g fiber/.test($('mealList').textContent));
  check('Daily Nutrition has a Fiber bar (12 / 28 g)', /Fiber/.test($('proteinSummaryBody').textContent) && (doc.querySelector('[data-macro-key$=":fiber"]') || {dataset:{}}).dataset.macroTarget === '12' && /\/\s*28g/.test($('proteinSummaryBody').textContent));
  check('USDA results carry fiber (nutrient 1079)', /fiber100: n\(1079\)/.test(html) && /fiber100: nn\(1079\)/.test(html));
  check('every AI estimate asks for fiber', (html.match(/"fat": number, "fiber": number\}/g) || []).length === 5);

  console.log('=== one water, one photo, What fits ===');
  check('the separate Water card is gone; water lives in Daily Nutrition with −8 / +8 / +16', !shown($('waterCard')) && $('proteinSummaryBody').querySelectorAll('[data-water-quick]').length === 3);
  check('only one photo button: no "Log with a photo" in the log, no camera in the top strip', !$('foodLogPhotoBtn') && !shown($('foodStripPhoto')) && !!doc.querySelector('.fqa[data-fqa="photo"]'));
  ev(`pinnedFavorites = []; foodCombos = []; entries = entries.filter(e => e.date === todayStr()); renderMealList();`); await sleep(40);
  check('"What fits?" is hidden when it has nothing to suggest', !shown($('whatFitsCard')));

  console.log('=== Appetite on the Log tab ===');
  check('Appetite is no longer in Daily Nutrition', !shown($('nutAppetite')));
  ev(`showView('log')`); await sleep(40);
  check('Appetite 1-5 sits on the Log tab (Daily log)', !!$('logAppetite') && $('logAppetite').closest('#logSub-daily') && $('logAppetite').querySelectorAll('[data-appetite]').length === 5);
  click($('logAppetite').querySelector('[data-appetite="2"]')); await sleep(60);
  check('tapping 2 saves appetite for today', ev(`(entries.find(e => e.date === todayStr()) || {}).appetite`) === 2 && $('logAppetite').querySelector('[data-appetite="2"]').classList.contains('on'));
  ev(`showView('food')`);

  console.log('=== protein plan ===');
  const plan = (hour, logged) => { ev(`(function(){ const R = Date; window.__RealDate = window.__RealDate || R; const fake = new R(); fake.setHours(${hour}, 0, 0, 0); const t = fake.getTime(); globalThis.Date = class extends R { constructor(...a) { if (a.length) super(...a); else super(t); } static now() { return t; } }; })()`); const out = ev(`proteinPlanHtml(todayStr(), 60, 100)`); ev(`globalThis.Date = window.__RealDate`); return out; };
  check('3 pm, no dinner yet: "About 60 g at dinner gets you to 100 g"', /About <b>60 g<\/b> at dinner gets you to 100 g/.test(plan(15)));
  check('8 am with lunch already logged: split across breakfast and dinner (30 g each)', /About <b>30 g<\/b> each at breakfast and dinner/.test(plan(8)));
  check('11 pm: a snack line', /A snack with about <b>60 g<\/b>/.test(plan(23)));
  check('no line once the goal is met, or on past days', ev(`proteinPlanHtml(todayStr(), 0, 100)`) === '' && ev(`proteinPlanHtml(dateStrShift(todayStr(), -1), 40, 100)`) === '');

  console.log('=== This week ===');
  ev(`entries = ${JSON.stringify([
    meals(10, [{ desc: 'A', protein: '50', cal: '1000' }]), meals(9, [{ desc: 'A', protein: '70', cal: '1200' }]),
    meals(3, [{ desc: 'B', protein: '110', cal: '1500', fiber: '20' }]), meals(1, [{ desc: 'B', protein: '90', cal: '1300', fiber: '10' }])
  ])}.sort((a, b) => a.date.localeCompare(b.date)); renderMealList();`); await sleep(40);
  const wk = $('foodWeekBody').textContent.replace(/\s+/g, ' ');
  check('This week card shows protein/day (100 g, ▲ 40 g vs before)', /Protein \/ day\s*100 g\s*▲ 40 g vs before/i.test(wk));
  check('protein goal days (1 of 7), calories/day, water/day, fiber/day', /Protein goal\s*1 of 7 days/i.test(wk) && /Calories \/ day\s*1,400/i.test(wk) && /Water \/ day\s*48 oz/i.test(wk) && /Fiber \/ day\s*15 g/i.test(wk));
  check('it says which days count', /Averages count only days with food/.test(wk));

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
