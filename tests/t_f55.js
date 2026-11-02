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
  const SYNC = 'sync-secret-abcdef1234567890';
  ev(`syncId = '${SYNC}'; window.__setDocImpl = () => Promise.resolve()`);

  console.log('=== 1. numbers are read strictly ===');
  const N = v => ev(`normalizeHealthNumber(${JSON.stringify(v)})`);
  check('"6,200" is 6200 (a Shortcut can format numbers with a thousands comma)', N('6,200') === 6200 && N('1,234,567') === 1234567);
  check('"7,5" is 7.5 (decimal comma)', N('7,5') === 7.5);
  check('plain numbers, padded and real numbers work', N('8200') === 8200 && N(' 7.2 ') === 7.2 && N(7.2) === 7.2);
  check('text is rejected, never half-read: "7h 12m", "6200 steps", "Core", "" are all not numbers', [N('7h 12m'), N('6200 steps'), N('Core'), N('')].every(x => Number.isNaN(x)));
  check('the validity check agrees (and still enforces the allowed range)', ev(`isValidHealthSyncValue('steps', '6,200')`) === true && ev(`isValidHealthSyncValue('sleepHrs', '7h 12m')`) === false && ev(`isValidHealthSyncValue('steps', '99,999,999')`) === false && ev(`isValidHealthSyncValue('restHR', '5')`) === false);
  const list = ev(`sanitizeHealthEntries([{ date: '2026-10-09', steps: '6,200', sleepHrs: '7h 12m', hrv: '42', weight: '190' }])`);
  check('a comma number is kept as 6200 on its way in, text is dropped and remembered', list[0].steps === '6200' && list[0].sleepHrs === undefined && list[0].hrv === '42' && list[0].weight === '190' && ev('healthIgnored.length') === 1 && ev('healthIgnored[0].field') === 'sleepHrs');

  console.log('=== 2. an entry with no date field is still an entry ===');
  const docs = [
    { id: '2026-10-08', data: () => ({ date: '2026-10-08', weight: '190' }) },
    { id: '2026-10-09', data: () => ({ steps: '6,200', healthSyncedAt: '2026-10-09T12:00:00Z' }) },   // what a Shortcut creates first: no date field
    { id: 'healthTest', data: () => ({ at: 'x' }) }
  ];
  w.__docs = docs; const got = ev(`entriesFromDocs(window.__docs)`);
  check('a document the Shortcut created (no date field) gets its date from its id, and is kept', got.length === 2 && got[1].date === '2026-10-09' && got[1].steps === '6200');
  check('documents that are not dates are ignored', !got.some(e => e.at));
  check('the entries are read in date order (by document id), not by a date field that can be missing', /orderBy\('__name__'\)/.test(html) && !/query\(entriesRef, orderBy\('date'/.test(html));
  ev(`entries = entriesFromDocs(window.__docs); renderAll()`);
  check('and the app shows it (steps 6200 from the Shortcut-made entry)', ev(`entries.find(e => e.date === '2026-10-09').steps`) === '6200');

  console.log('=== 3. the setup sheet ===');
  const sheet = ev('buildHealthSetupSheet()');
  check('it tells you to name DATE and NOW first, then paste the message and replace each capital word', /Name it DATE/.test(sheet) && /Name it NOW/.test(sheet) && /replace each CAPITAL WORD/.test(sheet));
  check('it says to send plain numbers, accepts 6,200, and never half-reads text', /plain, like 6200 or 7\.2/.test(sheet) && /6,200 is fine too/.test(sheet) && /never half-read/.test(sheet));
  check('it still has the address, both messages, every health field, and the unlocked-phone warning', sheet.includes('firestore.googleapis.com') && sheet.includes('MESSAGE (starter: steps only)') && sheet.includes('MESSAGE (all numbers)') && /UNLOCKED/.test(sheet) && ['STEPS', 'RESTINGHR', 'SLEEPHOURS', 'EXERCISEMIN', 'SLEEPSCORE', 'ACTIVECAL', 'MILES', 'HRV', 'NOW'].every(f => sheet.includes(f)));
  ev(`entries = [{ date: '2026-10-01', healthSyncedAt: new Date(Date.now() - 40 * 3600e3).toISOString() }]; renderHealthSyncStatus()`);
  check('the stale warning says how stale ("over 36 hours ago")', /over 36 hours ago/.test($('healthSetupStatus').textContent));

  console.log('=== 4. the connection test ===');
  let calls = [];
  const resp = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
  const stampOf = c => JSON.parse(c.opts.body).fields.at.stringValue;
  w.fetch = async (url, opts) => { calls.push({ url, opts: opts || {} }); if ((opts || {}).method === 'PATCH') return resp(200, {}); return resp(200, { fields: { at: { stringValue: stampOf(calls[0]) } } }); };
  click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  click($('testHealthRestBtn')); await sleep(120);
  const out = () => $('healthRestTestResult').textContent;
  check('it writes one small value with PATCH to a throwaway meta document, JSON, with the public key', calls.length === 2 && calls[0].opts.method === 'PATCH' && /\/trackers\/[^/]+\/meta\/healthTest\?updateMask\.fieldPaths=at&key=/.test(calls[0].url) && calls[0].opts.headers['Content-Type'] === 'application/json' && /^\d{4}-\d\d-\d\dT/.test(stampOf(calls[0])));
  check('it never writes into an entry (so it can not create a dateless day)', !/\/entries\//.test(calls[0].url));
  check('then reads it back', !calls[1].opts.method && /\/meta\/healthTest\?key=/.test(calls[1].url));
  check('success says you can build the Shortcut', /^✓ Your phone can write to your tracker the same way the Shortcut will/.test(out()) && !$('testHealthRestBtn').disabled);
  const tryStatus = async st => { calls = []; w.fetch = async (url, opts) => { calls.push({ url, opts: opts || {} }); return resp(st, {}); }; click($('testHealthRestBtn')); await sleep(100); return out(); };
  check('HTTP 403 explains that the database rules refuse it', /refused it \(HTTP 403\).*rules/.test(await tryStatus(403)));
  check('HTTP 400 says the address or key looks wrong', /HTTP 400.*address or key/.test(await tryStatus(400)));
  check('HTTP 429 says wait and retry', /HTTP 429.*wait a minute/.test(await tryStatus(429)));
  calls = []; w.fetch = async (url, opts) => { calls.push({ url, opts: opts || {} }); if ((opts || {}).method === 'PATCH') return resp(200, {}); return resp(200, { fields: { at: { stringValue: 'something else' } } }); };
  click($('testHealthRestBtn')); await sleep(100); check('a read-back that does not match is flagged, not called a success', /did not match/.test(out()) && !/^✓/.test(out()));
  w.fetch = async () => { throw new TypeError('Failed to fetch'); }; click($('testHealthRestBtn')); await sleep(100);
  check('no network: a plain message, and the button works again', /Couldn't reach Google \(Failed to fetch\)/.test(out()) && !$('testHealthRestBtn').disabled);
  check('your sync ID is never printed on screen', !doc.body.textContent.includes(SYNC));
  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
