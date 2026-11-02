const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; w.localStorage.setItem('mounjaro-sync-id', 'x'); w.__settingsData = {}; w.HTMLElement.prototype.scrollIntoView = () => {}; w.scrollTo = () => {}; } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); await sleep(2000);
  const doc = dom.window.document, w = dom.window; const ev = s => w.eval(s); const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  ev(`syncId = 'sync-secret-xyz'; window.__writes = []; window.__setDocImpl = (r, d, o) => { window.__writes.push({ r, d, o }); return Promise.resolve(); };
      entries = [{ date: '2026-10-09', steps: '1516', restHR: '50', sleepHrs: '7.34', activeCal: '306', hrv: '38', weight: '224' }, { date: '2026-10-10', steps: '5' }]; showView('history'); renderHistory();`);
  const fld = f => doc.querySelector(`#healthEditFields [data-hf="${f}"]`);

  console.log('=== the form ===');
  const card = doc.querySelector('#historyList .entry-card[data-date="2026-10-09"]');
  check('every day\'s ⋯ menu has "Edit Health numbers"', !!card.querySelector('.entry-menu .entry-health') && /Edit Health numbers/.test(card.querySelector('.entry-health').textContent));
  click(card.querySelector('.entry-more')); click(card.querySelector('.entry-health'));
  check('it opens a form titled with that day', !$('healthEditModal').classList.contains('hidden') && /Health numbers · .*Oct 9/.test($('healthEditTitle').textContent));
  check('with all eight numbers, filled in with what is saved', doc.querySelectorAll('#healthEditFields [data-hf]').length === 8 && fld('steps').value === '1516' && fld('restHR').value === '50' && fld('hrv').value === '38' && fld('distanceMi').value === '');
  check('and the menu closed behind it', card.querySelector('.entry-menu').hidden);

  console.log('=== saving ===');
  fld('steps').value = '11,240'; fld('restHR').value = '58'; fld('sleepHrs').value = '6.9'; fld('activeCal').value = '512'; fld('hrv').value = '';
  click($('healthEditSave')); await sleep(60);
  const wr = ev('window.__writes');
  check('one write, merged into that day only', wr.length === 1 && wr[0].o.merge === true && wr[0].d.date === '2026-10-09');
  check('numbers are cleaned ("11,240" → 11240) and the blank HRV is left alone, not erased', wr[0].d.steps === '11240' && wr[0].d.restHR === '58' && wr[0].d.sleepHrs === '6.9' && wr[0].d.activeCal === '512' && !('hrv' in wr[0].d));
  check('the form closes and a confirmation shows', $('healthEditModal').classList.contains('hidden') && /Saved Health numbers for/.test($('prToast').textContent));

  console.log('=== mistakes ===');
  ev(`window.__writes = []`); click(card.querySelector('.entry-more')); click(card.querySelector('.entry-health'));
  fld('steps').value = '7h 12m'; fld('restHR').value = '5'; click($('healthEditSave')); await sleep(60);
  check('text or out-of-range numbers are refused, naming the boxes, and nothing is written', ev('window.__writes.length') === 0 && /Check Steps, Resting heart rate: use plain numbers/.test($('healthEditMsg').textContent) && !$('healthEditModal').classList.contains('hidden'));
  fld('steps').value = ''; fld('restHR').value = ''; ['sleepHrs', 'activeCal', 'hrv', 'steps'].forEach(f => { fld(f).value = ''; }); doc.querySelectorAll('#healthEditFields [data-hf]').forEach(i => { i.value = ''; }); click($('healthEditSave')); await sleep(40);
  check('all boxes empty: it says so instead of writing', ev('window.__writes.length') === 0 && /every box is empty/.test($('healthEditMsg').textContent));
  click($('healthEditCancel')); check('Cancel closes it without saving', $('healthEditModal').classList.contains('hidden') && ev('window.__writes.length') === 0);
  click(doc.querySelector('#historyList .entry-card[data-date="2026-10-10"] .entry-more')); click(doc.querySelector('#historyList .entry-card[data-date="2026-10-10"] .entry-health'));
  check('a day with little data opens with mostly empty boxes', fld('steps').value === '5' && fld('restHR').value === '');
  check('your sync id is never shown', !doc.body.textContent.includes('sync-secret-xyz'));
  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
