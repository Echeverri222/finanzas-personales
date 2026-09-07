/**
 * El libro de por qué se movió el efectivo dentro de una cuenta (M22).
 *
 * Sin esto, un ajuste manual quedaría sin explicación y el saldo parecería
 * haberse movido solo. Compras, ventas, ajustes, rendimientos y comisiones
 * viven aquí — y ninguno es un movimiento de flujo, así que ninguno aparece en
 * el dashboard.
 */
import useSWR from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

function isMissingTable(error) {
  return error.code === '42P01' || error.message?.includes('does not exist');
}

async function fetchOperaciones([, usuarioId, cuentaId]) {
  let query = supabase
    .from('operaciones_cuenta')
    .select('id, cuenta_id, posicion_id, tipo, monto, nota, fecha, created_at')
    .eq('usuario_id', usuarioId)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false });

  if (cuentaId) query = query.eq('cuenta_id', cuentaId);

  const { data, error } = await query;
  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return (data || []).map((op) => ({ ...op, monto: Number(op.monto) }));
}

export function useOperaciones(cuentaId = null) {
  const { userProfile, loading: userLoading } = useUser();
  const usuarioId = userProfile?.id ?? null;

  // La clave incluye la cuenta: el detalle de una cuenta y una vista global no
  // pueden compartir entrada de caché o se mostrarían las operaciones de otra.
  const key = usuarioId ? ['operaciones', usuarioId, cuentaId ?? null] : null;
  const { data, error, isLoading, mutate } = useSWR(key, fetchOperaciones);

  /**
   * Fija el efectivo de la cuenta y registra la diferencia. Va por RPC porque
   * toca dos tablas y debe ser atómico.
   */
  const ajustarSaldo = async (id, nuevoSaldo, nota = null) => {
    if (!usuarioId) return { error: 'No user profile' };
    const valor = Number(nuevoSaldo);
    if (!Number.isFinite(valor)) return { error: 'Saldo inválido' };
    try {
      const { error: e } = await supabase.rpc('ajustar_saldo_cuenta', {
        p_cuenta_id: id,
        p_nuevo_saldo: valor,
        p_nota: nota,
      });
      if (e) throw e;
      await mutate();
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return {
    operaciones: data ?? [],
    loading: userLoading || isLoading,
    error: error ? error.message : null,
    ajustarSaldo,
    refetch: () => mutate(),
  };
}
