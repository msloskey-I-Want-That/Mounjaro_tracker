// Nov 11 — the Recovery / muscle map card moved from History to the Exercise tab, right under the workout plan. Still works there.
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
  doc.getElementById('app-main').scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = function () {};
  ev(`syncId = 'x'; window.__setDocImpl = () => Promise.resolve(); entries = [{ date: todayStr(), ex: [{ type: 'Strength', min: 50, ts: Date.now(), sets: { 'Lat Pulldown': [{ weight: 95, reps: 12 }, { weight: 95, reps: 12 }] } }] }]; renderAll();`);
  await sleep(60);
  const card = $('muscleMapCard');
  check('the card is on the Exercise tab', !!card.closest('#view-exercise'));
  check('it is no longer on the History tab', !$('view-history').querySelector('#muscleMapCard'));
  check('it sits right under the workout plan', $('workoutPlanCard').nextElementSibling === card);
  check('it is collapsible (header toggles the body)', (() => { ev(`muscleMapOpen = false; applyMuscleMapOpen();`); const closed = $('muscleMap').style.display === 'none'; click($('muscleMapHeader')); return closed && $('muscleMap').style.display !== 'none' && $('muscleMapHeader').getAttribute('aria-expanded') === 'true'; })());
  ev(`muscleMapMode = 'recovery'; renderMuscleMap();`); await sleep(30);
  check('Recovery mode draws the map and the muscle list', !!$('muscleMap').querySelector('svg') && /Recovery/.test($('muscleMapTitle').textContent));
  check('the mode buttons still switch modes', (() => { const b = $('muscleMap').querySelector('[data-musclemode="effort"]'); if (!b) return false; click(b); return /Effort/.test($('muscleMapTitle').textContent); })());
  check('no script errors', errors.length === 0);
  console.log(fails ? 'SOME FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
}, 2500);
