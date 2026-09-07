#!/usr/bin/env bash
# G-118: scripts with a shebang must be executable IN THE INDEX, not just on some disk.
#
# Why this exists: a workspace can lose exec bits (containers, a rehydrated sandbox, a
# `git add -A` run before `core.fileMode false` is restored) and the WRONG mode then becomes
# the committed mode. CI mostly escapes that because it invokes checks as `bash x.sh`, but
# `apps/web/package.json`'s `verify` runs `./verify.sh` - and that one line is the whole
# `verify-gui` job, so a lost bit costs a red run and a redeploy that never happens.
#
# The index is read (`git ls-files -s`), never the filesystem: the filesystem can be right while
# the commit is wrong, and the commit is what every other machine receives.
# Convention (verify-repo.sh): print a line matching /examined [0-9]+/, even when nothing is wrong.
set -uo pipefail
cd "$(dirname "$0")/.."

bad=0
n=0
while read -r mode _obj path; do
  case "$path" in
    *.sh) ;;
    *) continue ;;
  esac
  n=$((n + 1))
  [ "$(head -c 2 "$path" 2>/dev/null)" = "#!" ] || continue   # data-only .sh files are not entry points
  if [ "$mode" != "100755" ]; then
    echo "FAIL: $path starts with #! but its index mode is $mode; run: git update-index --chmod=+x $path"
    bad=$((bad + 1))
  fi
done < <(git ls-files -s '*.sh')

if [ "$n" -eq 0 ]; then
  echo "FAIL: examined 0 shell scripts - this check is not running (git missing? not a repo?)"
  exit 1
fi

echo "examined $n shell script(s) for the executable bit in the index; $bad wrong"
[ "$bad" -eq 0 ]
