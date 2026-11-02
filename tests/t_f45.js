const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {};
      w.localStorage.setItem('mounjaro-sync-id', 'x'); w.__settingsData = {}; w.HTMLElement.prototype.scrollIntoView = () => {}; } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); await sleep(2000);
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); window.__toasts = []; showUndoToast = (m, fn) => window.__toasts.push({ m, fn });
      window.M = (mt, desc, p, cal, ts) => ({ mt, desc, protein: p, cal, carbs: 10, fat: 5, ts });
      window.ds = n => lbAddDays(todayStr(), -n);
      document.getElementById('foodDate').value = todayStr(); showView('food');`);
  const toast = () => ev('window.__toasts').slice(-1)[0];
  const today = () => ev('mealsForDate(todayStr())');

  console.log('=== 1. "Adding to" sits at the top of Add Food ===');
  const at = doc.querySelector('.adding-to');
  check('the meal chips (Breakfast/Lunch/Dinner/Snack) are now the first thing in Add Food, labelled "Adding to"', !!at && at.contains($('mealTypeRow')) && /Adding to/.test(at.textContent) && !!(at.compareDocumentPosition($('foodTabRow')) & w.Node.DOCUMENT_POSITION_FOLLOWING));
  ev(`setMealType('Lunch')`);
  check('picking one still works', doc.querySelector('#mealTypeRow .mt-chip.on').dataset.mt === 'Lunch');

  console.log('=== 2. the macro form appears only when there is something to review ===');
  ev(`entries = []; renderMealList()`);
  check('at first the form is hidden and a "Enter macros manually" button is shown', $('reviewFormBody').style.display === 'none' && $('manualEntryBtn').style.display !== 'none');
  check('the search results area is outside the hidden part, so search still shows its results', !$('reviewFormBody').contains($('lookupResults')));
  click($('manualEntryBtn'));
  check('"Enter macros manually" opens the form', $('reviewFormBody').style.display !== 'none' && $('manualEntryBtn').style.display === 'none');
  ev(`document.getElementById('mDesc').value = ''`);
  check('clearing the form puts it away again', $('reviewFormBody').style.display === 'none');
  ev(`document.getElementById('mProtein').value = 30`);
  check('anything that fills the macros (a picked food, an AI estimate, a scan) opens it automatically', $('reviewFormBody').style.display !== 'none');
  ev(`document.getElementById('mProtein').value = ''`);
  check('and it closes again when emptied', $('reviewFormBody').style.display === 'none');
  ev(`entries = [{ date: todayStr(), meals: [{ mt: 'Lunch', desc: 'Mystery bowl', ts: 111 }] }]; renderMealList(); startEditMeal(todayStr(), 111)`);
  check('editing a logged item (even one with no macros) shows the form', $('reviewFormBody').style.display !== 'none' && $('mDesc').value === 'Mystery bowl');
  ev(`cancelEditMeal()`);
  check('cancelling the edit hides it again', $('reviewFormBody').style.display === 'none');
  ev(`entries = []; renderMealList(); document.getElementById('mDesc').value = 'Apple'`); click($('manualEntryBtn')); click($('addMealBtn')); await sleep(60);
  check('adding a plain item typed by hand works, and the form tidies itself away afterwards', today().some(m => m.desc === 'Apple') && $('reviewFormBody').style.display === 'none');

  console.log('=== 3. quick-add says where it went, and can be undone ===');
  ev(`entries = []; renderMealList(); setMealType('Lunch')`);
  await ev(`quickAddFood({ desc: 'Protein shake', protein: 30, cal: 180, carbs: 6, fat: 3 })`);
  check('a toast says what was added and to which meal', /Added "Protein shake" to Lunch/.test(toast().m) && today().length === 1 && today()[0].mt === 'Lunch');
  await toast().fn();
  check('Undo removes it', today().length === 0);
  await ev(`quickAddCombo({ name: 'Usual breakfast', items: [{ desc: 'Shake', protein: 30 }, { desc: 'Banana', protein: 1 }] })`);
  check('combos get the same toast and undo', /Added "Usual breakfast" to Lunch/.test(toast().m) && today().length === 2);
  await toast().fn(); check('undoing a combo removes all of it', today().length === 0);

  console.log('=== 4. repeat a meal, or a whole day ===');
  ev(`entries = [
    { date: ds(2), meals: [M('Dinner', 'Steak', 48, 720, 21), M('Dinner', 'Potatoes', 4, 200, 22)] },
    { date: ds(1), meals: [M('Breakfast', 'Protein shake', 30, 180, 1), M('Breakfast', 'Banana', 1, 105, 2), M('Lunch', 'Turkey wrap', 32, 480, 3)] }
  ]; renderMealList()`);
  const heads = () => [...doc.querySelectorAll('#mealList .meal-group-head')];
  const headOf = n => heads().find(h => h.querySelector('span').textContent === n);
  check('an empty meal takes one line with its name, a repeat button and Add', !!headOf('Breakfast') && headOf('Breakfast').classList.contains('empty') && !!headOf('Breakfast').querySelector('[data-repeatmeal="Breakfast"]') && !!headOf('Breakfast').querySelector('[data-addmeal="Breakfast"]'));
  check('the repeat button is short (the meal name sits beside it): "↻ Yesterday · 285 cal", with the full wording for screen readers', /↻ Yesterday · 285 cal/.test(headOf('Breakfast').textContent) && /Repeat yesterday's breakfast/.test(headOf('Breakfast').querySelector('[data-repeatmeal]').getAttribute('aria-label')));
  const dinnerLabel = ev(`dayWordFor(todayStr(), ds(2))`);
  check('with no dinner yesterday it finds the last one, named by weekday (e.g. "↻ Wed · 920 cal")', headOf('Dinner').textContent.includes(`↻ ${ev(`shortDayFor(todayStr(), ds(2))`)} · 920 cal`) && !/Yesterday/.test(headOf('Dinner').querySelector('[data-repeatmeal]').textContent) && !/yesterday/.test(dinnerLabel));
  check('"Copy yesterday\'s meals · 3 items · 765 cal" is offered while today is empty', /Copy yesterday's meals · 3 items · 765 cal/.test($('copyDayBtn').textContent));
  click(headOf('Breakfast').querySelector('[data-repeatmeal]')); await sleep(60);
  check('repeating yesterday\'s breakfast adds both items to today\'s Breakfast', today().filter(m => m.mt === 'Breakfast').length === 2 && today().map(m => m.desc).sort().join() === 'Banana,Protein shake');
  check('every copy gets its own timestamp (edit and delete depend on it)', new Set(today().map(m => m.ts)).size === today().length);
  check('a toast confirms and Undo removes exactly those', /Added yesterday's breakfast/.test(toast().m));
  await toast().fn(); check('undo works', today().length === 0);
  click($('copyDayBtn')); await sleep(60);
  check('copying the whole day adds all 3 items with their meal types', today().length === 3 && today().filter(m => m.mt === 'Lunch').length === 1);
  check('once today has food, the copy button and repeat buttons are gone', !$('copyDayBtn') && !doc.querySelector('[data-repeatmeal="Breakfast"]'));
  check('meals that have food keep their subtotal line and the "+ Add food to…" row', !!doc.querySelector('[data-addmeal="Breakfast"].add-to-meal-row') && /cal/.test(headOf('Breakfast').textContent));
  ev(`setMealType('Snack')`); click(headOf('Dinner').querySelector('[data-addmeal]'));
  check('the one-line Add still sets that meal and opens Add Food', doc.querySelector('#mealTypeRow .mt-chip.on').dataset.mt === 'Dinner');
  ev(`entries = []; renderMealList()`);
  check('with no history there is nothing to repeat and no copy button', !doc.querySelector('[data-repeatmeal]') && !$('copyDayBtn'));

  console.log('=== 5. photo shortcut ===');
  let picks = 0; $('photoFileInput').click = () => { picks++; };
  // Since Nov 1 there is one photo button: the 📷 Photo icon in Add Food (the log's and the strip's were removed).
  click(doc.querySelector('#foodQuickActions .fqa[data-fqa="photo"]'));
  check('the 📷 Photo icon in Add Food switches to the Photo method and opens the camera/photo picker', picks === 1 && doc.querySelector('.add-method-chip.on').dataset.addMethod === 'photo');
  check('the old "Log with a photo" button is gone from the log', !$('foodLogPhotoBtn'));

  console.log('=== 6. water, right in the nutrition card ===');
  ev(`entries = [{ date: todayStr(), water: 40 }]; renderMealList(); renderWater()`);
  check('the nutrition card shows water so far, with +8 and +16', /40 \/ 64 oz/.test($('nutWaterVal').textContent) && !!doc.querySelector('#proteinSummaryBody [data-water-quick="8"]') && !!doc.querySelector('#proteinSummaryBody [data-water-quick="16"]'));
  ev(`window.__w = []; adjustWater = async d => { window.__w.push(d); }`);
  click(doc.querySelector('[data-water-quick="16"]')); click(doc.querySelector('[data-water-quick="8"]'));
  check('the buttons use the same water logic as the Water card', ev('window.__w.join()') === '16,8');
  await ev(`setWater(todayStr(), 56, 40)`);
  check('the number updates immediately after a change', /56 \/ 64 oz/.test($('nutWaterVal').textContent));

  console.log('=== 7. the "estimated targets" note can be dismissed ===');
  ev(`localStorage.removeItem('mounjaro-targets-note-dismissed'); userHeightIn = 0; userAge = 0; renderProteinSummary()`);
  check('it shows when there is no height/age, with a ✕', !!doc.querySelector('.targets-note') && !!$('targetsNoteX'));
  click($('targetsNoteX'));
  check('✕ removes it and remembers', !doc.querySelector('.targets-note') && w.localStorage.getItem('mounjaro-targets-note-dismissed') === '1');
  ev(`renderProteinSummary()`);
  check('and it stays gone on later refreshes', !doc.querySelector('.targets-note'));
  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
