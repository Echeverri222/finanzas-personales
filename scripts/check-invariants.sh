#!/usr/bin/env bash
# Before/after invariant diff around a migration.
#
#   npm run db:invariants -- snapshot     # capture current state as the baseline
#   ...apply migration...
#   npm run db:invariants -- diff         # compare against the baseline
#   npm run db:invariants                 # just print current invariants
#
# A clean diff means the migration moved no money and dropped no rows. Any other
# diff must be one the migration intended -- read it, don't wave it through.
set -euo pipefail

LOCAL_DB="postgresql://postgres:postgres@127.0.0.1:54422/postgres"
DB_URL="${DB_URL:-$LOCAL_DB}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL="$HERE/supabase/tests/invariants.sql"
BASELINE="${BASELINE:-/tmp/finanzas-invariants-baseline.txt}"

run() { psql "$DB_URL" -X -q -P pager=off -f "$SQL"; }

case "${1:-show}" in
  snapshot)
    run > "$BASELINE"
    echo "Baseline saved: $BASELINE"
    ;;
  diff)
    [[ -f "$BASELINE" ]] || { echo "No baseline. Run: npm run db:invariants -- snapshot" >&2; exit 1; }
    CURRENT=$(mktemp)
    run > "$CURRENT"
    if diff -u "$BASELINE" "$CURRENT"; then
      echo "OK - invariants unchanged."
    else
      echo ""
      echo "!! Invariants CHANGED (diff above). Confirm every line was intended." >&2
      exit 1
    fi
    ;;
  show|*)
    run
    ;;
esac
