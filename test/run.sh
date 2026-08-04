#!/bin/sh
# Runs the test suite with whatever node it can find.
#
# The tests have no dependencies — no npm install, no node_modules — so any
# reasonably recent node will do. There is often no node on PATH on a machine
# that only writes single-file HTML, so fall back to the ones editors bundle.
set -e

CANDIDATES="
$(command -v node 2>/dev/null || true)
/opt/homebrew/bin/node
/usr/local/bin/node
/Applications/Cursor.app/Contents/Resources/app/resources/helpers/node
/Applications/Visual Studio Code.app/Contents/Resources/app/resources/helpers/node
"

ROOT=$(cd "$(dirname "$0")/.." && pwd)

for n in $CANDIDATES; do
  if [ -x "$n" ]; then
    exec "$n" --test "$ROOT/test/"
  fi
done

echo "No node found. Install one with:  brew install node" >&2
exit 1
