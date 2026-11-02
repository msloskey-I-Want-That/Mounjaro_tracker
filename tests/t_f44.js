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
  const CP = 'Chest Press (machine)';
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); workoutPlanMode = 'ppl'; pplDayOverride = 'Push';
      window.ds = n => lbAddDays(todayStr(), -n);
      window.sess = (n, wt, mins, day) => ({ date: ds(n), ex: [{ type: 'Strength', ts: Date.now() - n * 864e5, min: mins || 40, planDay: day || 'Push', sets: { '${CP}': [{ weight: wt, reps: 10 }, { weight: wt, reps: 10 }, { weight: wt, reps: 10 }], 'Pec Deck (machine)': [{ weight: 60, reps: 12 }] } }] });
      window.setH = list => { entries = list.map(o => sess(o[0], o[1], o[2], o[3])); entries.sort((a, b) => a.date.localeCompare(b.date)); };`);

  console.log('=== 1. card order ===');
  const order = [...doc.querySelectorAll('#view-exercise > *')].map(c => c.id || ((c.querySelector('.form-section-title') || {}).textContent || '').trim().replace(/\s+/g, ' ').replace(/ [▶▼]$/, ''));
  // Nov 1: Quick start folded into Exercise, Workout/Activity History moved to the History tab (order as live since Oct).
  check('order is Workout Plan, This week, Stretch & warm-up, Exercise, AI Coach (date chip on top; Nov 1: plan first); no history cards here', order.join('|') === ['exDateRow', 'workoutPlanCard', 'weekRecapCard', 'recoveryCard', 'exerciseActivityCard', 'aiCoachCard'].join('|'));
  check('the Exercise card still has its timer, minutes box and Add button', ['exTimerStartBtn', 'exMin', 'addExBtn'].every(id => $('exerciseActivityCardContent').contains($(id))));

  console.log('=== 2. Workout History: latest few, then more ===');
  ev(`setH([[35,100],[28,105],[21,110],[14,115],[7,120],[4,120],[2,125]]); workoutHistoryExpanded = false; renderWorkoutHistory()`);
  const sessions = () => ($('workoutHistoryList').textContent.match(/⏱/g) || []).length;
  check('with 7 workouts only the latest 4 are shown', sessions() === 4);
  check('a button offers the other 3', /Show 3 more/.test($('workoutHistoryMoreBtn').textContent));
  click($('workoutHistoryMoreBtn'));
  check('tapping it shows all 7 and offers "Show fewer"', sessions() === 7 && /Show fewer/.test($('workoutHistoryMoreBtn').textContent));
  click($('workoutHistoryMoreBtn'));
  check('and tapping again goes back to 4', sessions() === 4);
  ev(`setH([[7,100],[4,105],[2,110]]); renderWorkoutHistory()`);
  check('with 4 or fewer workouts there is no button', !$('workoutHistoryMoreBtn') && sessions() === 3);
  console.log('=== 3. PR lifts are marked in history ===');
  ev(`setH([[21,100],[14,110],[7,110],[2,120]]); workoutHistoryExpanded = true; renderWorkoutHistory()`);
  const marks = doc.querySelectorAll('#workoutHistoryList .hist-pr').length;
  check('a 🏆 sits on the lifts that set a record that day (110 and 120 beat the earlier best; the first session and the tie do not)', marks === 2);
  check('the session header still says how many PRs', /1 PR/.test($('workoutHistoryList').textContent));

  console.log('=== 4. Activity History: lifting is one line ===');
  ev(`setH([[3,100]]); entries.push({ date: ds(1), ex: [{ type: 'Walk', ts: Date.now(), min: 20, dist: 1.1 }] }); entries.sort((a, b) => a.date.localeCompare(b.date)); renderActivityHistory()`);
  const at = $('activityHistoryList').textContent.replace(/\s+/g, ' ');
  check('the lifting row says "Push day · 2 exercises" and does not dump every set', /Push day · 2 exercises/.test(at) && !/×10\//.test(at) && !/Chest Press/.test(at));
  check('walks still show distance and pace', /20 min/.test(at) && /1\.1 mi/.test(at));
  check('tapping a row still jumps to that date', (() => { const row = doc.querySelector('[data-activity-date]'); click(row); return $('exDate').value === row.dataset.activityDate; })());

  console.log('=== 5. Today\'s Workout header ===');
  ev(`setH([[21,100,40],[14,110,46],[7,120,52]]); workoutStartedAt = null; pplDayOverride = 'Push'; renderWorkoutPlan()`);
  const hero = $('todayWorkout') ? $('todayWorkout').textContent.replace(/\s+/g, ' ') : '';
  check('shows the day, how many exercises, and a typical duration (median of 40/46/52 = about 46 min)', /^\s*Push/.test(hero) && /[3-9] exercises/.test(hero) && /about 46 min/.test(hero));
  check('shows last time: date and volume', /Last time: .* · [\d,]+ lb/.test(hero));
  check('the Start button sits with it and is the main button', !!$('startPlanBtn') && $('startPlanBtn').classList.contains('btn-primary') && $('todayWorkout').nextElementSibling === $('startPlanBtn'));
  ev(`entries = []; renderWorkoutPlan()`);
  check('with no history it says this sets your baseline, and no invented minutes', /First time on this day/.test($('todayWorkout').textContent) && !/about/.test($('todayWorkout').textContent));
  ev(`setH([[21,100,40]]); workoutStartedAt = Date.now(); renderWorkoutPlan()`);
  check('once a workout is running the header is gone (it has done its job)', !$('todayWorkout') && !$('startPlanBtn'));
  ev(`workoutStartedAt = null`);

  console.log('=== 6. weekly volume compares with last week ===');
  ev(`setH([[40,100],[33,100],[26,100],[19,100],[12,100],[8,110],[1,120]]); renderWorkoutVolumeSparkline()`);
  const sp = $('workoutVolumeSparkline'); const lastWk = ev(`Math.round(weeklyVolumeHistory(9)[1].volume).toLocaleString()`);
  check('says "so far this week" and gives last week\'s number', /lb so far this week/.test(sp.textContent) && sp.textContent.includes(`last week ${lastWk}`));
  check('the old arrow percentage (which compared two other weeks) is gone', !/[↑↓]\d+%/.test(sp.textContent));

  console.log('=== 7. PR chip is quiet unless it matters ===');
  ev(`setH([[21,130],[14,130],[7,130]]); workoutSessionState = {}; renderWorkoutPlan()`);
  const hint = i => doc.querySelector(`.set-row[data-exercise="${CP}"][data-set-idx="${i}"] .pr-proximity-hint`);
  const setW = (i, v) => { const inp = doc.querySelector(`.set-row[data-exercise="${CP}"][data-set-idx="${i}"] .set-weight-input`); inp.value = v; inp.dispatchEvent(new w.Event('input', { bubbles: true })); };
  setW(0, '130'); check('matching your best (every pre-filled row) shows nothing', hint(0).style.display === 'none');
  setW(0, '125'); check('5 lb below shows "5 lb to PR"', hint(0).style.display !== 'none' && hint(0).textContent === '5 lb to PR');
  setW(0, '100'); check('30 lb below shows nothing', hint(0).style.display === 'none');
  setW(0, '135'); check('above your best shows PR pace', hint(0).style.display !== 'none' && /PR pace/.test(hint(0).textContent));
  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
