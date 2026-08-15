-- ============================================================================
-- M9: make recurring generation safe and manual-entry aware.
--
-- The old client-side loop (hooks/useRecurring.js processRecurringForToday)
-- had four problems:
--
--   1. It only asked "has THIS RULE already generated a movimiento this month?"
--      -- a check keyed on recurring_id. A movimiento the user typed in by hand
--      has recurring_id = NULL and is therefore invisible to it. Since the
--      feature has never actually run in production, every user has been
--      entering these payments manually for months, so the first successful run
--      would have duplicated all of them. Observed live: 'Arriendo' for August
--      existed twice, once manual and once generated, both 2.500.000.
--   2. One SELECT + one INSERT per rule, from the browser, in a loop.
--   3. No transaction and no constraint, so two tabs could interleave and both
--      insert.
--   4. The INSERT's error was discarded entirely (no `const { error } =`), so
--      every failure was silent -- which is why this went unnoticed.
--
-- This replaces the loop with a single atomic RPC plus a database-level
-- backstop.
--
-- MATCHING RULE -- deliberately name-based and amount-INSENSITIVE.
-- Measured against production: 'Datos' had 0 of 7 manual entries at the rule's
-- amount and 'Internet' only 1 of 11, because those bills fluctuate. Matching
-- on amount would therefore have duplicated exactly the rules that vary most.
-- Names, by contrast, matched exactly in every case.
--
-- The asymmetry that drives this: skipping a generation is recoverable -- the
-- user adds the movimiento by hand, as they already do today. Creating a
-- duplicate silently corrupts every total that movimiento feeds. So when in
-- doubt this skips.
--
-- SCOPE: current month only, same as the old behaviour. This deliberately does
-- NOT backfill missed months -- with rules dating back to February that would
-- generate a wave of rows on first run.
--
-- Risk: MEDIUM. Reversible: yes (down block at the bottom).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Database-level backstop.
-- Even if application logic is wrong, one rule can produce at most one
-- movimiento per calendar month. This is what makes the two-tab race
-- impossible rather than merely unlikely.
--
-- fecha is a `date`; date_trunc('month', date) resolves to the timestamptz
-- overload, which is only STABLE and so cannot be indexed. The explicit
-- ::timestamp cast selects the IMMUTABLE overload.
-- ---------------------------------------------------------------------------
create unique index if not exists movimientos_recurring_mes_uniq
  on public.movimientos (recurring_id, (date_trunc('month', fecha::timestamp)))
  where recurring_id is not null;

comment on index public.movimientos_recurring_mes_uniq is
  'One movimiento per recurring rule per month. Backstop against concurrent generation.';

-- ---------------------------------------------------------------------------
-- 2. Generation as a single atomic call.
--
-- SECURITY INVOKER (the default) on purpose: RLS still applies, so a caller can
-- only ever touch their own rows. The usuario_id is derived from auth.uid()
-- rather than taken as a parameter, so one user cannot generate movimientos
-- into another user's account by passing someone else's id.
--
-- p_hoy exists because the server runs in UTC while these users are in
-- UTC-5: after 19:00 Bogota, `current_date` on the server is already tomorrow,
-- which would run a rule a day early. The client passes its own local date.
-- ---------------------------------------------------------------------------
create or replace function public.generar_recurrentes_del_mes(p_hoy date default null)
returns table (accion text, regla text, movimiento_id uuid)
language plpgsql
as $$
declare
  v_usuario_id uuid;
  v_hoy        date;
  v_inicio_mes date;
  v_ultimo_dia int;
  r            record;
  v_dia        int;
  v_fecha      date;
  v_id         uuid;
begin
  select u.id into v_usuario_id
    from public.usuarios u
   where u.user_id = auth.uid();

  if v_usuario_id is null then
    raise exception 'generar_recurrentes_del_mes: no usuario profile for auth.uid() %', auth.uid();
  end if;

  v_hoy        := coalesce(p_hoy, (now() at time zone 'America/Bogota')::date);
  v_inicio_mes := date_trunc('month', v_hoy)::date;
  v_ultimo_dia := extract(day from (v_inicio_mes + interval '1 month - 1 day'))::int;

  for r in
    select pr.id, pr.nombre, pr.importe, pr.id_tipo_movimiento, pr.dia_mes
      from public.pagos_recurrentes pr
     where pr.usuario_id = v_usuario_id
       and pr.activo
     order by pr.dia_mes
  loop
    -- A rule set to the 31st still fires in February, on the 28th/29th.
    v_dia := least(r.dia_mes, v_ultimo_dia);

    if v_dia > extract(day from v_hoy)::int then
      accion := 'espera'; regla := r.nombre; movimiento_id := null;
      return next; continue;
    end if;

    -- The fix: match on name within the month regardless of origin, so a
    -- movimiento the user typed by hand counts as already present.
    if exists (
      select 1 from public.movimientos m
       where m.usuario_id = v_usuario_id
         and lower(btrim(m.nombre)) = lower(btrim(r.nombre))
         and m.fecha >= v_inicio_mes
         and m.fecha <  (v_inicio_mes + interval '1 month')
    ) then
      accion := 'omite'; regla := r.nombre; movimiento_id := null;
      return next; continue;
    end if;

    v_fecha := v_inicio_mes + (v_dia - 1);

    -- ON CONFLICT covers the race the index makes detectable: if a concurrent
    -- session inserted between the check above and here, this is a no-op
    -- instead of an error.
    insert into public.movimientos
      (usuario_id, nombre, importe, id_tipo_movimiento, fecha, recurring_id)
    values
      (v_usuario_id, r.nombre, r.importe, r.id_tipo_movimiento, v_fecha, r.id)
    on conflict (recurring_id, (date_trunc('month', fecha::timestamp)))
      where recurring_id is not null
      do nothing
    returning id into v_id;

    if v_id is null then
      accion := 'omite_carrera';
    else
      accion := 'genera';
    end if;
    regla := r.nombre; movimiento_id := v_id;
    return next;
  end loop;
end;
$$;

comment on function public.generar_recurrentes_del_mes(date) is
  'Generates this month''s movimientos for the calling user''s active recurring '
  'rules. Idempotent. Skips a rule when a movimiento with the same name already '
  'exists this month, whether generated or entered manually.';

revoke all on function public.generar_recurrentes_del_mes(date) from public, anon;
grant execute on function public.generar_recurrentes_del_mes(date) to authenticated;

-- ---------------------------------------------------------------------------
-- down (not auto-run by the Supabase CLI; written so the rollback is on record)
--
--   drop function if exists public.generar_recurrentes_del_mes(date);
--   drop index    if exists public.movimientos_recurring_mes_uniq;
--
-- Dropping these cannot lose data. Any movimientos already generated stay --
-- they are ordinary rows.
-- ---------------------------------------------------------------------------
