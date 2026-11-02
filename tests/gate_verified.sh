#!/bin/bash
# exit 0 only if all 3 parts passed on this exact code
H=$(/home/claude/gate_hash.sh)
for p in 1 2 3; do [ -e "/tmp/gate_stamps/${H}_part$p" ] || exit 1; done
exit 0
