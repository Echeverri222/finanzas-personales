-- ============================================================================
-- Aserciones de patrimonio (M20 cuentas, M21 saldo, M22 posiciones).
--
-- Corre DESPUES del seed, que es justamente lo que la migracion no puede hacer:
-- al aplicarse las migraciones `usuarios` todavia esta vacia, asi que cualquier
-- prueba que necesite insertar una cuenta se saltaria en silencio.
--
-- Uso:
--   psql "postgresql://postgres:postgres@127.0.0.1:54422/postgres" \
--        -X -q -f supabase/tests/assert_m20_patrimonio.sql
--
-- Todo ocurre dentro de una transaccion que termina en ROLLBACK: el archivo se
-- puede correr las veces que haga falta sin ensuciar los datos del seed.
-- ============================================================================

begin;

do $$
declare
  v_usuario uuid;
  v_fallo text;
  v_cuenta uuid;
begin
  select id into v_usuario from public.usuarios order by created_at limit 1;
  if v_usuario is null then
    raise exception 'M20: no hay usuarios; corre `npm run db:reset` primero';
  end if;

  -- ── M20: los CHECK rechazan estados imposibles ────────────────────────────

  -- 1. Una cuenta de ahorros sin banco.
  v_fallo := null;
  begin
    insert into public.cuentas (usuario_id, tipo, nombre)
    values (v_usuario, 'ahorros', 'probe');
    v_fallo := 'ahorros sin banco fue aceptada';
  exception when check_violation then null;
  end;
  if v_fallo is not null then raise exception 'M20: %', v_fallo; end if;

  -- 2. Un activo sin valor_total.
  v_fallo := null;
  begin
    insert into public.cuentas (usuario_id, tipo, nombre)
    values (v_usuario, 'activo', 'probe');
    v_fallo := 'activo sin valor_total fue aceptado';
  exception when check_violation then null;
  end;
  if v_fallo is not null then raise exception 'M20: %', v_fallo; end if;

  -- 3. Deuda activada sin monto.
  v_fallo := null;
  begin
    insert into public.cuentas (usuario_id, tipo, nombre, valor_total, tiene_deuda)
    values (v_usuario, 'activo', 'probe', 100, true);
    v_fallo := 'tiene_deuda sin valor_deuda fue aceptado';
  exception when check_violation then null;
  end;
  if v_fallo is not null then raise exception 'M20: %', v_fallo; end if;

  -- 4. Una cuenta liquida no puede cargar deuda: la deuda es de los activos.
  v_fallo := null;
  begin
    insert into public.cuentas (usuario_id, tipo, nombre, tiene_deuda, valor_deuda)
    values (v_usuario, 'efectivo', 'probe', true, 50);
    v_fallo := 'efectivo con deuda fue aceptado';
  exception when check_violation then null;
  end;
  if v_fallo is not null then raise exception 'M20: %', v_fallo; end if;

  -- 5. Un activo no puede tener saldo: su valor vive en valor_total.
  v_fallo := null;
  begin
    insert into public.cuentas (usuario_id, tipo, nombre, valor_total, saldo)
    values (v_usuario, 'activo', 'probe', 100, 25);
    v_fallo := 'activo con saldo fue aceptado';
  exception when check_violation then null;
  end;
  if v_fallo is not null then raise exception 'M20: %', v_fallo; end if;

  -- 6. Moneda malformada.
  v_fallo := null;
  begin
    insert into public.cuentas (usuario_id, tipo, nombre, moneda)
    values (v_usuario, 'efectivo', 'probe', 'cop');
    v_fallo := 'moneda en minusculas fue aceptada';
  exception when check_violation then null;
  end;
  if v_fallo is not null then raise exception 'M20: %', v_fallo; end if;

  -- 7. Las formas VALIDAS si entran. Un CHECK de mas es tan danino como uno de
  --    menos: bloquearia al usuario sin que nada lo delate.
  insert into public.cuentas (usuario_id, tipo, nombre, banco, saldo)
  values (v_usuario, 'ahorros', 'probe ok ahorros', 'Bancolombia', 1000);

  insert into public.cuentas (usuario_id, tipo, nombre, saldo)
  values (v_usuario, 'efectivo', 'probe ok efectivo', 200);

  insert into public.cuentas (usuario_id, tipo, nombre, valor_total, tiene_deuda, valor_deuda)
  values (v_usuario, 'activo', 'probe ok activo', 90000000, true, 30000000);

  -- 8. Una cuenta de inversion con saldo y CERO movimientos es un estado
  --    perfectamente valido -- es el caso del broker con plata que entro antes
  --    de usar la app. Ver PRD 4.3: el efectivo de la cuenta es autonomo.
  insert into public.cuentas (usuario_id, tipo, nombre, banco, saldo)
  values (v_usuario, 'inversion', 'probe ok broker', 'Interactive Brokers', 5000)
  returning id into v_cuenta;

  if (select saldo from public.cuentas where id = v_cuenta) <> 5000 then
    raise exception 'M20: la cuenta de inversion no conservo su saldo propio';
  end if;

  raise notice 'M20: OK -- forma de cuentas y autonomia del efectivo.';
end $$;

-- ── M21: el trigger de saldo, con los CINCO valores de tipo_categoria ───────
-- Esta es la parte que mas facil se rompe en silencio. `importe` se guarda
-- siempre positivo y el signo lo pone la categoria; invertir uno solo de los
-- cinco casos no lanza ningun error, solo deja el saldo mal.
do $$
declare
  v_usuario uuid;
  v_cuenta uuid;
  v_activo uuid;
  v_mov uuid;
  v_tipo uuid;
  v_saldo numeric;
  v_esperado numeric;
  v_categoria public.tipo_categoria;
  v_fallo text;
begin
  select id into v_usuario from public.usuarios order by created_at limit 1;

  -- Una cuenta y una categoria por cada valor del enum.
  foreach v_categoria in array array['ingreso','gasto','ahorro','inversion','prestamo']::public.tipo_categoria[]
  loop
    insert into public.cuentas (usuario_id, tipo, nombre, saldo)
    values (v_usuario, 'efectivo', 'probe ' || v_categoria, 1000)
    returning id into v_cuenta;

    insert into public.tipo_movimiento (usuario_id, nombre, meta, tipo)
    values (v_usuario, 'probe ' || v_categoria, 0, v_categoria)
    returning id into v_tipo;

    -- INSERT aplica el delta.
    insert into public.movimientos (usuario_id, id_tipo_movimiento, nombre, importe, fecha, cuenta_id)
    values (v_usuario, v_tipo, 'probe', 100, current_date, v_cuenta)
    returning id into v_mov;

    v_esperado := case when v_categoria = 'ingreso' then 1100 else 900 end;
    select saldo into v_saldo from public.cuentas where id = v_cuenta;
    if v_saldo <> v_esperado then
      raise exception 'M21: insert de % dejo saldo % (esperado %)',
        v_categoria, v_saldo, v_esperado;
    end if;

    -- UPDATE del importe: revierte lo viejo y aplica lo nuevo.
    update public.movimientos set importe = 250 where id = v_mov;
    v_esperado := case when v_categoria = 'ingreso' then 1250 else 750 end;
    select saldo into v_saldo from public.cuentas where id = v_cuenta;
    if v_saldo <> v_esperado then
      raise exception 'M21: update de % dejo saldo % (esperado %)',
        v_categoria, v_saldo, v_esperado;
    end if;

    -- Quitar la cuenta devuelve el saldo intacto.
    update public.movimientos set cuenta_id = null where id = v_mov;
    select saldo into v_saldo from public.cuentas where id = v_cuenta;
    if v_saldo <> 1000 then
      raise exception 'M21: desasociar % dejo saldo % (esperado 1000)',
        v_categoria, v_saldo;
    end if;

    -- Y volver a ponerla lo reaplica.
    update public.movimientos set cuenta_id = v_cuenta where id = v_mov;
    select saldo into v_saldo from public.cuentas where id = v_cuenta;
    if v_saldo <> v_esperado then
      raise exception 'M21: reasociar % dejo saldo % (esperado %)',
        v_categoria, v_saldo, v_esperado;
    end if;

    -- DELETE revierte.
    delete from public.movimientos where id = v_mov;
    select saldo into v_saldo from public.cuentas where id = v_cuenta;
    if v_saldo <> 1000 then
      raise exception 'M21: delete de % dejo saldo % (esperado 1000)',
        v_categoria, v_saldo;
    end if;
  end loop;

  -- Un movimiento SIN cuenta no toca ningun saldo. Todo el historico esta asi.
  select id into v_tipo from public.tipo_movimiento
   where usuario_id = v_usuario and tipo = 'gasto' limit 1;
  select id into v_cuenta from public.cuentas
   where usuario_id = v_usuario and tipo = 'efectivo' limit 1;
  select saldo into v_saldo from public.cuentas where id = v_cuenta;

  insert into public.movimientos (usuario_id, id_tipo_movimiento, nombre, importe, fecha)
  values (v_usuario, v_tipo, 'probe sin cuenta', 999, current_date);

  if (select saldo from public.cuentas where id = v_cuenta) <> v_saldo then
    raise exception 'M21: un movimiento sin cuenta movio un saldo';
  end if;

  -- Un activo no tiene efectivo: asociarle un movimiento debe fallar.
  insert into public.cuentas (usuario_id, tipo, nombre, valor_total)
  values (v_usuario, 'activo', 'probe carro', 50000000)
  returning id into v_activo;

  v_fallo := null;
  begin
    insert into public.movimientos (usuario_id, id_tipo_movimiento, nombre, importe, fecha, cuenta_id)
    values (v_usuario, v_tipo, 'probe', 100, current_date, v_activo);
    v_fallo := 'se acepto un movimiento contra una cuenta de tipo activo';
  exception when others then null;
  end;
  if v_fallo is not null then raise exception 'M21: %', v_fallo; end if;

  -- Borrar una cuenta CON movimientos asociados. El FK es ON DELETE SET NULL,
  -- que dispara un UPDATE sobre movimientos, que a su vez dispara el trigger de
  -- saldo sobre una cuenta que ya no existe. Debe ser un no-op silencioso, no
  -- un error: si esto fallara, el usuario no podria borrar nunca una cuenta que
  -- haya usado.
  insert into public.cuentas (usuario_id, tipo, nombre, saldo)
  values (v_usuario, 'efectivo', 'probe borrado', 1000)
  returning id into v_cuenta;

  insert into public.movimientos (usuario_id, id_tipo_movimiento, nombre, importe, fecha, cuenta_id)
  values (v_usuario, v_tipo, 'probe borrado', 100, current_date, v_cuenta)
  returning id into v_mov;

  delete from public.cuentas where id = v_cuenta;

  if not exists (select 1 from public.movimientos where id = v_mov) then
    raise exception 'M21: borrar una cuenta se llevo el movimiento por delante';
  end if;
  if (select cuenta_id from public.movimientos where id = v_mov) is not null then
    raise exception 'M21: tras borrar la cuenta, cuenta_id no quedo en NULL';
  end if;

  raise notice 'M21: OK -- signo del saldo en los 5 tipo_categoria, insert/update/delete, guardas y borrado de cuenta.';
end $$;


-- ── M22: posiciones, cierre parcial y autonomia del efectivo ────────────────
-- Las RPC derivan el usuario de auth.uid(), que en psql es NULL. Se prueba la
-- mecanica directamente sobre las tablas, y por separado que las RPC rechazan
-- a un llamante sin sesion -- que es justo lo que protege a un usuario de tocar
-- las posiciones de otro.
do $$
declare
  v_usuario uuid;
  v_cuenta uuid;
  v_lote uuid;
  v_cerrada uuid;
  v_cant numeric;
  v_saldo numeric;
  v_fallo text;
begin
  select id into v_usuario from public.usuarios order by created_at limit 1;

  insert into public.cuentas (usuario_id, tipo, nombre, banco, saldo, moneda)
  values (v_usuario, 'inversion', 'probe broker', 'IBKR', 10000, 'USD')
  returning id into v_cuenta;

  -- Dos lotes del MISMO ticker a precios distintos: el caso que obliga a
  -- guardar un lote por compra en vez de una fila agregada.
  insert into public.posiciones (usuario_id, cuenta_id, ticker, clase, cantidad, precio_compra, fecha_compra, moneda)
  values (v_usuario, v_cuenta, 'VOO', 'stocks', 5, 700, '2026-01-15', 'USD')
  returning id into v_lote;

  insert into public.posiciones (usuario_id, cuenta_id, ticker, clase, cantidad, precio_compra, fecha_compra, moneda)
  values (v_usuario, v_cuenta, 'VOO', 'stocks', 5, 600, '2026-02-20', 'USD');

  if (select count(*) from public.posiciones where cuenta_id = v_cuenta) <> 2 then
    raise exception 'M22: dos compras del mismo ticker deben ser dos lotes';
  end if;

  -- Una posicion abierta no puede llevar precio de venta.
  v_fallo := null;
  begin
    update public.posiciones set precio_venta = 800 where id = v_lote;
    v_fallo := 'una posicion abierta acepto precio_venta';
  exception when check_violation then null;
  end;
  if v_fallo is not null then raise exception 'M22: %', v_fallo; end if;

  -- Una cerrada no puede quedarse sin precio de venta.
  v_fallo := null;
  begin
    update public.posiciones set estado = 'cerrada' where id = v_lote;
    v_fallo := 'una posicion cerrada acepto precio_venta nulo';
  exception when check_violation then null;
  end;
  if v_fallo is not null then raise exception 'M22: %', v_fallo; end if;

  -- La venta no puede ser anterior a la compra.
  v_fallo := null;
  begin
    update public.posiciones
       set estado = 'cerrada', precio_venta = 800, fecha_venta = '2026-01-01'
     where id = v_lote;
    v_fallo := 'se acepto una venta anterior a la compra';
  exception when check_violation then null;
  end;
  if v_fallo is not null then raise exception 'M22: %', v_fallo; end if;

  -- ── CIERRE PARCIAL: vender 2 de un lote de 5 ──────────────────────────────
  -- Es la mecanica exacta de cerrar_posicion; si esto no cuadra, el historial
  -- de rentabilidades queda inservible.
  update public.posiciones set cantidad = 5 - 2 where id = v_lote;

  insert into public.posiciones (
    usuario_id, cuenta_id, ticker, clase, cantidad, precio_compra, fecha_compra,
    moneda, estado, precio_venta, fecha_venta, lote_origen_id
  )
  select usuario_id, cuenta_id, ticker, clase, 2, precio_compra, fecha_compra,
         moneda, 'cerrada', 750, '2026-03-10', id
    from public.posiciones where id = v_lote
  returning id into v_cerrada;

  select cantidad into v_cant from public.posiciones where id = v_lote;
  if v_cant <> 3 then
    raise exception 'M22: tras vender 2 de 5, el lote abierto quedo en % (esperado 3)', v_cant;
  end if;

  select cantidad into v_cant from public.posiciones where id = v_cerrada;
  if v_cant <> 2 then
    raise exception 'M22: el lote cerrado quedo con % (esperado 2)', v_cant;
  end if;

  -- El precio de compra del lote cerrado DEBE ser el del original: si se
  -- perdiera, la rentabilidad realizada seria inventada.
  if (select precio_compra from public.posiciones where id = v_cerrada) <> 700 then
    raise exception 'M22: el cierre parcial no conservo el precio de compra';
  end if;

  if (select lote_origen_id from public.posiciones where id = v_cerrada) <> v_lote then
    raise exception 'M22: el cierre parcial no dejo trazabilidad al lote origen';
  end if;

  -- El efectivo sube exactamente 2 * precio_venta.
  update public.cuentas set saldo = saldo + (2 * 750) where id = v_cuenta;
  select saldo into v_saldo from public.cuentas where id = v_cuenta;
  if v_saldo <> 11500 then
    raise exception 'M22: tras vender 2 a 750 el efectivo quedo en % (esperado 11500)', v_saldo;
  end if;

  -- Y todo esto SIN crear un solo movimiento: comprar y vender dentro del
  -- broker no es flujo. Ver PRD 4.3.
  if exists (select 1 from public.movimientos where cuenta_id = v_cuenta) then
    raise exception 'M22: una operacion interna creo un movimiento de flujo';
  end if;

  raise notice 'M22: OK -- lotes por compra, forma por estado y cierre parcial.';
end $$;

-- Las RPC exigen sesion. Sin auth.uid() no hay usuario que derivar, y por eso
-- un llamante anonimo no puede tocar las posiciones de nadie.
do $$
declare v_fallo text;
begin
  v_fallo := null;
  begin
    perform public.ajustar_saldo_cuenta(extensions.gen_random_uuid(), 100, 'probe');
    v_fallo := 'ajustar_saldo_cuenta acepto un llamante sin sesion';
  exception when others then null;
  end;
  if v_fallo is not null then raise exception 'M22: %', v_fallo; end if;

  raise notice 'M22: OK -- las RPC exigen sesion.';
end $$;

-- ── M22 bis: las RPC DE VERDAD, con sesion simulada ─────────────────────────
-- Lo de arriba reproduce a mano la mecanica del cierre parcial; esto ejecuta la
-- funcion real. Es la diferencia entre probar lo que creo que hace el codigo y
-- probar el codigo. auth.uid() lee request.jwt.claims->>'sub', asi que basta
-- con fijar esa GUC para que la RPC resuelva el usuario del seed.
do $$
declare
  v_auth_uid uuid;
  v_usuario uuid;
  v_cuenta uuid;
  v_lote uuid;
  v_cerrada uuid;
  v_cant numeric;
  v_saldo numeric;
  v_fallo text;
  v_movimientos_antes bigint;
begin
  select u.id, u.user_id into v_usuario, v_auth_uid
    from public.usuarios u order by u.created_at limit 1;
  select count(*) into v_movimientos_antes from public.movimientos;

  perform set_config('request.jwt.claims',
                     json_build_object('sub', v_auth_uid)::text, true);

  insert into public.cuentas (usuario_id, tipo, nombre, banco, saldo, moneda)
  values (v_usuario, 'inversion', 'probe rpc', 'IBKR', 10000, 'USD')
  returning id into v_cuenta;

  -- Comprar 5 VOO a 700 => efectivo 10000 - 3500 = 6500
  v_lote := public.registrar_compra_posicion(
    v_cuenta, 'voo', 'stocks', 5, 700, '2026-01-15', 'USD', 'Vanguard S&P 500'
  );

  select saldo into v_saldo from public.cuentas where id = v_cuenta;
  if v_saldo <> 6500 then
    raise exception 'M22rpc: tras comprar 5x700 el efectivo quedo en % (esperado 6500)', v_saldo;
  end if;

  -- El ticker se normaliza a mayusculas: 'voo' y 'VOO' no pueden ser dos
  -- tickers distintos o el resumen por ticker se parte en dos.
  if (select ticker from public.posiciones where id = v_lote) <> 'VOO' then
    raise exception 'M22rpc: el ticker no se normalizo a mayusculas';
  end if;

  -- No se puede vender mas de lo que hay.
  v_fallo := null;
  begin
    perform public.cerrar_posicion(v_lote, 9, 750, '2026-03-10');
    v_fallo := 'se acepto vender 9 de un lote de 5';
  exception when others then null;
  end;
  if v_fallo is not null then raise exception 'M22rpc: %', v_fallo; end if;

  -- CIERRE PARCIAL real: vender 2 de 5 a 750 => efectivo 6500 + 1500 = 8000
  v_cerrada := public.cerrar_posicion(v_lote, 2, 750, '2026-03-10');

  select cantidad into v_cant from public.posiciones where id = v_lote;
  if v_cant <> 3 then
    raise exception 'M22rpc: el lote abierto quedo en % (esperado 3)', v_cant;
  end if;

  select cantidad into v_cant from public.posiciones where id = v_cerrada;
  if v_cant <> 2 then
    raise exception 'M22rpc: el lote cerrado quedo en % (esperado 2)', v_cant;
  end if;

  if (select precio_compra from public.posiciones where id = v_cerrada) <> 700 then
    raise exception 'M22rpc: el cierre parcial no conservo el precio de compra';
  end if;

  if (select lote_origen_id from public.posiciones where id = v_cerrada) <> v_lote then
    raise exception 'M22rpc: falta la trazabilidad al lote origen';
  end if;

  select saldo into v_saldo from public.cuentas where id = v_cuenta;
  if v_saldo <> 8000 then
    raise exception 'M22rpc: tras vender 2x750 el efectivo quedo en % (esperado 8000)', v_saldo;
  end if;

  -- Cerrar el resto: cierre TOTAL, misma fila, sin lote nuevo.
  perform public.cerrar_posicion(v_lote, 3, 800, '2026-04-01');
  if (select estado from public.posiciones where id = v_lote) <> 'cerrada' then
    raise exception 'M22rpc: el cierre total no marco la fila como cerrada';
  end if;
  select saldo into v_saldo from public.cuentas where id = v_cuenta;
  if v_saldo <> 10400 then
    raise exception 'M22rpc: tras el cierre total el efectivo quedo en % (esperado 10400)', v_saldo;
  end if;

  -- Un lote cerrado no se puede volver a cerrar.
  v_fallo := null;
  begin
    perform public.cerrar_posicion(v_lote, 1, 900, '2026-05-01');
    v_fallo := 'se cerro dos veces el mismo lote';
  exception when others then null;
  end;
  if v_fallo is not null then raise exception 'M22rpc: %', v_fallo; end if;

  -- Ajuste manual de efectivo: el broker dice otra cosa.
  perform public.ajustar_saldo_cuenta(v_cuenta, 12000, 'El broker marca 12000');
  select saldo into v_saldo from public.cuentas where id = v_cuenta;
  if v_saldo <> 12000 then
    raise exception 'M22rpc: el ajuste dejo el efectivo en % (esperado 12000)', v_saldo;
  end if;
  if not exists (
    select 1 from public.operaciones_cuenta
     where cuenta_id = v_cuenta and tipo = 'ajuste' and monto = 1600
  ) then
    raise exception 'M22rpc: el ajuste no registro la diferencia (esperado +1600)';
  end if;

  -- Una cuenta que NO es de inversion no puede tener posiciones.
  v_fallo := null;
  begin
    insert into public.cuentas (usuario_id, tipo, nombre, banco)
    values (v_usuario, 'ahorros', 'probe no broker', 'Bancolombia')
    returning id into v_cuenta;
    perform public.registrar_compra_posicion(v_cuenta, 'VOO', 'stocks', 1, 700, '2026-01-15', 'USD', null);
    v_fallo := 'una cuenta de ahorros acepto una posicion';
  exception when others then null;
  end;
  if v_fallo is not null then raise exception 'M22rpc: %', v_fallo; end if;

  -- Y nada de esto creo un movimiento de flujo.
  if (select count(*) from public.movimientos) <> v_movimientos_antes then
    raise exception 'M22rpc: una operacion interna creo un movimiento';
  end if;

  perform set_config('request.jwt.claims', null, true);
  raise notice 'M22rpc: OK -- compra, cierre parcial y total, ajuste y guardas.';
end $$;

-- ── M23: consumo de ahorro trazable, pero separado del flujo ────────────────
do $$
declare
  v_usuario uuid;
  v_ahorros uuid;
  v_tipo_gasto uuid;
  v_tipo_ingreso uuid;
  v_mov uuid;
  v_fallo text;
begin
  select id into v_usuario from public.usuarios order by created_at limit 1;

  insert into public.cuentas (usuario_id, tipo, nombre, banco, saldo)
  values (v_usuario, 'ahorros', 'probe M23 ahorros', 'Banco prueba', 1000)
  returning id into v_ahorros;

  insert into public.tipo_movimiento (usuario_id, nombre, meta, tipo)
  values (v_usuario, 'probe M23 gasto', 0, 'gasto')
  returning id into v_tipo_gasto;

  insert into public.tipo_movimiento (usuario_id, nombre, meta, tipo)
  values (v_usuario, 'probe M23 ingreso', 0, 'ingreso')
  returning id into v_tipo_ingreso;

  insert into public.movimientos (
    usuario_id, id_tipo_movimiento, nombre, importe, fecha, sale_de_ahorros
  )
  values (
    v_usuario, v_tipo_gasto, 'probe M23 valido sin patrimonio', 100, current_date, true
  )
  returning id into v_mov;

  if (select cuenta_id from public.movimientos where id = v_mov) is not null then
    raise exception 'M24: el consumo sin Patrimonio adquirio una cuenta';
  end if;

  if (select saldo from public.cuentas where id = v_ahorros) <> 1000 then
    raise exception 'M24: el consumo sin cuenta movio un saldo de Patrimonio';
  end if;

  -- La asociación de Patrimonio es opcional e independiente. Si se añade, M21
  -- conserva su comportamiento normal y descuenta el saldo de esa cuenta.
  update public.movimientos set cuenta_id = v_ahorros where id = v_mov;
  if (select saldo from public.cuentas where id = v_ahorros) <> 900 then
    raise exception 'M24: asociar la cuenta no redujo su saldo a 900';
  end if;

  v_fallo := null;
  begin
    insert into public.movimientos (
      usuario_id, id_tipo_movimiento, nombre, importe, fecha,
      cuenta_id, sale_de_ahorros
    )
    values (
      v_usuario, v_tipo_ingreso, 'probe M23 ingreso invalido', 100, current_date,
      v_ahorros, true
    );
    v_fallo := 'se acepto un ingreso como consumo de ahorro';
  exception when others then null;
  end;
  if v_fallo is not null then raise exception 'M23: %', v_fallo; end if;

  -- Borrar la cuenta no borra ni desmarca el consumo: el ahorro acumulado no
  -- depende de que Patrimonio esté habilitado ni de que esa cuenta siga viva.
  delete from public.cuentas where id = v_ahorros;
  if not exists (
    select 1 from public.movimientos
     where id = v_mov and cuenta_id is null and sale_de_ahorros = true
  ) then
    raise exception 'M24: borrar la cuenta altero el consumo de ahorro';
  end if;

  raise notice 'M24: OK -- ahorro acumulado independiente de Patrimonio.';
end $$;

-- Un unico rollback, al final. Estuvo a mitad de archivo y los bloques que
-- venian despues corrian fuera de la transaccion: cada ejecucion dejaba
-- cuentas, posiciones y operaciones de prueba commiteadas en la base.
rollback;
