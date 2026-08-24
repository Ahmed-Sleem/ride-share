#!/usr/bin/env bash
# Produce a debug APK from a clean checkout (P7.1 / local or CI).
# Requires: Node 20, pnpm, Java 17+, Android SDK (ANDROID_HOME).
# Never writes a keystore. Debug APK is signed with the public Android debug key.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

if [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ]; then
  echo "FAIL: ANDROID_HOME or ANDROID_SDK_ROOT is required to assemble an APK"
  exit 1
fi

pnpm --filter @ride-share/mobile build
cd apps/mobile
if [ ! -d android ]; then
  npx cap add android
fi
npx cap sync android
cd android
chmod +x gradlew
./gradlew --no-daemon assembleDebug
APK="$(find app/build/outputs/apk/debug -name '*.apk' | head -1)"
[ -n "$APK" ] && [ -f "$APK" ]
echo "APK: $ROOT/apps/mobile/android/$APK"
