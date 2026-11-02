const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {};
      w.localStorage.setItem('mounjaro-sync-id', 'x'); w.__settingsData = {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {};
      w.HTMLCanvasElement.prototype.getContext = function () { const c = this; return new Proxy({ canvas: c }, { get: (t, k) => (k in t ? t[k] : () => ({ addColorStop() {} })) }); }; } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); await sleep(2000);
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  class FakeChart { constructor(ctx, cfg) { this.canvasId = ctx.canvas.id; this.config = cfg; this.data = cfg.data; this.options = cfg.options; FakeChart.instances.push(this); } destroy() {} update() {} }
  FakeChart.instances = []; w.Chart = FakeChart;
  const drawn = () => FakeChart.instances.map(i => i.canvasId);
  const inst = id => FakeChart.instances.filter(i => i.canvasId === id).pop();
  const draw = () => { FakeChart.instances = []; ev('renderCharts()'); };
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); window.ds = n => lbAddDays(todayStr(), -n); userProteinGoal = 100;
      localStorage.clear(); chartSecOpen = {}; chartRange = '12w'; showEmptyCharts = false; wkShowAll = false;
      const R = (n, w) => Array.from({ length: n }, () => ({ weight: w, reps: 10 }));
      entries = []; for (let i = 200; i >= 0; i--) { const e = { date: ds(i), weight: String((200 - (200 - i) * 0.1).toFixed(1)), steps: String(4000 + (200 - i) * 40), protein: String(i % 3 ? 110 : 80), water: '50', calories: '1800', carbs: '120', fat: '60', glucose: String(110 + i % 12) };
        if (i % 2 === 0) e.ex = [{ type: 'Strength', ts: Date.now() - i * 864e5, min: 40, planDay: 'Push', sets: { 'Chest Press (machine)': R(3, 60 + (200 - i) / 10) } }];
        entries.push(e); }
      showView('charts');`);
  await sleep(120);

  console.log('=== 1. sections ===');
  draw();
  const heads = () => [...doc.querySelectorAll('#view-charts .cs-head')].filter(h => !h.hidden).map(h => h.dataset.sec);
  check('the charts are grouped under headers, Body first (Recovery and Labs have no data, so no header)', heads().join() === 'Body,Treatment,Nutrition,Activity,Compare,Weekly summary');
  const exp = n => doc.querySelector(`.cs-head[data-sec="${n}"]`).getAttribute('aria-expanded') === 'true';
  check('Treatment and Body start open; the rest start folded', exp('Treatment') && exp('Body') && !exp('Nutrition') && !exp('Activity') && !exp('Recovery') && !exp('Compare'));
  check('the section cards really sit under their headers (DOM order)', (() => { const order = [...$('view-charts').children].filter(c => c.classList.contains('cs-head') || c.classList.contains('chart-card')).map(c => c.classList.contains('cs-head') ? 'H:' + c.dataset.sec : c.dataset.csec); return order.indexOf('H:Body') < order.indexOf('Body') && order.lastIndexOf('Body') < order.indexOf('H:Nutrition'); })());

  console.log('=== 2. only what is on screen is drawn ===');
  check('open sections are drawn (weight, glucose)', drawn().includes('weightChart') && drawn().includes('glucoseChart'));
  check('folded sections are not (protein, steps, sleep…)', !drawn().includes('proteinChart') && !drawn().includes('stepsChart') && !drawn().includes('hrChart'));
  check('a folded section still says its numbers in one line ("Protein 110 g · …")', /Protein/.test(doc.querySelector('.cs-head[data-sec="Nutrition"] .cs-sum').textContent));
  click(doc.querySelector('.cs-head[data-sec="Nutrition"]'));
  check('opening Nutrition draws its charts', drawn().includes('proteinChart') && drawn().includes('waterChart') && exp('Nutrition'));
  check('and it is remembered', JSON.parse(w.localStorage.getItem('mounjaro-chart-sections')).Nutrition === true);

  console.log('=== 3. empty charts ===');
  check('charts with no data are not drawn (blood pressure)', !drawn().includes('bpChart') && $('bpChart').closest('.chart-card').classList.contains('cs-empty'));
  const emptyBtn = doc.querySelector('[data-cs-empty]');
  check('one row says how many have no data, and offers to show them', /\d+ charts? (has|have) no data yet · Show/.test(emptyBtn.textContent));
  click(emptyBtn); check('Show draws them (an empty frame, on request) and the button flips to Hide', drawn().includes('bpChart') && /Hide/.test(doc.querySelector('[data-cs-empty]').textContent));
  FakeChart.instances = []; click(doc.querySelector('[data-cs-empty]')); check('Hide sets them aside again', !drawn().includes('bpChart') && drawn().includes('weightChart'));

  console.log('=== 4. time range ===');
  const countInRange = days => ev(`entries.filter(e => e.weight && e.date >= lbAddDays(todayStr(), -${days})).length`);
  check('default is 12 weeks: the weight chart has exactly the last 84 days', inst('weightChart').data.labels.length === countInRange(84) && /12 weeks/.test($('chartRangeHint').textContent) && doc.querySelector('[data-crange="12w"]').classList.contains('on'));
  FakeChart.instances = []; click(doc.querySelector('[data-crange="4w"]'));
  check('4 weeks narrows it (29 days)', inst('weightChart').data.labels.length === countInRange(28) && countInRange(28) === 29);
  FakeChart.instances = []; click(doc.querySelector('[data-crange="6m"]')); check('6 months widens it', inst('weightChart').data.labels.length === countInRange(183));
  FakeChart.instances = []; click(doc.querySelector('[data-crange="all"]')); check('All shows everything (201 days)', inst('weightChart').data.labels.length === 201);
  check('the choice is remembered', w.localStorage.getItem('mounjaro-chart-range') === 'all');
  FakeChart.instances = []; click(doc.querySelector('[data-crange="12w"]'));

  console.log('=== 5. a summary line on every card ===');
  const sum = id => $('sum-' + id).textContent.replace(/\s+/g, ' ');
  check('weight: latest, the change over the range, and the average ("… latest · −8.4 over last 12 weeks · avg …")', /latest/.test(sum('weightChart')) && /−8\.4/.test(sum('weightChart')) && /over last 12 weeks/.test(sum('weightChart')) && /avg/.test(sum('weightChart')));
  check('protein: average a day and how many days met your goal ("goal met 56 of 85 days")', /avg per day/.test(sum('proteinChart')) && new RegExp(`goal met ${ev(`entries.filter(e => e.date >= lbAddDays(todayStr(), -84) && +e.protein >= 100).length`)} of 85 days`).test(sum('proteinChart')));
  check('steps summary mentions the step goal days', /goal met \d+ of 85 days/.test(sum('stepsChart')) || !$('sum-stepsChart').textContent);
  FakeChart.instances = []; click(doc.querySelector('[data-crange="all"]'));
  check('on All it says "over the whole history"', /over the whole history/.test(sum('weightChart')));
  FakeChart.instances = []; click(doc.querySelector('[data-crange="12w"]'));

  console.log('=== 6. protein goal ===');
  ev(`userProteinGoal = 120`); draw();
  const target = inst('proteinChart').data.datasets.find(d => d.label === 'Goal');
  check('the protein chart\'s target line follows your goal (120), not a fixed 100', !!target && target.data.every(v => v === 120));
  check('and so does its legend', $('proteinLegend').textContent === '120g goal');
  check('and the "goal met" count', new RegExp(`goal met 0 of 85 days`).test(sum('proteinChart')));
  ev(`userProteinGoal = 100`);

  console.log('=== 7. tap a point to open that day ===');
  draw(); const wc = inst('weightChart'); const expect = ev(`chartRangeEntries(entries).filter(e => e.weight)[3].date`);
  check('every chart reports taps, and reads the nearest point (a fingertip need not hit the dot)', typeof wc.options.onClick === 'function' && wc.options.interaction.mode === 'nearest' && wc.options.interaction.intersect === false);
  wc.options.onClick({}, [{ index: 3 }], wc); await sleep(40);
  check('tapping a point opens History on that day (week open, card open)', doc.getElementById('view-history').classList.contains('active') && ev(`historyOpenCards.has('${expect}')`));
  ev(`showView('charts')`); await sleep(120);

  console.log('=== 8. charts are only drawn when the tab is open ===');
  ev(`showView('dashboard')`); await sleep(120); FakeChart.instances = [];
  ev(`renderAll()`); check('a save while you are on another tab draws no charts', FakeChart.instances.length === 0);
  ev(`showView('charts')`); await sleep(120); check('opening the tab draws them', FakeChart.instances.length > 0);
  FakeChart.instances = []; ev(`renderAll()`); check('and while you are on it they stay fresh', FakeChart.instances.length > 0);

  console.log('=== 9. compare two metrics ===');
  click(doc.querySelector('.cs-head[data-sec="Compare"]'));
  check('the Compare card lists only metrics with data in the range', [...$('cmpA').options].map(o => o.value).includes('weight') && [...$('cmpA').options].map(o => o.value).includes('steps') && ![...$('cmpA').options].map(o => o.value).includes('hrv'));
  $('cmpA').value = 'weight'; $('cmpB').value = 'steps'; $('cmpB').dispatchEvent(new w.Event('change', { bubbles: true }));
  const cc = inst('compareChart');
  check('it draws both on one chart, each on its own axis', !!cc && cc.data.datasets.length === 2 && cc.data.datasets[0].yAxisID === 'y' && cc.data.datasets[1].yAxisID === 'y1');
  check('weight falling while steps rise: a strong pattern, worded as a pattern and not as a cause ("higher weight", not "higher Weight (lb)")', /higher weight showed a strong tendency toward lower steps/.test($('cmpNote').textContent) && /r = −1\.00/.test($('cmpNote').textContent) && /not proof that one causes the other/.test($('cmpNote').textContent));
  check('the choice is remembered', JSON.parse(w.localStorage.getItem('mounjaro-compare')).b === 'steps');
  ev(`entries.forEach(e => { e.steps = String(5000 + (e.date.charCodeAt(9) * 7) % 13 * 100); e.water = String(40 + (e.date.charCodeAt(8) * 11) % 9) }); renderCharts()`);
  $('cmpA').value = 'steps'; $('cmpB').value = 'water'; $('cmpB').dispatchEvent(new w.Event('change', { bubbles: true }));
  check('unrelated numbers say so plainly ("No clear pattern")', /No clear pattern|weak tendency/.test($('cmpNote').textContent));
  ev(`entries.forEach(e => { delete e.hrv; delete e.restHR; }); const L = entries.length; for (let i = L - 10; i < L - 4; i++) entries[i].hrv = String(40 + i % 3); for (let i = L - 30; i < L - 24; i++) entries[i].restHR = String(60 + i % 3); renderCharts()`);
  $('cmpA').value = 'hrv'; $('cmpB').value = 'restHR'; $('cmpB').dispatchEvent(new w.Event('change', { bubbles: true }));
  check('with too few days that have both, it says so and asks for more data instead of guessing', /Only 0 days in the last 12 weeks have both HRV and resting HR\. Log a few more days to compare\./.test($('cmpNote').textContent));

  console.log('=== 10. weekly summary and the exercise picker ===');
  click(doc.querySelector('.cs-head[data-sec="Weekly summary"]'));
  const rows = () => doc.querySelectorAll('#wkTable tr').length - 1;
  check('weekly summary shows the last 8 weeks, with "Show all N weeks"', rows() === 8 && /Show all \d+ weeks/.test($('wkMoreBtn').textContent));
  click($('wkMoreBtn')); check('Show all lists every week', rows() > 8 && /Show fewer/.test($('wkMoreBtn').textContent));
  click(doc.querySelector('.cs-head[data-sec="Activity"]')); FakeChart.instances = [];
  ev(`renderWeightProgressChart('Chest Press (machine)')`);
  const wp = inst('weightProgressChart');
  check('the exercise picker redraws its chart inside the chosen range', !!wp && wp.data.labels.length > 0 && wp.data.labels.length <= 43 && /Best set|latest/.test($('sum-weightProgressChart').textContent));
  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
