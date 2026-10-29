---
name: revisar-cambio
description: Repo-specific code review for finanzas-personales. Use before committing or pushing any change, when the user asks to review a diff, branch or PR, or asks "is this change safe". Checks the bugs this app has actually shipped: UTC dates for a Bogotá user, es-CO money parsing, Supabase RLS/usuario_id scoping, raw Postgres errors in the UI, SWR invalidation, secrets in NEXT_PUBLIC_*, native alert/confirm, migration safety and schema-vs-UI drift. Ends with a safe-to-ship verdict.
---

# Revisar cambio

A review tuned to this codebase's real failure modes. Pair it with `pre-push` before anything ships.

## 1. Get the diff

Pick the first that applies:

- A PR number is given: `gh pr diff <n>` and `gh pr view <n>`.
- A branch is given: `git diff $(git merge-base HEAD <branch>)...HEAD`. The usual bases are `staging`, then `main`.
- Otherwise, use the working tree: `git diff HEAD` (staged and unstaged) plus `git status --porcelain` for untracked files. Read untracked files whole.

Read every changed file **in full**, not just the hunks: most bugs here are a hunk that looks fine but disagrees with a caller, a hook or the schema. For each migration, also open the latest definition of every table or function it touches (`grep -rn "<table>" supabase/migrations`).

If the diff is non-trivial (more than ~50 lines, any migration, or any money/date logic), also run the built-in **/code-review** for generic correctness, and merge its findings into this report.

## 2. Checklist

**Dates (the #1 bug class here).** Users are in Bogotá (UTC-5). The server and Postgres run in UTC.
- Never derive a calendar day from `toISOString()`, `toJSON()` or `new Date('yyyy-mm-dd')`. After 19:00 local time the first gives *tomorrow*, and the last parses as UTC midnight, which is *yesterday* locally. Use local getters, `todayISO()` from `lib/format.js`, or `createSafeDate()` from `lib/dateUtils.ts`.
- In SQL, `current_date`, `now()::date` and `default current_date` give the UTC day. Use `(now() at time zone 'America/Bogota')::date`, or have the client send the local date.
- Month boundaries: an entry made on the last evening of a month must land in that month.

**Money (es-CO).**
- `.` is the thousands separator and `,` is the decimal. A `type="number"` input reads `12.345` as 12.345, and a peso display rounds it to $12 with no error. Money inputs must parse es-CO (or reject ambiguity), never `parseFloat` raw user text.
- Display goes through `formatCurrency` / `formatNumber`. No hand-built `toFixed` strings, and don't mix `13777.23` and `699.838,47` on one screen.
- Sign conventions follow `components/money/Amount.tsx` and `lib/ahorros.js`. Changes there need `npm run test:ahorros` / `test:patrimonio`.

**Supabase data access.**
- Every query and mutation is scoped by `.eq('usuario_id', usuarioId)`, even with RLS on. New tables get RLS enabled plus policies that compare through `usuarios.user_id = auth.uid()`, since `usuario_id` is *not* `auth.uid()`.
- New RPCs: `security invoker` unless there is a written reason; `revoke ... from public, anon`; `grant execute ... to authenticated`.
- Raw Postgres or PostgREST errors never reach the user. Messages like `duplicate key value violates unique constraint "..."` must become Spanish copy, keyed on the error code (`23505` unique, `23502` not null, `23503` FK).

**Schema vs UI drift.**
- Every NOT NULL column without a default must be sent by **every** insert path in the UI. Missing one is how `metas.fecha_meta` made "Nueva meta" fail with a 400 for every user.
- New columns: is there a default that existing rows and old clients survive? Does `types/supabase.ts` need `npm run db:types`?
- Renamed or removed columns: grep the whole repo for the old name, including `select(...)` strings.

**SWR cache.**
- After a write, every key whose data changed is invalidated or mutated, not just the hook's own key. Example: the recurring generator writes `movimientos`, so `['movimientos', usuarioId]` must be revalidated too.
- Optimistic updates roll back on error.

**Secrets and config.**
- `NEXT_PUBLIC_*` ships to every browser. Only the Supabase URL and anon key belong there. Third-party API keys go through an API route (`pages/api/*`).
- No `service_role` key in client code, and no `.env*` files or tokens in the diff.

**UI conventions.**
- No `window.alert` / `window.confirm` / `prompt`. Use the `alert-dialog` / `dialog` components and inline errors.
- All user-facing copy is in Spanish, including validation messages and empty states.
- Forms: labels tied to inputs (`htmlFor`/`id`), icon-only buttons have `aria-label`, focus is visible, errors announced near the field. Empty states that come from active filters offer a way to clear them.
- Query params a link relies on (e.g. `?tipo=ahorros`) are actually read by the target page.

**Migrations** (`supabase/migrations/`).
- The header states what changed, why, the risk level and whether it is reversible. There is a `-- down` block on record.
- Idempotent: `if not exists` / `create or replace` / `drop ... if exists`.
- Backfills are safe for existing rows and computed, not hardcoded dates. They cover every user, not only the test user.
- Destructive statements (DROP, TRUNCATE, DELETE without WHERE, type narrowing) are called out, with a backup step.
- Dates follow the timezone rule above. Defaults match what the UI sends.
- The migration ships to staging before prod (see `pre-push`).

**Scope hygiene.**
- No leftover `console.log` debugging, no committed `*_staging_data_sync.sql`, no edits to `supabase/.temp`.
- The comments in this repo explain *why*. Keep that density, and don't strip existing rationale comments.

## 3. Verify before reporting

For every candidate finding, re-open the code and confirm it: trace the caller, check the schema, or run the relevant `test:*` script. Drop anything you cannot point to concretely. Mark a finding PLAUSIBLE (instead of CONFIRMED) only when it depends on runtime state you cannot check, such as remote DB contents.

## 4. Report

```
REVISIÓN: <scope reviewed, e.g. "working tree vs HEAD, 7 files">

1. [CRITICAL] path/to/file.js:42 — <one-line defect>
   Failure: <concrete input/state → wrong result>
   Fix: <smallest correct change>
2. [HIGH] ...
3. [MEDIUM] / [LOW] ...

Verdict: SAFE TO SHIP | NOT YET — <one line: what blocks it>
```

Severity: **CRITICAL** = data loss or corruption, a security issue, or a feature broken for everyone. **HIGH** = wrong numbers or dates for real users in common cases. **MEDIUM** = edge cases, UX that misleads. **LOW** = polish.
Any CRITICAL or HIGH finding means NOT YET. If there are no findings, say so plainly and give the verdict.
