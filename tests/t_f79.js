// Nov 1 review of Home / History / Charts / Badges / Settings: positive "lost" numbers, singular units,
// no blank strip under folded cards, gym check-in box gone, no "0m", Labs counts the A1C, Today card
// doesn't repeat the dose, This week shows avg protein (streak has its own card), Roadmap inside Milestone
// Progress, no "+ Log Today's Reading", History log first, Charts Body first, leaderboard pitch last until
// you're in a group, Settings in 4 groups.
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
  const shown = el => { let e = el; while (e && e !== doc.body) { if (w.getComputedStyle(e).display === 'none') return false; e = e.parentElement; } return !!el; };
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  const d = n => ev(`lbAddDays(todayStr(), ${-n})`);
  const txt = el => el.textContent.replace(/\s+/g, ' ').trim();

  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); baselineWeight = 242; goalWeight = 197; labs = []; entries = [];
      for (let i = 20; i >= 0; i--) { const dt = lbAddDays(todayStr(), -i); entries.push({ date: dt, weight: String(220 - (20 - i) * 0.5), protein: String(100 + i), steps: '7000' }); }
      entries.push({ date: lbAddDays(todayStr(), -40), weight: '230' });
      entries.sort((a, b) => a.date.localeCompare(b.date)); renderAll();`);
  await sleep(60);

  console.log('=== 1. no backwards minus signs ===');
  check('Total Lost shows a positive amount lost ("32.0 lbs")', txt($('scChange')) === '32.0 lbs');
  check('its goal line has no minus sign', !/[−-]\s*\d/.test(txt($('scChangeSub'))));
  ev(`baselineWeight = 200; renderAll();`); await sleep(20);
  check('a gain since the start still shows with a plus', txt($('scChange')) === '+10.0 lbs');
  ev(`baselineWeight = 242; renderAll();`); await sleep(20);
  check('"ahead of target" never has a minus sign', !/—\s*[−-]/.test(txt($('msSub'))));

  console.log('=== 2. singular units ===');
  check('one left reads singular', ev(`unitForCount('combos', 1)`) === 'combo' && ev(`unitForCount('exercises', 1)`) === 'exercise' && ev(`unitForCount('days', '1')`) === 'day' && ev(`unitForCount('activities', 1)`) === 'activity' && ev(`unitForCount('lbs', 1)`) === 'lb' && ev(`unitForCount('lbs of volume', 1)`) === 'lb of volume' && ev(`unitForCount('PRs', 1)`) === 'PR');
  check('more than one stays plural', ev(`unitForCount('combos', 2)`) === 'combos' && ev(`unitForCount('lbs', 6.1)`) === 'lbs');
  ev(`foodCombos = []; renderAll(); showView('badges');`); await sleep(40);
  const allText = (() => { const c = doc.body.cloneNode(true); c.querySelectorAll('script,style').forEach(x => x.remove()); return c.textContent; })();
  check('nowhere says "1 more combos", "1 more days" or "1 more exercises"', !/\b1 more (combos|days|exercises|workouts|weeks)\b/.test(allText));

  console.log('=== 3. folded cards have no blank strip ===');
  const css = [...doc.querySelectorAll('style')].map(s => s.textContent).join('\n');
  check('a CSS rule drops the title margin when everything under it is hidden', /\.form-section-title:has\(\+ \[style\*="display: none"\]:last-child\)/.test(css));

  console.log('=== 4. gym check-in box ===');
  ev(`showView('dashboard')`); await sleep(20);
  check('the Weekly Goal no longer shows "Count gym check-ins too"', !shown($('goalGymRow')) && !!$('goalGym'));

  console.log('=== 5. no "0m" ===');
  ev(`entries.push({ date: todayStr(), ex: [{ type: 'Strength', planDay: 'Push', sets: { 'Bench Press': [{ weight: 100, reps: 10 }] } }] }); entries.sort((a, b) => a.date.localeCompare(b.date)); renderWorkoutHistory();`); await sleep(20);
  check('a workout with no time logged shows no "⏱ 0m"', !/⏱\s*0m/.test($('workoutHistoryList').textContent) && /100 lb/.test($('workoutHistoryList').textContent));
  ev(`entries = entries.filter(e => !(e.date === todayStr() && e.ex)); entries.push({ date: todayStr(), ex: [{ type: 'Strength', min: 45, planDay: 'Push', sets: { 'Bench Press': [{ weight: 100, reps: 10 }] } }] }); entries.sort((a, b) => a.date.localeCompare(b.date)); renderWorkoutHistory();`); await sleep(20);
  check('with a time it still shows "⏱ 45m"', /⏱\s*45m/.test($('workoutHistoryList').textContent));

  console.log('=== 6. Labs card ===');
  ev(`labs = [{ date: '${d(30)}', a1c: '6.1' }]; renderAll();`); await sleep(20);
  check('only an A1C logged: shows "A1C 6.1%", "1 tracked" (not "All clear · 0 tracked")', txt($('scLabs')) === 'A1C 6.1%' && /^1 tracked/.test(txt($('scLabsSub'))));
  ev(`labs = [{ date: '${d(30)}', a1c: '5.4', ldl: '90' }]; renderAll();`); await sleep(20);
  check('A1C plus a panel value: "All clear", 2 tracked', txt($('scLabs')) === 'All clear' && /^2 tracked/.test(txt($('scLabsSub'))));
  ev(`labs = [{ date: '${d(30)}', notes: 'x' }]; renderAll();`); await sleep(20);
  check('a lab day with no values: no "All clear"', txt($('scLabs')) !== 'All clear' && /^0 tracked/.test(txt($('scLabsSub'))));

  console.log('=== 7. Home ===');
  ev(`todayDoseStatus = () => ({ kind: 'upcoming', val: 'in 6 days' }); computeNextDoseCountdown = () => ({ daysUntil: 6 }); renderTodayCard(); renderDueToday();`); await sleep(20);
  check('the Today card has the Dose tile', /in 6 days/.test(txt($('todayChips'))));
  check('and "Coming up" does not repeat "6 days until your next dose"', !/until your next dose/.test($('dueTodayList') ? $('dueTodayList').textContent : ''));
  ev(`todayDoseStatus = () => null; renderDueToday();`); await sleep(20);
  check('with no Dose tile, Coming up still gives the countdown', /6 days until your next dose/.test($('dueTodayList').textContent));
  ev(`renderAll()`); await sleep(20);
  const recap = txt($('weeklyRecapBody'));
  check('This week: average protein instead of the streak (the streak keeps its own card)', /Avg protein/.test(recap) && !/Day Streak/.test(recap) && /\d+ g/.test(recap));
  const prog = doc.querySelector('[data-card-key="milestoneProgress"]'), road = doc.querySelector('[data-card-key="milestoneRoadmap"]');
  check('the Roadmap sits inside the Milestone Progress card (one card)', !!road && prog.contains(road) && !road.classList.contains('timeline-card'));
  check('it still opens and closes', (() => { click($('msRoadmapHead')); const a = $('msRoadmap').style.display !== 'none'; click($('msRoadmapHead')); return a && $('msRoadmap').style.display === 'none'; })());
  ev(`hideCard('milestoneRoadmap')`); await sleep(20);
  check('hiding just the Roadmap leaves Progress showing', !shown(road) && shown(prog));
  ev(`showCard('milestoneRoadmap')`); await sleep(20);
  check('"+ Log Today\'s Reading" is gone', !shown($('quickLogBtn')));

  console.log('=== 8. History: your log first ===');
  const hk = [...$('view-history').children];
  const at = id => hk.findIndex(c => c.id === id || c.querySelector('#' + id));
  check('highlights, search and your log come before Consistency and Workout History', at('historyHighlights') === 0 && at('historyList') < at('consistencyHeatmap') && at('consistencyHeatmap') < at('workoutHistoryCard'));

  console.log('=== 9. Charts: Body first ===');
  check('chart sections in order Body, Treatment, Nutrition, Activity, Recovery, Labs, Compare, Weekly summary', ev(`CHART_SECTIONS.map(s => s.name).join()`) === 'Body,Treatment,Nutrition,Activity,Recovery,Labs,Compare,Weekly summary');

  console.log('=== 10. Badges: leaderboard ===');
  ev(`lbConfig = null; renderLeaderboard();`); await sleep(20);
  const bk = () => [...$('view-badges').children].map(c => c.id).filter(Boolean);
  check('not in a group: the sign-up pitch is after All badges', bk().indexOf('leaderboardCard') === bk().indexOf('badgeSectionsCard') + 1);
  ev(`lbConfig = { code: 'ABC123', memberId: 'm1', sharing: true }; lbMembers = []; lbCheers = []; renderLeaderboard();`); await sleep(20);
  check('in a group: the board leads the tab again', bk().indexOf('leaderboardCard') === bk().indexOf('milestoneCelebration') + 1);
  ev(`lbConfig = null; renderLeaderboard();`); await sleep(20);

  console.log('=== 11. Settings in 4 groups ===');
  const groups = [...doc.querySelectorAll('#view-settings > .settings-group')];
  check('4 groups: You & goals, App & screens, Data & backup, Connections', groups.map(g => g.dataset.group).join() === 'You & goals,App & screens,Data & backup,Connections');
  const titlesIn = g => [...g.querySelectorAll('.settings-title')].map(t => t.firstChild.textContent.trim());
  check('all 14 sections are inside a group', groups.reduce((n, g) => n + titlesIn(g).length, 0) === 14 && doc.querySelectorAll('#view-settings > .settings-section .settings-title').length === 0);
  check('Data & backup holds Your Data, Export, Backup, Doctor Visit, Print', titlesIn(groups[2]).join() === 'Your Data,Data Export,Full Backup,Doctor Visit,Print');
  check('Save Changes stays last', [...$('view-settings').children].filter(c => c.classList.contains('settings-group') || c.classList.contains('settings-section')).pop().classList.contains('settings-section'));
  ev(`showView('settings')`); await sleep(20);
  const appMode = [...doc.querySelectorAll('.settings-title')].find(t => /App Mode/.test(t.textContent));
  click(appMode); await sleep(20);
  check('a section inside a group still opens', shown($('appModeRow')));
  click(appMode);
  ev(`appMode = 'exercise'; applyAppMode();`); await sleep(20);
  check('Workouts-only mode keeps the groups that still have something in them', shown(groups[1]) && shown(groups[2]));
  ev(`appMode = 'full'; applyAppMode();`);

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
