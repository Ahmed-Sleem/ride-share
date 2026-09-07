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
shebanged=0
# `git ls-files -s` prints "<mode> <sha> <stage>\t<path>", so the path must be split on the TAB.
# Reading the first field with `read -r mode obj stage path` leaves "0\tapps/web/verify.sh" in
# path, the shebang read then fails, and every script is skipped - a green that checked nothing
# (it happened; the guard passed while verify.sh sat at 100644, which is the whole bug class).
while IFS=$'\t' read -r meta path; do
  [ -n "$path" ] || continue
  mode="${meta%% *}"
  case "$path" in
    *.sh) ;;
    *) continue ;;
  esac
  n=$((n + 1))
  [ "$(head -c 2 "$path" 2>/dev/null)" = "#!" ] || continue   # data-only .sh files are not entry points
  shebanged=$((shebanged + 1))
  if [ "$mode" != "100755" ]; then
    echo "FAIL: $path starts with #! but its index mode is $mode; run: git update-index --chmod=+x $path"
    bad=$((bad + 1))
  fi
done < <(git ls-files -s '*.sh')

# A second tripwire: scripts exist but none were recognised as entry points means the parse or
# the checkout is wrong, which is exactly the failure above. Never report a pass for 0 examined.
if [ "$n" -gt 0 ] && [ "$shebanged" -eq 0 ]; then
  echo "FAIL: $n .sh files found but none read as '#!' - the shebang test is not working"
  exit 1
fi

if [ "$n" -eq 0 ]; then
  echo "FAIL: examined 0 shell scripts - this check is not running (git missing? not a repo?)"
  exit 1
fi

echo "examined $n shell script(s), $shebanged with a shebang, for the executable bit in the index; $bad wrong"
[ "$bad" -eq 0 ]
