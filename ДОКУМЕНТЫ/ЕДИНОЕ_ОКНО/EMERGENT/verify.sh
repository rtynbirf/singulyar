#!/bin/sh
set -eu
node --check src/core.js
node --check src/adapters.js
node --check prototype/app.js
node --check tests/e2e.chromium.cjs
node tests/core.test.js
if python3 -c 'import jsonschema' >/dev/null 2>&1; then python3 tests/schema.test.py; else echo 'SKIP full JSON Schema test: install python package jsonschema'; fi
CHROMIUM_BIN="${CHROMIUM_BIN:-$(command -v chromium || true)}"
if [ -n "$CHROMIUM_BIN" ] && [ -x "$CHROMIUM_BIN" ]; then
  CHROMIUM_BIN="$CHROMIUM_BIN" node tests/e2e.chromium.cjs
else
  echo 'SKIP Chromium browser-flow test: Chromium not installed; set CHROMIUM_BIN to its executable.'
fi
