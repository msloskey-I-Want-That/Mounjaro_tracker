// For every exercise on every plan day, at several phone widths: does each number fit its box?
// Weight boxes get "142.5" and "1000", reps boxes "12" and "120".
const { chromium } = require('playwright');
const widths = (process.argv[2] || '320,360,375,390,393,402,414,430,440').split(',').map(Number);
(async () => {
  const b = await chromium.launch({ args: ['--no-sandbox'] });
  const report = [];
  for (const W of widths) {
    const ctx = await b.newContext({ viewport: { width: W, height: 900 }, deviceScaleFactor: 2, hasTouch: true }); const p = await ctx.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await ctx.route(/^https?:\/\/(?!localhost)/, r => r.abort());
    await p.goto('http://localhost:8765/app.html'); await p.waitForTimeout(1200);
    await p.evaluate(() => { document.querySelectorAll('.modal-overlay').forEach(m => m.remove()); const t = document.getElementById('modalTitle'); if (t) { let n = t; while (n.parentElement && n.parentElement !== document.body) n = n.parentElement; n.style.display = 'none'; } });
    const res = await p.evaluate(async () => {
      syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); window.__noPreviewList = true; entries = []; exerciseGroups = {}; exerciseStations = {}; customWorkoutExercises = {}; hiddenWorkoutExercises = {}; workoutPlanMode = 'ppl'; showView('exercise');
      const cv = document.createElement('canvas').getContext('2d'); const out = []; let rows = 0;
      const measure = inp => { const cs = getComputedStyle(inp); cv.font = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`; const tw = cv.measureText(inp.value || '').width; const avail = inp.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); return { tw: Math.round(tw), avail: Math.round(avail) }; };
      for (const day of ['Push', 'Pull', 'Legs']) {
        pplDayOverride = day; workoutSessionState = {}; collapsedExercises.clear(); renderWorkoutPlan();
        const st = document.getElementById('startPlanBtn'); if (st) st.click(); await new Promise(r => setTimeout(r, 50));
        for (const pass of [['142.5', '12'], ['1000', '120']]) {
          Object.keys(workoutSessionState).forEach(n => workoutSessionState[n].forEach(q => { q.weight = pass[0]; q.reps = pass[1]; }));
          collapsedExercises.clear(); renderWorkoutPlan(); await new Promise(r => setTimeout(r, 30));
          document.querySelectorAll('.set-row').forEach(row => {
            rows++;
            row.querySelectorAll('input').forEach(inp => { const m = measure(inp); if (m.tw > m.avail) out.push(`${day} · ${row.dataset.exercise} · ${inp.className.includes('weight') ? 'weight' : 'reps'} "${inp.value}" needs ${m.tw}px, box ${m.avail}px`); });
            if (row.scrollWidth > row.clientWidth + 1) out.push(`${day} · ${row.dataset.exercise} · row overflows (${row.scrollWidth}>${row.clientWidth})`);
          });
        }
        try { workoutStartedAt = null; } catch (e) { /* */ }
      }
      return { out, rows };
    });
    report.push([W, res, errs]); await ctx.close();
  }
  for (const [W, res, errs] of report) console.log(`${W}px (${res.rows} rows checked): ${res.out.length ? res.out.length + ' problems\n   ' + [...new Set(res.out)].slice(0, 6).join('\n   ') : 'all fit'}${errs.length ? '  ERR ' + errs[0] : ''}`);
  await b.close();
})();
