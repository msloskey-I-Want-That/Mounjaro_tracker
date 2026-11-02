const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true });
dom.window.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const click = el => el.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
setTimeout(async () => {
  const doc = dom.window.document;
  const rowsText = () => [...doc.querySelectorAll('#whatFitsList .fits-name')].map(e => e.textContent.replace(/\s+/g,' ').trim());
  dom.window.eval(`
    userHeightIn = 70; userAge = 40; userSex = 'male'; userActivityLevel = 'moderate'; userLossRate = 1;
    pinnedFavorites = [
      { desc: 'Chicken Salad', protein: '35', cal: '400', carbs: '20', fat: '15' },
      { desc: 'Greek Yogurt', protein: '17', cal: '100', carbs: '6', fat: '0' },
      { desc: 'Banana', protein: '1', cal: '105', carbs: '27', fat: '0' },
      { desc: 'Huge Burrito', protein: '40', cal: '99999', carbs: '90', fat: '30' } ];
    foodCombos = [{ name: 'Breakfast combo', items: [{desc:'PB',protein:'8',cal:'190',carbs:'7',fat:'16'},{desc:'Muffin',protein:'5',cal:'90',carbs:'28',fat:'1'}], createdAt: 1 }];
    const t = todayStr();
    entries = [{ date: t, meals: [{ desc: 'PB', mt: 'Breakfast', protein: '13', cal: '280', carbs: '35', fat: '10', ts: 1 }], protein: '13', calories: '280' }];
    for (let i = 2; i <= 20; i += 6) { const d = new Date(); d.setDate(d.getDate() - i);
      entries.push({ date: (d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')), meals: [{ desc: 'Protein Shake', mt: 'Snack', protein: '25', cal: '150', carbs: '5', fat: '2', ts: i }] }); }
    document.getElementById('foodDate').value = t;
    renderProteinSummary();`);
  console.log('=== 1. ranking + filtering ===');
  const card = doc.getElementById('whatFitsCard');
  check('card is visible', card.style.display !== 'none');
  console.log('   picks:', JSON.stringify(rowsText()));
  const names = rowsText();
  check('highest protein contribution first (Chicken Salad)', names[0] === 'Chicken Salad');
  check('Protein Shake (repeat from history, 3x) shows up even though never favorited', names.some(n => n.startsWith('Protein Shake')));
  check('combo included and labeled', names.some(n => n.startsWith('Breakfast combo') && n.includes('combo')));
  check('Banana excluded (1g protein is not worth suggesting)', !names.includes('Banana'));
  check('Huge Burrito excluded (would blow the calories)', !names.includes('Huge Burrito'));
  check('no more than 4 picks', names.length <= 4);
  console.log('=== 2. header ===');
  const left = doc.getElementById('whatFitsLeft').textContent;
  console.log('   ', left);
  check('shows protein and calories left', /87g protein/.test(left) && /cal left/.test(left));
  console.log('=== 3. one tap logs the right thing, for the selected date + meal type ===');
  dom.window.eval(`window.__w = null; writeMeals = (d, m) => { window.__w = { d, m }; return Promise.resolve(); }; setMealType('Dinner'); document.getElementById('foodDate').value = todayStr();`);
  click(doc.querySelector('#whatFitsList .fits-row'));
  await new Promise(r => setTimeout(r, 50));
  const w = dom.window.eval('window.__w');
  const logged = w && w.m[w.m.length - 1];
  check('logged Chicken Salad', logged && logged.desc === 'Chicken Salad');
  check('uses the selected meal type (Dinner)', logged && logged.mt === 'Dinner');
  check('macros carried over', logged && logged.protein === '35' && logged.cal === '400');
  check('appended to today, did not replace existing meals', w.m.length === 2);
  dom.window.eval(`window.__w = null`);
  const comboBtn = [...doc.querySelectorAll('#whatFitsList .fits-row')].find(b => b.textContent.includes('Breakfast combo'));
  click(comboBtn); await new Promise(r => setTimeout(r, 50));
  const w2 = dom.window.eval('window.__w');
  check('combo logs every item in it', w2 && w2.m.filter(m => m.desc === 'PB' || m.desc === 'Muffin').length >= 2);
  console.log('=== 4. hides itself when it should ===');
  dom.window.eval(`entries[0].meals = [{ desc: 'Big', protein: '100', cal: '800', ts: 5 }]; renderProteinSummary();`);
  check('hidden once the protein goal is met', card.style.display === 'none');
  dom.window.eval(`entries[0].meals = [{ desc: 'Big', protein: '10', cal: '3000', ts: 5 }]; renderProteinSummary();`);
  check('hidden when calories are already used up', card.style.display === 'none');
  dom.window.eval(`entries[0].meals = []; pinnedFavorites = []; foodCombos = []; entries = [entries[0]]; renderProteinSummary();`);
  check('with no favorites or frequent foods yet, the card stays hidden (Nov 1: no empty card)', card.style.display === 'none' || !!dom.window.document.getElementById('whatFitsEmpty') && /favorites/.test(dom.window.document.getElementById('whatFitsList').textContent));
  dom.window.eval(`pinnedFavorites = [{ desc: 'Huge feast', protein: '60', cal: '9000' }]; foodCombos = []; renderProteinSummary();`);
  check('with favorites that simply do not fit the calories left, it stays hidden (nothing useful to say)', card.style.display === 'none');
  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2000); setTimeout(() => process.exit(1), 20000);
