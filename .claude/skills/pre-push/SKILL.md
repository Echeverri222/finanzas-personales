---
name: pre-push
description: Safety gate for finanzas-personales before any `git push`, PR merge, Vercel deploy (staging or prod), or Supabase migration push. Use it whenever the user says push, ship, deploy, merge, release, "is this safe to push", or before Claude itself proposes a push/deploy. Runs scripts/pre-push-check.sh (Node 20, branch, leftovers, secrets, migrations, typecheck, lint, tests, build) and walks the staging-first migration and bundle-isolation checks, ending in a go/no-go.
---

# Pre-push gate

Nothing leaves this machine (push, deploy, migration) until this passes.
Run it after `revisar-cambio` and before the push, not instead of it.

## 1. Run the script

```bash
npm run prepush              # full gate, includes `next build` (~2-4 min)
npm run prepush -- --quick   # skip the build, for intermediate pushes
```

It prints a PASS / WARN / FAIL / SKIP table and exits 1 on any FAIL. What it checks:

| Area | FAIL when | WARN when |
|---|---|---|
| Node | not v20 (it prepends `~/.nvm/versions/node/v20.20.2/bin`) | |
| Branch | target is `main` without `ALLOW_MAIN_PUSH=1` | working tree dirty |
| Leftovers | `supabase/migrations/*_staging_data_sync.sql` exists (real financial data); `supabase/.temp/project-ref` is **prod**; a tracked `.env*` holds key-like vars | `supabase/.temp` exists (breaks local `supabase start`); a tracked `.env*` with only public values |
| Secrets (added lines vs upstream, + untracked files) | JWT-looking token, `sb_secret_`, private key, service_role key value, `NEXT_PUBLIC_*KEY/SECRET/TOKEN` other than the Supabase anon key/URL | `service_role` mentioned outside SQL grants |
| Migrations changed | no `-- down` / rollback section | DROP/TRUNCATE, DELETE without WHERE, `default current_date` (UTC bug), any NOT NULL, plus a staging-first reminder |
| Pipeline | typecheck, lint, every `test:*` script, build fail or time out | |

Never "fix" a FAIL by weakening the script. If a check is wrong, say so and fix the check deliberately.

### When it hangs or a heavy step times out

- **iCloud dataless files**: `~/Desktop` is iCloud-synced, and evicted files in `node_modules` make tsc and the build block forever. The script detects this and skips the heavy steps instead of hanging. Workaround: clone the branch into the scratchpad, `npm ci`, and run the script there.
- **ESLint first-run prompt**: `next lint` with no config waits on an interactive prompt. `.eslintrc.json` must exist (the script checks).
- **Wrong Node**: Homebrew Node 25/26 shadows nvm. Next 14 hangs on it.

## 2. If any migration changed: staging first, always

Migrations reach **staging** (`tswabgfnkwbcbwammnbi`) before prod (`vvzadoagclwzjuhgbwgf`). `supabase link` needs a TTY, so hand these steps to the user to run in a real terminal:

```bash
supabase link --project-ref tswabgfnkwbcbwammnbi
cat supabase/.temp/project-ref     # MUST print tswabgfnkwbcbwammnbi
supabase migration list            # read-only: confirm exactly what is pending
supabase db push
rm -rf supabase/.temp              # unlink; a live link breaks local `supabase start`
```

- Never `supabase config push` while linked: `config.toml` has `site_url = localhost`, and pushing it to prod locks every user out.
- Don't work around the link with `db push --db-url ...`. Hand-carrying the DB password is worse than the prompt.
- Back up prod before a prod migration: `npm run db:backup-prod`.
- After applying a migration, run `npm run db:invariants` if the migration touches money or balances.

## 3. After a deploy: verify isolation from the bundle

Config can lie. The built bundle can't, because `NEXT_PUBLIC_*` is inlined at build time.

```bash
URL=https://finanzas-staging-silk.vercel.app     # or the prod URL
curl -s "$URL" | grep -o '/_next/static/chunks/pages/_app-[^"]*\.js' | head -1 \
  | xargs -I{} curl -s "$URL{}" | grep -o 'tswabgfnkwbcbwammnbi\|vvzadoagclwzjuhgbwgf' | sort -u
```

Staging must print only `tswabgfnkwbcbwammnbi`; prod only `vvzadoagclwzjuhgbwgf`. Staging is SSO-protected, so if curl gets a login page, use the `vercel:access-protected-vercel-deployment` skill or check in the browser.

Remember: this working copy's `.vercel/` links to the **finanzas-staging** Vercel project, so `vercel deploy --prod` here ships to staging. Production deploys come from `main` on the prod project.

## 4. Who presses the button

Sandbox limits from earlier sessions: Claude's sandbox blocks remote destructive writes. Hand these to the user from the start, with the exact command, instead of attempting them:
`git push` (when not explicitly requested), `gh pr merge`, `supabase db push` against a remote, `vercel env add`, `supabase projects api-keys`, and anything that reveals `service_role` keys.

## 5. Report: go / no-go

End with exactly this shape:

```
PRE-PUSH: GO | NO-GO
- Script: <n> PASS, <n> WARN, <n> FAIL (build: ran | skipped)
- Blocking: <each FAIL, one line, with the fix>
- Warnings accepted: <each WARN and why it is fine, or "none">
- Migrations: none | applied to staging ✔ / pending on staging ✘ / prod pending
- Next step for the user: <exact command, e.g. `git push origin staging`>
```

GO requires zero FAIL rows. Every WARN must also be explained, and any changed migration must already be applied to staging.

## Enabling it as a real git hook (one-time, per clone)

```bash
git config core.hooksPath .githooks
```

After that, `git push` runs the full gate automatically (`PREPUSH_FLAGS=--quick git push` for a fast run, `--no-verify` only in an emergency).
