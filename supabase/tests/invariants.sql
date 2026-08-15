-- ============================================================================
-- Data invariants. Run BEFORE and AFTER a migration batch and diff the output.
--
--   psql "$DB" -X -q -P pager=off -f supabase/tests/invariants.sql > /tmp/before.txt
--   supabase db reset            # or apply the migration
--   psql "$DB" -X -q -P pager=off -f supabase/tests/invariants.sql > /tmp/after.txt
--   diff /tmp/before.txt /tmp/after.txt
--
-- Any diff that is not explicitly intended by the migration is a bug.
-- `npm run db:invariants` wraps this. See scripts/check-invariants.sh for the
-- automated before/after harness.
--
-- Deterministic by construction: every query has a total ORDER BY, and no
-- query selects now()/random() or anything else that varies between runs.
-- ============================================================================

\echo '### 1. row counts per table'
select 'metas'             as tabla, count(*) from public.metas
union all select 'movimiento_tags',    count(*) from public.movimiento_tags
union all select 'movimientos',        count(*) from public.movimientos
union all select 'pagos_recurrentes',  count(*) from public.pagos_recurrentes
union all select 'tags',               count(*) from public.tags
union all select 'tipo_movimiento',    count(*) from public.tipo_movimiento
union all select 'usuarios',           count(*) from public.usuarios
union all select 'auth.users',         count(*) from auth.users
order by 1;

\echo ''
\echo '### 2. THE MONEY MUST NOT MOVE - grand total'
-- Single most important assertion in this file. If this line changes and the
-- migration was not supposed to change amounts, stop and roll back.
select count(*) as movimientos, sum(importe) as suma_total from public.movimientos;

\echo ''
\echo '### 3. money per user / month / category'
select u.email,
       date_trunc('month', m.fecha)::date as mes,
       t.nombre as categoria,
       count(*) as n,
       sum(m.importe) as suma
from public.movimientos m
join public.usuarios u        on u.id = m.usuario_id
join public.tipo_movimiento t on t.id = m.id_tipo_movimiento
group by 1,2,3
order by 1,2,3;

\echo ''
\echo '### 4. orphan / NULL tenancy (must be 0 before NOT NULL can be applied)'
select 'movimientos.usuario_id'     as col, count(*) from public.movimientos     where usuario_id is null
union all select 'tipo_movimiento.usuario_id', count(*) from public.tipo_movimiento where usuario_id is null
union all select 'metas.usuario_id',           count(*) from public.metas           where usuario_id is null
union all select 'movimientos.id_tipo_movimiento', count(*) from public.movimientos where id_tipo_movimiento is null
order by 1;

\echo ''
\echo '### 5. metas totals'
select count(*) as filas, coalesce(sum(meta_total),0) as suma_meta,
       coalesce(sum(monto_actual),0) as suma_actual
from public.metas;

\echo ''
\echo '### 6. category names -> row count + movimiento count'
-- Proves the M2 tipo backfill classified every row without renaming anything.
-- `nombre` must be byte-identical before and after: users keep the labels they chose.
select t.nombre, count(distinct t.id) as filas_categoria, count(m.id) as movimientos
from public.tipo_movimiento t
left join public.movimientos m on m.id_tipo_movimiento = t.id
group by 1 order by 1;

\echo ''
\echo '### 7. duplicate category names per user (must be 0 for UNIQUE(usuario_id,nombre))'
select usuario_id, nombre, count(*)
from public.tipo_movimiento group by 1,2 having count(*) > 1
order by 1,2;

\echo ''
\echo '### 8. duplicate recurring generations (must be 0 for the M9 unique index)'
select recurring_id, date_trunc('month', fecha)::date as mes, count(*)
from public.movimientos where recurring_id is not null
group by 1,2 having count(*) > 1
order by 1,2;

\echo ''
\echo '### 9. amount sanity (zero/negative/sub-cent block the M6 CHECK constraints)'
select count(*) filter (where importe = 0)                    as ceros,
       count(*) filter (where importe < 0)                    as negativos,
       count(*) filter (where importe <> round(importe, 2))   as sub_centavo,
       min(importe) as minimo, max(importe) as maximo
from public.movimientos;

\echo ''
\echo '### 10. referential integrity (must all be 0)'
select 'movimientos sin usuario' as check, count(*) from public.movimientos m
  where not exists (select 1 from public.usuarios u where u.id = m.usuario_id)
union all
select 'movimientos sin categoria', count(*) from public.movimientos m
  where not exists (select 1 from public.tipo_movimiento t where t.id = m.id_tipo_movimiento)
union all
select 'movimientos con recurring_id colgante', count(*) from public.movimientos m
  where m.recurring_id is not null
    and not exists (select 1 from public.pagos_recurrentes p where p.id = m.recurring_id)
union all
select 'movimiento_tags colgantes', count(*) from public.movimiento_tags mt
  where not exists (select 1 from public.movimientos m where m.id = mt.movimiento_id)
     or not exists (select 1 from public.tags g      where g.id = mt.tag_id)
union all
select 'categoria de otro usuario', count(*) from public.movimientos m
  join public.tipo_movimiento t on t.id = m.id_tipo_movimiento
  where t.usuario_id is distinct from m.usuario_id
order by 1;
