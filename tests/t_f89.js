// Nov 14 — the "syncs automatically once your Shortcut is set up" notes are gone from the Apple Health tiles (they only took up space).
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; w.__noPreviewList = true; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, $ = id => doc.getElementById(id);
  await sleep(200);
  const card = $('appleHealthCard');
  check('the Apple Health card is still there', !!card);
  check('no "syncs automatically" note anywhere on the card', !/syncs automatically/i.test(card.textContent));
  check('no "once your Shortcut is set up" text anywhere in the app', !/once your Shortcut is set up/i.test(doc.body.textContent));
  const ids = ['Steps', 'Sleep', 'SleepScore', 'ActiveCal', 'Distance', 'Hrv'];
  check('all six tiles still have their value and pencil', ids.every(i => !!$('exView' + i)) && card.querySelectorAll('[title="Save"]').length >= 6);
  w.eval('updateAppleHealthSummary()');
  check('the "Last synced from your iPhone" line is still shown', /synced/i.test((card.querySelector('.ah-synced') || {}).textContent || ''));
  check('no script errors', errors.length === 0);
  console.log(fails ? 'SOME FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
}, 2500);
