// Nov 14 audit, batch 3 — the offline cache keeps only the app's own files, fonts and libraries (never food/barcode/AI
// answers); Reduce Motion is respected; the Charts exercise picker has a VoiceOver label; a backup restore only writes
// real YYYY-MM-DD days.
const { JSDOM } = require('jsdom'); const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

console.log('=== service worker ===');
const swSrc = fs.readFileSync(fs.existsSync('/home/claude/mounjaro_tracker/sw.js') ? '/home/claude/mounjaro_tracker/sw.js' : __dirname + '/sw.js', 'utf-8');
const handlers = {}; const self = { location: { origin: 'https://msloskey-i-want-that.github.io' }, addEventListener: (t, f) => { handlers[t] = f; }, skipWaiting: () => {}, clients: { claim: () => {} } };
vm.runInNewContext(swSrc, { self, caches: { open: async () => ({ put() {}, add: async () => {} }), match: async () => null, keys: async () => [] }, fetch: async () => ({ status: 200, clone() { return this; } }), URL, Promise });
const handled = (url, opts = {}) => { let used = false; handlers.fetch({ request: { url, method: opts.method || 'GET', mode: opts.mode || 'cors', destination: opts.destination || '' }, respondWith() { used = true; } }); return used; };
check('cache name bumped so old caches (with lookups) are deleted', /const CACHE = 'mounjaro-v3[3-9]'/.test(swSrc));
check('the app page itself is still handled (works offline)', handled('https://msloskey-i-want-that.github.io/Mounjaro_tracker/', { mode: 'navigate', destination: 'document' }));
check('own icons and manifest are cached', handled('https://msloskey-i-want-that.github.io/Mounjaro_tracker/icon-192.png') && handled('https://msloskey-i-want-that.github.io/Mounjaro_tracker/manifest.json'));
check('Chart.js / fonts from the CDN are cached', handled('https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js') && handled('https://fonts.gstatic.com/s/x.woff2') && handled('https://cdnjs.cloudflare.com/ajax/libs/x.js'));
check('USDA search is NOT cached (it has an API key in the URL)', !handled('https://api.nal.usda.gov/fdc/v1/foods/search?query=egg&api_key=K'));
check('barcode lookups are NOT cached', !handled('https://world.openfoodfacts.org/api/v2/product/012345678905.json'));
check('Spoonacular / FatSecret / ntfy / Anthropic are NOT cached', !handled('https://api.spoonacular.com/food/ingredients/search?apiKey=K') && !handled('https://platform.fatsecret.com/rest/server.api') && !handled('https://ntfy.sh/topic') && !handled('https://api.anthropic.com/v1/messages', { method: 'POST' }));
check('Firestore still goes straight to the network', !handled('https://firestore.googleapis.com/v1/projects/x/databases/(default)/documents/a'));
check('the update check (HEAD) is not cached', !handled('https://msloskey-i-want-that.github.io/Mounjaro_tracker/?v=1', { method: 'HEAD' }));

const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
  beforeParse(w) { w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.confirm = () => true; w.alert = () => {}; w.__noPreviewList = true; } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, ev = s => w.eval(s);
  console.log('=== accessibility ===');
  check('Reduce Motion turns animations and transitions off', /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\*, \*::before, \*::after \{ animation-duration: 0\.01ms !important;[^}]*transition-duration: 0\.01ms !important/.test(html));
  check('the Charts exercise picker has a label', doc.getElementById('weightProgressExercisePicker').getAttribute('aria-label') === 'Exercise to chart');

  console.log('=== backup restore ===');
  const writes = [];
  ev(`syncId = 'x'; entries = []; renderAll();`);
  w.__setDocImpl = (ref, data) => { writes.push({ path: ref && ref.path, data }); return Promise.resolve(); };
  const backup = { entries: [{ date: '2026-11-01', weight: '230' }, { date: '2026-11/02', weight: '1' }, { date: 'meta', weight: '1' }, { date: '', weight: '1' }, { weight: '1' }], labs: [{ date: '2026-10-01', a1c: '5.6' }, { date: 'x/y', a1c: '9' }] };
  const input = doc.getElementById('restoreJsonInput');
  Object.defineProperty(input, 'files', { configurable: true, value: [{ text: async () => JSON.stringify(backup) }] });
  input.dispatchEvent(new w.Event('change'));
  await sleep(200);
  const entryWrites = writes.filter(x => x.data && x.data.weight != null), labWrites = writes.filter(x => x.data && x.data.a1c != null);
  check('only the real day is restored (bad dates skipped)', entryWrites.length === 1 && entryWrites[0].data.date === '2026-11-01');
  check('only the real lab date is restored', labWrites.length === 1 && labWrites[0].data.date === '2026-10-01');
  check('no script errors', errors.length === 0);
  console.log(fails ? 'SOME FAILED' : 'ALL PASSED'); process.exit(fails ? 1 : 0);
}, 2500);
