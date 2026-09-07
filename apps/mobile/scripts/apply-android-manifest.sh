#!/usr/bin/env bash
# G-122 + the permission list, applied to ONE manifest file. Its own script on purpose: the two
# installer variants must not be able to diverge, and a test can only prove that by running this on
# a real manifest — a regex over the build scripts proves nothing about behaviour (it is how G-115
# stayed hidden: a substring that was true either way).
#
#   usage: apply-android-manifest.sh [path/to/AndroidManifest.xml]
#
# Missing file is NOT an error: `cap add android` creates it, and a fresh checkout has no native
# project yet. That is the same contract apply-android-version.sh has always had.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
MANIFEST="${1:-$ROOT/apps/mobile/android/app/src/main/AndroidManifest.xml}"

if [ ! -f "$MANIFEST" ]; then
  echo "apply-android-manifest: no manifest yet ($MANIFEST)"
  exit 0
fi

# Location + foreground service + notifications: without these the app asks for nothing and the
# driver's live position silently never arrives.
for perm in \
  android.permission.ACCESS_COARSE_LOCATION \
  android.permission.ACCESS_FINE_LOCATION \
  android.permission.ACCESS_BACKGROUND_LOCATION \
  android.permission.FOREGROUND_SERVICE \
  android.permission.FOREGROUND_SERVICE_LOCATION \
  android.permission.POST_NOTIFICATIONS
do
  grep -q "$perm" "$MANIFEST" \
    || sed -i "s|</manifest>|    <uses-permission android:name=\"$perm\" />\n</manifest>|" "$MANIFEST"
done

# The shipped debug APK measured android:allowBackup="true", which puts the WebView data directory —
# where the session bearer token lives — into Android's cloud backup and device-to-device transfer.
# Nothing here needs restoring from a backup: accounts, rides and the GUI all come from the server,
# and the GUI arrives over the air. So backup is pure exposure, and it is refused rather than warned
# about — a silent no-op is how this stayed true for every build so far.
if grep -q "android:allowBackup" "$MANIFEST"; then
  sed -i 's/android:allowBackup="[^"]*"/android:allowBackup="false"/' "$MANIFEST"
else
  sed -i 's|<application |<application android:allowBackup="false" |' "$MANIFEST"
fi
grep -q 'android:allowBackup="false"' "$MANIFEST" \
  || { echo "FAIL: could not set allowBackup=false on $MANIFEST (no <application> tag to attach it to?)" >&2; exit 1; }

echo "apply-android-manifest: 6 permissions ensured, allowBackup=false on $MANIFEST"
