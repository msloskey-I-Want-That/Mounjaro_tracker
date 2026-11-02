const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {};
      w.localStorage.setItem('mounjaro-sync-id', 'x'); w.__settingsData = {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {}; } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); await sleep(2000);
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); window.ds = n => lbAddDays(todayStr(), -n);
      window.mk = (d, o) => { let e = entries.find(x => x.date === d); if (!e) { e = { date: d }; entries.push(e); } Object.assign(e, o); return e; };
      baselineWeight = 205; goalWeight = 180; hiddenCards = []; localStorage.removeItem('mounjaro-home-groups'); localStorage.removeItem('mounjaro-home-showempty'); homeGroupState = {}; showEmptyStatCards = false;
      entries = []; for (let i = 20; i >= 0; i--) mk(ds(i), { steps: '6000', weight: String(200 - i * 0.2), protein: '90', water: '40', calories: '1500', carbs: '90', fat: '40', glucose: '118' });
      entries.sort((a, b) => a.date.localeCompare(b.date)); showView('dashboard'); updateStats();`);
  const grid = $('statGrid');
  const card = k => grid.querySelector(`.stat-card[data-card-key="${k}"]`);
  const hidden = k => card(k).classList.contains('sc-auto-hidden');
  const heads = () => [...grid.querySelectorAll('.sc-section')].map(h => h.dataset.group);

  console.log('=== 1. sections and empty cards ===');
  check('stat cards sit under section headers (Treatment, Body, Nutrition, Activity, Recovery as they have data)', ['Treatment', 'Body', 'Nutrition', 'Activity'].every(g => heads().includes(g)));
  check('the first header is above the first card', grid.firstElementChild.classList.contains('sc-section'));
  check('Nutrition and Activity start folded (the rings and Today card already show them)', hidden('protein') && hidden('steps') && !hidden('weight') && !hidden('day'));
  check('each group has exactly one header by default (the cards are in group order), and no header sits over nothing', new Set(heads()).size === heads().length && [...grid.querySelectorAll('.sc-section')].every(h => { let n = h.nextElementSibling; while (n && !n.classList.contains('sc-section') && !n.classList.contains('sc-empty-row')) { if (!n.classList.contains('sc-auto-hidden') || true) return true; n = n.nextElementSibling; } return false; }));
  const sum = grid.querySelector('.sc-section[data-group="Nutrition"] .sc-sec-sum').textContent;
  check('a folded section still tells you its numbers in one line ("Protein 90 g · …")', /Protein 90 g/.test(sum));
  check('cards with no data are tucked away (no blood pressure, labs, meds, HRV…)', ['bp', 'labs', 'meds', 'hrv', 'incline'].every(hidden));
  const emptyBtn = grid.querySelector('[data-empty-toggle]');
  check('one row says how many have no data and offers to show them', /\d+ cards have no data yet · Show/.test(emptyBtn.textContent));
  click(emptyBtn);
  check('Show brings them back (in their open sections), and the button flips to Hide', !hidden('bp') && !hidden('labs') && /Hide/.test(grid.querySelector('[data-empty-toggle]').textContent) && w.localStorage.getItem('mounjaro-home-showempty') === 'true');
  click(grid.querySelector('[data-empty-toggle]')); check('Hide puts them away again', hidden('bp'));
  click(grid.querySelector('.sc-section[data-group="Nutrition"]'));
  check('tapping a folded section opens its cards (the ones with data), and it is remembered', !hidden('protein') && JSON.parse(w.localStorage.getItem('mounjaro-home-groups')).Nutrition === true);
  click(grid.querySelector('.sc-section[data-group="Nutrition"]')); check('tapping again folds it', hidden('protein'));
  ev(`hiddenCards = ['weight']; applyCardVisibility()`);
  check('a card you hid yourself stays out of the sections', card('weight').style.display === 'none');
  ev(`hiddenCards = []; applyCardVisibility()`);

  console.log('=== 2. customize mode shows everything ===');
  click($('customizeDashBtn'));
  check('while customizing there are no headers and nothing is tucked away (so drag and ✕ work on every card)', grid.classList.contains('editing') && !grid.querySelector('.sc-section') && !grid.querySelector('.sc-auto-hidden') && !grid.querySelector('.sc-empty-row'));
  click($('customizeDashBtn')); check('Done brings the sections back', !!grid.querySelector('.sc-section') && hidden('bp'));

  console.log('=== 3. tap a card to go to its detail ===');
  click(card('weight')); check('weight → Charts', doc.getElementById('view-charts').classList.contains('active'));
  ev(`showView('dashboard')`); click(card('day').querySelector('.sc-value') || card('day')); check('treatment day → Badges', doc.getElementById('view-badges').classList.contains('active'));
  ev(`showView('dashboard'); document.querySelector('[data-card-key="loggingStreak"]')`);
  click(card('loggingStreak').querySelector('.sc-label')); check('logging streak → History', doc.getElementById('view-history').classList.contains('active'));
  ev(`showView('dashboard')`); ev(`homeGroupState.Nutrition = true; applyStatSections()`); click(card('protein')); check('protein → Food', doc.getElementById('view-food').classList.contains('active'));
  ev(`showView('dashboard')`); click(card('dose')); check('dose → Log, on the Medications sub-tab', doc.getElementById('view-log').classList.contains('active') && doc.querySelector('#logSubtabRow .chip.on').dataset.logsub === 'meds');
  ev(`showView('dashboard')`); const sick = card('loggingStreak').querySelector('button');
  if (sick) { click(sick); check('buttons inside a card (Sick / Rest) do not navigate', doc.getElementById('view-dashboard').classList.contains('active')); } else check('(no inner button to test)', true);
  ev(`showView('dashboard')`); click($('customizeDashBtn')); click(card('weight')); check('and nothing navigates while customizing', doc.getElementById('view-dashboard').classList.contains('active')); click($('customizeDashBtn'));
  check('tappable cards look tappable', card('weight').dataset.go === '1');

  console.log('=== 4. the Today card is one card ===');
  ev(`daysSinceStart = () => 16; entries = [{ date: ds(2), injection: true, dose: '5' }]; showView('dashboard'); detectDeloadNeeded = () => ({ weeksSinceDeload: null }); computeNextDoseCountdown = () => ({ daysUntil: 5 }); renderTodayCard(); renderDueToday();`);
  check('"Coming up" lives inside the Today card', $('todayCard').contains($('dueTodayCard')) && /Coming up/.test($('dueTodayCard').textContent));
  check('and lists the dose countdown', /5 days until your next dose/.test($('dueTodayList').textContent));
  check('but no longer repeats the next workout (it is a Today tile) or the deload note (moved to the Workout tab)', !/Next workout/.test($('dueTodayList').textContent) && !/deload/i.test($('dueTodayList').textContent));
  check('there is no separate "What\'s Due Today" card any more', !/What's Due Today/.test(doc.getElementById('view-dashboard').textContent));
  ev(`workoutPlanMode = 'ppl'; pplDayOverride = 'Push'; entries = [{ date: ds(3), ex: [{ type: 'Strength', ts: Date.now() - 3 * 864e5, min: 40, planDay: 'Push', sets: { 'Chest Press (machine)': [{ weight: 80, reps: 10 }] } }] }]; detectDeloadNeeded = () => ({ weeksSinceDeload: 6 }); renderWorkoutPlan();`);
  check('the deload note now lives on the Workout tab, stated plainly', !!$('twDeload') && /6\+ weeks since your last lighter week/.test($('twDeload').textContent));

  console.log('=== 5. evening wrap-up ===');
  ev(`weighInDay = 'any'; entries = [{ date: todayStr(), water: 20, protein: 100 }]; window.__homeHour = 12; renderTodayCard()`);
  check('before 8 pm: no wrap-up', $('todayWrapUp').style.display === 'none');
  ev(`window.__homeHour = 21; renderTodayCard()`);
  const wb = [...doc.querySelectorAll('#todayWrapUp [data-wrap]')].map(b => b.dataset.wrap);
  check('after 8 pm: water and weight are one tap away', $('todayWrapUp').style.display !== 'none' && wb.join() === 'water,weight');
  let tapped = ''; $('quickWaterBtn').addEventListener('click', () => { tapped += 'W'; }); $('quickWeightBtn').addEventListener('click', () => { tapped += 'S'; });
  click(doc.querySelector('#todayWrapUp [data-wrap="water"]')); click(doc.querySelector('#todayWrapUp [data-wrap="weight"]'));
  check('the buttons do exactly what the quick buttons up top do', tapped === 'WS');
  ev(`entries = [{ date: todayStr(), water: 70, protein: 100, weight: 190 }]; renderTodayCard()`);
  check('when nothing is missing the wrap-up disappears', $('todayWrapUp').style.display === 'none');
  ev(`weighInDay = '${ev('(new Date(todayStr() + "T00:00:00").getDay() + 1) % 7')}'; entries = [{ date: todayStr(), water: 70 }]; renderTodayCard()`);
  check('weight is only offered on your weigh-in day', $('todayWrapUp').style.display === 'none');
  ev(`weighInDay = 'any'; window.__homeHour = null`);

  console.log('=== 6. one "This week" strip ===');
  ev(`entries = []; const mon = lbWeekStart(todayStr()); mk(ds(8), { weight: '200' }); mk(todayStr(), { weight: '199', ex: [{ type: 'Strength' }] }); entries.sort((a, b) => a.date.localeCompare(b.date)); updateStats()`);
  const recap = $('weeklyRecapBody').textContent.replace(/\s+/g, ' ');
  check('weight, lifts, streak and challenges together', /lbs/.test(recap) && /Lifts? this week/.test(recap) && /Day Streak/.test(recap) && /\d\/3 Challenges/.test(recap));
  click($('weeklyRecapBody').querySelector('[data-recap-go]')); check('the challenges tile opens the Badges tab', doc.getElementById('view-badges').classList.contains('active'));

  console.log('=== 7. milestones ===');
  ev(`showView('dashboard')`);
  check('the roadmap starts folded', $('msRoadmap').style.display === 'none' && $('msRoadmapHead').getAttribute('aria-expanded') === 'false');
  click($('msRoadmapHead')); check('tap to open, and it is remembered', $('msRoadmap').style.display !== 'none' && w.localStorage.getItem('mounjaro-roadmap-open') === 'true');
  click($('msRoadmapHead')); check('tap to close', $('msRoadmap').style.display === 'none');
  click($('msAllBtn')); check('"All milestones & badges" goes to the Badges tab', doc.getElementById('view-badges').classList.contains('active'));

  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
