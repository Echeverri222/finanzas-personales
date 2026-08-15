-- Custom roles for the local dev stack. The CLI runs this as init-scripts/99-roles.sql.
--
-- Contents mirror production (captured via `supabase db dump --linked --role-only`)
-- so local enforces the same statement timeouts prod does -- a query that would
-- time out against prod also times out locally. Keep in sync if prod roles change.
--
-- Unrelated gotcha, documented here because the symptom points at this file:
-- if `supabase start` loops with
--   psql: error: .../init-scripts/99-roles.sql: No such file or directory
-- the cause is stale CLI state, not a missing file. Fix with `rm -rf supabase/.temp`.
-- Known CLI bug, tends to appear right after `supabase link`.
-- See https://github.com/supabase/cli/issues/4756

ALTER ROLE "anon" SET "statement_timeout" TO '3s';
ALTER ROLE "authenticated" SET "statement_timeout" TO '8s';
ALTER ROLE "authenticator" SET "statement_timeout" TO '8s';
