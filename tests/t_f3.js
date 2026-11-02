const { JSDOM } = require('jsdom'); const fs = require('fs');
const html = fs.readFileSync('/home/claude/live_five.html', 'utf-8');
let fails = 0; const check = (l, c) => { if (!c) fails++; console.log((c ? 'PASS ' : 'FAIL ') + l); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
function boot({ storage = {}, snapDocs = null, online = true } = {}) {
  const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable', url: 'https://example.com/', pretendToBeVisual: true,
    beforeParse(w) {
      w.matchMedia = () => ({ matches: false, addEventListener: () => {}, removeEventListener: () => {} });
      w.confirm = () => true; w.alert = () => {};
      Object.entries(storage).forEach(([k, v]) => w.localStorage.setItem(k, v));
      if (snapDocs) w.__snapDocs = snapDocs;
      Object.defineProperty(w.navigator, 'onLine', { value: online, configurable: true });
    } });
  dom.errors = []; dom.window.addEventListener('error', e => dom.errors.push(e.message));
  return dom;
}
const DRAFT_KEY = 'mounjaro-workout-draft';
const mkDraft = (over = {}) => JSON.stringify(Object.assign({ v: 1, createdAt: Date.now() - 600000, savedAt: Date.now() - 120000, startedAt: Date.now() - 600000,
  sessions: { 'Chest Press (machine)': [{ weight: 70, reps: 12, done: true, checkedAt: 1 }, { weight: 70, reps: 10, done: true, checkedAt: 2 }, { weight: 70, reps: '', done: false }] },
  notes: { 'Chest Press (machine)': 'left shoulder tight' }, variations: { 'Chest Press (machine)': 'high' }, swaps: {}, pplDay: 'Push', splitDay: null }, over));

(async () => {
  // ───────── A. SAVE STATUS PILL ─────────
  console.log('=== A. cloud save status pill ===');
  let dom = boot({ storage: { 'mounjaro-sync-id': 'test' } }); await sleep(1500);
  let ev = s => dom.window.eval(s); const pill = () => dom.window.document.getElementById('syncStatus');
  check('pill exists in the header, next to the subtitle', !!pill() && pill().parentElement.contains(dom.window.document.getElementById('headerSub')));
  let release; ev(`window.__releases = []; window.__setDocImpl = () => new Promise(r => { window.__releases.push(r); });`);
  const p1 = ev(`setDoc({}, { a: 1 }, { merge: true })`);
  check('pending write -> "Saving…"', pill().textContent === 'Saving…');
  ev(`window.__releases.splice(0).forEach(r => r())`); await p1;
  check('write confirmed -> "✓ Saved"', pill().textContent === '✓ Saved' && pill().classList.contains('ok'));
  ev(`window.__setDocImpl = () => new Promise(r => { window.__releases.push(r); });`);
  const p2 = ev(`setDoc({}, { a: 2 })`);
  ev(`_pendingSince = Date.now() - 6000; updateSyncPill();`);
  check('stuck >5s -> "Syncing 1…" in amber', pill().textContent === 'Syncing 1…' && pill().classList.contains('warn'));
  const p3 = ev(`setDoc({}, { a: 3 })`);
  check('counts several waiting', /Syncing 2/.test(pill().textContent));
  Object.defineProperty(dom.window.navigator, 'onLine', { value: false, configurable: true });
  dom.window.dispatchEvent(new dom.window.Event('offline'));
  check('offline with writes waiting -> "Offline · 2 to sync"', pill().textContent === 'Offline · 2 to sync');
  ev(`window.__releases.splice(0).forEach(r => r())`); await Promise.all([p2, p3]);
  check('offline, nothing waiting -> "Offline"', pill().textContent === 'Offline');
  Object.defineProperty(dom.window.navigator, 'onLine', { value: true, configurable: true });
  dom.window.dispatchEvent(new dom.window.Event('online'));
  check('back online -> "✓ Saved"', pill().textContent === '✓ Saved');
  ev(`window.__setDocImpl = () => Promise.reject(new Error('denied'))`);
  let threw = false; try { await ev(`setDoc({}, { a: 4 })`); } catch (e) { threw = true; }
  check('a failed write still throws to the caller (existing error handling keeps working)', threw);
  check('and the pill says it plainly', /Couldn't save/.test(pill().textContent) && pill().classList.contains('bad'));
  ev(`window.__setDocImpl = () => Promise.resolve()`); await ev(`setDoc({}, { a: 5 })`);
  check('next successful write clears the warning', pill().textContent === '✓ Saved');
  ev(`window.__setDocCalls = 0; window.__got = null; window.__setDocImpl = (r, d, o) => { window.__got = { r, d, o }; return Promise.resolve('ok'); }`);
  const ret = await ev(`setDoc({ k: 1 }, { x: 9 }, { merge: true })`);
  check('arguments and return value pass straight through', ev(`window.__got.d.x`) === 9 && ev(`window.__got.o.merge`) === true && ret === 'ok');
  ev(`window.__deleteDocImpl = () => Promise.resolve()`); await ev(`deleteDoc({})`);
  check('deleteDoc is tracked too', pill().textContent === '✓ Saved');
  console.log('   page errors:', dom.errors.length ? dom.errors.join(' | ') : '(none)');

  // ───────── B. AUTOSAVE ─────────
  console.log('=== B. workout autosave ===');
  dom = boot({ storage: { 'mounjaro-sync-id': 'test' } }); await sleep(1500); ev = s => dom.window.eval(s);
  const stored = () => dom.window.localStorage.getItem(DRAFT_KEY);
  ev(`workoutPlanMode = 'ppl'; pplDayOverride = 'Push'; entries = []; workoutSessionState = {}; renderWorkoutPlan(); persistWorkoutDraft();`);
  check('just opening the plan (pre-filled, nothing done) saves nothing', stored() === null);
  ev(`workoutSessionState['Chest Press (machine)'][0].done = true; workoutSessionState['Chest Press (machine)'][0].weight = 75; persistWorkoutDraft();`);
  check('checking off a set saves a draft', stored() !== null);
  const d1 = JSON.parse(stored());
  check('draft holds the sets, with the weight that was entered', d1.sessions['Chest Press (machine)'][0].weight === 75 && d1.sessions['Chest Press (machine)'][0].done === true);
  check('status line says so', ev('draftStatusText()') === '✓ Autosaved on this phone');
  let writes = 0; const orig = dom.window.Storage.prototype.setItem; dom.window.Storage.prototype.setItem = function (...a) { if (a[0] === DRAFT_KEY) writes++; return orig.apply(this, a); };
  ev('persistWorkoutDraft(); persistWorkoutDraft(); persistWorkoutDraft();');
  check('an unchanged session does not rewrite storage', writes === 0);
  ev(`workoutNotesState['Chest Press (machine)'] = 'felt strong'; `);
  dom.window.dispatchEvent(new dom.window.Event('pagehide'));
  check('backgrounding the app (pagehide) saves immediately, no waiting for the timer', JSON.parse(stored()).notes['Chest Press (machine)'] === 'felt strong');
  ev(`workoutSessionState = {}; workoutNotesState = {}; workoutVariationState = {}; workoutStartedAt = null; persistWorkoutDraft();`);
  check('emptying the session clears the stored draft', stored() === null);
  ev(`workoutStartedAt = Date.now(); persistWorkoutDraft();`);
  check('starting a workout counts even before any set is done', stored() !== null);
  ev(`workoutStartedAt = null; workoutSessionState = {}; renderWorkoutPlan(); workoutSessionState['Chest Press (machine)'][0].done = true; persistWorkoutDraft();`);
  check('finishing clears the draft (via the real logExercise path)', (() => { ev(`writeEx = () => Promise.resolve(); document.getElementById('exDate').value = todayStr();`); return stored() !== null; })());
  await ev(`logExercise('Strength', 30, '', '')`);
  check('draft is gone the moment Finish has saved', stored() === null);
  console.log('   page errors:', dom.errors.length ? dom.errors.join(' | ') : '(none)');

  // ───────── C. RELAUNCH + RESTORE ─────────
  console.log('=== C. app killed and relaunched ===');
  dom = boot({ storage: { 'mounjaro-sync-id': 'test', [DRAFT_KEY]: mkDraft() } }); await sleep(1500); ev = s => dom.window.eval(s);
  const doc2 = dom.window.document;
  check('sets come back', ev(`workoutSessionState['Chest Press (machine)'].filter(s => s.done).length`) === 2);
  check('weights and reps come back', ev(`workoutSessionState['Chest Press (machine)'][1].reps`) === 10);
  check('notes + handle position come back', ev(`workoutNotesState['Chest Press (machine)']`) === 'left shoulder tight' && ev(`workoutVariationState['Chest Press (machine)']`) === 'high');
  check('chosen day comes back', ev('pplDayOverride') === 'Push');
  check('workout timer is running again (start time restored)', ev('workoutStartedAt') > 0 && ev('workoutTimerInterval') !== null);
  const banner = doc2.getElementById('draftBanner');
  check('a banner offers Resume / Discard and says how many sets', !!banner && /2 sets logged/.test(banner.textContent) && !!doc2.getElementById('draftResumeBtn') && !!doc2.getElementById('draftDiscardBtn'));
  doc2.getElementById('draftResumeBtn').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  check('Resume dismisses the banner and reopens the workout fullscreen', !doc2.getElementById('draftBanner') && doc2.getElementById('workoutPlanCard').classList.contains('strength-workout-fullscreen'));
  console.log('   page errors:', dom.errors.length ? dom.errors.join(' | ') : '(none)');
  dom = boot({ storage: { 'mounjaro-sync-id': 'test', [DRAFT_KEY]: mkDraft() } }); await sleep(1500); ev = s => dom.window.eval(s);
  dom.window.document.getElementById('draftDiscardBtn').dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true }));
  check('Discard wipes the session, the timer, and the stored draft', ev(`Object.values(workoutSessionState).every(s => s.every(x => !x.done))`) && ev('workoutStartedAt') === null && dom.window.localStorage.getItem(DRAFT_KEY) === null && !dom.window.document.getElementById('draftBanner'));

  console.log('=== D. drafts that must NOT come back ===');
  dom = boot({ storage: { 'mounjaro-sync-id': 'test', [DRAFT_KEY]: mkDraft({ savedAt: Date.now() - 20 * 3600 * 1000 }) } }); await sleep(1500);
  check('a draft older than 16 hours is dropped, no banner', !dom.window.document.getElementById('draftBanner') && dom.window.localStorage.getItem(DRAFT_KEY) === null);
  const createdAt = Date.now() - 600000;
  dom = boot({ storage: { 'mounjaro-sync-id': 'test', [DRAFT_KEY]: mkDraft({ createdAt }) },
    snapDocs: [{ date: '2026-10-02', ex: [{ type: 'Strength', ts: createdAt + 300000, sets: { 'Chest Press (machine)': [{ weight: 70, reps: 12 }] } }] }] }); await sleep(1500);
  check('a workout that already reached the cloud is NOT resurrected (no duplicate)', !dom.window.document.getElementById('draftBanner') && dom.window.localStorage.getItem(DRAFT_KEY) === null);
  dom = boot({ storage: { 'mounjaro-sync-id': 'test', [DRAFT_KEY]: mkDraft({ createdAt }) },
    snapDocs: [{ date: '2026-09-20', ex: [{ type: 'Strength', ts: createdAt - 86400000 * 5, sets: {} }] }] }); await sleep(1500);
  check('an OLDER saved workout does not block a genuine draft', !!dom.window.document.getElementById('draftBanner'));
  dom = boot({ storage: { 'mounjaro-sync-id': 'test', [DRAFT_KEY]: '{ not json' } }); await sleep(1500);
  check('a corrupt draft is discarded quietly', !dom.window.document.getElementById('draftBanner') && dom.window.localStorage.getItem(DRAFT_KEY) === null && dom.errors.length === 0);
  dom = boot({ storage: { [DRAFT_KEY]: mkDraft() } }); await sleep(600); // no sync id -> no data load -> restore still pending (fallback fires at 4s)
  check('(precondition) restore has not happened yet', dom.window.eval('_draftRestoreDone') === false);
  dom.window.eval(`workoutSessionState['Chest Press (machine)'] = [{ weight: 1, reps: 1, done: true }]; persistWorkoutDraft();`);
  check('a new session cannot overwrite an old draft before the restore decision', JSON.parse(dom.window.localStorage.getItem(DRAFT_KEY)).sessions['Chest Press (machine)'][0].weight === 70);

  console.log(fails ? `\n${fails} FAILED` : '\nALL PASSED'); process.exit(0);
})();
setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 90000);
