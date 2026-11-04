// Nov 4: tapping a favorite gives visible confirmation (the "Added · Undo" message sits above the full-screen
// Add Food panel) and a quick repeat tap on the same food doesn't add it twice.
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
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = []; foodCombos = [{ name: 'Breakfast combo', items: [{ desc: 'Oatmeal', protein: '6', cal: '150' }, { desc: 'Eggs', protein: '12', cal: '140' }] }];
      pinnedFavorites = [{ desc: 'Protein Shake', protein: '30', cal: '160', carbs: '5', fat: '3' }]; document.getElementById('foodDate').value = todayStr(); showView('food'); renderAll(); renderFavorites();`);
  await sleep(60);
  const count = d => ev(`mealsForDate(todayStr()).filter(m => m.desc === '${d}').length`);

  console.log('=== 1. the message is on top of the Add Food panel ===');
  const css = [...doc.querySelectorAll('style')].map(s => s.textContent).join('\n');
  const popupZ = Number((css.match(/\.entry-popup-fullscreen \{[^}]*z-index: (\d+)/) || [])[1]);
  const toastZ = Number($('undoToast').style.zIndex);
  check(`the "Added · Undo" message (z ${toastZ}) is above the full-screen panel (z ${popupZ})`, toastZ > popupZ && popupZ > 0);

  console.log('=== 2. one tap = one add, with confirmation ===');
  const chip = () => doc.querySelector('[data-pin-add="0"]');
  click(chip()); await sleep(40);
  check('the first tap adds it', count('Protein Shake') === 1);
  check('and says so: "✓ Added "Protein Shake" to …" with Undo', $('undoToast').style.display === 'flex' && /✓ Added "Protein Shake" to/.test($('undoToastMsg').textContent));
  click(chip()); await sleep(20); click(chip()); await sleep(40);
  check('two more quick taps on the same food do not add it again', count('Protein Shake') === 1);
  ev(`pinnedFavorites.push({ desc: 'Greek yogurt', protein: '20', cal: '180' }); renderFavorites();`); await sleep(20);
  click(doc.querySelector('[data-pin-add="1"]')); await sleep(40);
  check('a different food right after still adds', count('Greek yogurt') === 1);
  ev(`lastQuickAdd.at -= 2500`); click(chip()); await sleep(40);
  check('the same food again after 2 seconds adds a second serving (on purpose)', count('Protein Shake') === 2);
  click($('undoToastBtn')); await sleep(40);
  check('Undo still removes the last one', count('Protein Shake') === 1);

  console.log('=== 3. combos too ===');
  const comboChip = () => doc.querySelector('[data-combo-add="0"]');
  click(comboChip()); await sleep(40); click(comboChip()); await sleep(40);
  check('a double-tapped combo is added once', count('Oatmeal') === 1 && count('Eggs') === 1);

  console.log('=== 4. Consistency heatmap has every day (Nov 1, the 25-hour day, was missing) ===');
  ev(`showView('history'); renderConsistencyHeatmap && renderConsistencyHeatmap();`); await sleep(40);
  const days = [...doc.querySelectorAll('#consistencyHeatmap rect[data-date]')].map(r => r.dataset.date);
  const want = []; for (let i = 0; i < 60; i++) want.push(ev(`lbAddDays(todayStr(), -${i})`));
  check('the last 60 days are all there, once each, ending today', want.every(d => days.filter(x => x === d).length === 1) && days[days.length - 1] === ev('todayStr()'));
  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
