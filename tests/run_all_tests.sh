#!/bin/bash
# Runs the suites against the current five/index.html. Exit non-zero on ANY failure.
# usage: ./run_all_tests.sh          everything in ONE command (~6 min on 2 cores; was 3 commands, ~12 min)
#        ./run_all_tests.sh 1|2|3    just that third (same split as before)
# Suites run in parallel (gate_runner.js; JOBS=n to override, default cores+1). A passing part writes a stamp
# tied to a fingerprint of the app + every test file; gate_verified.sh passes only when all three parts have a
# stamp for the current code. A suite that fails is re-run once on its own (timing-sensitive checks can flake
# under parallel load); a real failure fails again and is reported.
cd /home/claude && python3 prep.py >/dev/null 2>&1 && cp live_five.html live_fullaudit_test.html && cp live_five.html live_setui_test.html || { echo "prep failed"; exit 1; }
exec node gate_runner.js "${1:-all}"
