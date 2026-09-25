/**
 * Posiciones de inversión (M22).
 *
 * **Una fila = un lote de compra.** Tres compras de VOO son tres filas, no una
 * con la cantidad sumada. Eso es lo que permite saber la rentabilidad de cada
 * compra por separado, que es justo lo que pide el documento original: de la
 * misma acción puedo tener muchas posiciones con distintos precios de compra.
 *
 * Cerrar una posición es un UPDATE, nunca un DELETE: el historial de
 * rentabilidades realizadas vive en esas mismas filas.
 *
 * Comprar y vender no crean movimientos. Mover efectivo que ya está dentro del
 * broker no es un gasto — si lo fuera, cada rebalanceo inflaría los gastos del
 * mes con plata que nunca salió del patrimonio. Por eso las tres operaciones
 * son RPC que tocan `posiciones`, `cuentas` y `operaciones_cuenta` de forma
 * atómica, y ninguna toca `movimientos`.
 */
import useSWR from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { userKey } from '../lib/swr';

const SELECT = `
  id, usuario_id, cuenta_id, ticker, nombre, clase,
  cantidad, precio_compra, fecha_compra, moneda,
  estado, precio_venta, fecha_venta, lote_origen_id,
  notas, created_at, updated_at
`;

/** La tabla no existe hasta M22; eso no es un error que mostrarle a nadie. */
function isMissingTable(error) {
  return error.code === '42P01' || error.message?.includes('does not exist');
}

/** `numeric` llega como string desde Postgres; estos números se multiplican. */
function decode(row) {
  return {
    ...row,
    cantidad: Number(row.cantidad),
    precio_compra: Number(row.precio_compra),
    precio_venta: row.precio_venta == null ? null : Number(row.precio_venta),
  };
}

async function fetchPosiciones([, usuarioId]) {
  const { data, error } = await supabase
    .from('posiciones')
    .select(SELECT)
    .eq('usuario_id', usuarioId)
    .order('fecha_compra', { ascending: false });

  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data || []).map(decode);
}

export function usePosiciones() {
  const { userProfile, loading: userLoading } = useUser();
  const usuarioId = userProfile?.id ?? null;

  const { data, error, isLoading, mutate } = useSWR(
    userKey('posiciones', usuarioId),
    fetchPosiciones
  );

  const posiciones = data ?? [];
  const abiertas = posiciones.filter((p) => p.estado === 'abierta');
  const cerradas = posiciones.filter((p) => p.estado === 'cerrada');

  /**
   * Compra: crea el lote y descuenta el efectivo de la cuenta, en una sola
   * transacción. Dos llamadas separadas dejarían una posición sin pagar si la
   * segunda falla.
   */
  const comprar = async ({ cuentaId, ticker, nombre, clase, cantidad, precio, fecha, moneda }) => {
    if (!usuarioId) return { error: 'No user profile' };
    if (!cuentaId) return { error: 'Cuenta requerida' };
    if (!(ticker || '').trim()) return { error: 'Ticker requerido' };
    if (!(Number(cantidad) > 0)) return { error: 'La cantidad debe ser mayor que cero' };
    if (!(Number(precio) >= 0)) return { error: 'Precio de compra inválido' };
    if (!fecha) return { error: 'Fecha de compra requerida' };

    try {
      const { error: e } = await supabase.rpc('registrar_compra_posicion', {
        p_cuenta_id: cuentaId,
        p_ticker: ticker.trim().toUpperCase(),
        p_nombre: (nombre || '').trim() || null,
        p_clase: clase || 'stocks',
        p_cantidad: Number(cantidad),
        p_precio: Number(precio),
        p_fecha: fecha,
        p_moneda: moneda || 'USD',
      });
      if (e) throw e;
      await mutate();
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  /**
   * Cierre total o **parcial**. Si `cantidad` es menor que la del lote, la RPC
   * lo divide: reduce la fila abierta y crea una cerrada con el mismo precio de
   * compra. Sin esto, vender 2 de 5 acciones obligaría al usuario a mentirle a
   * la app y el historial quedaría inservible.
   */
  const cerrar = async ({ posicionId, cantidad, precioVenta, fechaVenta }) => {
    if (!usuarioId) return { error: 'No user profile' };
    if (!(Number(cantidad) > 0)) return { error: 'La cantidad debe ser mayor que cero' };
    if (!(Number(precioVenta) >= 0)) return { error: 'Precio de venta inválido' };
    if (!fechaVenta) return { error: 'Fecha de venta requerida' };

    try {
      const { error: e } = await supabase.rpc('cerrar_posicion', {
        p_posicion_id: posicionId,
        p_cantidad: Number(cantidad),
        p_precio_venta: Number(precioVenta),
        p_fecha_venta: fechaVenta,
      });
      if (e) throw e;
      await mutate();
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  /**
   * Borrar un lote es corregir un error de captura, no vender. Devuelve el
   * efectivo que la compra descontó.
   */
  const eliminar = async (id) => {
    if (!usuarioId) return { error: 'No user profile' };
    try {
      const { error: e } = await supabase.rpc('eliminar_posicion', { p_posicion_id: id });
      if (e) throw e;
      await mutate();
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return {
    posiciones,
    abiertas,
    cerradas,
    loading: userLoading || isLoading,
    error: error ? error.message : null,
    comprar,
    cerrar,
    eliminar,
    refetch: () => mutate(),
  };
}
