#!/usr/bin/env bash
# D-8.14 — break-detection harness for the device-token guards (G-117, G-119).
# Each case cuts one guard, runs its gate, and demands the expected failure
# shows up for the right reason; no case may leak a mutation, and none may
# touch the product. A check never seen failing is not a check (§0.2).
#
# Five cases gate on the mobile node suite (server + boot) in TAP mode,
# because that is where the device-token guards are held to account; the
# sixth is the platform-boundary case this file shipped with, whose gate is
# scripts/check-platform-boundary.sh. CI runs this script from apps/mobile via
# `pnpm verify` (apps/mobile "test" -> `node --test ... && bash
# tests/breaks.sh`), so case paths are repo-root relative and the node gate
# always runs from the app directory.
#
# A node case passes only when the TAP report names the expected failure. The
# boot page tests run in the same suite as the server tests, so we look for
# the literal name of the failing test on a `not ok ` line (`grep -F`: the
# names contain parentheses and question marks that regex would misread) and
# ignore everything else - including web-bundler noise boot.test.js can spawn.
set -u
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"
BREAKS_ONLY="${BREAKS_ONLY:-}"
PASS=0
FAIL=0
# Scratch lives OUTSIDE the tree: a .bak beside the source is picked up by the
# next glob and read as product code, and $TMPDIR can be wiped mid-run by a
# sandbox rehydrate.
BREAKS_TMP="${HOME}/.vtest/breaks-scratch.$$"
SCRATCH="$BREAKS_TMP"
INFLIGHT=""

log() { printf '%s\n' "$*"; }
die() { log "breaks: $*"; exit 1; }

# The trap restores whichever case is mid-flight on any exit. A signal can
# reach the parent before this trap does, and the parent's cleanup may have
# removed the scratch dir already - so recreate the path, then copy back.
_restore_inflight() {
  [ -n "$INFLIGHT" ] || return 0
  mkdir -p "$BREAKS_TMP" 2>/dev/null
  cp "$BREAKS_TMP/${INFLIGHT//\//_}" "$INFLIGHT" 2>/dev/null
  INFLIGHT=""
}
trap '_restore_inflight; rm -rf "$BREAKS_TMP"' EXIT INT TERM

# run_break "<sentence>" <file-from-repo-root> '<sed expr>' "<failing test name>"
run_break() {
  name="$1"
  file="$2"
  expr="$3"
  expect="$4"
  if [ -n "$BREAKS_ONLY" ]; then
    case "$name" in
      *"$BREAKS_ONLY"*) ;;
      *) return ;;
    esac
  fi
  mkdir -p "$SCRATCH/orig/$(dirname "$file")"
  cp -n "$file" "$SCRATCH/orig/$file"
  bak="$BREAKS_TMP/${file//\//_}"
  cp "$file" "$bak"
  INFLIGHT="$file"
  sed -i -e "$expr" "$file"
  if cmp -s "$file" "$bak"; then
    # A non-empty expression always rewrites its anchor line, so an unchanged
    # file means the anchor no longer exists in the source.
    log "breaks: BROKEN-BREAK: sed matched nothing: $name"
    INFLIGHT=""
    FAIL=$((FAIL + 1))
  else
    out="$(cd "$HERE/.." && node --test --test-reporter=tap tests/server.test.js tests/boot.test.js 2>&1)"
    cp "$bak" "$file"
    INFLIGHT=""
    if cmp -s "$file" "$bak"; then
      if printf '%s\n' "$out" | grep -F "not ok " | grep -qF "$expect"; then
        log "breaks: CAUGHT: $name"
        PASS=$((PASS + 1))
      else
        log "breaks: MISSED: $name"
        log "breaks: expected a 'not ok' naming: $expect"
        FAIL=$((FAIL + 1))
      fi
    else
      die "the harness failed to restore $file exactly"
    fi
  fi
}

# The case this file shipped with, converted to the same accounting: plant a
# Capacitor import in a web screen and demand the platform-boundary check
# refuse it, then restore and demand the check go green again. The restore is
# a byte-for-byte copy, never a rewrite of the file's lines - a line rewrite
# appended a trailing newline to rider.js on every run and build.js baked it
# into the preview bundle (G-121).
run_boundary_break() {  # "<sentence>" <file-from-repo-root>
  name="$1"
  file="$2"
  if [ -n "$BREAKS_ONLY" ]; then
    case "$name" in
      *"$BREAKS_ONLY"*) ;;
      *) return ;;
    esac
  fi
  [ -f "$file" ] || die "platform-boundary target missing: $file"
  mkdir -p "$SCRATCH/orig/$(dirname "$file")"
  cp -n "$file" "$SCRATCH/orig/$file"
  bak="$BREAKS_TMP/${file//\//_}"
  cp "$file" "$bak"
  INFLIGHT="$file"
  printf '\n/* P7.1-BREAK */\nimport { Camera } from "@capacitor/camera";\n' >> "$file"
  if cmp -s "$file" "$bak"; then
    log "breaks: BROKEN-BREAK: append did not change the file: $name"
    INFLIGHT=""
    FAIL=$((FAIL + 1))
  else
    if bash scripts/check-platform-boundary.sh >/dev/null 2>&1; then
      log "breaks: MISSED: $name"
      log "breaks: expected the boundary check to refuse the planted import"
      FAIL=$((FAIL + 1))
    else
      log "breaks: CAUGHT: $name"
      PASS=$((PASS + 1))
    fi
    cp "$bak" "$file"
    INFLIGHT=""
    if cmp -s "$file" "$bak"; then
      bash scripts/check-platform-boundary.sh >/dev/null 2>&1 \
        || die "the boundary check is still red after the restore"
    else
      die "the harness failed to restore $file exactly"
    fi
  fi
}

# Case 1 — a forged device token is refused. The guard rejects any request
# whose signature does not fit its payload, which is what keeps a personal
# route from answering to someone else's token.
run_break "a forged device token is refused" \
  apps/mobile/server.js \
  's|if (sign1(payload) !== sig) throw new Error("sig");|if (false) throw new Error("sig");|' \
  "a personal route with nothing to present is refused, and says which thing is missing"

# Case 2 — an expired device token is refused. A token is a self-contained
# credential, so the expiry check is the only thing standing between a lapsed
# token and the routes it used to open.
run_break "an expired device token is refused" \
  apps/mobile/server.js \
  's|Date.now() > body.e|Date.now() - 86400000 > body.e|' \
  "a service with no key configured still enrols, instead of locking everyone out"

# Case 3 — a device cannot enrol in a loop. Each minted token opens the gate
# for a minute, so nothing may mint faster than that.
run_break "a device cannot enrol in a loop" \
  apps/mobile/server.js \
  's|^function enrollAllowed(deviceId, now) {$|function enrollAllowed(deviceId, now) {\n  return true;|' \
  "a device cannot enrol in a loop"

# Case 4 — enrolment itself is guarded. Only a request that already holds a
# valid device token may mint a new one; without the check any client could
# mint for any app id. This is the regression lock on the deadlock that
# shipped once: requiring a token in order to receive a token (G-117).
run_break "enrolment without a device token is refused" \
  apps/mobile/server.js \
  's|if (url === "/v1/mobile/enroll") {|if (url === "/v1/mobile/enroll") {\n    const gate = deviceToken(req); if (!gate.ok) return json(res, 401, { ok: false, code: gate.code });|' \
  "enrolment mints a token, and that token opens the personal routes"

# Case 5 — the boot page must stay credential-free. It has no key to sign
# with, so its one request must not carry the signing header at all, not even
# a blank value that a proxy could mistake for a credential.
run_break "the boot page sends no credential" \
  apps/mobile/offline.html \
  's|return { "x-rs-app-id": appId };|return { "x-rs-app-id": appId, "x-rs-sign": "0".repeat(64) };|' \
  "the boot page asks for its interface without a credential, and without a preflight"

# Case 6 — the platform boundary: screens and feature files never import
# @capacitor/*, only the native shell may name a plugin.
run_boundary_break "a screen never imports a Capacitor plugin" \
  apps/web/src/screens/rider.js

# Every case restores before it returns; this proves the tree came back whole.
# A leftover mutation is not a test failure - it is a corrupted build that the
# next suite would read as truth.
drift=0
if [ -d "$SCRATCH/orig" ]; then
  while IFS= read -r f; do
    rel="${f#$SCRATCH/orig/}"
    if ! cmp -s "$f" "$rel"; then
      log "breaks: RESTORE FAILED $rel"
      cp "$f" "$rel" 2>/dev/null
      drift=1
    fi
  done < <(find "$SCRATCH/orig" -type f)
fi
[ "$drift" -eq 0 ] || exit 1

log "breaks: examined $((PASS + FAIL)) check(s), $FAIL missed"
[ "$FAIL" -eq 0 ] || exit 1
exit 0
