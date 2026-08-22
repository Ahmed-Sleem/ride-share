#!/usr/bin/env bash
# Workspace integrity (BUILD_PLAN P0.1). Fails on any of:
#   - root not private
#   - packageManager not an exact version (range characters ^ ~ > < = | space)
#   - an apps/* or packages/* package.json missing or without a name
#   - an internal dependency not using the workspace: protocol
#   - an external dependency version not resolved via the catalog (catalog:)
# Each check prints what it examined — a silent check is indistinguishable
# from one that never ran.
set -euo pipefail
cd "$(dirname "$0")/.."

fail=0; examined=0
say(){ printf '  %s\n' "$*"; }

# 1. root package.json
examined=$((examined+1))
root=$(node -e 'console.log(JSON.stringify(require("./package.json")))')
printf '  %s\n' "examined root package.json"
if ! node -e 'const p=require("./package.json"); process.exit(p.private===true?0:1)'; then
  say "FAIL root package.json is not private"; fail=$((fail+1))
fi
pm=$(node -e 'console.log(require("./package.json").packageManager||"")')
if ! printf '%s' "$pm" | grep -Eq '^[a-z]+@[0-9]+\.[0-9]+\.[0-9]+$'; then
  say "FAIL packageManager is not an exact version: '$pm'"; fail=$((fail+1))
else
  printf '  %s\n' "packageManager exact: $pm"
fi

# 2. catalog — the single source of dependency versions
examined=$((examined+1))
if ! node -e '
  const fs=require("fs"),yaml=fs.readFileSync("pnpm-workspace.yaml","utf8");
  process.exit(/catalog:/.test(yaml) && /catalogMode:\s*strict/.test(yaml)?0:1)'; then
  say "FAIL pnpm-workspace.yaml missing catalog or catalogMode: strict"; fail=$((fail+1))
else
  printf '  %s\n' "catalog present with catalogMode: strict"
fi

# 3. every workspace package declares a name; deps obey the two protocols
for dir in apps/* packages/*; do
  [ -e "$dir/package.json" ] || { say "FAIL $dir has no package.json"; fail=$((fail+1)); continue; }
  examined=$((examined+1))
  printf '  %s\n' "examined $dir/package.json"
  node - "$dir" <<'EOF'
const dir=process.argv[2];
const p=require("./"+dir+"/package.json");
let bad=0;
if(!p.name){ console.log(`  FAIL ${dir}: no name`); bad=1; }
for(const [k,o] of [["dependencies",p.dependencies||{}],["devDependencies",p.devDependencies||{}]]){
  for(const [dep,spec] of Object.entries(o)){
    if(dep.startsWith("@ride-share/")){
      if(!/^workspace:/.test(spec)){ console.log(`  FAIL ${dir}: internal dep ${dep} is "${spec}", not workspace:`); bad=1; }
    } else {
      if(spec!=="catalog:" && !/^workspace:/.test(spec)){ console.log(`  FAIL ${dir}: external dep ${dep} has bare version "${spec}" (must be catalog:)`); bad=1; }
    }
  }
}
process.exit(bad);
EOF
  [ $? -eq 0 ] || fail=$((fail+1))
done

echo
echo "workspace check: examined $examined files, $fail failure(s)"
[ "$fail" -eq 0 ]
