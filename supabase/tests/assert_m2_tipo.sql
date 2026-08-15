-- ============================================================================
-- Post-condition assertions for M2 (tipo_movimiento.tipo).
--
--   psql "$DB" -X -q -f supabase/tests/assert_m2_tipo.sql
--
-- Run AFTER the migration, against real data. Raises on the first violation, so
-- a bad backfill fails the rehearsal instead of shipping.
--
-- Kept separate from invariants.sql because these are one-time post-conditions,
-- not before/after invariants -- the column does not exist on the "before" side.
-- ============================================================================

do $$
declare n integer; detalle text;
begin
  -- 1. Every category classified.
  select count(*) into n from public.tipo_movimiento where tipo is null;
  if n > 0 then raise exception 'M2: % categoria(s) still NULL', n; end if;

  -- 2. The two names with fixed meaning map correctly, for every user.
  select count(*), coalesce(string_agg(format('%s->%s', nombre, tipo), ', '), '')
    into n, detalle
    from public.tipo_movimiento
   where (nombre = 'Ingresos' and tipo <> 'ingreso')
      or (nombre = 'Ahorro'   and tipo <> 'ahorro');
  if n > 0 then
    raise exception 'M2: % categoria(s) misclassified: %', n, detalle;
  end if;

  -- 3. The whole point of the migration: nothing lands in a bucket by accident.
  -- 'Inversiones' means different things to different users, so each row must
  -- have been resolved explicitly to inversion or prestamo -- never defaulted.
  select count(*), coalesce(string_agg(format('id=%s tipo=%s', id, tipo), ', '), '')
    into n, detalle
    from public.tipo_movimiento
   where nombre = 'Inversiones' and tipo not in ('inversion', 'prestamo');
  if n > 0 then
    raise exception
      'M2: % "Inversiones" categoria(s) fell through to a default: %. Each needs '
      'an explicit UPDATE in step 2 of the migration.', n, detalle;
  end if;

  -- 4. Names are untouched. Users keep the labels they chose, including the
  -- Alimentacion/Alimentación split across different users.
  select count(*) into n from public.tipo_movimiento
   where nombre is null or btrim(nombre) = '';
  if n > 0 then raise exception 'M2: % categoria(s) lost their nombre', n; end if;

  -- 5. The new UNIQUE constraint holds.
  select count(*) into n from (
    select usuario_id, nombre from public.tipo_movimiento
    group by 1,2 having count(*) > 1
  ) d;
  if n > 0 then raise exception 'M2: % duplicate (usuario_id, nombre)', n; end if;

  raise notice 'M2 assertions passed.';
end $$;

\echo ''
\echo '=== tipo distribution (eyeball this against expectations) ==='
select tipo, count(*) as categorias,
       (select count(*) from public.movimientos m
         join public.tipo_movimiento t2 on t2.id = m.id_tipo_movimiento
        where t2.tipo = t.tipo) as movimientos,
       string_agg(distinct nombre, ', ' order by nombre) as nombres
from public.tipo_movimiento t
group by tipo order by tipo;
