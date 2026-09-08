#!/usr/bin/env bash
# Shared Android preparation for BOTH installer variants (D-8.18).
#
# Why this file exists: `make-apk.sh` (the debug build the landing page ships) applied the manifest
# permissions, the version rewrite, the icons and the night splash, while `make-release.sh` (the
# Play/signed build) applied *only* the version. So swapping the landing page onto the release
# variant — which is the whole point of D-8.18 — would have quietly dropped the location and
# notification permissions, the adaptive icons and the night splash. Two entry points, one prep:
# neither variant can be missing a patch the other has, and the mobile suite asserts exactly that.
#
# `RS_PREP_DRY=1` prints the ordered step list instead of running it. That is what the test drives:
# a shape check on text can be satisfied by a comment, this cannot.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

step () {
  echo "prep: $1"
  [ "${RS_PREP_DRY:-0}" = "1" ] && return 0
  shift
  "$@"
}

if [ "${RS_PREP_DRY:-0}" != "1" ] && [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ]; then
  echo "FAIL: ANDROID_HOME or ANDROID_SDK_ROOT is required to prepare the Android project" >&2
  exit 1
fi

# The wrap must come first: `cap sync` copies apps/web/dist-derived www into the native project.
step "mobile build (wrap + capacitor.config.json)" pnpm --filter @ride-share/mobile build
step "cap add android (first time only)" bash -c 'cd apps/mobile && [ -d android ] || npx cap add android'
step "cap sync android" bash -c 'cd apps/mobile && npx cap sync android'

# One call, both variants: permissions and the backup refusal live in apply-android-manifest.sh so a
# test can run them against a real manifest instead of trusting this file's text (see the reason there).
step "android manifest: permissions + no app-data backup (G-122)" bash apps/mobile/scripts/apply-android-manifest.sh

step "versionName/versionCode from brand.json (P7.6)" bash apps/mobile/scripts/apply-android-version.sh
step "adaptive icons from brand.json" bash apps/mobile/scripts/apply-android-icons.sh
step "night splash from brand.json" node apps/mobile/scripts/apply-android-night-splash.js
# After the night splash on purpose: that script creates values-night/styles.xml, and this one adds the
# system-bar items into the same style in both folders, so neither writes over the other's file.
step "system bars from brand.json (G-124, G-126)" node apps/mobile/scripts/apply-android-system-bars.js

[ "${RS_PREP_DRY:-0}" = "1" ] || echo "prep: done"
