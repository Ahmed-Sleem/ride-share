#!/usr/bin/env bash
# P7.6 — signed Play AAB/APK. The keystore is NEVER written into the repo.
# Secrets (CI / Railway / local env only):
#   ANDROID_KEYSTORE_BASE64   PKCS12/JKS as base64
#   ANDROID_KEYSTORE_PASSWORD
#   ANDROID_KEY_ALIAS
#   ANDROID_KEY_PASSWORD
# Without secrets this produces an UNSIGNED release APK (honest, not Play-ready).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

if [ -z "${ANDROID_HOME:-}${ANDROID_SDK_ROOT:-}" ]; then
  echo "FAIL: ANDROID_HOME or ANDROID_SDK_ROOT is required"
  exit 1
fi

pnpm --filter @ride-share/mobile build
cd apps/mobile
if [ ! -d android ]; then
  npx cap add android
fi
npx cap sync android
bash "$ROOT/apps/mobile/scripts/apply-android-version.sh"

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
  APPG="android/app/build.gradle"
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
  echo "unsigned: ANDROID_KEYSTORE_* secrets not set — Play will not accept this build"
fi

cd android
chmod +x gradlew
if [ "$SIGNED" = 1 ]; then
  ./gradlew --no-daemon bundleRelease assembleRelease
else
  ./gradlew --no-daemon assembleRelease
fi

if [ "$SIGNED" = 1 ]; then
  AAB="$(find app/build/outputs/bundle/release -name '*.aab' | head -1)"
  echo "AAB: $AAB"
  echo "SIGNED=1"
else
  echo "SIGNED=0"
fi
APK="$(find app/build/outputs/apk/release -name '*.apk' | head -1 || true)"
[ -n "${APK:-}" ] && echo "APK: $APK"
