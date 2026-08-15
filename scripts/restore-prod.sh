#!/usr/bin/env bash
# Rebuild the LOCAL database from a production dump.
#
#   npm run db:restore-prod                 # newest dump in ~/backups/finanzas
#   npm run db:restore-prod -- <dump-dir>   # a specific one
#
# Local dev normally runs on supabase/seed.sql (small, fake, safe). Use this when
# you need to rehearse a migration against real data shape and volume -- fake data
# proves nothing about a backfill.
#
# Writes ONLY to the local stack (127.0.0.1:54422). It never touches the linked
# remote: the URL is hardcoded below, not read from the CLI's link state.
set -euo pipefail

LOCAL_DB="postgresql://postgres:postgres@127.0.0.1:54422/postgres"
BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups/finanzas}"

DUMP_DIR="${1:-}"
if [[ -z "$DUMP_DIR" ]]; then
  DUMP_DIR=$(ls -1d "$BACKUP_ROOT"/*/ 2>/dev/null | sort | tail -1 || true)
  [[ -n "$DUMP_DIR" ]] || { echo "No dumps in $BACKUP_ROOT. Run: npm run db:backup-prod" >&2; exit 1; }
fi
DATA="${DUMP_DIR%/}/data.sql"
[[ -f "$DATA" ]] || { echo "Not found: $DATA" >&2; exit 1; }

# Refuse to run unless the local stack is actually the thing answering.
psql "$LOCAL_DB" -tAc 'select 1' >/dev/null 2>&1 \
  || { echo "Local stack not reachable on 54422. Run: npm run db:start" >&2; exit 1; }

echo "==> Restoring from: $DUMP_DIR"
echo "==> Target: LOCAL only ($LOCAL_DB)"

# Order matters, and getting it wrong silently invalidates the rehearsal.
#
# Data must land at the PRE-migration schema and then be migrated forward, so
# backfills actually process the real rows. Resetting to HEAD first and loading
# afterwards means new columns take their DEFAULT instead -- which looks like a
# clean run while proving nothing. That mistake made an M2 rehearsal report
# every category as 'gasto', including Ingresos.
#
# BASELINE_VERSION is the last migration that predates the dump.
BASELINE_VERSION="${BASELINE_VERSION:-0000}"

echo "==> Resetting to baseline schema (migration $BASELINE_VERSION, no seed)"
supabase db reset --version "$BASELINE_VERSION" --no-seed

echo "==> Clearing any residual data"
psql "$LOCAL_DB" -q -v ON_ERROR_STOP=1 <<'SQL'
set session_replication_role = replica;
truncate public.movimiento_tags, public.movimientos, public.tags, public.metas,
         public.pagos_recurrentes, public.tipo_movimiento, public.usuarios cascade;
truncate auth.users cascade;
SQL

echo "==> Loading production data"
# The dump sets session_replication_role = replica itself, so FKs and triggers
# stay out of the way while rows land in dump order.
psql "$LOCAL_DB" -q -v ON_ERROR_STOP=1 -f "$DATA"

echo "==> Applying migrations on top of real data (this is what exercises backfills)"
supabase migration up --local --include-all

echo "==> Row counts"
psql "$LOCAL_DB" -X -P pager=off -c "
select 'movimientos' t, count(*) from public.movimientos
union all select 'tipo_movimiento', count(*) from public.tipo_movimiento
union all select 'usuarios', count(*) from public.usuarios
union all select 'auth.users', count(*) from auth.users
order by 1;"

echo "==> Done. Local now mirrors production."
echo "    Log in with a real prod email; local auth accepts any password only if"
echo "    you reset it -- otherwise use the seed user from supabase/seed.sql."
