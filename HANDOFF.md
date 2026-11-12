# My Health Tracker (Mounjaro_tracker) — Handoff for Claude

_Last updated: 2026-11-11 night (commit after 3e25568). Read this whole file before touching the app. It is everything needed to edit, test and ship changes on your own. The same text lives in the claude.ai Project "Home Projects" as `claude/mounjaro-tracker-status.md`, and in the repo as `HANDOFF.md`. When you ship, update BOTH (Project doc via `project_write`, repo file in the same commit)._

## 0. What Mike pastes to start a chat

> Read mounjaro-tracker-status.md in the Project, set up from the repo, and wait for my first change.

Do steps 1–2 below in your first reply, report in one or two lines ("Set up on commit abc123, gate scripts ready"), then wait. If he asks for a change in the same message, do it straight away.

## 1. Who and how

- **Owner:** Mike Sloskey. iPhone user; uses the app as a home-screen PWA, often **from the gym between sets**.
- **How he wants to work:** Claude edits, tests and pushes **directly** to `main`; no files for him to upload. Short, plain updates; no jargon. Say plainly what was only checked in a simulated browser.
- **At the gym:** ship in small batches and send a `SendUserMessage` as each batch goes live. Tell him to close and reopen the app (the update banner never shows during a workout).
- **Decisions already made:** keep all **7 bottom tabs** (Home, Log, Food, Exercise, History, Charts, Badges). Don't merge tabs. Every new Exercise-tab card must be collapsible like the others. He likes the **frosted-glass** look.
- **Before suggesting features, grep the app.** Several "new" ideas already existed (auto rest timer, repeat a meal / copy a day, type what you ate, barcode, label scan, supersets, 1RM, finish summary, plateau hint).
- **Other users:** Stacy (exercise only, leaderboard), Ryan ("Food & fitness" mode, own goals, no medication screens), Brandon (Food & fitness, one-off workouts). Don't break their modes: App Mode = Everything / Workouts-only / Food & fitness.
- **End of each reply:** say whether to keep going in this chat or start a new one. Long chats get slow; suggest a new chat after a few big changes.

## 2. Setup (first reply of every chat)

1. `add_repo` with `owner: msloskey-i-want-that`, `repo: Mounjaro_tracker`, `access: push`. It works through Mike's Claude GitHub link (no token); Mike may need to approve. Clone exactly as the tool says (`git clone --depth 1 … /home/claude/mounjaro_tracker`, 10-minute timeout), then `register_repo_root` if that tool exists.
2. Test kit (it lives in the repo; scripts hard-code `/home/claude`):
   ```
   cd /home/claude && cp -r mounjaro_tracker/tests/. . && chmod +x *.sh && mkdir -p five shots \
     && cp mounjaro_tracker/index.html five/index.html && cp five/index.html base_remote.html \
     && npm install --no-audit --no-fund && python3 prep.py
   ```
   `five/index.html` is the working copy you edit. `prep.py` builds `live_five.html` (the copy the tests load) from it. **Re-run `python3 prep.py` after every edit.**
3. Playwright + Chromium are preinstalled (`require('playwright')`; don't install them). For screenshots: `cp live_five.html shots/app.html` and serve `shots/` with `python3 -m http.server 8765` (start it with `setsid nohup … &`; it dies between turns or sessions, so restart it if you get "connection refused").

## 3. The app

- **One file:** `index.html` (~1.5 MB, ~22k lines). All HTML, CSS and JS are inline. Also in the repo: `sw.js` (service worker; network-first for the page, so updates arrive on reload), `manifest.json`, icons. Hosted on **GitHub Pages from `main`**: `https://msloskey-i-want-that.github.io/Mounjaro_tracker/`. A push is live in about a minute.
- **Data:** an in-memory `entries` array, one object per date (`date` 'YYYY-MM-DD', `weight`, `protein`/`calories`/… strings, `meals[]`, `ex[]` workouts, `appetite`, `steps`, `healthSyncedAt`, `injection`/`dose`/`site`, …), plus settings globals (`userProteinGoal`, `baselineWeight`, `goalWeight`, `pinnedFavorites`, `foodCombos`, `exerciseGroups`, `exerciseStations`, `workoutPlanMode`, `appMode`, …).
  - It syncs to **Firebase Firestore** (project `mounjaro-tracker-a6f44`, SDK 10.12.2) under `trackers/<syncId>`. Firestore rules are in `tests/firestore.rules`.
  - **Apple Health:** Mike's iOS Shortcut "Sync To Health 1" sums Zepp-source steps (plus resting HR, sleep, active cal, etc.) and writes them to `trackers/<syncId>/meta/healthInbox`; the app applies them. Health data is unreadable while the phone is locked, so Shortcut automations must trigger on unlock-only events.
- **Meal fields:** `desc`, `mt` (Breakfast/Lunch/Dinner/Snack), `protein`, `cal` (not "calories"), `carbs`, `fat`, `fiber`, `ts`.
- **Workout fields:** `ex[]` items look like `{ type: 'Strength', planDay: 'Pull', min, effort, sets: { 'Lat Pulldown': [{ weight, reps, warmup?, rir?, timed? }] } }`. Workout minutes are `min`.
- **Exercise tab internals:** the live session is `workoutSessionState[name][i]` (`{ weight, reps, done, checkedAt, rir, warmup }`).
  - `renderWorkoutPlan()` re-renders everything, then `wireWorkoutPlanEvents()`. Set rows are built by `renderSetRowHtml()`, and `gatherWorkoutSets()` saves them.
  - `exerciseMode(name)` returns `weighted` / `bodyweight` / `timed` / `timedLoaded`.
  - Rest timer: `startRestTimer`, `updateRestTimerDisplay`, `restTimerContext`, `nudgeRestForEffort`. Timed sets: `toggleSetStopwatch`, the big screen `#setTimerBig`, `openGetReady`.
  - Plan days: `workoutPlanMode = 'ppl'` with `pplDayOverride = 'Push'|'Pull'|'Legs'`. Farmers Carry (dumbbells) is on Legs.
- **Food tab internals:** `renderMealList()`, `renderProteinSummary()`, `renderFoodWeek()`, `quickAddFood(f, chipEl)`, `quickAddCombo(c, chipEl)`, `mealsForDate(d)`, `writeMeals(d, list)`, `foodWeekStats(end)`.
- **Dates:** always local. Use `todayStr()`, `ymdOf(date)`, `lbAddDays(str, n)` / `dateStrShift`. Never `toISOString().slice(0,10)`: it's a day ahead after 7 pm Eastern, and it broke the heatmap on the 25-hour DST day.
- **Find things with grep**, not by reading the file: `grep -n "^function name" five/index.html`, then `sed -n 'a,bp'`.

## 4. Edit → test → ship

1. **Sync first:** `cd mounjaro_tracker && git fetch origin main`. If `origin/main` moved (another chat pushed), `git merge --ff-only origin/main`, then re-copy `index.html` → `five/index.html` + `base_remote.html` and `tests/*` → `/home/claude/`.
2. **Edit `five/index.html` with a small Python script of exact replacements.** Each old string is asserted to occur exactly the expected number of times, and the script exits on a mismatch. Never retype big chunks of the file. Keep comments short and plain.
3. `python3 prep.py`.
4. **Look at it:** take a Playwright screenshot at 390×844 (dark: `colorScheme:'dark'`) of the card you changed, with realistic data.
   - Seed: set `syncId='x'; window.__setDocImpl=()=>Promise.resolve();`, then `entries`, then `renderAll()`.
   - Hide the Welcome/Sync ID modal: hide `#modalTitle`'s top-level container.
   - Views scroll inside `#app-main`, not the page.
   - Workout: `window.__noPreviewList=true`, `renderWorkoutPlan()`, click `#startPlanBtn`.
5. **Write a new jsdom suite** `t_fNN.js`: copy the header of the newest one (`t_f86.js`). It loads `/home/claude/live_five.html` and waits 2.5 s. In `beforeParse` set `w.__noPreviewList = true` and stub `matchMedia`/`confirm`/`alert`. Use `check(label, cond)` and end with `ALL PASSED`. Run it alone first: `timeout 120 node t_fNN.js`. **Next free number: t_f87.**
6. **Full gate (one command, 10-min timeout):**
   ```
   ./run_all_tests.sh 2>&1 | grep -i "^FAIL\|PART\|TIMEOUT\|flaked" ; ./gate_verified.sh && echo GATE_OK
   ```
   It runs all suites in parallel (~5½ min). t_f23, t_f55 and t_f74 sometimes flake once and pass on the automatic re-run; that's fine. A real FAIL means: run that suite alone, read the failure, and fix the app or (only if the old expectation is genuinely outdated) the test. Changing any test file resets the gate, so re-run it.
7. **Ship:**
   ```
   cd /home/claude/mounjaro_tracker && git fetch origin main -q \
     && [ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] \
     && cp ../five/index.html index.html && cp ../t_fNN.js tests/ \
     && git add -A && git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -q -F msg.txt \
     && git push origin HEAD:main \
     && git fetch origin main -q && [ "$(git show origin/main:index.html | sha256sum)" = "$(sha256sum < ../five/index.html)" ] && echo SHA_MATCH
   ```
   Commit message: a short title plus bullets, ending with the session's attribution lines from the system reminder.
8. **Tell Mike:** what changed in plain words, and "tap **Refresh** on the New version ready banner" (or "close and reopen the app" if he's mid-workout). Then update this handoff (Project doc + repo `HANDOFF.md`).

## 5. Rules the tests enforce (learned the hard way)

- **t_f10 layout:** grid columns must be `minmax(0, 1fr)`, never bare `1fr`, and text fields must be able to shrink.
- **t_f45:** a meal header's FIRST `<span>` is the meal name. Put badges in their own element after it.
- **Set-row width:** after ANY change to the workout set row, run `node fit_check.js` (copy `tests/fit_check.js` into `shots/`, serve on :8765). It checks every exercise on Push/Pull/Legs at 9 widths. Mike's iPhone draws numbers wider than Chromium, so leave spare room; `fitSetNumber()` shrinks a number that still doesn't fit.
- **Layers:** the full-screen Add Food panel is z-index 501, the undo toast 800, and the big set timer 1850. Anything that must show above the panel needs >501.
- **Dates:** local only (see §3). Tests must use local date helpers too.

## 6. What's shipped (newest first)

**2026-11-11: hands-free timed sets (t_f86).** When rest ends, `nextOpenSetAfter(restTimerContext)` finds the next open set. If it's timed and no stopwatch is running, `openGetReady()` reuses `#setTimerBig`:
- Same exercise: amber 5-4-3-2-1 "Get ready… starts by itself", then `toggleSetStopwatch()`.
- Next exercise: big "▶ START" with no countdown.
- Buttons while getting ready: "▶ START NOW"/"▶ START" and "Not yet". The big STOP already checks the set off, which starts the rest, so the loop runs hands-free. The input-focus step is skipped so the keyboard doesn't pop up under it.

**2026-11-09: numbers cut off (t_f85).** The weight box showed "13(" after the reps −/+ buttons were added.
- Steppers are 28/26 px, the check button 40 px, and the weight field has `min-width: 56px`.
- `fitSetNumber()`/`fitSetNumbers()` measure each value with a canvas and shrink the font (≥10 px). They run after render, on input, on stepper taps and on resize.

**2026-11-09: Food tab (t_f84).**
- Protein pill per main meal (`mealProteinTarget()` = 30% of goal, 25–40 g).
- Low-appetite card for appetite 1–2 (`lowAppetitePicks`: ≥10 g protein, ≤250 cal, ranked by protein per calorie, tap to add).
- This Week card: 7-day weight change, plus a 12-week split of weeks at the protein goal vs the rest (`foodVsWeightInsight`).

**2026-11-09: Exercise tab (t_f82, t_f83).**
- "Reps left?" 0 💀/1/2/3+ after each working set (`rir` is saved on the set). 2+ left on every set earns the next weight jump in `nextStepFor`.
- 🎯 Today target line (`todayTargetFor`).
- Reps −/+ and "↻ Same again".
- Rest: +30 s after failure, −15 s after an easy set (this rest only); bigger countdown.
- "▲/▼ N lb vs last time" per card and for the session (`exercisePaceVsLast`).
- Stall alert after 3 sessions without estimated-1RM progress (`stallFor`), with "Reset to 90%" or "Swap exercise".

**2026-11-04 (t_f80, t_f81).**
- Home Steps shows "as of 5:52 pm" (`#ringStepsAsOf`). Zepp → Apple Health → Shortcut each lag, which explains Zepp vs app step differences.
- The undo toast shows above the Add Food panel, and a repeat tap within 2 s is ignored (`quickAddIsRepeat`).
- Heatmap uses local dates.
- Test kit runs in parallel in one command.

**2026-11-01 (t_f79).** Home/History/Charts/Badges/Settings tidy:
- No minus signs on "lost" numbers, and `unitForCount` singular/plural.
- Folded-card gap removed; gym check-in box hidden; Labs card counts A1C.
- Home duplicates removed; Roadmap moved inside Milestone Progress.
- History shows the log first; Charts shows Body first; leaderboard pitch moved last.
- Settings sorted into 4 groups (`SETTINGS_GROUPS`).

**2026-10-28 → 11-01 (t_f71–t_f78).**
- Automatic exercise grouping (`exerciseGroups`); walks on the muscle map; simpler tabs plus Settings → Screens.
- Update banner (never mid-workout).
- Machine cards (`exerciseStations`; Mike's Matrix cable machine on Pull day).
- Food tab: Add Food pop-up, fiber, This Week card.
- Exercise tab: plan first, one-line preview, "Last 3", live "lb so far", past activity behind "✎ Log a past activity".

## 7. Open ideas (not built)

- Hint under "Reps left?" ("how many more could you have done?").
- Plan tomorrow's meals.
- Home defaulting to 6–8 cards; a Charts default set plus "More".
- Merge Quick Log into the daily log; one Apple Health edit card.
- Injection-day reminder (ntfy); Apple Health write-back (weight, water); Sunday recap notification.
- Housekeeping: confirm the Firestore rules are published in the Firebase console.
