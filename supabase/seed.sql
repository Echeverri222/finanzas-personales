-- ============================================================================
-- Local development seed. Applied by `supabase db reset` after migrations.
-- Creates a test auth user + a realistic dataset so every feature (dashboard
-- charts, filters, goals, savings, recurring payments, tags) can be exercised.
--
-- Test login (email confirmations are disabled locally — see config.toml):
--   email:    test@finanzas.local
--   password: password123
--
-- All ids are hard-coded so the seed is deterministic and re-runnable.
-- pgcrypto (crypt/gen_salt) lives in the `extensions` schema on Supabase.
-- ============================================================================

-- ── Auth user ───────────────────────────────────────────────────────────────
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data,
  confirmation_token, recovery_token, email_change_token_new, email_change
) values (
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated',
  'test@finanzas.local',
  extensions.crypt('password123', extensions.gen_salt('bf')),
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{"nombre":"Usuario Demo"}',
  '', '', '', ''
);

-- Email identity (required by GoTrue for email/password sign-in)
insert into auth.identities (
  id, provider_id, user_id, identity_data, provider,
  last_sign_in_at, created_at, updated_at
) values (
  extensions.gen_random_uuid(),
  'a0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '{"sub":"a0000000-0000-0000-0000-000000000001","email":"test@finanzas.local"}',
  'email', now(), now(), now()
);

-- ── App profile ──────────────────────────────────────────────────────────────
insert into public.usuarios (id, user_id, email, nombre) values (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'test@finanzas.local',
  'Usuario Demo'
);

-- ── Categories (tipo_movimiento) ─────────────────────────────────────────────
--    `tipo` is the semantic classification and MUST be set explicitly here.
--    Names are user-editable free text and carry no logic (M2); the app reads
--    `tipo` only. The column defaults to 'gasto', and the backfill in
--    20260815140220_add_tipo_to_tipo_movimiento.sql runs BEFORE this seed, so
--    omitting `tipo` silently files 'Ingresos' under spending.
insert into public.tipo_movimiento (id, usuario_id, nombre, meta, tipo) values
  ('c0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Ingresos',     0,    'ingreso'),
  ('c0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Ahorro',       0,    'ahorro'),
  ('c0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Alimentacion', 600,  'gasto'),
  ('c0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'Transporte',   200,  'gasto'),
  ('c0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 'Gastos fijos', 1500, 'gasto'),
  ('c0000000-0000-0000-0000-000000000006', 'b0000000-0000-0000-0000-000000000001', 'Compras',      300,  'gasto'),
  ('c0000000-0000-0000-0000-000000000007', 'b0000000-0000-0000-0000-000000000001', 'Salidas',      250,  'gasto');

-- ── Tags ─────────────────────────────────────────────────────────────────────
insert into public.tags (id, usuario_id, nombre) values
  ('d0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Trabajo'),
  ('d0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Personal'),
  ('d0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'Vacaciones');

-- ── Movimientos: 5 months (Mar–Jul 2026). Importe is always positive; income vs
--    expense is decided by the category's `tipo` above, never by its name.
--    A few rows get fixed ids so they can be tagged below. ───────────────────
insert into public.movimientos (id, usuario_id, id_tipo_movimiento, nombre, importe, fecha) values
  -- March
  ('e0000000-0000-0000-0000-000000000301', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Salario marzo',        3800, '2026-03-01'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Arriendo',             1200, '2026-03-03'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Supermercado',          420, '2026-03-08'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Gasolina',              120, '2026-03-12'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'Cena con amigos',        85, '2026-03-20'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Ahorro marzo',          500, '2026-03-28'),

  -- April
  ('e0000000-0000-0000-0000-000000000401', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Salario abril',        3800, '2026-04-01'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Arriendo',             1200, '2026-04-03'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Supermercado',          480, '2026-04-09'),
  ('e0000000-0000-0000-0000-000000000402', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'Zapatos nuevos',        150, '2026-04-15'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Metro mensual',          65, '2026-04-18'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Ahorro abril',          600, '2026-04-28'),

  -- May
  ('e0000000-0000-0000-0000-000000000501', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Salario mayo',         3900, '2026-05-01'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Arriendo',             1200, '2026-05-03'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Supermercado',          510, '2026-05-10'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'Concierto',             140, '2026-05-17'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Taxi aeropuerto',        45, '2026-05-22'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Ahorro mayo',           700, '2026-05-28'),

  -- June
  ('e0000000-0000-0000-0000-000000000601', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Salario junio',        3900, '2026-06-01'),
  ('e0000000-0000-0000-0000-000000000602', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Freelance diseño',      600, '2026-06-14'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Arriendo',             1200, '2026-06-03'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Supermercado',          465, '2026-06-11'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000006', 'Audífonos',             220, '2026-06-19'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000002', 'Ahorro junio',          800, '2026-06-27'),

  -- July (partial, current month)
  ('e0000000-0000-0000-0000-000000000701', 'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'Salario julio',        3900, '2026-07-01'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000005', 'Arriendo',             1200, '2026-07-03'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000003', 'Supermercado',          230, '2026-07-06'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000004', 'Gasolina',              110, '2026-07-09'),
  (extensions.gen_random_uuid(),           'b0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000007', 'Almuerzo trabajo',       38, '2026-07-11');

-- ── Movimiento ↔ tag links ────────────────────────────────────────────────────
insert into public.movimiento_tags (movimiento_id, tag_id) values
  ('e0000000-0000-0000-0000-000000000602', 'd0000000-0000-0000-0000-000000000001'), -- Freelance -> Trabajo
  ('e0000000-0000-0000-0000-000000000402', 'd0000000-0000-0000-0000-000000000002'), -- Zapatos   -> Personal
  ('e0000000-0000-0000-0000-000000000701', 'd0000000-0000-0000-0000-000000000001'); -- Salario   -> Trabajo

-- ── Savings goals (metas) ─────────────────────────────────────────────────────
insert into public.metas (id, usuario_id, nombre_objetivo, meta_total, monto_actual, descripcion, fecha_meta) values
  ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'Fondo de emergencia', 10000, 4500, 'Seis meses de gastos', '2026-12-31'),
  ('f0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'Viaje a Japón',         5000, 1200, 'Vacaciones de fin de año', '2026-11-15');

-- ── Recurring payment templates (pagos_recurrentes) ──────────────────────────
insert into public.pagos_recurrentes (usuario_id, nombre, importe, id_tipo_movimiento, dia_mes, activo) values
  ('b0000000-0000-0000-0000-000000000001', 'Netflix',        15,  'c0000000-0000-0000-0000-000000000005', 5,  true),
  ('b0000000-0000-0000-0000-000000000001', 'Gimnasio',       40,  'c0000000-0000-0000-0000-000000000007', 1,  true),
  ('b0000000-0000-0000-0000-000000000001', 'Seguro médico',  120, 'c0000000-0000-0000-0000-000000000005', 10, true);

-- ── Patrimonio (M20-M22) ─────────────────────────────────────────────────────
--    Activado en el usuario demo para que la seccion sea visible sin tener que
--    ir a Ajustes primero. Ids con prefijo por entidad, igual que arriba.
update public.usuarios
   set patrimonio_habilitado = true
 where id = 'b0000000-0000-0000-0000-000000000001';

-- Faltaba una categoria de tipo 'inversion': sin ella no se puede probar el
-- aporte al broker, que es el caso que motiva la mitad del diseno.
insert into public.tipo_movimiento (id, usuario_id, nombre, meta, tipo) values
  ('c0000000-0000-0000-0000-000000000008', 'b0000000-0000-0000-0000-000000000001', 'Inversiones', 0, 'inversion');

-- Una cuenta de cada tipo, para ejercitar los cuatro caminos de la UI.
insert into public.cuentas (id, usuario_id, tipo, nombre, banco, saldo, valor_total, tiene_deuda, valor_deuda, moneda) values
  ('11110000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ahorros',  'Cuenta principal', 'Bancolombia', 12500000, null, false, null, 'COP'),
  ('11110000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 'efectivo', 'Efectivo',          null,            800000, null, false, null, 'COP'),
  -- Activo CON deuda: el neto debe ser 90.000.000 - 30.000.000 = 60.000.000.
  ('11110000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', 'activo',   'Apartamento',       null,                 0, 90000000, true, 30000000, 'COP'),
  -- Broker con efectivo propio. Este saldo NO viene de ningun movimiento, y es
  -- justo el punto: el efectivo de una cuenta de inversion es autonomo.
  ('11110000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 'inversion','Broker',            'Interactive Brokers', 1500, null, false, null, 'USD');

-- Dos lotes del MISMO ticker a precios distintos: 5 @ 700 y 5 @ 600.
-- El promedio ponderado debe salir 650, y cada lote rinde distinto.
insert into public.posiciones (id, usuario_id, cuenta_id, ticker, nombre, clase, cantidad, precio_compra, fecha_compra, moneda, estado) values
  ('22220000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '11110000-0000-0000-0000-000000000004', 'VOO', 'Vanguard S&P 500 ETF', 'stocks', 5, 700, '2026-01-15', 'USD', 'abierta'),
  ('22220000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', '11110000-0000-0000-0000-000000000004', 'VOO', 'Vanguard S&P 500 ETF', 'stocks', 5, 600, '2026-02-20', 'USD', 'abierta'),
  ('22220000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000001', '11110000-0000-0000-0000-000000000004', 'X:BTCUSD', 'Bitcoin', 'crypto', 0.05, 62000, '2026-03-05', 'USD', 'abierta');

-- Una posicion CERRADA, para que el historial de rentabilidad realizada no
-- este vacio al abrir la pantalla por primera vez.
insert into public.posiciones (id, usuario_id, cuenta_id, ticker, nombre, clase, cantidad, precio_compra, fecha_compra, moneda, estado, precio_venta, fecha_venta) values
  ('22220000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', '11110000-0000-0000-0000-000000000004', 'AAPL', 'Apple Inc.', 'stocks', 10, 180, '2026-01-10', 'USD', 'cerrada', 205, '2026-04-18');

-- Precios de cierre semilla. Existen para que /inversiones y /patrimonio
-- rendericen SIN llamar a Massive: la degradacion por API caida o sin llave
-- tiene que ser probable en local.
insert into public.precios_mercado (ticker, fecha, cierre, moneda, clase, fuente) values
  ('VOO',      '2026-09-03', 710.72,  'USD', 'stocks', 'seed'),
  ('X:BTCUSD', '2026-09-03', 79675.12,'USD', 'crypto', 'seed'),
  -- La tasa para pasar dolares a pesos. Llega gratis en el grouped de FX.
  ('C:USDCOP', '2026-09-03', 3131.92, 'COP', 'fx',     'seed');

-- Dos movimientos EXISTENTES se asocian a la cuenta de ahorros, para ver el
-- trigger de M21 en accion. Se asocian en vez de crearse nuevos a proposito:
-- insertar movimientos cambiaria el total de dinero del seed y con ello la
-- seccion 2 de invariants.sql ("THE MONEY MUST NOT MOVE"), que es justamente
-- la red que protege al dashboard de esta feature. Asociar no mueve ese total
-- -- que es, literalmente, lo que esta migracion promete.
update public.movimientos
   set cuenta_id = '11110000-0000-0000-0000-000000000001'
 where id in (
   'e0000000-0000-0000-0000-000000000701',  -- Salario julio (ingreso, +3900)
   'e0000000-0000-0000-0000-000000000402'   -- Zapatos nuevos (gasto,  -150)
 );
