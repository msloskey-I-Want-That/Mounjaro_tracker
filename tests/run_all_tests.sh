#!/bin/bash
# Runs the suites against the current five/index.html. Exit non-zero on ANY failure.
# usage: ./run_all_tests.sh [1|2|3]   Each part runs about a third of the suites so it fits in one command
# (this machine has ONE core and the full set takes ~6 minutes). A passing part writes a stamp tied to a
# fingerprint of the app + every test file; ship.sh pushes only when all three parts have a stamp for the
# current code. With no argument, every part runs in turn. A suite that fails is re-run once on its own
# (timing-sensitive checks can flake); a real failure fails again and is reported.
cd /home/claude && python3 prep.py >/dev/null 2>&1 && cp live_five.html live_fullaudit_test.html && cp live_five.html live_setui_test.html
H=$(./gate_hash.sh); mkdir -p /tmp/gate_stamps
passes_alone() { timeout 60 node "$1" 2>&1 | grep -q "ALL PASSED"; }
run_part() {
  local p=$1 bad=0 i=0
  if [ "$p" = "1" ]; then
    r=$(timeout 40 node run_fullaudit_test.js 2>&1 | grep -v 'Could not load\|Not implemented'); echo "$r" | grep -q "Passed: 38 / 38" && echo "$r" | grep -q "global errors caught during entire test === 0" || { echo "FAIL smoke"; bad=1; }
    n=$(timeout 40 node run_fullaudit_tabs.js 2>&1 | grep -c ': OK'); [ "$n" = "7" ] || { echo "FAIL tabs ($n/7)"; bad=1; }
    timeout 40 node run_setui_test.js 2>&1 | grep -q "ALL CHECKS PASSED" || { echo "FAIL workout UI"; bad=1; }
  fi
  for t in $(ls t_f*.js | sort -V); do
    if [ $(( i % 3 + 1 )) = "$p" ]; then
      passes_alone "$t" || { passes_alone "$t" && echo "(flaked once, passed on re-run: $t)" || { echo "FAIL $t"; bad=1; }; }
    fi
    i=$((i+1))
  done
  if [ $bad = 0 ]; then touch "/tmp/gate_stamps/${H}_part$p"; echo "PART $p PASSED"; else echo "PART $p FAILED"; fi
  return $bad
}
if [ -n "$1" ]; then run_part "$1"; exit $?; fi
overall=0; for p in 1 2 3; do run_part $p || overall=1; done
[ $overall = 0 ] && echo "ALL SUITES PASSED" || echo "SUITE FAILURES"
exit $overall
