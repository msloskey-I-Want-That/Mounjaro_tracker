// Nov 9 — Food tab: protein per meal pill (breakfast/lunch/dinner vs ~30% of the goal), low-appetite picks
// (appetite 1–2: your foods with the most protein per calorie, ≤250 cal, tap to add), weekly food vs weight.
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
  // 12 weeks: even weeks 105 g protein/day and −0.3 lb/day... odd weeks 75 g and −0.1 lb/day. Today: breakfast 12 g, lunch 34 g.
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); userProteinGoal = 100;
    entries = []; let wt = 240;
    for (let i = 84; i >= 1; i--) { const hi = Math.floor(i / 7) % 2 === 0; wt -= hi ? 0.3 : 0.1; const e = { date: lbAddDays(todayStr(), -i), meals: [{ desc: 'Eggs', mt: 'Breakfast', protein: hi ? '30' : '15', cal: '300', ts: i * 10 + 1 }, { desc: 'Chicken', mt: 'Lunch', protein: '35', cal: '450', ts: i * 10 + 2 }, { desc: 'Salmon', mt: 'Dinner', protein: hi ? '40' : '25', cal: '500', ts: i * 10 + 3 }] }; if (i % 2 === 0) e.weight = wt.toFixed(1); entries.push(e); }
    entries.push({ date: todayStr(), meals: [{ desc: 'Oatmeal', mt: 'Breakfast', protein: '12', cal: '280', ts: 9001 }, { desc: 'Turkey wrap', mt: 'Lunch', protein: '34', cal: '420', ts: 9002 }] });
    pinnedFavorites = [{ desc: 'Protein Shake', protein: '30', cal: '160' }, { desc: 'Greek yogurt cup', protein: '15', cal: '90' }, { desc: 'Beef jerky', protein: '12', cal: '110' }, { desc: 'Cheese stick', protein: '7', cal: '80' }, { desc: 'Big burrito', protein: '40', cal: '900' }];
    foodCombos = []; document.getElementById('foodDate').value = todayStr(); showView('food'); renderAll(); renderMealList();`);
  await sleep(80);
  const head = mt => [...doc.querySelectorAll('#mealList .meal-group-head')].find(h => h.textContent.trim().startsWith(mt.toUpperCase()) || h.firstElementChild.textContent.startsWith(mt));

  console.log('=== 3. protein per meal ===');
  check('meal target is 30 g for a 100 g goal (25–40 g bounds)', ev('mealProteinTarget()') === 30 && ev('(userProteinGoal = 200, mealProteinTarget())') === 40 && ev('(userProteinGoal = 60, mealProteinTarget())') === 25);
  ev('userProteinGoal = 100; renderMealList();'); await sleep(20);
  const pill = mt => (head(mt) || doc).querySelector('.mp-pill');
  check('Breakfast 12 g: "12 g protein · 18 short" (amber)', pill('Breakfast') && pill('Breakfast').textContent === '12 g protein · 18 short' && pill('Breakfast').classList.contains('low'));
  check('Lunch 34 g: "34 g protein ✓" (green)', pill('Lunch') && pill('Lunch').textContent === '34 g protein ✓' && pill('Lunch').classList.contains('good'));
  check('an empty Dinner has no pill; snacks never get one', !pill('Dinner') && ev(`mealProteinPillHtml('Snack', [{ protein: '5' }])`) === '');

  console.log('=== 5. low appetite ===');
  check('no low-appetite card without an appetite rating', !$('lowAppetiteCard'));
  click(doc.querySelector('#nutAppetite [data-appetite="2"]')); await sleep(40);
  const card = $('lowAppetiteCard');
  check('appetite 2 shows "Low appetite today" with 54 g to go', !!card && /Low appetite today/.test(card.textContent) && /54 g of protein to go/.test(card.textContent));
  const names = [...card.querySelectorAll('.low-app-pick b')].map(b => b.textContent);
  check('picks: most protein per calorie first (Shake 30/160, Greek yogurt 15/90, Beef jerky 12/110); a 7 g cheese stick is under the 10 g floor', names.join(',') === 'Protein Shake,Greek yogurt cup,Beef jerky');
  check('a 900-cal burrito is never a low-appetite pick', !names.includes('Big burrito'));
  click(card.querySelector('[data-lowapp="0"]')); await sleep(60);
  check('tapping one adds it (Protein Shake logged today)', ev(`mealsForDate(todayStr()).some(m => m.desc === 'Protein Shake')`));
  click(doc.querySelector('#nutAppetite [data-appetite="4"]')); await sleep(40);
  check('appetite 4: no card', !$('lowAppetiteCard'));
  ev(`pinnedFavorites = []; topFrequentFoods = () => [];`);
  click(doc.querySelector('#nutAppetite [data-appetite="1"]')); await sleep(40);
  check('no suitable foods yet: the card explains how to get picks', /Save a few high-protein foods as favorites/.test($('lowAppetiteCard').textContent));

  console.log('=== 6. food vs weight ===');
  const wk = $('foodWeekBody').textContent;
  check('this week\'s weight line: "Weight these 7 days: lost … lb on N g protein a day"', /⚖️ Weight these 7 days: lost \d+\.\d lb on \d+ g protein a day/.test(wk));
  const ins = ev(`JSON.stringify(foodVsWeightInsight(todayStr()))`);
  check('insight splits weeks at the protein goal from the rest', /"goal":100/.test(ins) && JSON.parse(ins).hit < JSON.parse(ins).miss);
  check('and says it in words: "Weeks you averaged 100+ g protein, you lost …"', /Weeks you averaged 100\+ g protein, you lost \d\.\d lb a week on average \(\d+ weeks\)\. Other weeks: lost \d\.\d lb/.test(wk));
  ev(`entries.forEach(e => { delete e.weight; }); renderFoodWeek(todayStr());`); await sleep(20);
  check('no weights logged: no weight line or insight', !/Weight these 7 days|Weeks you averaged/.test($('foodWeekBody').textContent));

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
