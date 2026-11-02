const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function boot(extra = {}) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {};
      Object.entries(extra.storage || {}).forEach(([k, v]) => w.localStorage.setItem(k, v)); if (extra.settings) w.__settingsData = extra.settings; } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); return dom;
}
(async () => {
  const dom = boot({ storage: { 'mounjaro-sync-id': 'test-sync-id' }, settings: {} }); await sleep(2000);
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ev(`syncId = 'test-sync-id'; window.__calls = []; window.__setDocImpl = (r, d, o) => { window.__calls.push({ path: r._path, d, o }); return Promise.resolve(); };`);
  const today = ev('todayStr()'); const add = n => ev(`lbAddDays('${today}', ${n})`);
  const render = () => { ev('renderTodayCard()'); };
  const chip = k => doc.querySelector(`[data-today-chip="${k}"]`);
  const val = k => chip(k) && chip(k).querySelector('.today-chip-val').textContent;

  console.log('=== 1. the card is part of Home ===');
  const card = $('todayCard');
  check('Today card exists, tagged as a hideable Home card', !!card && card.dataset.cardKey === 'todaySummary' && card.classList.contains('home-extra-card'));
  check('it sits above the injection banner (top of Home)', !!(card.compareDocumentPosition($('injBanner')) & w.Node.DOCUMENT_POSITION_FOLLOWING));
  check('it is in the card catalog so it can be brought back', ev(`CARD_CATALOG.todaySummary.label`) === 'Today');

  console.log('=== 2. a day with nothing logged ===');
  w.HTMLElement.prototype.scrollIntoView = () => {};
  ev(`daysSinceStart = () => 3; entries = [{ date: lbAddDays(todayStr(), -3), injection: true }];`); render();
  check('workout tile names the next plan day ("Next: Day A")', /^Next: /.test(val('workout')));
  check('protein and water are no longer tiles (they are the rings right below)', !chip('protein') && !chip('water'));
  check('headline is the briefing of what is still to go, no advice', /^To go: .+ workout · 100 g protein · 64 oz water$/.test($('todayHeadline').textContent));
  check('dose chip says in 4 days (day 3 of the cycle, injection already logged)', val('dose') === 'in 4 days');

  console.log('=== 3. dose states ===');
  ev(`daysSinceStart = () => 14; entries = [];`); render();
  check('injection day, not logged: Due today, urgent, headline prompts to log', val('dose') === 'Due today' && chip('dose').classList.contains('urgent') && /log your dose/.test($('todayHeadline').textContent));
  ev(`daysSinceStart = () => 16;`); render();
  check('two days late', val('dose') === '2 days late' && /waiting to be logged/.test($('todayHeadline').textContent));
  ev(`daysSinceStart = () => 19;`); render();
  check('past the window: Missed window, no nagging headline', val('dose') === 'Missed window' && !/dose/i.test($('todayHeadline').textContent));
  ev(`daysSinceStart = () => 16; entries = [{ date: lbAddDays(todayStr(), -2), injection: true }];`); render();
  check('injected this cycle mid-week: shows days until next, not urgent', /^in 5 days$/.test(val('dose')) && !chip('dose').classList.contains('urgent'));
  ev(`daysSinceStart = () => 14; entries = [{ date: todayStr(), injection: true }];`); render();
  check('injected today: Logged ✓ and counted as done', val('dose') === 'Logged ✓' && chip('dose').classList.contains('done'));
  ev(`daysSinceStart = () => -5; entries = [];`); render();
  check('before treatment starts: no dose chip', !chip('dose'));

  console.log('=== 4. everything done ===');
  ev(`daysSinceStart = () => 16; entries = [{ date: lbAddDays(todayStr(), -2), injection: true }, { date: todayStr(), protein: 112, water: 70, ex: [{ type: 'Strength', sets: [] }] }];`); render();
  check('workout Done and marked done', val('workout') === 'Done ✓' && chip('workout').classList.contains('done'));
  check('headline: All set for today', $('todayHeadline').textContent === 'All set for today ✓');
  ev(`entries[1].water = 40`); render();
  check('partway (water 40/64): the headline says what is left (24 oz water)', $('todayHeadline').textContent === 'To go: 24 oz water');

  console.log('=== 5. one definition of "workouts this week" ===');
  ev(`daysSinceStart = () => 16; const mon = lbWeekStart(todayStr()); entries = [
    { date: lbAddDays(todayStr(), -9), weight: 200 },
    { date: mon, ex: [{ type: 'Strength' }, { type: 'Walk' }] },
    { date: todayStr(), weight: 199.2, ex: [{ type: 'Walk' }] }];
    entries = entries.filter((e, i, a) => a.findIndex(x => x.date === e.date) === i).sort((a, b) => a.date.localeCompare(b.date));`); render();
  check('the Today card no longer has a week line (the This week strip owns it)', !$('todayWeek'));
  const lifts = ev('weekLiftDays()');
  check('weekLiftDays counts days with a lifting session since Monday (the walks never count)', lifts === 1);
  ev(`updateStats()`);
  check('the This week strip shows the same number, labelled "Lift(s) this week"', new RegExp(lifts + '\\s*Lifts? this week').test($('weeklyRecapBody').textContent.replace(/\s+/g, ' ')));
  ev(`entries = []`); render();
  check('no history: no errors, and the headline still says something sensible', $('todayHeadline').textContent.length > 3 && dom.errors.length === 0);

  console.log('=== 6. taps ===');
  ev(`daysSinceStart = () => 14; entries = [];`); render();
  click(chip('dose')); check('dose chip opens Log with Injection ticked', $('fInjection').checked === true && doc.getElementById('view-log').classList.contains('active'));
  let started = 0; $('quickWorkoutBtn').addEventListener('click', () => started++);
  render(); click(chip('workout')); check('workout chip starts a workout (same as Start Workout)', started === 1);

  console.log('=== 7. hiding ===');
  ev(`hiddenCards = []; hideCard('todaySummary')`); await sleep(20);
  check('hidden: card gone', card.style.display === 'none');
  ev(`updateStats()`);
  check('stays hidden after a refresh of the stats', card.style.display === 'none');
  const saved = ev('window.__calls').filter(c => c.d && 'hiddenCards' in c.d).pop();
  check('hide syncs through the settings document', !!saved && saved.d.hiddenCards.includes('todaySummary'));
  ev(`showCard('todaySummary')`); await sleep(20); ev('updateStats()');
  check('restored: card shows again', card.style.display !== 'none');
  check('no script errors throughout', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
