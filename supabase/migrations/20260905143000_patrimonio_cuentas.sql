-- ============================================================================
-- M20: patrimonio -- el flag, las cuentas y el snapshot diario.
--
-- La app responde "en que se me fue la plata" (flujo) pero no "cuanto tengo"
-- (stock). El usuario mantiene ese numero aparte, asi que nunca sabe si un mes
-- bueno de flujo se tradujo en mas patrimonio. Ver docs/PRD-Patrimonio.md.
--
-- Una sola tabla `cuentas` con discriminador `tipo`, no cuatro tablas. Los
-- cuatro tipos comparten identidad, dueno, nombre, moneda y estado; lo que
-- difiere son tres o cuatro campos que van nulos con CHECK por tipo. Cuatro
-- tablas obligarian a un UNION en cada consulta de patrimonio y a cuatro FKs
-- desde movimientos (M21).
--
-- El saldo se ALMACENA, no se deriva de los movimientos. El usuario llega con
-- anos de movimientos historicos que no tienen cuenta, y derivar el saldo sobre
-- esa base daria un numero falso. Lo mismo vale para el efectivo de un broker:
-- ese dinero entro por aportes previos a usar la app, ventas, dividendos e
-- intereses, no solo por movimientos de tipo 'inversion'.
--
-- Risk: LOW. Aditivo puro: una columna con DEFAULT en usuarios y dos tablas
--   nuevas. Ninguna fila existente se lee ni se reescribe, y nada en la app
--   consulta todavia lo que se crea aqui.
-- Reversible: yes -- ver el bloque down al final.
-- Verify with: npm run db:invariants -- diff   (solo la seccion 1 gana filas)
-- ============================================================================

-- ── el flag ─────────────────────────────────────────────────────────────────
-- Arranca apagado para todos. Con el apagado la app se ve y se comporta
-- identica a hoy: sin rutas nuevas, sin campo de cuenta en el formulario de
-- movimientos, sin consultas extra.
alter table public.usuarios
  add column if not exists patrimonio_habilitado boolean not null default false;

comment on column public.usuarios.patrimonio_habilitado is
  'Activa la seccion de patrimonio. Apagarlo OCULTA las pantallas, nunca borra '
  'cuentas ni posiciones: los datos vuelven intactos al reactivar.';

-- ── tipos de cuenta ─────────────────────────────────────────────────────────
-- Enum nuevo en vez de texto libre: el tipo decide que columnas son validas
-- (ver los CHECK abajo) y que puede hacer la cuenta, asi que un valor
-- inesperado no puede existir.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'tipo_cuenta') then
    create type public.tipo_cuenta as enum
      ('ahorros', 'efectivo', 'activo', 'inversion');
  end if;
end $$;

comment on type public.tipo_cuenta is
  'Que clase de cuenta es, y por lo tanto que columnas de public.cuentas '
  'aplican. Ver los CHECK de esa tabla.';

-- ── cuentas ─────────────────────────────────────────────────────────────────
create table if not exists public.cuentas (
  id uuid primary key default extensions.gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  tipo public.tipo_cuenta not null,
  nombre text not null,

  -- Banco de la cuenta de ahorros; nombre del broker en una de inversion.
  banco text,

  -- Efectivo. Aplica a ahorros, efectivo e inversion (el cash del broker).
  -- Un activo no tiene saldo: su valor vive en valor_total.
  saldo numeric not null default 0,

  -- Solo activo: carro, casa, apartamento.
  valor_total numeric,
  tiene_deuda boolean not null default false,
  valor_deuda numeric,

  moneda text not null default 'COP',
  activa boolean not null default true,
  notas text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.cuentas is
  'Cuentas de patrimonio. Discriminadas por tipo; los CHECK impiden que un '
  'tipo lleve campos de otro. El saldo se almacena y se ajusta por trigger '
  'desde movimientos (M21) y por las RPC de operaciones internas (M22) -- '
  'NUNCA se deriva sumando movimientos.';

comment on column public.cuentas.saldo is
  'Efectivo de la cuenta. En una cuenta de inversion es el cash sin invertir '
  'del broker, y NO equivale a la suma de movimientos de tipo ''inversion'': '
  'tambien entra por saldo inicial, ventas, dividendos, intereses y ajustes.';

comment on column public.cuentas.nombre is
  'Texto libre editable por el usuario. Display only -- nunca ramificar sobre '
  'este valor; la semantica esta en `tipo` (misma leccion que M2).';

-- Los CHECK son el corazon de la tabla: sin ellos un 'efectivo' podria llevar
-- deuda y un 'activo' podria llevar saldo, y toda la aritmetica de patrimonio
-- tendria que defenderse de estados imposibles en cada consulta.
alter table public.cuentas
  drop constraint if exists cuentas_ahorros_requiere_banco;
alter table public.cuentas
  add constraint cuentas_ahorros_requiere_banco
  check (tipo <> 'ahorros' or banco is not null);

alter table public.cuentas
  drop constraint if exists cuentas_activo_shape;
alter table public.cuentas
  add constraint cuentas_activo_shape
  check (tipo <> 'activo' or (valor_total is not null and saldo = 0));

alter table public.cuentas
  drop constraint if exists cuentas_no_activo_shape;
alter table public.cuentas
  add constraint cuentas_no_activo_shape
  check (tipo = 'activo' or (valor_total is null and tiene_deuda = false));

alter table public.cuentas
  drop constraint if exists cuentas_deuda_shape;
alter table public.cuentas
  add constraint cuentas_deuda_shape
  check (
    (tiene_deuda and valor_deuda is not null and valor_deuda >= 0)
    or (not tiene_deuda and valor_deuda is null)
  );

-- Mismo guard que M11 puso en usuarios.currency: barato, y ataja un '$' o un
-- 'cop' que se cuele desde un formulario.
alter table public.cuentas
  drop constraint if exists cuentas_moneda_check;
alter table public.cuentas
  add constraint cuentas_moneda_check check (moneda ~ '^[A-Z]{3}$');

alter table public.cuentas
  drop constraint if exists cuentas_valor_total_no_negativo;
alter table public.cuentas
  add constraint cuentas_valor_total_no_negativo
  check (valor_total is null or valor_total >= 0);

alter table public.cuentas
  drop constraint if exists cuentas_nombre_no_vacio;
alter table public.cuentas
  add constraint cuentas_nombre_no_vacio check (length(btrim(nombre)) > 0);

create index if not exists cuentas_usuario_tipo_idx
  on public.cuentas (usuario_id, tipo);

drop trigger if exists cuentas_updated_at on public.cuentas;
create trigger cuentas_updated_at
  before update on public.cuentas
  for each row execute function public.set_updated_at();

-- ── snapshots ───────────────────────────────────────────────────────────────
-- Una fila por usuario y dia. Se escribe con upsert al cargar /patrimonio, no
-- por cron: sin snapshot no hay grafico de evolucion, y un cron para esto no se
-- paga solo. Precio explicito de esa decision: los dias sin abrir la app no
-- tienen punto, y el grafico interpola.
create table if not exists public.patrimonio_snapshots (
  id uuid primary key default extensions.gen_random_uuid(),
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  fecha date not null,
  total numeric not null,
  desglose jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (usuario_id, fecha)
);

comment on table public.patrimonio_snapshots is
  'Patrimonio neto por dia, para el grafico de evolucion. Upsert por (usuario, '
  'fecha) al cargar la pantalla. `desglose` guarda el total por tipo de cuenta '
  'para que un punto viejo siga siendo legible aunque las cuentas cambien.';

create index if not exists patrimonio_snapshots_usuario_fecha_idx
  on public.patrimonio_snapshots (usuario_id, fecha desc);

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Patron de tags/pagos_recurrentes: UNA policy ALL con el mismo predicado en
-- USING y WITH CHECK. Deliberadamente NO se copia la forma legacy de
-- movimientos/metas (`auth.uid() = usuario_id`), que compara un auth.users.id
-- contra un usuarios.id y nunca casa -- ahi es inofensiva solo porque las
-- policies se OR-ean con las correctas.
alter table public.cuentas enable row level security;
drop policy if exists "Users can manage own cuentas" on public.cuentas;
create policy "Users can manage own cuentas" on public.cuentas
  using (usuario_id in (
    select usuarios.id from public.usuarios where usuarios.user_id = auth.uid()
  ))
  with check (usuario_id in (
    select usuarios.id from public.usuarios where usuarios.user_id = auth.uid()
  ));

alter table public.patrimonio_snapshots enable row level security;
drop policy if exists "Users can manage own snapshots" on public.patrimonio_snapshots;
create policy "Users can manage own snapshots" on public.patrimonio_snapshots
  using (usuario_id in (
    select usuarios.id from public.usuarios where usuarios.user_id = auth.uid()
  ))
  with check (usuario_id in (
    select usuarios.id from public.usuarios where usuarios.user_id = auth.uid()
  ));

grant all on table public.cuentas to anon, authenticated, service_role;
grant all on table public.patrimonio_snapshots to anon, authenticated, service_role;

-- ── self-check ──────────────────────────────────────────────────────────────
-- Estructural a proposito. Las migraciones corren ANTES del seed, asi que aqui
-- `usuarios` esta vacia y no hay como insertar una cuenta de prueba: cualquier
-- asercion de comportamiento se saltaria en silencio y daria una falsa
-- sensacion de cobertura. Las pruebas de que los CHECK realmente rechazan
-- estados imposibles viven en supabase/tests/assert_m20_patrimonio.sql, que
-- corre despues del seed.
do $$
declare
  faltan text;
begin
  select string_agg(esperado, ', ')
    into faltan
    from unnest(array[
      'cuentas_ahorros_requiere_banco',
      'cuentas_activo_shape',
      'cuentas_no_activo_shape',
      'cuentas_deuda_shape',
      'cuentas_moneda_check',
      'cuentas_valor_total_no_negativo',
      'cuentas_nombre_no_vacio'
    ]) as esperado
   where not exists (
     select 1 from pg_constraint
      where conrelid = 'public.cuentas'::regclass
        and contype = 'c'
        and conname = esperado
   );

  if faltan is not null then
    raise exception 'M20: faltan CHECK en public.cuentas: %', faltan;
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'cuentas'
  ) then
    raise exception 'M20: public.cuentas quedo sin policy RLS';
  end if;

  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'patrimonio_snapshots'
  ) then
    raise exception 'M20: public.patrimonio_snapshots quedo sin policy RLS';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- down (no lo corre la CLI de Supabase; queda escrito para que el rollback
-- exista). Es seguro porque nada anterior a M20 lee estas tablas ni esta
-- columna: se creo todo aqui.
--
--   drop table if exists public.patrimonio_snapshots;
--   drop table if exists public.cuentas;
--   drop type if exists public.tipo_cuenta;
--   alter table public.usuarios drop column if exists patrimonio_habilitado;
-- ----------------------------------------------------------------------------
