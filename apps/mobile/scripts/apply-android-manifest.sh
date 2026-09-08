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
#
# CAMERA is here for a different reason, and it is a footgun worth the comment: the
# @capacitor-mlkit/barcode-scanning plugin this app already depends on does NOT declare it (measured:
# its android/src/main/AndroidManifest.xml is an empty <manifest/>), and its requestPermissions()
# quietly answers `checkPermissions()` instead of prompting when the permission is undeclared — so a
# driver who taps "Scan QR" gets a silent "denied", not a dialog. Same for the WebView: Capacitor's
# onPermissionRequest launches a CAMERA request that can only work if the manifest declares it.
# The plugin's docs also require the MLKit DEPENDENCIES meta-data inside <application>; without it the
# barcode model is not fetched and startScan() fails on a device without Play-services bundles.
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

# Both insertions are anchored on real tags, and both are counted before and after: an "ensure" step
# that cannot say whether it added anything is how a silent no-op passes as a fix (G-115). CAMERA goes
# before <application> because that is where a permission belongs; the meta-data goes inside it because
# that is where a library looks for it. Python, not sed: four lines and a multi-line pattern each, and a
# `\n` inside a sed replacement is a literal backslash-n in a file Gradle then refuses to parse.
python3 - "$MANIFEST" <<'PYEOF'
import sys
path = sys.argv[1]
text = open(path, encoding="utf-8").read()
before_perms = text.count("<uses-permission")
CAM = '<uses-permission android:name="android.permission.CAMERA" />'
# CAMERA is NOT in the loop above, and it must not be: the loop appends before </manifest>, which
# parses but is not where a permission belongs, and running the loop twice would then put CAMERA in
# the file twice. Exactly one line, inserted before <application>, counted before and after.
declared = text.count(CAM)
if declared:
    action = f"already declared ({declared})"
    if declared > 1:
        raise SystemExit(f"FAIL: {declared} CAMERA lines already in {path} — refusing to guess which to keep")
elif "\n    <application" in text:
    text = text.replace("\n    <application", "\n    " + CAM + "\n    <application", 1)
    action = "inserted before <application>"
elif "<application" in text:
    text = text.replace("<application", CAM + "\n    <application", 1)
    action = "inserted before <application>"
else:
    raise SystemExit("FAIL: no <application tag to put CAMERA before")
if "com.google.mlkit.vision.DEPENDENCIES" not in text:
    i = text.find("<application")
    if i < 0:
        raise SystemExit("FAIL: no <application tag to put the barcode meta-data inside")
    j = text.find(">", i)
    if j < 0:
        raise SystemExit("FAIL: <application> tag is unterminated")
    text = text[: j + 1] + "\n        <meta-data android:name=\"com.google.mlkit.vision.DEPENDENCIES\" android:value=\"barcode_ui\" />" + text[j + 1 :]
open(path, "w", encoding="utf-8").write(text)
after_perms = text.count("<uses-permission")
print(f"apply-android-manifest: CAMERA {action}; permissions {before_perms} -> {after_perms}")
PYEOF



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

PERMS=$(grep -c "<uses-permission" "$MANIFEST")
echo "apply-android-manifest: $PERMS permissions ensured (7 expected: 6 from the list above + CAMERA), MLKit barcode meta-data set, allowBackup=false on $MANIFEST"
