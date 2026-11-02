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

  console.log('=== Workouts-only Charts (with real data) ===');
  ev(`setAppModeLocal('exercise')`); draw(); await sleep(150);
  const visH = () => [...doc.querySelectorAll('#view-charts .cs-head')].filter(h => !h.hidden).map(h => h.dataset.sec);
  console.log('HEADS', JSON.stringify(visH()));
  check('only the Activity header is left', JSON.stringify(visH()) === '["Activity"]');
  const shownCards = () => [...doc.querySelectorAll('#view-charts .chart-card')].filter(c => w.getComputedStyle(c).display !== 'none' && !c.classList.contains('cs-skip')).map(c => (c.querySelector('.chart-title') || {}).textContent);
  click(doc.querySelector('.cs-head[data-sec="Activity"]')); await sleep(80);
  console.log('SHOWN', JSON.stringify(shownCards()));
  check('opening Activity shows only Strength Volume, Exercise Weight Progress and the 1RM trend', shownCards().every(t => /Strength Volume|Exercise Weight Progress|1RM|One-Rep|Estimated/i.test(t)) && shownCards().length >= 1);
  const er = doc.querySelector('#view-charts .cs-emptyrow');
  console.log('EMPTY', er ? er.textContent.trim() : '(none)');
  check('no "N charts have no data" count for hidden health charts', !er || !/\b\d\d\b/.test(er.textContent));
  const drawnIds = drawn();
  ev(`setAppModeLocal('full')`); draw(); await sleep(120);
  check('back to Everything: all the section headers return', visH().length >= 6);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
})();
