#!/usr/bin/env python3
"""P7.6 / D-8.18 — give the generated `app/build.gradle` a release signingConfig.

Run as a file, never as a heredoc inside `make-release.sh`. That is not a style preference: the block
used to live inline in the bash script, its own lines indented by two spaces to match the surrounding
`if`, and a bash `<<'PY'` heredoc preserves that indentation verbatim. So the first statement *after*
the triple-quoted Gradle block — which has to keep its indent to sit at column 0 relative to the file —
was an IndentationError. The release path was never executed before 2026-09-08 because no keystore
secrets existed, so "untested" was exactly the state of the most important line in the release build.
CI's first signed run died there (`IndentationError: unexpected indent`, job 101934922253) while the
landing page kept handing out the debug build. A file can be executed by a test; a heredoc cannot.

usage: apply-release-signing.py <path/to/app/build.gradle> <path/to/keystore.properties>

The Gradle side is deliberately defensive: it reads `keystore.properties` at configuration time and
only applies the signing config when the file exists, so a local build without secrets still produces
an unsigned release rather than failing on a missing path. `make-release.sh` decides *whether* to call
this; nothing else.
"""
import re
import sys

MARK = "signingConfig signingConfigs.release"


def patch(text, props_path):
    if "signingConfigs" in text:
        # Already wired (idempotent re-run, or a template that gained its own block). Refuse to stack a
        # second one — two signingConfigs blocks is a Gradle error nobody would trace back to a patch.
        return text, "already wired"
    if "\nandroid {" not in text and not text.startswith("android {"):
        raise SystemExit("FAIL: no `android {` block to hang signingConfigs on — the Capacitor template changed")
    if "buildTypes {" not in text:
        raise SystemExit("FAIL: no buildTypes block — refusing to write a signing config nothing will use")
    block = (
        "\n    signingConfigs {\n"
        "        release {\n"
        f"            def rsKs = file(\"{props_path}\")\n"
        "            if (rsKs.exists()) {\n"
        "                def rsP = new Properties()\n"
        "                rsKs.withInputStream { rsP.load(it) }\n"
        "                storeFile file(rsP[\"storeFile\"])\n"
        "                storePassword rsP[\"storePassword\"]\n"
        "                keyAlias rsP[\"keyAlias\"]\n"
        "                keyPassword rsP[\"keyPassword\"]\n"
        "            }\n"
        "        }\n"
        "    }\n"
    )
    text = text.replace("android {", "android {" + block.rstrip("\n"), 1)
    # Attach it to the release build type. The template's `release {` sits inside buildTypes; a bare
    # `release {` replace could in principle match something else, so the replacement is verified below
    # by counting the marker rather than by trusting the substitution.
    text = re.sub(r"buildTypes \{\s*\n(\s*)release \{", lambda m: "buildTypes {\n%srelease {\n%s    if (rsHasReleaseKey) signingConfig signingConfigs.release" % (m.group(1), m.group(1)), text, count=1)
    if MARK not in text:
        raise SystemExit(f"FAIL: `{MARK}` never reached buildTypes.release — the reference would then point at a "
                         "signingConfig nothing applies, which Gradle accepts and an installer silently ships unsigned")
    # The guard flag has to exist before it is read; it is derived from the same properties file, so a
    # build with no secrets resolves nothing and simply stays unsigned (an honest artifact, per the
    # script's contract) instead of failing at configuration time.
    text = text.replace("android {", "def rsHasReleaseKey = file(\"%s\").exists()\n\nandroid {" % props_path, 1)
    if text.count(MARK) != 1:
        raise SystemExit(f"FAIL: expected exactly one `{MARK}`, wrote {text.count(MARK)} — the release block was not found where the template puts it")
    return text, "patched"


def main():
    if len(sys.argv) != 3:
        raise SystemExit(__doc__.strip().splitlines()[-1])
    path, props = sys.argv[1], sys.argv[2]
    with open(path, encoding="utf-8") as fh:
        text = fh.read()
    out, action = patch(text, props)
    if out == text:
        print(f"apply-release-signing: {action} ({path})")
        return
    with open(path, "w", encoding="utf-8") as fh:
        fh.write(out)
    print(f"apply-release-signing: {action} {path} (keystore.properties: {props})")


if __name__ == "__main__":
    main()
