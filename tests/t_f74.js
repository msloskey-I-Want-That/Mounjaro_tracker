// "New version ready" banner: HEAD the page, compare ETag with the one seen at load, offer Refresh.
const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/Mounjaro_tracker/', pretendToBeVisual: true,
  beforeParse(w) {
    w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} }); w.__alerts = []; w.alert = m => w.__alerts.push(m);
    w.__etag = '"v1"'; w.__calls = [];
    w.fetch = (url, opts) => { w.__calls.push({ url: String(url), opts }); return Promise.resolve({ ok: true, headers: { get: k => k === 'etag' ? w.__etag : null } }); };
  } });
const errors = []; dom.window.addEventListener('error', e => errors.push(e.message));
setTimeout(async () => {
  const w = dom.window, doc = w.document, ev = s => w.eval(s), $ = id => doc.getElementById(id);
  const click = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  let reloaded = 0; try { ev(`location.reload = () => { window.__reloaded = (window.__reloaded || 0) + 1; }`); } catch (e) {}
  await sleep(1200); // the first check runs 3s after load
  const head = w.__calls.find(c => c.opts && c.opts.method === 'HEAD');
  check('on open it asks for the page version with a tiny HEAD request (no download, no cache)', !!head && head.opts.cache === 'no-store' && /\/Mounjaro_tracker\/\?v=\d+/.test(head.url));
  check('same version: no banner', !$('updateBanner'));
  await ev('checkForAppUpdate()'); await sleep(20);
  check('still the same version on the next check: no banner', !$('updateBanner'));

  w.__etag = '"v2"';
  ev(`workoutStartedAt = Date.now();`);
  await ev('checkForAppUpdate()'); await sleep(20);
  check('new version during a workout: no banner yet (unsaved sets are safe)', !$('updateBanner'));
  ev(`workoutStartedAt = null;`);
  ev(`document.dispatchEvent(new Event('visibilitychange'))`); await sleep(40);
  check('after the workout, coming back to the app shows "New version ready"', !!$('updateBanner') && /New version ready/.test($('updateBanner').textContent));
  check('the banner has a Refresh button and a ✕', !!$('updateBannerBtn') && !!$('updateBannerLater'));
  await ev('checkForAppUpdate()'); await sleep(20);
  check('only one banner at a time', doc.querySelectorAll('#updateBanner').length === 1);

  click($('updateBannerLater')); await sleep(20);
  check('✕ hides it', !$('updateBanner'));
  await ev('checkForAppUpdate()'); await sleep(20);
  check('...and it does not nag again for that same version', !$('updateBanner'));
  w.__etag = '"v3"';
  await ev('checkForAppUpdate()'); await sleep(20);
  check('an even newer version brings it back', !!$('updateBanner'));

  ev(`workoutStartedAt = Date.now();`); click($('updateBannerBtn')); await sleep(20);
  check('Refresh mid-workout asks you to finish first (no reload)', w.__alerts.some(a => /Finish your workout/.test(a)) && !ev('window.__reloaded'));
  ev(`workoutStartedAt = null;`);
  let reloadCalled = false; try { click($('updateBannerBtn')); reloadCalled = true; } catch (e) {}
  check('Refresh otherwise reloads the app', reloadCalled);

  ev(`appVersionTag = null; updateBannerShown = false; document.getElementById('updateBanner') && document.getElementById('updateBanner').remove(); window.fetch = () => Promise.reject(new Error('offline'));`);
  await ev('checkForAppUpdate()'); await sleep(20);
  check('offline: no banner, no error', !$('updateBanner'));

  console.log('=== Errors ==='); const real = errors.filter(e => !/reload|navigation/i.test(e)); console.log(real.length ? real.join('\n') : '(none)');
  check('no script errors', real.length === 0);
  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
}, 2500); setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 60000);
