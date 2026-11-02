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

Edit `/home/claude/five/index.html`, then `python3 prep.py`, then run the gate one part per command (each ~3–4 min):

```bash
./run_all_tests.sh 1
./run_all_tests.sh 2
./run_all_tests.sh 3
./gate_verified.sh   # passes only if all three parts passed on the current code
```

Ship: copy `five/index.html` into the repo, check `origin/main` has not moved, commit, `git push origin HEAD:main`, then confirm the pushed file's sha256 matches. When tests change, copy them back into `tests/` and commit them too.

## Conventions

- New suites are numbered after the highest existing `t_fN.js` (never overwrite one).
- Suites written before the Nov 1 2026 one-line preview list set `w.__noPreviewList = true` in `beforeParse`.
- `firestore.rules` is checked by `t_f38` against every database path in the app; update it (and republish in the Firebase console) if a new path is added.
- Pin the clock in date-sensitive suites (see `t_f50`).
