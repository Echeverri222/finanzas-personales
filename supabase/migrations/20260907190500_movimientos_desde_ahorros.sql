-- ============================================================================
-- M23: distinguir los consumos de ahorro del flujo mensual.
--
-- Un gasto financiado con dinero acumulado debe reducir el saldo de la cuenta
-- y conservar su trazabilidad, pero no debe inflar los gastos ni reducir el
-- balance del mes. `sale_de_ahorros` expresa ese origen sin reemplazar la
-- categoria real del movimiento.
--
-- Risk: LOW. La columna es NOT NULL con default false, por lo que todo el
-- historico conserva exactamente la semantica anterior.
-- Reversible: yes -- ver bloque down.
-- ============================================================================

alter table public.movimientos
  add column if not exists sale_de_ahorros boolean not null default false;

comment on column public.movimientos.sale_de_ahorros is
  'True cuando el movimiento consume ahorro acumulado: mueve el saldo de la '
  'cuenta asociada, queda en el historial, pero se excluye del flujo mensual.';

-- La regla no puede expresarse como CHECK porque depende de cuentas y
-- tipo_movimiento. Se valida antes de que el trigger de saldo aplique el delta.
create or replace function public.validar_movimiento_desde_ahorros()
returns trigger
language plpgsql
as $$
declare
  v_tipo public.tipo_categoria;
begin
  if not new.sale_de_ahorros then
    return new;
  end if;

  -- ON DELETE SET NULL tiene que seguir permitiendo borrar una cuenta. En ese
  -- caso se conserva el movimiento, pero deja de estar marcado como consumo de
  -- ahorro porque ya no hay una cuenta que respalde esa afirmacion.
  if new.cuenta_id is null then
    if tg_op = 'UPDATE' and old.sale_de_ahorros and old.cuenta_id is not null then
      new.sale_de_ahorros := false;
      return new;
    end if;
    raise exception
      'M23: un movimiento que sale de ahorros requiere una cuenta de ahorros';
  end if;

  if not exists (
    select 1
      from public.cuentas c
     where c.id = new.cuenta_id
       and c.usuario_id is not distinct from new.usuario_id
       and c.tipo = 'ahorros'
  ) then
    raise exception
      'M23: la cuenta debe ser una cuenta de ahorros del mismo usuario';
  end if;

  select tm.tipo
    into v_tipo
    from public.tipo_movimiento tm
   where tm.id = new.id_tipo_movimiento;

  if v_tipo not in ('gasto', 'inversion', 'prestamo') then
    raise exception
      'M23: solo una salida de dinero puede marcarse como consumo de ahorros (tipo %)',
      v_tipo;
  end if;

  return new;
end;
$$;

drop trigger if exists movimientos_validar_desde_ahorros on public.movimientos;
create trigger movimientos_validar_desde_ahorros
  before insert or update on public.movimientos
  for each row execute function public.validar_movimiento_desde_ahorros();

create or replace function public.aplicar_movimiento_a_saldo()
returns trigger
language plpgsql
as $$
declare
  v_delta numeric;
begin
  if (tg_op = 'DELETE' or tg_op = 'UPDATE') and old.cuenta_id is not null then
    select case when tm.tipo = 'ingreso' then -old.importe else old.importe end
      into v_delta
      from public.tipo_movimiento tm
     where tm.id = old.id_tipo_movimiento;

    if v_delta is not null then
      update public.cuentas
         set saldo = saldo + v_delta
       where id = old.cuenta_id;
    end if;
  end if;

  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.cuenta_id is not null then
    if exists (
      select 1 from public.cuentas c
       where c.id = new.cuenta_id and c.tipo = 'activo'
    ) then
      raise exception
        'M21: un movimiento no puede causarse contra una cuenta de tipo activo (cuenta %)',
        new.cuenta_id;
    end if;

    if exists (
      select 1 from public.cuentas c
       where c.id = new.cuenta_id and c.usuario_id is distinct from new.usuario_id
    ) then
      raise exception
        'M21: la cuenta % no pertenece al usuario del movimiento', new.cuenta_id;
    end if;

    select case when tm.tipo = 'ingreso' then new.importe else -new.importe end
      into v_delta
      from public.tipo_movimiento tm
     where tm.id = new.id_tipo_movimiento;

    if v_delta is not null then
      update public.cuentas
         set saldo = saldo + v_delta
       where id = new.cuenta_id;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

comment on function public.aplicar_movimiento_a_saldo() is
  'Mantiene cuentas.saldo y valida que sale_de_ahorros solo use una cuenta de '
  'ahorros propia y una categoria de salida.';

-- ----------------------------------------------------------------------------
-- down
--
--   drop trigger if exists movimientos_validar_desde_ahorros on public.movimientos;
--   drop function if exists public.validar_movimiento_desde_ahorros();
--   alter table public.movimientos
--     drop column if exists sale_de_ahorros;
--   -- Restaurar aplicar_movimiento_a_saldo desde M21.
-- ----------------------------------------------------------------------------
