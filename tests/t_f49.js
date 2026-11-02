const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {};
      w.localStorage.setItem('mounjaro-sync-id', 'x'); w.__settingsData = {}; w.__scrolled = []; w.HTMLElement.prototype.scrollIntoView = function () { w.__scrolled.push(this.dataset && this.dataset.date); }; w.Element.prototype.scrollTo = () => {}; w.scrollTo = () => {}; } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); await sleep(2000);
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ev(`syncId = 'x'; window.__sets = []; window.__dels = []; window.__setDocImpl = (r, d, o) => { window.__sets.push({ d, o }); return Promise.resolve(); }; window.__deleteDocImpl = r => { window.__dels.push(r); return Promise.resolve(); };
      window.__toasts = []; showUndoToast = (m, fn) => window.__toasts.push({ m, fn });
      window.ds = n => lbAddDays(todayStr(), -n);
      const mk = (n, extra) => Object.assign({ date: ds(n) }, extra || {});
      const R = (k, w) => Array.from({ length: k }, () => ({ weight: w, reps: 10 }));
      const E = [];
      for (let n = 59; n >= 0; n--) {
        const e = mk(n, { weight: (201 - (59 - n) * 0.12).toFixed(1), protein: '110', calories: '1500', carbs: '90', fat: '40', steps: '7000' });
        if (n % 7 === 0) { e.injection = true; e.dose = '5'; e.site = 'L Abdomen'; }
        if (n % 2 === 0) e.glucose = '118';
        if (n === 6) { e.notes = 'Mild nausea in the afternoon'; e.tags = ['Nausea']; }
        if (n % 4 === 0) e.meals = [{ mt: 'Breakfast', desc: 'Protein shake', protein: 30, cal: 180, ts: Date.now() - n * 864e5 }, { mt: 'Lunch', desc: 'Chicken bowl', protein: 45, cal: 520, ts: Date.now() - n * 864e5 + 1 }];
        E.push(e);
      }
      const addWo = (n, wt) => { const e = E.find(x => x.date === ds(n)); e.ex = [{ type: 'Strength', ts: Date.now() - n * 864e5, min: 46, planDay: 'Push', sets: { 'Chest Press (machine)': R(3, wt) } }]; };
      addWo(14, 100); addWo(7, 105); addWo(1, 110);
      entries = E; window.E = E; document.getElementById('historySearch').value = ''; historyFilters.clear(); historyWeekState = {}; historyOpenCards.clear(); historyWeeksShown = 8;
      showView('history'); renderHistory();`);
  const weeks = () => [...doc.querySelectorAll('#historyList .hist-week')];
  const cards = () => [...doc.querySelectorAll('#historyList .entry-card')];
  const weekEl = wk => doc.querySelector(`.hist-week[data-week="${wk}"]`);
  const card = d => doc.querySelector(`#historyList .entry-card[data-date="${d}"]`);

  console.log('=== 1. weeks ===');
  const nWeeks = ev(`new Set(entries.map(e => lbWeekStart(e.date))).size`);
  check(`entries are grouped by week (${nWeeks} weeks of data, the latest 8 shown)`, weeks().length === 8 && nWeeks > 8);
  const heads = weeks().map(x => x.querySelector('.hw-title').textContent);
  check('the newest two are "This week" and "Last week", the rest "Week of …"', heads[0] === 'This week' && heads[1] === 'Last week' && /^Week of /.test(heads[2]));
  check('only the latest two weeks are open (older ones are just a header and a summary line)', weeks().slice(0, 2).every(x => x.querySelector('.entry-card')) && weeks().slice(2).every(x => !x.querySelector('.entry-card')));
  const sum = weeks()[1].querySelector('.hw-sum').textContent;
  check('each week has a summary line: weight and change, average protein, workouts, dose', /lb \(/.test(sum) && /avg 110 g protein/.test(sum) && /💉 5 mg/.test(sum));
  check('a week with a workout says so ("1 workout")', /1 workout/.test(weeks().map(x => x.querySelector('.hw-sum')).filter(Boolean).map(x => x.textContent).join(' ')));
  const wk3 = weeks()[3].dataset.week;
  click(weeks()[3].querySelector('.hist-week-head'));
  check('tapping a closed week opens it', weekEl(wk3).querySelectorAll('.entry-card').length > 0 && weekEl(wk3).querySelector('.hist-week-head').getAttribute('aria-expanded') === 'true');
  ev(`renderHistory()`); check('and it stays open when the list refreshes', weekEl(wk3).querySelectorAll('.entry-card').length > 0);
  click(weekEl(wk3).querySelector('.hist-week-head')); check('tapping again closes it', weekEl(wk3).querySelectorAll('.entry-card').length === 0);
  click($('historyMoreWeeks'));
  check('"Show older weeks" adds more, and the button goes once everything is shown', weeks().length === nWeeks && !$('historyMoreWeeks'));

  console.log('=== 2. compact cards ===');
  const c1 = card(ev('ds(0)')) || cards()[0];
  const date = c1.dataset.date;
  check('the date is short (e.g. "Fri, Oct 9") and does not wrap with the year', /^[A-Z][a-z]{2}, [A-Z][a-z]{2} \d{1,2}$/.test(c1.querySelector('.entry-date').textContent.trim()));
  check('at most 4 key numbers are shown, with a "+N more" for the rest', c1.querySelectorAll('.entry-metrics .metric-pill').length <= 4 && !!c1.querySelector('.hist-more-btn'));
  check('Edit and Delete are tucked into a ⋯ menu that starts closed', c1.querySelector('.entry-menu').hidden && !!c1.querySelector('.entry-more'));
  const before = c1.querySelectorAll('.metric-pill').length;
  click(c1.querySelector('.entry-date'));
  const open1 = card(date);
  check('tapping a card opens it and shows everything', open1.classList.contains('open') && open1.querySelectorAll('.metric-pill').length > before);
  check('with a "Show less" to fold it back', !!open1.querySelector('.hist-less-btn'));
  click(open1.querySelector('.hist-less-btn')); check('Show less folds it', !card(date).classList.contains('open'));
  click(card(date).querySelector('.hist-more-btn')); check('"+N more" opens it too', card(date).classList.contains('open')); click(card(date).querySelector('.hist-less-btn'));
  const mealDay = ev('E.filter(e => e.meals).map(e => e.date).slice(-1)[0]');
  ev(`historyWeekState[lbWeekStart('${mealDay}')] = true; historyOpenCards.add('${mealDay}'); renderHistory()`);
  check('an open card lists the meals of that day', /Protein shake/.test(card(mealDay).textContent) && /Chicken bowl/.test(card(mealDay).textContent));
  ev(`historyOpenCards.clear(); renderHistory()`);
  const noteDay = ev('ds(6)'); ev(`historyWeekState[lbWeekStart('${noteDay}')] = true; renderHistory()`);
  check('a note shows as a one-line preview, and side effects stay visible when folded', /Mild nausea/.test(card(noteDay).querySelector('.hist-note-1').textContent) && !!card(noteDay).querySelector('.tag-pill'));

  console.log('=== 3. workouts on the card ===');
  const d1 = ev('ds(1)'); ev(`historyWeekState[lbWeekStart('${d1}')] = true; renderHistory()`);
  check('a lifting day shows "Push Day · 46m" with its PR count (🏆1) in the key numbers', /Push Day · 46m · 🏆1/.test(card(d1).textContent));
  click(card(d1).querySelector('.entry-date'));
  check('opened, it lists the lifts: "3 × Chest Press (machine)  110 lb × 10 🏆"', /3 × Chest Press \(machine\)/.test(card(d1).textContent) && /110 lb × 10 🏆/.test(card(d1).textContent));
  ev(`historyOpenCards.clear()`);

  console.log('=== 4. the ⋯ menu, delete with Undo ===');
  ev(`renderHistory()`);
  const cc = card(ev('ds(0)')) || cards()[0], cd = cc.dataset.date;
  click(cc.querySelector('.entry-more')); check('⋯ opens the menu', !cc.querySelector('.entry-menu').hidden);
  click(doc.body); check('tapping elsewhere closes it', card(cd).querySelector('.entry-menu').hidden);
  click(card(cd).querySelector('.entry-more')); click(card(cd).querySelector('.entry-edit'));
  check('Edit loads that day into the Log tab', $('fDate').value === cd && doc.getElementById('view-log').classList.contains('active'));
  ev(`showView('history'); renderHistory()`);
  const orig = JSON.parse(JSON.stringify(ev(`entries.find(e => e.date === '${cd}')`)));
  ev(`window.__sets = []; window.__dels = []; window.__toasts = []`);
  click(card(cd).querySelector('.entry-more')); click(card(cd).querySelector('.entry-del')); await sleep(60);
  check('Delete removes it without a pop-up question', ev('window.__dels.length') === 1);
  check('and offers Undo ("Deleted …")', ev('window.__toasts.length') === 1 && /^Deleted /.test(ev('window.__toasts[0].m')));
  await ev(`window.__toasts[0].fn()`); await sleep(30);
  const restored = ev('window.__sets').slice(-1)[0];
  check('Undo puts the whole day back exactly as it was', !!restored && JSON.stringify(restored.d) === JSON.stringify(orig) && !restored.o);

  console.log('=== 5. filters ===');
  ev(`renderHistory()`);
  const chipTexts = [...doc.querySelectorAll('#historyFilters .chip')].map(c => c.textContent);
  const nInj = ev(`entries.filter(e => e.injection).length`);
  check('four filter chips with counts', chipTexts.length === 4 && chipTexts[0].includes('Injection days') && chipTexts[0].endsWith(String(nInj)));
  click(doc.querySelector('[data-histfilter="injection"]'));
  check('Injection days: only those days, in weeks that are all open', cards().length === nInj && cards().every(c => card(c.dataset.date).querySelector('.entry-badge')) && /match/.test(weeks()[0].querySelector('.hw-count').textContent));
  click(doc.querySelector('[data-histfilter="sideeffects"]'));
  check('adding Side effects narrows to days that are both (none here)', cards().length === 0 && /No entries match/.test($('historyList').textContent));
  click(doc.querySelector('[data-histfilter="injection"]'));
  check('Side effects alone finds the nausea day', cards().length === 1 && cards()[0].dataset.date === ev('ds(6)'));
  click(doc.querySelector('[data-histfilter="sideeffects"]'));
  click(doc.querySelector('[data-histfilter="notes"]')); check('Notes finds days with a note', cards().length === 1);
  $('historySearch').value = 'zzz'; ev(`renderHistory()`); check('search still works together with filters', cards().length === 0);
  $('historySearch').value = ''; click(doc.querySelector('[data-histfilter="notes"]')); check('clearing the filters brings the weeks back (all of them, as I had asked for more earlier)', weeks().length === nWeeks && !doc.querySelector('#historyFilters .chip.on'));

  console.log('=== 6. highlights ===');
  const hl = [...doc.querySelectorAll('#historyHighlights .hist-hl')].map(x => x.textContent.replace(/\s+/g, ' ').trim());
  check('up to three highlights are shown', hl.length >= 1 && hl.length <= 3);
  check('a new low weight comes first (weight has been falling)', /New low weight: /.test(hl[0]));
  check('PRs this month are counted', hl.some(t => /PR/.test(t)) || ev(`buildWorkoutHistorySummaries().filter(s => s.date >= ds(30)).reduce((t, s) => t + s.prCount, 0)`) === 0);

  console.log('=== 7. heatmap day → that entry ===');
  const oldDay = ev('ds(40)'); ev(`historyWeeksShown = 8; historyWeekState = {}; historyOpenCards.clear(); renderHistory()`);
  check('before the tap that day is inside a closed week', !card(oldDay));
  w.__scrolled.length = 0;
  click(doc.querySelector(`#consistencyHeatmap rect[data-date="${oldDay}"]`));
  check('tapping a day opens its week and its card, and scrolls to it', !!card(oldDay) && card(oldDay).classList.contains('open') && w.__scrolled.includes(oldDay));
  ev(`historyFilters.add('injection'); renderHistory()`);
  click(doc.querySelector(`#consistencyHeatmap rect[data-date="${ev('ds(3)')}"]`));
  check('it clears any filter that would hide the day', !doc.querySelector('#historyFilters .chip.on') && !!card(ev('ds(3)')));
  ev(`entries = entries.filter(e => e.date !== ds(10)); renderHistory(); window.__toasts2 = 0`);
  ev(`document.getElementById('prToast').style.display = 'none'`);
  click(doc.querySelector(`#consistencyHeatmap rect[data-date="${ev('ds(10)')}"]`));
  check('a day with nothing logged says so instead of jumping', $('prToast').style.display === 'block' && /Nothing logged on/.test($('prToast').textContent));

  console.log('=== 8. the muscle card is folded by default ===');
  check('the body map starts closed, with a one-line summary showing', $('muscleMap').style.display === 'none' && /muscles on goal/.test($('muscleMapSummary').textContent) && $('muscleMapHeader').getAttribute('aria-expanded') === 'false');
  click($('muscleMapHeader'));
  check('tapping the title opens it (and the summary steps aside)', $('muscleMap').style.display !== 'none' && $('muscleMapSummary').style.display === 'none' && $('muscleMapChevron').textContent === '▼');
  check('the choice is remembered', w.localStorage.getItem('mounjaro-musclemap-open') === 'true');
  click($('muscleMapHeader')); check('and it folds again', $('muscleMap').style.display === 'none');

  console.log('=== 9. doctor summary ===');
  ev(`window.__doc = 0; showDoctorSummary = () => { window.__doc++; }`); click($('historyDoctorBtn'));
  check('a Doctor summary button sits at the top of History', ev('window.__doc') === 1);
  console.log('=== 10. heatmap legend ===');
  check('the legend says what more/less means and that days are tappable', /Less logged/.test($('view-history').textContent) && /More logged/.test($('view-history').textContent) && /tap a day/.test($('view-history').textContent));
  check('each day has a spoken/hover label such as "Fri, Oct 9 · 4 things logged"', /· (\d+ things? logged|nothing logged|rest day)$/.test(doc.querySelector('#consistencyHeatmap rect[data-date] title').textContent));
  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
