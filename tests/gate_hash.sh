#!/bin/bash
# A fingerprint of the app AND every test file: a "passed" stamp is only valid for exactly this code.
cd /home/claude && cat five/index.html t_f*.js prep.py run_fullaudit_test.js run_fullaudit_tabs.js run_setui_test.js | sha256sum | cut -d' ' -f1
