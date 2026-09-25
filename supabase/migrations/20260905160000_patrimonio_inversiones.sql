-- ============================================================================
-- M22: inversiones -- precios de mercado, posiciones por lote y operaciones.
--
-- UNA FILA DE `posiciones` = UN LOTE DE COMPRA.
-- Tres compras de VOO son tres filas, no una con la cantidad sumada. Es lo que
-- pide el documento original: de la misma accion puedo tener muchas posiciones
-- con diferentes precios de compra, y asi puedo saber el rendimiento de cada
-- una. Cerrar es un UPDATE, nunca un DELETE: el historial de rentabilidades
-- realizadas vive en esas mismas filas.
--
-- POR QUE `precios_mercado` Y NO LLAMAR A LA API.
-- El plan contratado de Massive no da precios en tiempo real: /v3/snapshot,
-- /v2/snapshot, /v2/last/trade y /v1/conversion responden 403. Lo que si
-- responde 200 es /v2/aggs/grouped/..., que devuelve el mercado COMPLETO en una
-- sola llamada (12.509 acciones, 405 criptos, 1.194 pares FX). Ademas el rate
-- limit es de concurrencia: la segunda llamada seguida da 429 y la ventana
-- reabre en ~5s. Conclusion: tres llamadas al dia sincronizan los cierres aqui,
-- y las pantallas leen de esta tabla sin tocar la red nunca. Para un patrimonio
-- el cierre diario no es una concesion: nadie mide su patrimonio neto al tick.
--
-- COMPRAR Y VENDER NO CREAN MOVIMIENTOS.
-- Mover efectivo que ya esta dentro del broker no es un gasto. Si lo fuera,
-- cada rebalanceo inflaria los gastos del mes con plata que nunca salio del
-- patrimonio. Por eso las operaciones son RPC que tocan posiciones + cuentas +
-- operaciones_cuenta de forma atomica, y ninguna escribe en `movimientos`.
--
-- Risk: LOW. Tres tablas nuevas y tres funciones nuevas. No toca ninguna tabla
--   existente ni ninguna fila existente.
-- Reversible: yes -- ver el bloque down al final.
-- Verify with: npm run db:invariants -- diff
--   y psql -f supabase/tests/assert_m20_patrimonio.sql
-- ============================================================================

-- ── precios de mercado ──────────────────────────────────────────────────────
-- GLOBAL, no por usuario: el cierre de VOO del 3 de septiembre es el mismo para
-- todo el mundo. Guardarlo por usuario multiplicaria las filas por nada.
create table if not exists public.precios_mercado (
  ticker text not null,
  fecha date not null,
  cierre numeric not null,
  moneda text not null default 'USD',
  clase text,
  fuente text not null default 'massive',
  actualizado_at timestamptz not null default now(),
  primary key (ticker, fecha)
);

comment on table public.precios_mercado is
  'Cierres diarios sincronizados desde Massive (pages/api/precios/sync.js). '
  'Global, no por usuario. Las pantallas leen SIEMPRE de aqui: ninguna llama '
  'a la API en caliente.';

comment on column public.precios_mercado.ticker is
  'En forma Massive: acciones ''VOO'', cripto ''X:BTCUSD'', forex ''C:USDCOP''. '
  'El par C:USDCOP se guarda como un ticker mas y es la tasa de conversion.';

create index if not exists precios_mercado_ticker_fecha_idx
  on public.precios_mercado (ticker, fecha desc);

-- Lectura para cualquier autenticado; escritura SOLO para service_role. Si un
-- usuario cualquiera pudiera escribir aqui, podria envenenar el precio que ven
-- los demas -- la tabla es compartida.
alter table public.precios_mercado enable row level security;
drop policy if exists "Precios legibles por autenticados" on public.precios_mercado;
create policy "Precios legibles por autenticados" on public.precios_mercado
  for select to authenticated using (true);

grant select on table public.precios_mercado to anon, authenticated;
grant all on table public.precios_mercado to service_role;

-- ── posiciones ──────────────────────────────────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'estado_posicion') then
    create type public.estado_posicion as enum ('abierta', 'cerrada');
  end if;
end $$;

create table if not exists public.posiciones (
  id uuid primary key default extensions.gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  cuenta_id uuid not null references public.cuentas(id) on delete cascade,

  ticker text not null,
  nombre text,
  clase text not null default 'stocks',

  -- numeric(20,8): fraccionaria porque BTC. Un integer haria imposible tener
  -- 0.05 BTC, que es el caso normal y no el raro.
  cantidad numeric(20,8) not null,
  precio_compra numeric not null,
  fecha_compra date not null,
  moneda text not null default 'USD',

  estado public.estado_posicion not null default 'abierta',
  precio_venta numeric,
  fecha_venta date,

  -- Cierre parcial: la fila cerrada apunta al lote del que salio.
  lote_origen_id uuid references public.posiciones(id) on delete set null,

  notas text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.posiciones is
  'Una fila = UN LOTE de compra. Varias compras del mismo ticker son varias '
  'filas, para conocer la rentabilidad de cada una. Cerrar es UPDATE, nunca '
  'DELETE: el historial de realizadas vive aqui.';

alter table public.posiciones
  drop constraint if exists posiciones_cantidad_positiva;
alter table public.posiciones
  add constraint posiciones_cantidad_positiva check (cantidad > 0);

alter table public.posiciones
  drop constraint if exists posiciones_precio_compra_no_negativo;
alter table public.posiciones
  add constraint posiciones_precio_compra_no_negativo check (precio_compra >= 0);

-- La forma de una posicion depende de su estado, igual que la de una cuenta
-- depende de su tipo: una abierta no puede tener precio de venta, y una cerrada
-- no puede no tenerlo.
alter table public.posiciones
  drop constraint if exists posiciones_estado_shape;
alter table public.posiciones
  add constraint posiciones_estado_shape check (
    (estado = 'abierta' and precio_venta is null and fecha_venta is null)
    or (estado = 'cerrada' and precio_venta is not null and fecha_venta is not null)
  );

alter table public.posiciones
  drop constraint if exists posiciones_venta_no_anterior_a_compra;
alter table public.posiciones
  add constraint posiciones_venta_no_anterior_a_compra
  check (fecha_venta is null or fecha_venta >= fecha_compra);

alter table public.posiciones
  drop constraint if exists posiciones_clase_check;
alter table public.posiciones
  add constraint posiciones_clase_check
  check (clase in ('stocks', 'crypto', 'fx'));

alter table public.posiciones
  drop constraint if exists posiciones_moneda_check;
alter table public.posiciones
  add constraint posiciones_moneda_check check (moneda ~ '^[A-Z]{3}$');

create index if not exists posiciones_usuario_estado_idx
  on public.posiciones (usuario_id, estado);
create index if not exists posiciones_cuenta_idx
  on public.posiciones (cuenta_id);

drop trigger if exists posiciones_updated_at on public.posiciones;
create trigger posiciones_updated_at
  before update on public.posiciones
  for each row execute function public.set_updated_at();

alter table public.posiciones enable row level security;
drop policy if exists "Users can manage own posiciones" on public.posiciones;
create policy "Users can manage own posiciones" on public.posiciones
  using (usuario_id in (
    select usuarios.id from public.usuarios where usuarios.user_id = auth.uid()
  ))
  with check (usuario_id in (
    select usuarios.id from public.usuarios where usuarios.user_id = auth.uid()
  ));

grant all on table public.posiciones to anon, authenticated, service_role;

-- ── operaciones internas ────────────────────────────────────────────────────
-- El libro de POR QUE se movio el efectivo dentro de una cuenta. Sin esto, un
-- ajuste manual queda sin explicacion y el saldo parece haberse movido solo.
create table if not exists public.operaciones_cuenta (
  id uuid primary key default extensions.gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  cuenta_id uuid not null references public.cuentas(id) on delete cascade,
  posicion_id uuid references public.posiciones(id) on delete set null,
  tipo text not null,
  -- Firmado: negativo saca efectivo, positivo lo mete. Aqui SI lleva signo,
  -- al reves que movimientos.importe -- porque una operacion no tiene una
  -- categoria de la que deducirlo.
  monto numeric not null,
  nota text,
  fecha date not null default current_date,
  created_at timestamptz not null default now()
);

comment on table public.operaciones_cuenta is
  'Movimientos internos de efectivo dentro de una cuenta de patrimonio: '
  'compras, ventas, ajustes, rendimientos, comisiones, depositos y retiros. '
  'NO son movimientos de flujo y no aparecen en el dashboard.';

comment on column public.operaciones_cuenta.monto is
  'FIRMADO: negativo saca efectivo de la cuenta, positivo lo mete. A '
  'diferencia de movimientos.importe, que es siempre positivo y toma el signo '
  'de tipo_movimiento.tipo.';

alter table public.operaciones_cuenta
  drop constraint if exists operaciones_cuenta_tipo_check;
alter table public.operaciones_cuenta
  add constraint operaciones_cuenta_tipo_check check (
    tipo in ('compra', 'venta', 'ajuste', 'rendimiento', 'comision', 'deposito', 'retiro')
  );

create index if not exists operaciones_cuenta_cuenta_fecha_idx
  on public.operaciones_cuenta (cuenta_id, fecha desc);

alter table public.operaciones_cuenta enable row level security;
drop policy if exists "Users can manage own operaciones" on public.operaciones_cuenta;
create policy "Users can manage own operaciones" on public.operaciones_cuenta
  using (usuario_id in (
    select usuarios.id from public.usuarios where usuarios.user_id = auth.uid()
  ))
  with check (usuario_id in (
    select usuarios.id from public.usuarios where usuarios.user_id = auth.uid()
  ));

grant all on table public.operaciones_cuenta to anon, authenticated, service_role;

-- ============================================================================
-- RPC. SECURITY INVOKER (el default) a proposito, como
-- generar_recurrentes_del_mes: la RLS sigue aplicando y el usuario_id se deriva
-- de auth.uid() dentro de la funcion en vez de recibirse por parametro.
-- Existen como RPC y no como tres llamadas del cliente porque cada una toca dos
-- o tres tablas: dos llamadas separadas dejarian una posicion sin pagar si la
-- segunda falla.
-- ============================================================================

create or replace function public.registrar_compra_posicion(
  p_cuenta_id uuid,
  p_ticker text,
  p_clase text,
  p_cantidad numeric,
  p_precio numeric,
  p_fecha date,
  p_moneda text default 'USD',
  p_nombre text default null
)
returns uuid
language plpgsql
as $$
declare
  v_usuario_id uuid;
  v_tipo public.tipo_cuenta;
  v_posicion uuid;
  v_costo numeric;
begin
  select u.id into v_usuario_id
    from public.usuarios u
   where u.user_id = auth.uid();

  if v_usuario_id is null then
    raise exception 'registrar_compra_posicion: no usuario profile for auth.uid() %', auth.uid();
  end if;

  select c.tipo into v_tipo
    from public.cuentas c
   where c.id = p_cuenta_id and c.usuario_id = v_usuario_id;

  if v_tipo is null then
    raise exception 'registrar_compra_posicion: la cuenta % no existe o no es tuya', p_cuenta_id;
  end if;

  if v_tipo <> 'inversion' then
    raise exception 'registrar_compra_posicion: solo una cuenta de inversion puede tener posiciones (esta es %)', v_tipo;
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'registrar_compra_posicion: la cantidad debe ser mayor que cero';
  end if;

  insert into public.posiciones (
    usuario_id, cuenta_id, ticker, nombre, clase,
    cantidad, precio_compra, fecha_compra, moneda
  ) values (
    v_usuario_id, p_cuenta_id, upper(btrim(p_ticker)), p_nombre, coalesce(p_clase, 'stocks'),
    p_cantidad, p_precio, coalesce(p_fecha, current_date), coalesce(p_moneda, 'USD')
  )
  returning id into v_posicion;

  -- El efectivo baja por el costo del lote. Puede quedar negativo a proposito:
  -- significa que el usuario no habia registrado el aporte todavia, y forzarlo
  -- a cero mentiria sobre cuanto tiene.
  v_costo := p_cantidad * p_precio;

  update public.cuentas
     set saldo = saldo - v_costo
   where id = p_cuenta_id;

  insert into public.operaciones_cuenta (usuario_id, cuenta_id, posicion_id, tipo, monto, fecha, nota)
  values (v_usuario_id, p_cuenta_id, v_posicion, 'compra', -v_costo, coalesce(p_fecha, current_date),
          format('Compra de %s %s', p_cantidad, upper(btrim(p_ticker))));

  return v_posicion;
end;
$$;

comment on function public.registrar_compra_posicion(uuid, text, text, numeric, numeric, date, text, text) is
  'Crea un lote de compra y descuenta su costo del efectivo de la cuenta, '
  'atomicamente. NO crea ningun movimiento: comprar con efectivo que ya esta '
  'en el broker no es un gasto.';

revoke all on function public.registrar_compra_posicion(uuid, text, text, numeric, numeric, date, text, text) from public, anon;
grant execute on function public.registrar_compra_posicion(uuid, text, text, numeric, numeric, date, text, text) to authenticated;

-- ── cerrar (total o parcial) ────────────────────────────────────────────────
create or replace function public.cerrar_posicion(
  p_posicion_id uuid,
  p_cantidad numeric,
  p_precio_venta numeric,
  p_fecha_venta date default null
)
returns uuid
language plpgsql
as $$
declare
  v_usuario_id uuid;
  r public.posiciones%rowtype;
  v_fecha date;
  v_ingreso numeric;
  v_cerrada uuid;
begin
  select u.id into v_usuario_id
    from public.usuarios u
   where u.user_id = auth.uid();

  if v_usuario_id is null then
    raise exception 'cerrar_posicion: no usuario profile for auth.uid() %', auth.uid();
  end if;

  select * into r
    from public.posiciones
   where id = p_posicion_id and usuario_id = v_usuario_id
   for update;

  if r.id is null then
    raise exception 'cerrar_posicion: la posicion % no existe o no es tuya', p_posicion_id;
  end if;

  if r.estado <> 'abierta' then
    raise exception 'cerrar_posicion: la posicion % ya esta cerrada', p_posicion_id;
  end if;

  if p_cantidad is null or p_cantidad <= 0 then
    raise exception 'cerrar_posicion: la cantidad debe ser mayor que cero';
  end if;

  if p_cantidad > r.cantidad then
    raise exception 'cerrar_posicion: no puedes vender % de un lote de %',
      p_cantidad, r.cantidad;
  end if;

  v_fecha := coalesce(p_fecha_venta, current_date);

  if v_fecha < r.fecha_compra then
    raise exception 'cerrar_posicion: la venta (%) no puede ser anterior a la compra (%)',
      v_fecha, r.fecha_compra;
  end if;

  if p_cantidad = r.cantidad then
    -- Cierre TOTAL: la misma fila pasa a cerrada. No se borra, porque es el
    -- registro historico de la rentabilidad realizada.
    update public.posiciones
       set estado = 'cerrada',
           precio_venta = p_precio_venta,
           fecha_venta = v_fecha
     where id = r.id;
    v_cerrada := r.id;
  else
    -- Cierre PARCIAL: se divide el lote. La fila abierta se queda con el resto
    -- y nace una cerrada con la cantidad vendida, al MISMO precio de compra --
    -- si no, vender 2 de 5 acciones obligaria al usuario a mentirle a la app.
    update public.posiciones
       set cantidad = r.cantidad - p_cantidad
     where id = r.id;

    insert into public.posiciones (
      usuario_id, cuenta_id, ticker, nombre, clase,
      cantidad, precio_compra, fecha_compra, moneda,
      estado, precio_venta, fecha_venta, lote_origen_id
    ) values (
      r.usuario_id, r.cuenta_id, r.ticker, r.nombre, r.clase,
      p_cantidad, r.precio_compra, r.fecha_compra, r.moneda,
      'cerrada', p_precio_venta, v_fecha, r.id
    )
    returning id into v_cerrada;
  end if;

  v_ingreso := p_cantidad * p_precio_venta;

  update public.cuentas
     set saldo = saldo + v_ingreso
   where id = r.cuenta_id;

  insert into public.operaciones_cuenta (usuario_id, cuenta_id, posicion_id, tipo, monto, fecha, nota)
  values (v_usuario_id, r.cuenta_id, v_cerrada, 'venta', v_ingreso, v_fecha,
          format('Venta de %s %s', p_cantidad, r.ticker));

  return v_cerrada;
end;
$$;

comment on function public.cerrar_posicion(uuid, numeric, numeric, date) is
  'Cierra un lote, total o parcialmente. En parcial DIVIDE el lote: reduce la '
  'fila abierta y crea una cerrada con el mismo precio de compra. Suma el '
  'ingreso al efectivo de la cuenta. No crea ningun movimiento.';

revoke all on function public.cerrar_posicion(uuid, numeric, numeric, date) from public, anon;
grant execute on function public.cerrar_posicion(uuid, numeric, numeric, date) to authenticated;

-- ── ajustar efectivo ────────────────────────────────────────────────────────
-- El efectivo de una cuenta de inversion es AUTONOMO: entra por el saldo
-- inicial, por ventas, dividendos, intereses, comisiones y retiros, no solo por
-- movimientos de tipo 'inversion'. Esta funcion es como el usuario dice "el
-- broker marca esto otro" sin tener que inventar un movimiento de flujo.
create or replace function public.ajustar_saldo_cuenta(
  p_cuenta_id uuid,
  p_nuevo_saldo numeric,
  p_nota text default null
)
returns numeric
language plpgsql
as $$
declare
  v_usuario_id uuid;
  v_actual numeric;
  v_tipo public.tipo_cuenta;
  v_delta numeric;
begin
  select u.id into v_usuario_id
    from public.usuarios u
   where u.user_id = auth.uid();

  if v_usuario_id is null then
    raise exception 'ajustar_saldo_cuenta: no usuario profile for auth.uid() %', auth.uid();
  end if;

  select c.saldo, c.tipo into v_actual, v_tipo
    from public.cuentas c
   where c.id = p_cuenta_id and c.usuario_id = v_usuario_id
   for update;

  if v_actual is null then
    raise exception 'ajustar_saldo_cuenta: la cuenta % no existe o no es tuya', p_cuenta_id;
  end if;

  if v_tipo = 'activo' then
    raise exception 'ajustar_saldo_cuenta: un activo no tiene efectivo; edita su valor_total';
  end if;

  v_delta := p_nuevo_saldo - v_actual;

  if v_delta = 0 then
    return v_actual;
  end if;

  update public.cuentas set saldo = p_nuevo_saldo where id = p_cuenta_id;

  insert into public.operaciones_cuenta (usuario_id, cuenta_id, tipo, monto, nota)
  values (v_usuario_id, p_cuenta_id, 'ajuste', v_delta,
          coalesce(p_nota, 'Ajuste manual de efectivo'));

  return p_nuevo_saldo;
end;
$$;

comment on function public.ajustar_saldo_cuenta(uuid, numeric, text) is
  'Fija el efectivo de una cuenta y deja registrada la diferencia como '
  'operacion de ajuste, para que el saldo nunca parezca haberse movido solo.';

revoke all on function public.ajustar_saldo_cuenta(uuid, numeric, text) from public, anon;
grant execute on function public.ajustar_saldo_cuenta(uuid, numeric, text) to authenticated;

-- ── borrar un lote (corregir una captura) ───────────────────────────────────
create or replace function public.eliminar_posicion(p_posicion_id uuid)
returns void
language plpgsql
as $$
declare
  v_usuario_id uuid;
  r public.posiciones%rowtype;
  v_devolver numeric;
begin
  select u.id into v_usuario_id
    from public.usuarios u
   where u.user_id = auth.uid();

  if v_usuario_id is null then
    raise exception 'eliminar_posicion: no usuario profile for auth.uid() %', auth.uid();
  end if;

  select * into r
    from public.posiciones
   where id = p_posicion_id and usuario_id = v_usuario_id
   for update;

  if r.id is null then
    raise exception 'eliminar_posicion: la posicion % no existe o no es tuya', p_posicion_id;
  end if;

  -- Borrar es corregir un error de captura, no vender: se revierte lo que la
  -- compra descontó, y en una cerrada tambien lo que la venta habia sumado.
  v_devolver := r.cantidad * r.precio_compra;
  if r.estado = 'cerrada' then
    v_devolver := v_devolver - (r.cantidad * r.precio_venta);
  end if;

  update public.cuentas
     set saldo = saldo + v_devolver
   where id = r.cuenta_id;

  delete from public.operaciones_cuenta where posicion_id = r.id;
  delete from public.posiciones where id = r.id;
end;
$$;

comment on function public.eliminar_posicion(uuid) is
  'Borra un lote capturado por error y devuelve el efectivo que habia movido. '
  'Para vender se usa cerrar_posicion, que conserva el historial.';

revoke all on function public.eliminar_posicion(uuid) from public, anon;
grant execute on function public.eliminar_posicion(uuid) to authenticated;

-- ── self-check ──────────────────────────────────────────────────────────────
do $$
declare
  faltan text;
begin
  select string_agg(f, ', ') into faltan
    from unnest(array[
      'registrar_compra_posicion', 'cerrar_posicion',
      'ajustar_saldo_cuenta', 'eliminar_posicion'
    ]) as f
   where not exists (
     select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = f
   );
  if faltan is not null then
    raise exception 'M22: faltan funciones: %', faltan;
  end if;

  -- precios_mercado es compartida: si un usuario cualquiera pudiera escribirla,
  -- podria envenenar el precio que ven los demas.
  if exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'precios_mercado'
       and cmd <> 'SELECT'
  ) then
    raise exception 'M22: precios_mercado no debe tener policies de escritura';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- down (no lo corre la CLI; queda escrito para que el rollback exista).
-- Seguro: solo se pierde la parte de inversiones. Las cuentas y sus saldos
-- sobreviven -- representan dinero real, no un derivado de las posiciones.
--
--   drop function if exists public.eliminar_posicion(uuid);
--   drop function if exists public.ajustar_saldo_cuenta(uuid, numeric, text);
--   drop function if exists public.cerrar_posicion(uuid, numeric, numeric, date);
--   drop function if exists public.registrar_compra_posicion(uuid, text, text, numeric, numeric, date, text, text);
--   drop table if exists public.operaciones_cuenta;
--   drop table if exists public.posiciones;
--   drop type if exists public.estado_posicion;
--   drop table if exists public.precios_mercado;
-- ----------------------------------------------------------------------------
