-- ============================================================================
-- M10a: pagos_recurrentes.generar_desde -- when a rule starts generating.
--
-- Two jobs, one column.
--
-- 1) THE FEATURE. A recurring rule had no start date, so it implicitly applied
--    to all of history. Creating a rule in October for a bill you have paid
--    since January gave no way to say "start from now".
--
-- 2) THE SHIP-DAY GUARANTEE. Recurring generation has never actually run in
--    production (a ref-guard bug in RecurringProcessor, fixed on this branch).
--    Deploying that fix is what switches the feature on -- so without this
--    column, the very first page load after release would generate movimientos
--    for the CURRENT month, for every rule whose day has already passed and
--    whose name does not match something already entered. That is 2 rows today,
--    and it would land silently in real users' books on release day.
--
--    Backfilling existing rules to the first day of the month AFTER this
--    migration runs means release day adds NOTHING, and generation begins
--    cleanly at the next month boundary. Deliberately computed from now()
--    rather than hardcoded, so it stays correct whenever it is applied.
--
-- Risk: LOW. Additive; no existing value is read or rewritten.
-- Reversible: yes (down block at the bottom).
-- ============================================================================

alter table public.pagos_recurrentes
  add column if not exists generar_desde date;

comment on column public.pagos_recurrentes.generar_desde is
  'First date this rule may generate a movimiento. A scheduled date earlier '
  'than this is skipped, so rules never generate retroactively.';

-- Existing rules: start at the beginning of NEXT month, so the release itself
-- creates nothing. 'America/Bogota' because that is where these users are and
-- the server runs UTC -- near midnight the UTC date is already tomorrow, which
-- at a month boundary would pick the wrong month.
update public.pagos_recurrentes
   set generar_desde = (date_trunc('month', (now() at time zone 'America/Bogota')::date)
                        + interval '1 month')::date
 where generar_desde is null;

-- New rules start the day they are created: a rule added mid-month will not
-- back-generate for a day that has already passed.
alter table public.pagos_recurrentes
  alter column generar_desde set default current_date,
  alter column generar_desde set not null;

do $$
declare n integer;
begin
  select count(*) into n from public.pagos_recurrentes where generar_desde is null;
  if n > 0 then
    raise exception 'M10a: % rules left without generar_desde', n;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Teach the generator about it.
-- Identical to the M9 version except for the generar_desde check and the new
-- 'aun_no_inicia' outcome.
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
    select pr.id, pr.nombre, pr.importe, pr.id_tipo_movimiento, pr.dia_mes, pr.generar_desde
      from public.pagos_recurrentes pr
     where pr.usuario_id = v_usuario_id
       and pr.activo
     order by pr.dia_mes
  loop
    -- A rule set to the 31st still fires in February, on the 28th/29th.
    v_dia   := least(r.dia_mes, v_ultimo_dia);
    v_fecha := v_inicio_mes + (v_dia - 1);

    -- Never generate for a date before the rule starts.
    if v_fecha < r.generar_desde then
      accion := 'aun_no_inicia'; regla := r.nombre; movimiento_id := null;
      return next; continue;
    end if;

    if v_dia > extract(day from v_hoy)::int then
      accion := 'espera'; regla := r.nombre; movimiento_id := null;
      return next; continue;
    end if;

    -- Match on name within the month regardless of origin, so a movimiento the
    -- user typed by hand counts as already present.
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

    insert into public.movimientos
      (usuario_id, nombre, importe, id_tipo_movimiento, fecha, recurring_id)
    values
      (v_usuario_id, r.nombre, r.importe, r.id_tipo_movimiento, v_fecha, r.id)
    on conflict (recurring_id, (date_trunc('month', fecha::timestamp)))
      where recurring_id is not null
      do nothing
    returning id into v_id;

    if v_id is null then accion := 'omite_carrera'; else accion := 'genera'; end if;
    regla := r.nombre; movimiento_id := v_id;
    return next;
  end loop;
end;
$$;

revoke all on function public.generar_recurrentes_del_mes(date) from public, anon;
grant execute on function public.generar_recurrentes_del_mes(date) to authenticated;

-- ---------------------------------------------------------------------------
-- down (not auto-run by the Supabase CLI; written so the rollback is on record)
--
--   alter table public.pagos_recurrentes drop column if exists generar_desde;
--   -- then re-apply the M9 version of generar_recurrentes_del_mes, which does
--   -- not reference the column.
-- ---------------------------------------------------------------------------
