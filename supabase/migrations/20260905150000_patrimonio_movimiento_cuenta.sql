-- ============================================================================
-- M21: un movimiento puede afectar el saldo de una cuenta.
--
-- Lo unico que patrimonio habilita dentro del flujo: marcar que un gasto o un
-- ingreso se causa contra una cuenta concreta -- pago la gasolina con la cuenta
-- de ahorros, y el efectivo de esa cuenta baja.
--
-- LA CONVENCION DE SIGNO ES EL CORAZON DE ESTA MIGRACION.
-- `movimientos.importe` se guarda SIEMPRE POSITIVO; el signo lo aporta
-- `tipo_movimiento.tipo` (regla M2: la semantica esta en `tipo`, jamas en
-- `nombre`, que es texto libre que el usuario renombra). Por lo tanto:
--     ingreso                              -> saldo + importe
--     gasto | ahorro | inversion | prestamo -> saldo - importe
-- Invertir uno solo de esos casos produce saldos equivocados en silencio: nada
-- falla, solo el numero esta mal. Por eso los cinco valores del enum se prueban
-- en supabase/tests/assert_m20_patrimonio.sql.
--
-- POR QUE UN TRIGGER Y NO CODIGO EN EL CLIENTE.
-- `generar_recurrentes_del_mes` inserta movimientos sin pasar por ningun
-- formulario, y una edicion desde el SQL editor tampoco pasa por React. Un
-- ajuste de saldo en JavaScript se perderia ambos casos sin dejar rastro.
--
-- LO QUE ESTA MIGRACION NO HACE: derivar el saldo. El saldo se almacena. El
-- usuario llega con anos de movimientos historicos sin cuenta, y el efectivo de
-- un broker entra ademas por aportes previos, ventas, dividendos e intereses.
-- `suma de movimientos <> valor de la cuenta`, y nada debe conciliarlos.
--
-- Risk: MEDIUM. Es el unico cambio de M20-M22 que toca `movimientos`. Mitiga:
--   la columna es nullable sin default (todo el historico queda en NULL y no
--   mueve ningun saldo), y el trigger NUNCA escribe en `movimientos` -- solo en
--   `cuentas` -- asi que ninguna cifra del dashboard puede cambiar.
-- Reversible: yes -- ver el bloque down al final.
-- Verify with: npm run db:invariants -- diff   (la seccion 2, "THE MONEY MUST
--   NOT MOVE", tiene que quedar identica)
-- ============================================================================

-- on delete set null, NO cascade: borrar una cuenta no puede llevarse por
-- delante movimientos de flujo. El movimiento sigue siendo cierto aunque la
-- cuenta contra la que se causo ya no exista.
alter table public.movimientos
  add column if not exists cuenta_id uuid
  references public.cuentas(id) on delete set null;

comment on column public.movimientos.cuenta_id is
  'Cuenta de patrimonio contra la que se causa el movimiento. OPCIONAL: un '
  'movimiento sin cuenta es valido y no mueve ningun saldo -- todo el '
  'historico anterior a M21 esta en ese estado.';

create index if not exists movimientos_cuenta_idx
  on public.movimientos (cuenta_id) where cuenta_id is not null;

-- ── el trigger ──────────────────────────────────────────────────────────────
create or replace function public.aplicar_movimiento_a_saldo()
returns trigger
language plpgsql
as $$
declare
  v_delta numeric;
begin
  -- DELETE y la mitad "vieja" de un UPDATE: revierte lo que el movimiento
  -- habia aplicado.
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

  -- INSERT y la mitad "nueva" de un UPDATE: aplica el efecto actual.
  -- Un solo camino cubre cambio de importe, de categoria, de cuenta, y quitar
  -- o poner cuenta: siempre se revierte lo viejo y se aplica lo nuevo.
  if (tg_op = 'INSERT' or tg_op = 'UPDATE') and new.cuenta_id is not null then
    -- Un activo (carro, casa) no tiene efectivo: su valor vive en valor_total.
    -- Se rechaza aqui y no en el cliente para que tambien lo respete un insert
    -- hecho desde el SQL editor o por un pago recurrente.
    if exists (
      select 1 from public.cuentas c
       where c.id = new.cuenta_id and c.tipo = 'activo'
    ) then
      raise exception
        'M21: un movimiento no puede causarse contra una cuenta de tipo activo (cuenta %)',
        new.cuenta_id;
    end if;

    -- La FK garantiza que la cuenta existe, no que sea del mismo dueno. Sin
    -- esta comprobacion, un usuario podria mover el saldo de otro.
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
  'Mantiene cuentas.saldo cuando un movimiento se crea, edita o borra. '
  'importe es siempre positivo y el signo lo da tipo_movimiento.tipo: '
  '''ingreso'' suma, el resto resta. Nunca escribe en movimientos.';

drop trigger if exists movimientos_aplicar_saldo on public.movimientos;
create trigger movimientos_aplicar_saldo
  after insert or update or delete on public.movimientos
  for each row execute function public.aplicar_movimiento_a_saldo();

-- ── self-check ──────────────────────────────────────────────────────────────
-- Estructural: al aplicarse las migraciones no hay usuarios ni cuentas contra
-- las que probar comportamiento. Las pruebas reales del signo, con los cinco
-- valores del enum, viven en supabase/tests/assert_m20_patrimonio.sql.
do $$
begin
  if not exists (
    select 1 from pg_trigger
     where tgrelid = 'public.movimientos'::regclass
       and tgname = 'movimientos_aplicar_saldo'
  ) then
    raise exception 'M21: el trigger movimientos_aplicar_saldo no quedo creado';
  end if;

  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'movimientos'
       and column_name = 'cuenta_id' and is_nullable = 'YES'
  ) then
    raise exception
      'M21: movimientos.cuenta_id debe existir y ser NULLABLE -- el historico '
      'sin cuenta tiene que seguir siendo valido';
  end if;
end $$;

-- ----------------------------------------------------------------------------
-- down (no lo corre la CLI; queda escrito para que el rollback exista).
-- Seguro: quitar la columna solo pierde la asociacion movimiento->cuenta. Los
-- saldos quedan como esten, que es correcto -- representan dinero real, no un
-- derivado de los movimientos.
--
--   drop trigger if exists movimientos_aplicar_saldo on public.movimientos;
--   drop function if exists public.aplicar_movimiento_a_saldo();
--   drop index if exists public.movimientos_cuenta_idx;
--   alter table public.movimientos drop column if exists cuenta_id;
-- ----------------------------------------------------------------------------
