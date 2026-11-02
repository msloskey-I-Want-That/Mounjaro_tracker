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
  const SYNC = 'zz-test-sync-id-0123456789abcdef';
  ev(`syncId = '${SYNC}'; window.__writes = []; window.__setDocImpl = (r, d, o) => { window.__writes.push({ d, o }); return Promise.resolve(); }; window.ds = n => lbAddDays(todayStr(), -n);`);

  console.log('=== 1. values that are not usable numbers are ignored on read ===');
  ev(`window.testEntries = [{ date: ds(2), steps: '8200', restHR: '61', sleepHrs: 'Core', hrv: '41' }, { date: ds(1), steps: '99999999', sleepHrs: '7.4', activeCal: 'abc', distanceMi: '2.5' }, { date: ds(0), steps: '', restHR: '', weight: '195' }]; sanitizeHealthEntries(testEntries)`);
  const te = ev('testEntries');
  check('text where a number belongs (sleepHrs "Core") is dropped, good fields stay', te[0].sleepHrs === undefined && te[0].steps === '8200' && te[0].restHR === '61' && te[0].hrv === '41');
  check('out-of-range (steps 99,999,999) and non-numeric (activeCal "abc") are dropped, good ones stay', te[1].steps === undefined && te[1].activeCal === undefined && te[1].sleepHrs === '7.4' && te[1].distanceMi === '2.5');
  check('empty strings and non-health fields are left alone', te[2].steps === '' && te[2].weight === '195');
  check('everything ignored is remembered for Settings (3 values)', ev('healthIgnored.length') === 3 && ev('healthIgnored.map(x => x.field).sort().join()') === 'activeCal,sleepHrs,steps');
  check('the loader uses it: bad health values never reach the screens (entriesFromDocs runs sanitizeHealthEntries)', /entries = entriesFromDocs\(snap\.docs\)/.test(fs.readFileSync('/home/claude/live_five.html', 'utf-8')) && /return sanitizeHealthEntries\(out\)/.test(fs.readFileSync('/home/claude/live_five.html', 'utf-8')));

  console.log('=== 2. the URL path now stamps "last synced" too ===');
  ev(`pendingHealthSync = { steps: '6000' }`); await ev(`applyPendingHealthSync()`); await sleep(30);
  const wr = ev('window.__writes').pop();
  check('the write carries healthSyncedAt as an ISO time, within the last few seconds', !!wr && /^\d{4}-\d\d-\d\dT/.test(wr.d.healthSyncedAt) && Math.abs(Date.now() - Date.parse(wr.d.healthSyncedAt)) < 5000 && wr.d.steps === '6000' && wr.o.merge === true);

  console.log('=== 3. last synced: how it reads ===');
  const at = (hoursAgo) => new Date(Date.now() - hoursAgo * 3600e3).toISOString();
  const atToday = (hoursAgo) => new Date(Math.max(Date.now() - hoursAgo * 3600e3, new Date(ev('todayStr()') + 'T00:00:00').getTime() + 60000)).toISOString(); // stays inside today even when the test runs just after midnight
  ev(`entries = [{ date: ds(0), healthSyncedAt: '${atToday(1)}' }]`);
  check('a recent sync reads "today 8:05 AM" style', /^today \d{1,2}:\d\d (AM|PM)$/.test(ev('healthSyncWhen(lastHealthSyncAt())')));
  ev(`entries = [{ date: ds(1), healthSyncedAt: '${new Date(new Date(ev('todayStr()') + 'T00:00:00').getTime() - 14 * 3600e3).toISOString()}' }]`);
  check('yesterday reads "yesterday …"', /^yesterday /.test(ev('healthSyncWhen(lastHealthSyncAt())')));
  ev(`entries = [{ date: ds(3), healthSyncedAt: '${at(24 * 3 + 2)}' }, { date: ds(5), healthSyncedAt: '${at(24 * 5)}' }]`);
  check('it uses the most recent one across all days', Math.abs(ev('lastHealthSyncAt()') - Date.parse(at(24 * 3 + 2))) < 2000 && /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) /.test(ev('healthSyncWhen(lastHealthSyncAt())')));

  console.log('=== 4. a gentle nudge only when it has gone quiet ===');
  const items = () => ev(`computeDueTodayItems().filter(i => i.icon === '📱').map(i => i.text)`);
  ev(`entries = [{ date: ds(0), healthSyncedAt: '${at(10)}' }]`); check('synced 10 hours ago: no nudge', items().length === 0);
  ev(`entries = [{ date: ds(2), healthSyncedAt: '${at(40)}' }]`); check('synced 40 hours ago: "Apple Health last synced …" shows under Coming up', items().length === 1 && /^Apple Health last synced /.test(items()[0]));
  ev(`entries = [{ date: ds(0), steps: '5000' }]`); check('never synced from the iPhone (typed in by hand): no nagging', items().length === 0);
  ev(`entries = [{ date: ds(2), healthSyncedAt: '${at(40)}' }]; renderDueToday()`); check('and it appears in the Today card list', /Apple Health last synced/.test($('dueTodayList').textContent));

  console.log('=== 5. the Apple Health card says when ===');
  ev(`entries = [{ date: ds(0), healthSyncedAt: '${atToday(2)}' }]; renderExList()`);
  check('the one-line summary with no numbers yet says "last synced today …"', /^last synced today /.test(doc.querySelector('#appleHealthCard .ah-summary').textContent));
  check('and the card has a "Last synced from your iPhone" line inside', /Last synced from your iPhone: today /.test(doc.querySelector('#appleHealthCard .ah-synced').textContent));
  ev(`entries = []; renderExList()`);
  check('never synced: it says so and points to the setup sheet', /not synced yet/.test(doc.querySelector('#appleHealthCard .ah-summary').textContent) && /silent-sync setup sheet/.test(doc.querySelector('#appleHealthCard .ah-synced').textContent));

  console.log('=== 6. the setup sheet ===');
  const sheet = ev('buildHealthSetupSheet()');
  check('it has the web address for your tracker\'s inbox (one fixed address, nothing to fill in)', sheet.includes(`https://firestore.googleapis.com/v1/projects/`) && /\/meta\/healthInbox\?key=/.test(sheet) && !/FIELD/.test(sheet));
  check('and the message, with a capital word to replace for each number', sheet.includes('"steps":{"stringValue":"STEPS"}') && sheet.includes('"healthSyncedAt":{"stringValue":"NOW"}'));
  check('it explains every word, with the allowed range', ['STEPS', 'RESTINGHR', 'SLEEPHOURS', 'EXERCISEMIN', 'SLEEPSCORE', 'ACTIVECAL', 'MILES', 'HRV', 'NOW', 'DATE'].every(x => sheet.includes(x)) && /allowed 0-100000/.test(sheet));
  check('it says a blank is skipped (never erases a number), and warns about locked phones', /simply skipped, so it never erases/.test(sheet) && /UNLOCKED/.test(sheet));
  let copied = null; Object.defineProperty(w.navigator, 'clipboard', { value: { writeText: async t => { copied = t; } }, configurable: true });
  click($('copyHealthSetupBtn')); await sleep(60);
  check('the button copies the sheet to the clipboard and says so', copied === sheet && /Copied\. Paste it into Notes/.test($('healthSetupStatus').textContent));
  check('but your sync ID is never shown on screen', !doc.body.textContent.includes(SYNC));

  console.log('=== 7. the Settings status ===');
  ev(`entries = [{ date: ds(0), healthSyncedAt: '${atToday(3)}', steps: '5000' }]; healthIgnored = [{ date: ds(1), field: 'sleepHrs', value: 'Core' }]; renderHealthSyncStatus()`);
  const st = $('healthSetupStatus').textContent;
  check('it shows the last sync time', /Last sync from your iPhone: today /.test(st));
  check('and any ignored values, naming the field and what came through', /Ignored 1 value/.test(st) && /sleepHrs on .* \("Core"\)/.test(st));
  ev(`entries = []; healthIgnored = []; renderHealthSyncStatus()`);
  check('with nothing yet, it says no silent sync has arrived', /No silent sync received yet/.test($('healthSetupStatus').textContent));
  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
