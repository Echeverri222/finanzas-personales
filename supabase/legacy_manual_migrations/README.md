# Legacy manual migrations

These two SQL files (`001_pagos_recurrentes.sql`, `002_tags.sql`) were originally
run **by hand** in the Supabase SQL editor against production — they were never
tracked in the CLI migration history.

They are kept here for reference only. They are **not** applied by `supabase db reset`
because the complete production schema (including the tables/policies they created)
is already captured in `../migrations/0000_remote_schema.sql`, which was produced by
`supabase db dump --schema public`. That dump is the single source of truth for local
development.
