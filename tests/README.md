# Tests for My Health Tracker

Simulated-browser (jsdom) test suites for `index.html`. They are not part of the app; GitHub Pages simply ignores them.

## Set up in a fresh Claude chat

```bash
# after cloning the repo to /home/claude/mounjaro_tracker
cd /home/claude && cp -r mounjaro_tracker/tests/. . && chmod +x *.sh
mkdir -p five shots && cp mounjaro_tracker/index.html five/index.html && cp five/index.html base_remote.html
npm install --no-audit --no-fund && python3 prep.py
```

The scripts expect to live in `/home/claude` (paths are hard-coded).

## Run

Edit `/home/claude/five/index.html`, then run the whole gate in one command (~5–6 min on 2 cores; give the command a 10-minute timeout):

```bash
./run_all_tests.sh     # runs prep.py, then every suite in parallel (gate_runner.js)
./gate_verified.sh     # passes only if all three parts passed on the current code
```

`./run_all_tests.sh 1|2|3` still runs one third. `JOBS=n` overrides how many suites run at once (default: cores + 1). A suite that fails is re-run once on its own; t_f23, t_f55 and t_f74 are timing-sensitive and usually need that re-run under parallel load. To run one suite by hand: `node t_fN.js`.

Ship: copy `five/index.html` into the repo, check `origin/main` has not moved, commit, `git push origin HEAD:main`, then confirm the pushed file's sha256 matches. When tests change, copy them back into `tests/` and commit them too.

## Conventions

- New suites are numbered after the highest existing `t_fN.js` (never overwrite one).
- Suites written before the Nov 1 2026 one-line preview list set `w.__noPreviewList = true` in `beforeParse`.
- `firestore.rules` is checked by `t_f38` against every database path in the app; update it (and republish in the Firebase console) if a new path is added.
- Pin the clock in date-sensitive suites (see `t_f50`).
