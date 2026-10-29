#!/usr/bin/env bash
# Pre-push gate: everything that must be true before code leaves this machine.
#
#   npm run prepush              # full gate (includes `next build`)
#   npm run prepush -- --quick   # skip the build
#   ALLOW_MAIN_PUSH=1 npm run prepush   # deliberate push to main
#
# Also runs as the git pre-push hook (.githooks/pre-push), which passes the
# refs being pushed on stdin and sets PREPUSH_TARGETS.
#
# Every check lands in a PASS / WARN / FAIL / SKIP table. Any FAIL exits 1.
# Each heavy step runs under a time limit, because in this repo a hang is
# usually the iCloud "dataless" problem or the ESLint first-run prompt, not a
# slow build -- see the notes printed when those are detected.
set -euo pipefail

PROD_REF="vvzadoagclwzjuhgbwgf"
STAGING_REF="tswabgfnkwbcbwammnbi"
QUICK=""
for arg in "$@"; do
  case "$arg" in
    --quick|-q) QUICK=1 ;;
    *) echo "Unknown option: $arg" >&2; exit 2 ;;
  esac
done

cd "$(dirname "$0")/.."

NVM_NODE="$HOME/.nvm/versions/node/v20.20.2/bin"
if [[ -d "$NVM_NODE" ]]; then export PATH="$NVM_NODE:$PATH"; fi

LOG_DIR="$(mktemp -d "${TMPDIR:-/tmp}/prepush.XXXXXX")"
ROWS=()
FAILED=0

row() {  # row STATUS "check" "detail"
  ROWS+=("$1|$2|$3")
  [[ "$1" == "FAIL" ]] && FAILED=1
  return 0
}

# macOS has no `timeout`; perl's alarm is always there.
with_timeout() {  # with_timeout SECONDS cmd...
  local secs="$1"; shift
  perl -e 'alarm shift; exec @ARGV or die "exec: $!"' "$secs" "$@"
}

run_step() {  # run_step "label" SECONDS cmd...
  local label="$1" secs="$2"; shift 2
  local log="$LOG_DIR/$(echo "$label" | tr -c 'a-zA-Z0-9' '_').log"
  local start=$SECONDS rc=0
  printf '  … %s\n' "$label"
  with_timeout "$secs" "$@" >"$log" 2>&1 || rc=$?
  local took=$((SECONDS - start))
  if [[ $rc -eq 0 ]]; then
    row PASS "$label" "${took}s"
  elif [[ $rc -eq 142 ]]; then
    row FAIL "$label" "timed out after ${secs}s (hang? see notes) -- log: $log"
  else
    row FAIL "$label" "exit $rc in ${took}s -- log: $log"
    echo "----- last lines of $label -----"; tail -n 25 "$log"; echo "-------------------------------"
  fi
}

echo "==> Pre-push checks"

# --- Node ---------------------------------------------------------------
NODE_V="$(node -v 2>/dev/null || echo none)"
if [[ "$NODE_V" == v20.* ]]; then
  row PASS "Node 20" "$NODE_V"
else
  row FAIL "Node 20" "got $NODE_V; Next 14 misbehaves on newer Node (install v20.20.2 via nvm)"
fi

# --- Branch -------------------------------------------------------------
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
TARGETS="${PREPUSH_TARGETS:-$BRANCH}"
if [[ " $TARGETS " == *" main "* && "${ALLOW_MAIN_PUSH:-}" != "1" ]]; then
  row FAIL "Not pushing to main" "target includes main; go through staging + a PR, or set ALLOW_MAIN_PUSH=1"
else
  row PASS "Not pushing to main" "branch $BRANCH -> ${TARGETS}"
fi

if [[ -n "$(git status --porcelain)" ]]; then
  row WARN "Clean working tree" "uncommitted changes -- they are checked below but will NOT be pushed"
else
  row PASS "Clean working tree" ""
fi

# Diff base: the upstream if there is one, else origin/main. No fetch -- a
# fetch can hang on iCloud-evicted .git files, and stale refs are good enough.
if BASE_REF="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null)"; then :; else BASE_REF="origin/main"; fi
BASE="$(git merge-base HEAD "$BASE_REF" 2>/dev/null || git rev-parse "$BASE_REF")"

# --- Leftovers that must never ship -------------------------------------
SYNC_LEFT="$(ls supabase/migrations/*_staging_data_sync.sql 2>/dev/null || true)"
if [[ -n "$SYNC_LEFT" ]]; then
  row FAIL "No staging-sync leftovers" "real financial data in: $SYNC_LEFT -- delete it"
else
  row PASS "No staging-sync leftovers" ""
fi

if [[ -d supabase/.temp ]]; then
  REF="$(cat supabase/.temp/project-ref 2>/dev/null || echo '?')"
  if [[ "$REF" == "$PROD_REF" ]]; then
    row FAIL "Supabase CLI link" "!!! LINKED TO PRODUCTION ($PROD_REF). A db push/config push now hits prod. rm -rf supabase/.temp"
  else
    row WARN "Supabase CLI link" "supabase/.temp present (ref $REF); breaks local 'supabase start' -- rm -rf supabase/.temp when done"
  fi
else
  row PASS "Supabase CLI link" "unlinked"
fi

# A tracked .env holding only public values (a site URL) is tolerable; one
# holding anything key-like is not.
ENV_TRACKED="$(git ls-files | grep -E '(^|/)\.env' | grep -vE '\.example$' || true)"
ENV_SECRET=""
for f in $ENV_TRACKED; do
  if git show "HEAD:$f" 2>/dev/null | grep -qiE '^[A-Z0-9_]*(KEY|SECRET|TOKEN|PASSWORD|SERVICE_ROLE)[A-Z0-9_]*[[:space:]]*='; then
    ENV_SECRET+="$f "
  fi
done
if [[ -n "$ENV_SECRET" ]]; then
  row FAIL "No secrets in tracked .env files" "key-like variables in: $ENV_SECRET-- untrack them and rotate the values"
elif [[ -n "$ENV_TRACKED" ]]; then
  row WARN "No secrets in tracked .env files" "tracked but no key-like vars: $(echo "$ENV_TRACKED" | tr '\n' ' ')-- never add secrets to them"
else
  row PASS "No secrets in tracked .env files" ""
fi

# --- Secret scan (added lines vs base, plus untracked files) -------------
EXCLUDE=(':!scripts/pre-push-check.sh' ':!.claude/skills/**' ':!package-lock.json')
ADDED="$LOG_DIR/added.txt"
{ git diff "$BASE" -- . "${EXCLUDE[@]}" | grep -E '^\+[^+]' || true
  git ls-files --others --exclude-standard -- . "${EXCLUDE[@]}" | while read -r f; do
    [[ -f "$f" ]] && sed 's/^/+/' "$f"
  done
} >"$ADDED"

SECRET_HITS=""
grep -nE 'eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}' "$ADDED" >/dev/null && SECRET_HITS+="JWT-looking token; "
grep -nE 'sb_secret_[A-Za-z0-9]' "$ADDED" >/dev/null && SECRET_HITS+="sb_secret_ key; "
grep -nE -- '-----BEGIN [A-Z ]*PRIVATE KEY-----' "$ADDED" >/dev/null && SECRET_HITS+="private key; "
grep -nE 'SERVICE_ROLE(_KEY)?[[:space:]]*[=:][[:space:]]*["'\'']?[A-Za-z0-9]' "$ADDED" >/dev/null && SECRET_HITS+="service_role key value; "
# Only real uses (process.env.X or an X= assignment), not a comment that
# merely names the variable -- explaining why a key was removed is not a leak.
PUB="$(grep -oE '(process\.env\.NEXT_PUBLIC_[A-Z0-9_]*(KEY|SECRET|TOKEN)[A-Z0-9_]*|^\+[[:space:]]*NEXT_PUBLIC_[A-Z0-9_]*(KEY|SECRET|TOKEN)[A-Z0-9_]*[[:space:]]*=)' "$ADDED" | grep -oE 'NEXT_PUBLIC_[A-Z0-9_]*' | grep -vE 'NEXT_PUBLIC_SUPABASE_(ANON_KEY|URL)' | sort -u | tr '\n' ' ' || true)"
[[ -n "$PUB" ]] && SECRET_HITS+="secret-looking public env var(s) shipped to the browser: $PUB; "
if [[ -n "$SECRET_HITS" ]]; then
  row FAIL "Secret scan (vs $BASE_REF)" "$SECRET_HITS"
else
  row PASS "Secret scan (vs $BASE_REF)" ""
fi
if grep -iE 'service_role' "$ADDED" | grep -viE '^\+.*(grant|revoke|to service_role|role service_role|--)' >/dev/null; then
  row WARN "service_role mention" "added lines mention service_role outside SQL grants -- make sure no key or client uses it in the browser"
fi

# --- Migrations ---------------------------------------------------------
MIGS="$( { git diff --name-only --diff-filter=AM "$BASE" -- supabase/migrations
          git ls-files --others --exclude-standard -- supabase/migrations; } | grep -E '\.sql$' | sort -u || true)"
if [[ -z "$MIGS" ]]; then
  row PASS "Migrations" "none changed"
else
  for m in $MIGS; do
    [[ -f "$m" ]] || continue
    name="$(basename "$m")"
    # SQL with "--" comments stripped, for the content checks below: a header
    # that EXPLAINS a current_date bug must not trip the current_date check.
    sql="$(sed -E 's/--.*$//' "$m")"
    if grep -qiE '^--.*\b(down|rollback)\b' "$m"; then
      row PASS "Migration $name: down block" ""
    else
      row FAIL "Migration $name: down block" "no '-- down' / rollback section on record"
    fi
    if grep -qiE '^[[:space:]]*(drop|truncate)[[:space:]]' "$m"; then
      row WARN "Migration $name: destructive" "DROP/TRUNCATE -- confirm it is intended and backed up (npm run db:backup-prod)"
    fi
    if grep -iE '^[[:space:]]*delete[[:space:]]+from[[:space:]]+[^;]*;' "$m" | grep -viqE 'where'; then
      row WARN "Migration $name: DELETE without WHERE" "deletes every row of a table"
    fi
    if grep -qiE 'default[[:space:]]+(current_date|now\(\)::date|\(now\(\)\)::date)' <<<"$sql"; then
      row WARN "Migration $name: UTC date default" "current_date is UTC; Bogotá is UTC-5 -> use (now() at time zone 'America/Bogota')::date"
    fi
    # "is not null" is a condition, not a NOT NULL column.
    if grep -iE 'not null' <<<"$sql" | grep -qviE 'is[[:space:]]+not[[:space:]]+null'; then
      row WARN "Migration $name: NOT NULL" "check every UI insert path actually sends this column (metas.fecha_meta bug)"
    fi
  done
  row WARN "Migrations go to staging first" "link staging ($STAGING_REF), cat supabase/.temp/project-ref, migration list, db push, rm -rf supabase/.temp -- then prod"
fi

# --- Build pipeline -----------------------------------------------------
NOTE_DATALESS=""
if [[ ! -d node_modules ]]; then
  row FAIL "node_modules" "missing -- run npm ci (on Node 20)"
  SKIP_HEAVY=1
elif [[ -n "$(find node_modules -flags +dataless -print -quit 2>/dev/null || true)" ]]; then
  row FAIL "node_modules readable" "files are iCloud-evicted (dataless); tsc/build would hang forever"
  NOTE_DATALESS=1
  SKIP_HEAVY=1
else
  row PASS "node_modules readable" "no iCloud-dataless files"
  SKIP_HEAVY=""
fi

if [[ -n "$SKIP_HEAVY" ]]; then
  row SKIP "typecheck / lint / tests / build" "see above"
else
  run_step "typecheck" 300 npm run -s typecheck
  # `next lint` with no config waits on an interactive prompt forever.
  # compgen, not `ls a* b*`: ls fails when EITHER glob matches nothing, which
  # reported "no config" while .eslintrc.json was sitting right there.
  if compgen -G '.eslintrc*' >/dev/null || compgen -G 'eslint.config.*' >/dev/null; then
    run_step "lint" 300 npm run -s lint
  else
    row FAIL "lint" "no ESLint config -- next lint would block on its setup prompt"
  fi
  for t in $(node -e 'console.log(Object.keys(require("./package.json").scripts).filter(k=>k.startsWith("test:")).join(" "))'); do
    run_step "$t" 120 npm run -s "$t"
  done
  if [[ -n "$QUICK" ]]; then
    row SKIP "build" "--quick"
  else
    run_step "build" 900 npm run -s build
  fi
fi

# --- Report -------------------------------------------------------------
echo ""
printf '%-6s  %-40s  %s\n' "RESULT" "CHECK" "DETAIL"
printf '%-6s  %-40s  %s\n' "------" "-----" "------"
for r in "${ROWS[@]}"; do
  IFS='|' read -r s c d <<<"$r"
  printf '%-6s  %-40s  %s\n' "$s" "$c" "$d"
done
echo ""

if [[ -n "$NOTE_DATALESS" ]]; then
  cat <<'EOF'
NOTE: ~/Desktop is iCloud-synced and node_modules files are evicted. Either
  move the repo out of ~/Desktop (or set iCloud to "Keep Downloaded"), or verify
  in a fresh clone outside iCloud:
    git clone --branch "$(git rev-parse --abbrev-ref HEAD)" <repo-url> /tmp/finanzas-check
    cd /tmp/finanzas-check && npm ci && bash scripts/pre-push-check.sh
  (push your branch first, or clone from this local repo path instead of GitHub).

EOF
fi

rm -f "$ADDED"
if [[ $FAILED -ne 0 ]]; then
  echo "NO-GO: fix the FAIL rows above. Logs: $LOG_DIR"
  exit 1
fi
echo "GO: all checks passed (review WARN rows). Logs: $LOG_DIR"
