// Nov 1 layout: Log tab chips on top, "Tell me about your day" + Stretch card hideable (Settings > Screens),
// Quick start folded into the Exercise card, Workout/Activity history moved to the History tab.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, ev = s => w.eval(s), $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const shown = el => { let e = el; while (e && e !== doc.body) { if (w.getComputedStyle(e).display === 'none') return false; e = e.parentElement; } return true; };
  w.__writes = []; ev(`syncId = 'x'; window.__setDocImpl = (ref, data) => { window.__writes.push(data); return Promise.resolve(); };`);

  console.log('=== Log tab ===');
  const logKids = [...$('view-log').children];
  check('Medications / Results / Daily log chips are the first thing on the Log tab', logKids[0].id === 'logSubtabRow');
  check('Quick Log and the Apple Health cards now sit inside Daily log', ['logContextCard', 'quickLogCard', 'stepsOverrideCard', 'hrvOverrideCard'].every(id => $(id).closest('#logSub-daily')));
  ev(`showView('log')`); await sleep(30);
  click(doc.querySelector('#logSubtabRow [data-logsub="meds"]')); await sleep(30);
  check('picking Medications shows medications right under the chips (no Quick Log in the way)', shown($('logSub-meds')) && !shown($('quickLogCard')));
  click(doc.querySelector('#logSubtabRow [data-logsub="daily"]')); await sleep(30);
  check('Daily log shows Quick Log and the full log', shown($('quickLogCard')) && shown($('fullLogCard')));
  check('"Tell me about your day" is hidden by default', !shown($('tellMeAboutDayCard')));

  console.log('=== Settings > Screens ===');
  const rows = $('panelPrefRows');
  check('Settings has a Screens section with Show/Hide for both', rows && rows.querySelectorAll('.panel-pref-chip').length === 4);
  click(rows.querySelector('[data-panelpref="tellMeDay"][data-val="1"]')); await sleep(40);
  check('Show brings "Tell me about your day" back', shown($('tellMeAboutDayCard')));
  check('the choice is saved to your settings (synced)', w.__writes.some(d => d.panelPrefs && d.panelPrefs.tellMeDay === true));
  click($('panelPrefRows').querySelector('[data-panelpref="tellMeDay"][data-val="0"]')); await sleep(40);
  check('Hide hides it again', !shown($('tellMeAboutDayCard')));

  console.log('=== Exercise tab ===');
  ev(`showView('exercise')`); await sleep(40);
  check('no separate Quick start card any more', !$('quickWalkCard'));
  check('Quick start lives inside the Exercise card', !!$('quickWalkBody') && !!$('quickWalkBody').closest('#exerciseActivityCard') && $('quickWalkBody').innerHTML.length > 0);
  check('Stretch & warm-up card is hidden by default', !shown($('recoveryCard')));
  click($('panelPrefRows').querySelector('[data-panelpref="stretchCard"][data-val="1"]')); await sleep(40);
  check('Settings > Screens > Show brings the Stretch card back', shown($('recoveryCard')));
  click($('panelPrefRows').querySelector('[data-panelpref="stretchCard"][data-val="0"]')); await sleep(40);
  check('Workout History and Activity History are gone from the Exercise tab', !$('workoutHistoryCard').closest('#view-exercise') && !$('activityHistoryList').closest('#view-exercise'));
  ev(`appMode = 'exercise'; panelPrefs = {}; applyAppMode();`); await sleep(30);
  check('in Workouts-only mode (Stacy) the Stretch card stays on by default', shown($('recoveryCard')) || !doc.body.classList.contains('hide-stretch'));
  ev(`appMode = 'full'; panelPrefs = {}; applyAppMode();`);

  console.log('=== History tab ===');
  ev(`entries = [{ date: todayStr(), ex: [{ type: 'Strength', min: 50, ts: Date.now(), sets: { 'Lat Pulldown': [{ weight: 95, reps: 12 }] } }, { type: 'Walk', min: 40, dist: '2', ts: Date.now() }] }];`);
  ev(`showView('history')`); await sleep(60);
  check('Workout History is on the History tab, after the muscle map', !!$('workoutHistoryCard').closest('#view-history') && $('muscleMapCard').compareDocumentPosition($('workoutHistoryCard')) & 4);
  check('Activity History is on the History tab', !!$('activityHistoryList').closest('#view-history'));
  check('opening History fills in Workout History', /Lat Pulldown|Strength|workout/i.test($('workoutHistoryList').textContent));

  console.log('=== Errors ==='); console.log(errors.length ? errors.join('\n') : '(none)');
  check('no script errors', errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
