#!/usr/bin/env bash
# §0.2 — observe the platform-boundary check fail, then restore it byte-for-byte.
# A check never observed failing is an assumption in a test's clothing.
#
# The restore is a copy of a scratch copy, never a rewrite of the file's lines. The first version of
# this case read the file into python, filtered the planted lines and wrote it back — and that
# appended a trailing newline to `apps/web/src/screens/rider.js` every single run. The tree was left
# dirty, `verify.sh` then baked that newline into `apps/web/dist-preview.html`, and the next person
# reading `git status` after a break run saw a "change" in product source he never made. A harness
# must not be able to do that, so the proof is in the file: `cmp` against the bytes we found, and
# fail the run if they differ.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"
CHECK=scripts/check-platform-boundary.sh
TARGET=apps/web/src/screens/rider.js
MARKER="/* P7.1-BREAK */"

# Scratch lives OUTSIDE the tree, like apps/web/tests/breaks.sh does: a `.bak` beside the source is
# found by the next glob and read as product code. Not $TMPDIR — a sandbox rehydrate wipes it mid-run.
SCRATCH="${HOME}/.vtest/breaks-scratch.$$"
mkdir -p "$SCRATCH"
ORIG="$SCRATCH/orig"
cp "$TARGET" "$ORIG"
restore_file () { [ -f "$ORIG" ] && cp "$ORIG" "$TARGET"; }
cleanup () { restore_file; rm -rf "$SCRATCH"; }
trap cleanup EXIT INT TERM

echo "▍ platform-boundary break (plant @capacitor import in a screen)"
printf '\n%s\nimport { Camera } from "@capacitor/camera";\n' "$MARKER" >> "$TARGET"
if bash "$CHECK"; then
  echo "  FAIL: check stayed green after a planted Capacitor import"
  exit 1
fi
echo "  CAUGHT planted Capacitor import"

restore_file
if ! bash "$CHECK"; then
  echo "  FAIL: check still red after the restore — the mutation is not gone"
  exit 1
fi
# The comparison has to happen before the trap clears the scratch dir — my first version deleted it
# first and `cmp` then reported a mismatch against a file that no longer existed. It caught itself.
cmp -s "$ORIG" "$TARGET" || { echo "  FAIL: the restore did not return the file byte-for-byte"; exit 1; }
echo "  restored — check green, file byte-identical"
echo
echo "breaks: examined 1 check, 0 missed"
