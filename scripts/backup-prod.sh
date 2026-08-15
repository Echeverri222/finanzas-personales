#!/usr/bin/env bash
# Timestamped production backup, written OUTSIDE the repo.
#
#   npm run db:backup-prod
#
# Run this before every migration applied to production. Dumps land in
# ~/backups/finanzas/<timestamp>/ -- deliberately outside the working tree so a
# stray `git add -A` can never commit real financial data.
#
# Uses `supabase db dump`, which runs pg_dump inside a version-matched container.
# Do not substitute a local pg_dump: the Homebrew client here is 14.x and prod is
# Postgres 15, and pg_dump refuses to dump a newer server than itself.
set -euo pipefail

BACKUP_ROOT="${BACKUP_ROOT:-$HOME/backups/finanzas}"
DIR="$BACKUP_ROOT/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$DIR"

echo "==> Dumping production to $DIR"
supabase db dump --linked            -f "$DIR/schema.sql"
supabase db dump --linked --data-only -f "$DIR/data.sql"
supabase db dump --linked --role-only -f "$DIR/roles.sql"

echo "==> Sizes"
ls -la "$DIR"

echo ""
echo "==> Backup written: $DIR"
echo "    A dump you have never restored is not a backup. Verify it with:"
echo "      npm run db:restore-prod -- $DIR"
