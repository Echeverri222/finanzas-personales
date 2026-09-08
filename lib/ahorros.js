/** Un aporte suma; un movimiento marcado como uso de ahorro resta. */
export function cambioEnAhorro(movimiento) {
  const importe = Math.abs(Number(movimiento?.importe) || 0);
  if (movimiento?.sale_de_ahorros) return -importe;
  // Valor del enum public.tipo_categoria; nunca comparar el nombre editable.
  if (movimiento?.tipo_categoria === 'ahorro') return importe;
  return 0;
}

/** Saldo lógico disponible, independiente de las cuentas de Patrimonio. */
export function ahorroAcumulado(movimientos) {
  return (movimientos || []).reduce(
    (total, movimiento) => total + cambioEnAhorro(movimiento),
    0
  );
}

export function afectaAhorro(movimiento) {
  return cambioEnAhorro(movimiento) !== 0;
}
