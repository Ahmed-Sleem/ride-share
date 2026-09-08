#!/usr/bin/env bash
# P7.6 / D-8.18 — signed release AAB + APK. The keystore is NEVER written into the repo.
# Secrets (CI / local env only):
#   ANDROID_KEYSTORE_BASE64   PKCS12/JKS as base64
#   ANDROID_KEYSTORE_PASSWORD
#   ANDROID_KEY_ALIAS
#   ANDROID_KEY_PASSWORD
# Without them this produces an UNSIGNED release build (honest, not Play-ready, and not installable
# over a debug-signed install).
#
# Both variants run the SAME prep (apps/mobile/scripts/prepare-android.sh): the release build used to
# apply only the version rewrite, so "ship the signed build instead" would have shipped a binary with
# no location permission and the default Capacitor icon. apps/mobile/tests/config.test.js executes
# both prep lists and compares them, because that sentence is a promise a comment cannot keep.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

bash "$ROOT/apps/mobile/scripts/prepare-android.sh"

# Print the step plan and stop, before any Gradle file is touched. This is what lets CI run the release
# pipeline on demand without a keystore, and it is why a whole class of "unreachable until a secret
# exists" bug (the IndentationError above) can be made reachable by a test instead.
if [ "${RS_PREP_DRY:-0}" = "1" ]; then
  echo "gradle: bundleRelease assembleRelease"
  [ -n "${ANDROID_KEYSTORE_BASE64:-}" ] && echo "SIGNED=planned" || echo "SIGNED=0"
  exit 0
fi

SIGNED=0
WORKDIR="$(mktemp -d)"
cleanup() { rm -rf "$WORKDIR"; }
trap cleanup EXIT

if [ -n "${ANDROID_KEYSTORE_BASE64:-}" ] && [ -n "${ANDROID_KEYSTORE_PASSWORD:-}" ] \
   && [ -n "${ANDROID_KEY_ALIAS:-}" ] && [ -n "${ANDROID_KEY_PASSWORD:-}" ]; then
  STORE="$WORKDIR/upload.jks"
  printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$STORE"
  [ -s "$STORE" ]
  # Gradle properties stay in the temp dir — never committed.
  cat > "$WORKDIR/keystore.properties" <<EOF
storeFile=$STORE
storePassword=$ANDROID_KEYSTORE_PASSWORD
keyAlias=$ANDROID_KEY_ALIAS
keyPassword=$ANDROID_KEY_PASSWORD
EOF
  APPG="apps/mobile/android/app/build.gradle"
  # The Gradle patch is a FILE, not a heredoc, and that is load-bearing: see the header of
  # scripts/apply-release-signing.py. A bash <<'PY' heredoc keeps the script's own indentation, so the
  # inline version died on `IndentationError: unexpected indent` the first time the release path was
  # ever run (CI job 101934922253, 2026-09-08 — with the keystore secrets present at last).
  python3 "$ROOT/apps/mobile/scripts/apply-release-signing.py" "$APPG" "$WORKDIR/keystore.properties"
  SIGNED=1
else
  echo "unsigned: ANDROID_KEYSTORE_* secrets not set — Play will not accept this build" >&2
fi

cd apps/mobile/android
chmod +x gradlew
if [ "$SIGNED" = 1 ]; then
  ./gradlew --no-daemon bundleRelease assembleRelease
  AAB="$(find app/build/outputs/bundle/release -name '*.aab' | head -1)"
  echo "AAB: $AAB"
else
  ./gradlew --no-daemon assembleRelease
fi
echo "SIGNED=$SIGNED"
APK="$(find app/build/outputs/apk/release -name '*.apk' | head -1 || true)"
[ -n "${APK:-}" ] && echo "APK: $ROOT/apps/mobile/android/$APK"
