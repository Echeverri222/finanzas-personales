-- ============================================================================
-- M2: give categories an explicit semantic type.
--
-- Income/expense/savings was decided by comparing the category NAME to the
-- literal strings 'Ingresos' and 'Ahorro' (hooks/useDashboardData.js,
-- pages/ahorros.js, and four view files). Renaming a category in
-- /gestion-tipos silently reclassified every historical movimiento, and
-- nothing stopped two categories sharing a name.
--
-- The classification moves onto the row. `nombre` is NEVER modified: every user
-- keeps the exact labels they chose, including the 'Alimentacion' /
-- 'Alimentación' spelling split, which is two different users' preferences and
-- not a data-quality problem to merge.
--
-- Five values, not three. Measured from production:
--   * camilo's  'Inversiones' is money lent out (Prestamo a HERNAN/Alvaro)
--   * simon's   'Inversiones' is actual investing (Binance, eToro)
-- Same name, two meanings, two different rows. Because `tipo` lives on the
-- per-user tipo_movimiento row, both are representable -- but it means the
-- backfill CANNOT be a name -> tipo map. Unambiguous names go by rule;
-- ambiguous ones are listed explicitly and the migration REFUSES to guess.
--
-- Risk: MEDIUM. Reversible: yes (down block at the bottom).
-- Verify with: npm run db:invariants -- diff   (section 6 must be unchanged)
-- ============================================================================

create type public.tipo_categoria as enum
  ('ingreso', 'gasto', 'ahorro', 'inversion', 'prestamo');

comment on type public.tipo_categoria is
  'What a category means for reporting. Replaces string-matching on nombre.';

alter table public.tipo_movimiento
  add column tipo public.tipo_categoria;

-- --------------------------------------------------------------------------
-- Step 1: names whose meaning is unambiguous across all users.
-- Anything not named here falls through to 'gasto', which is exactly what the
-- old client did (`tipo_nombre !== 'Ingresos' && !== 'Ahorro'` -> expense),
-- so this reproduces today's behaviour rather than inventing new answers.
-- --------------------------------------------------------------------------
update public.tipo_movimiento
   set tipo = case nombre
                when 'Ingresos' then 'ingreso'
                when 'Ahorro'   then 'ahorro'
                else                 'gasto'
              end::public.tipo_categoria
 where tipo is null
   and nombre not in ('Inversiones');   -- ambiguous, handled below

-- --------------------------------------------------------------------------
-- Step 2: ambiguous names, resolved per category row.
-- Keyed by tipo_movimiento.id because ids are stable; emails are not.
-- --------------------------------------------------------------------------

-- camilo.jcez@gmail.com -- 6 movimientos, all loans to named people
update public.tipo_movimiento set tipo = 'prestamo'
 where id = '29fe6c27-e86c-440a-b060-116ddcb7b240';

-- simon.echeverri2003@gmail.com -- 4 movimientos, brokerage/crypto deposits
update public.tipo_movimiento set tipo = 'inversion'
 where id = '46142113-d099-498f-9b7c-47e3ec0613fb';

-- --------------------------------------------------------------------------
-- Step 3: refuse to guess.
-- If production grew another ambiguous-name category after this migration was
-- written, fail here. A loud failure is recoverable; a silent misclassification
-- quietly corrupts every total that category feeds.
-- --------------------------------------------------------------------------
do $$
declare
  unresolved integer;
  detalle    text;
begin
  select count(*),
         coalesce(string_agg(format('%s (id=%s, usuario=%s)', nombre, id, usuario_id), '; '), '')
    into unresolved, detalle
    from public.tipo_movimiento
   where tipo is null;

  if unresolved > 0 then
    raise exception
      'M2: % categoria(s) with an ambiguous name have no explicit tipo: %. '
      'Add an explicit UPDATE for each in step 2 of this migration -- do not '
      'let them default.', unresolved, detalle;
  end if;
end $$;

alter table public.tipo_movimiento
  alter column tipo set not null,
  alter column tipo set default 'gasto';

comment on column public.tipo_movimiento.tipo is
  'Semantic type for reporting. Read this instead of matching on nombre.';

-- --------------------------------------------------------------------------
-- Step 4: stop two categories from sharing a name for one user.
-- Verified zero violations in production. Cross-user duplicates stay legal --
-- different people naturally pick the same names.
-- --------------------------------------------------------------------------
alter table public.tipo_movimiento
  add constraint tipo_movimiento_usuario_nombre_key unique (usuario_id, nombre);

-- Dashboard/ahorros filter by tipo per user on every load.
create index if not exists tipo_movimiento_usuario_tipo_idx
  on public.tipo_movimiento (usuario_id, tipo);

-- --------------------------------------------------------------------------
-- down (not auto-run by the Supabase CLI; kept so the rollback is written down)
--
--   drop index  if exists public.tipo_movimiento_usuario_tipo_idx;
--   alter table public.tipo_movimiento
--     drop constraint if exists tipo_movimiento_usuario_nombre_key;
--   alter table public.tipo_movimiento drop column if exists tipo;
--   drop type   if exists public.tipo_categoria;
--
-- Safe: no data outside the dropped column is touched, and `nombre` -- which
-- the old client reads -- was never modified.
-- --------------------------------------------------------------------------
