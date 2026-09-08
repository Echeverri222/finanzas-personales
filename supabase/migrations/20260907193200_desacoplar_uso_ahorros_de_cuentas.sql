-- ============================================================================
-- M24: "sale de ahorros" pertenece al ahorro acumulado, no a Patrimonio.
--
-- M23 exigía una cuenta de patrimonio tipo ahorros. Eso mezclaba dos modelos:
-- la bolsa lógica de ahorro que existe para todos los usuarios y las cuentas
-- opcionales de Patrimonio. El marcador solo necesita representar una salida
-- de dinero; cuenta_id sigue siendo una asociación independiente y opcional.
--
-- Risk: LOW. No modifica filas ni saldos; relaja una validación de escritura.
-- Reversible: restaurar validar_movimiento_desde_ahorros desde M23.
-- ============================================================================

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

  select tm.tipo
    into v_tipo
    from public.tipo_movimiento tm
   where tm.id = new.id_tipo_movimiento;

  if v_tipo not in ('gasto', 'inversion', 'prestamo') then
    raise exception
      'M24: solo una salida de dinero puede marcarse como uso de ahorros (tipo %)',
      v_tipo;
  end if;

  return new;
end;
$$;

comment on column public.movimientos.sale_de_ahorros is
  'True cuando el movimiento consume ahorro acumulado. No requiere una cuenta '
  'de Patrimonio, se excluye del flujo mensual y resta en la vista de Ahorros.';

comment on function public.validar_movimiento_desde_ahorros() is
  'Valida que sale_de_ahorros solo se use en categorias de salida. No depende '
  'de movimientos.cuenta_id ni de que Patrimonio este habilitado.';
