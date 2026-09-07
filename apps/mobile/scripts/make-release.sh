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
  # Inject a signingConfigs.release block if Capacitor's template has none.
  APPG="apps/mobile/android/app/build.gradle"
  if ! grep -q "signingConfigs" "$APPG"; then
    python3 - "$APPG" "$WORKDIR/keystore.properties" <<'PY'
import sys
path, props = sys.argv[1], sys.argv[2]
text = open(path, encoding="utf-8").read()
block = f'''
    def ks = new File("{props}")
    if (ks.exists()) {{
        def p = new Properties()
        ks.withInputStream {{ p.load(it) }}
        signingConfigs {{
            release {{
                storeFile file(p["storeFile"])
                storePassword p["storePassword"]
                keyAlias p["keyAlias"]
                keyPassword p["keyPassword"]
            }}
        }}
    }}
'''
    text = text.replace("android {", "android {" + block, 1)
    if "signingConfig signingConfigs.release" not in text:
        text = text.replace(
            "release {",
            "release {\n            if (signingConfigs.findByName('release') != null) signingConfig signingConfigs.release",
            1,
        )
    open(path, "w", encoding="utf-8").write(text)
PY
  fi
  SIGNED=1
else
  echo "unsigned: ANDROID_KEYSTORE_* secrets not set — Play will not accept this build" >&2
fi

if [ "${RS_PREP_DRY:-0}" = "1" ]; then
  echo "gradle: bundleRelease assembleRelease"
  echo "SIGNED=$SIGNED"
  exit 0
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
