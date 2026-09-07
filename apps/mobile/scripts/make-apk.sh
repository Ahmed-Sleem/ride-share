#!/usr/bin/env bash
# Debug APK for local runs and CI (P7.1). Requires: Node 20, pnpm, Java 17+, Android SDK.
# Never writes a keystore: the debug variant is signed with the machine's Android debug key, which
# is why two CI builds of the same versionCode carry different public keys (D-8.18) and why the
# landing page's installer is a tester channel until `make-release.sh` has its secrets.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

# Every patch the release variant must also carry lives in prepare-android.sh — see the reason there.
bash "$ROOT/apps/mobile/scripts/prepare-android.sh"

if [ "${RS_PREP_DRY:-0}" = "1" ]; then echo "gradle: assembleDebug"; exit 0; fi

cd apps/mobile/android
chmod +x gradlew
./gradlew --no-daemon assembleDebug
APK="$(find app/build/outputs/apk/debug -name '*.apk' | head -1)"
[ -n "$APK" ] && [ -f "$APK" ]
echo "APK: $ROOT/apps/mobile/android/$APK"
