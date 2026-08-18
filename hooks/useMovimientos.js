import useSWR from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { userKey } from '../lib/swr';
import { createSafeDate } from '../lib/dateUtils';
import { TIPO } from '../lib/constants';

// The embed is `!inner`, which does two things: an orphan movimiento is
// unrepresentable, and the SQL layer supplies nombre/tipo so no client-side
// re-join is needed to classify a row.
const MOVIMIENTO_SELECT = `
  *,
  tipo_movimiento!inner (
    id,
    nombre,
    meta,
    tipo
  )
`;

/**
 * Row -> what consumers actually get. Never a bare table row:
 *
 * - `fecha` is re-parsed to a LOCAL date, because `new Date('2026-08-16')` is
 *   UTC midnight and renders as the 15th in Bogotá.
 * - `importe` is coerced, because Postgres `numeric` can arrive as a string.
 * - `tipo_categoria` is the semantic field. Branch on it, never on
 *   `tipo_nombre`, which is user-editable free text (M2).
 */
function toMovimiento(row) {
  return {
    ...row,
    fecha: createSafeDate(row.fecha),
    importe: Number(row.importe),
    tipo_nombre: row.tipo_movimiento?.nombre || 'Sin categoría',
    tipo_categoria: row.tipo_movimiento?.tipo || TIPO.GASTO,
  };
}

async function fetchMovimientos([, usuarioId]) {
  const { data, error } = await supabase
    .from('movimientos')
    .select(MOVIMIENTO_SELECT)
    .eq('usuario_id', usuarioId)
    .order('fecha', { ascending: false });

  // Thrown, not returned: SWR surfaces a throw as `error`, and swallowing it
  // here is what used to make a failed load indistinguishable from no data.
  if (error) throw new Error(error.message);
  return (data || []).map(toMovimiento);
}

export function useMovimientos() {
  const { userProfile, loading: userLoading } = useUser();
  const usuarioId = userProfile?.id ?? null;

  const { data, error, isLoading, mutate } = useSWR(
    userKey('movimientos', usuarioId),
    fetchMovimientos
  );

  const movimientos = data ?? [];

  const createMovimiento = async (movimientoData) => {
    if (!usuarioId) return { error: 'No user profile' };

    try {
      const { data: row, error: e } = await supabase
        .from('movimientos')
        .insert([{ ...movimientoData, usuario_id: usuarioId }])
        .select(MOVIMIENTO_SELECT)
        .single();

      if (e) throw e;

      const created = toMovimiento(row);
      // `revalidate: false` because we already hold the authoritative row the
      // server just wrote -- a round-trip would only confirm what we know.
      await mutate((prev = []) => [created, ...prev], { revalidate: false });
      return { data: created, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateMovimiento = async (id, updates) => {
    if (!usuarioId) return { error: 'No user profile' };

    try {
      const { data: row, error: e } = await supabase
        .from('movimientos')
        .update(updates)
        .eq('id', id)
        .eq('usuario_id', usuarioId)
        .select(MOVIMIENTO_SELECT)
        .single();

      if (e) throw e;

      const updated = toMovimiento(row);
      await mutate(
        (prev = []) => prev.map((mov) => (mov.id === id ? updated : mov)),
        { revalidate: false }
      );
      return { data: updated, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  /**
   * The one optimistic mutation. Delete is the case where waiting for the
   * server is most visible and rolling back is unambiguous -- previously the
   * row was removed from state after a successful DELETE, so a *failed* delete
   * left the UI correct only by accident, with no signal either way.
   */
  const deleteMovimiento = async (id) => {
    if (!usuarioId) return { error: 'No user profile' };

    const withoutRow = (prev = []) => prev.filter((mov) => mov.id !== id);

    try {
      await mutate(
        async (prev = []) => {
          const { error: e } = await supabase
            .from('movimientos')
            .delete()
            .eq('id', id)
            .eq('usuario_id', usuarioId);
          if (e) throw new Error(e.message);
          return withoutRow(prev);
        },
        {
          optimisticData: withoutRow,
          rollbackOnError: true,
          populateCache: true,
          revalidate: false,
        }
      );
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return {
    movimientos,
    // A null key makes SWR report `isLoading: false`, so without `userLoading`
    // every screen would render its EMPTY state for the ~200ms the profile
    // takes to resolve -- a regression against the old `useState(true)`.
    loading: userLoading || isLoading,
    error: error ? error.message : null,
    createMovimiento,
    updateMovimiento,
    deleteMovimiento,
    refetch: () => mutate(),
  };
}
