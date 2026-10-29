-- ============================================================================
-- M25: pagos_recurrentes -- start date in Bogotá time, and an optional end date.
--
-- 1) BUG. M10a set `generar_desde default current_date`. current_date is the
--    SERVER's date, and the server runs UTC: from 19:00 in Bogotá it is already
--    tomorrow. A rule for day 28 created on the 28th at 19:46 got
--    generar_desde = the 29th, so the generator answered 'aun_no_inicia' and
--    skipped the whole month -- while the UI said it started "en octubre".
--    M10a's own backfill used `now() at time zone 'America/Bogota'` for exactly
--    this reason; the column default just didn't. (The app now also sends
--    generar_desde explicitly from the browser's local date; this default is
--    the backstop for any other writer.)
--
-- 2) FEATURE. Installments ("Cuota moro", "Audífonos") end. Without an end
--    date the only way to stop one was to remember to pause it. generar_hasta
--    is the last date a rule may generate; null = no end.
--
-- Risk: LOW. Additive column (nullable, no backfill), a default change that
-- only affects future inserts, and the generator gains one early-exit branch.
-- Reversible: yes (down block at the bottom).
-- ============================================================================

alter table public.pagos_recurrentes
  alter column generar_desde set default ((now() at time zone 'America/Bogota')::date);

alter table public.pagos_recurrentes
  add column if not exists generar_hasta date;

comment on column public.pagos_recurrentes.generar_hasta is
  'Last date this rule may generate a movimiento (inclusive). Null = no end.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'pagos_recurrentes_hasta_despues_de_desde'
  ) then
    alter table public.pagos_recurrentes
      add constraint pagos_recurrentes_hasta_despues_de_desde
      check (generar_hasta is null or generar_hasta >= generar_desde);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Generator: identical to M10a except for the generar_hasta check and the new
-- 'terminada' outcome.
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
    select pr.id, pr.nombre, pr.importe, pr.id_tipo_movimiento, pr.dia_mes,
           pr.generar_desde, pr.generar_hasta
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

    -- Nor after it ends.
    if r.generar_hasta is not null and v_fecha > r.generar_hasta then
      accion := 'terminada'; regla := r.nombre; movimiento_id := null;
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
--   alter table public.pagos_recurrentes
--     drop constraint if exists pagos_recurrentes_hasta_despues_de_desde;
--   alter table public.pagos_recurrentes drop column if exists generar_hasta;
--   alter table public.pagos_recurrentes alter column generar_desde set default current_date;
--   -- then re-apply the M10a version of generar_recurrentes_del_mes
--   -- (20260815155929_recurring_start_date.sql), which does not read generar_hasta.
-- ---------------------------------------------------------------------------
