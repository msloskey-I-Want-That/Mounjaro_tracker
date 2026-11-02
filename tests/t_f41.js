const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function boot(store) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {};
      w.localStorage.setItem('mounjaro-sync-id', 'x'); w.__settingsData = {}; Object.entries(store || {}).forEach(([k, v]) => w.localStorage.setItem(k, v)); w.HTMLElement.prototype.scrollIntoView = () => {}; } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message)); return dom;
}
(async () => {
  let dom = boot(); await sleep(2000);
  let doc = dom.window.document, w = dom.window; const $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  const card = () => $('exerciseActivityCard'), content = () => $('exerciseActivityCardContent'), title = () => card().querySelector('.form-section-title');
  console.log('=== the Exercise (activity) card minimizes ===');
  check('the card is open by default and shows a chevron', content().style.display !== 'none' && $('exerciseCardChevron').textContent === '▼');
  check('everything (types, timer, describe, scan, minutes, Add) is inside the collapsible part', ['exTimerStartBtn', 'exMin', 'addExBtn', 'workoutDescBlock'].every(id => content().contains($(id))));
  click(title());
  check('tapping the title minimizes it: only the title is left', content().style.display === 'none' && $('exerciseCardChevron').textContent === '▶');
  check('the choice is remembered on this device', w.localStorage.getItem('mounjaro-exercisecard-expanded') === 'false');
  click(title());
  check('tapping again opens it', content().style.display !== 'none' && w.localStorage.getItem('mounjaro-exercisecard-expanded') === 'true');
  console.log('=== still works with the timer ===');
  click($('exTimerStartBtn')); await sleep(50);
  check('starting the timer still opens the full-screen timer card', card().classList.contains('entry-popup-fullscreen'));
  click(title());
  check('while full screen, tapping the title does not collapse the card away', content().style.display !== 'none');
  click($('exerciseFullscreenCloseBtn'));
  check('closing the full-screen timer returns the card to its place', !card().classList.contains('entry-popup-fullscreen'));
  console.log('=== remembered after a reload ===');
  click(title()); const saved = w.localStorage.getItem('mounjaro-exercisecard-expanded');
  dom = boot({ 'mounjaro-exercisecard-expanded': 'false' }); await sleep(2000); doc = dom.window.document; w = dom.window;
  check('a saved "minimized" choice starts minimized', saved === 'false' && doc.getElementById('exerciseActivityCardContent').style.display === 'none' && doc.getElementById('exerciseCardChevron').textContent === '▶');
  check('no script errors', dom.errors.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(fails ? 1 : 0);
})();
