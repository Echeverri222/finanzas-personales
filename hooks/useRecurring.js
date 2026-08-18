import { useCallback } from 'react';
import useSWR, { mutate as globalMutate } from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { userKey } from '../lib/swr';

// Note the absence of `!inner`: unlike the movimientos embed this one is
// NULLABLE, so every `r.tipo_movimiento.nombre` has to be guarded.
//
// It is a shared constant because create/update used to call a bare `.select()`
// without it: the inserted row then landed in a list where every other item had
// a category, and its category column rendered blank until the next reload.
const RECURRENTE_SELECT = `
  *,
  tipo_movimiento ( id, nombre )
`;

async function fetchRecurring([, usuarioId]) {
  const { data, error } = await supabase
    .from('pagos_recurrentes')
    .select(RECURRENTE_SELECT)
    .eq('usuario_id', usuarioId)
    .order('dia_mes', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

/**
 * Recurring payments: templates that generate one movimiento per month on a fixed day.
 * Use processRecurringForToday() on app load to create this month's movimientos.
 */
export function useRecurring() {
  const { userProfile, loading: userLoading } = useUser();
  const usuarioId = userProfile?.id ?? null;

  const { data, error, isLoading, mutate } = useSWR(
    userKey('pagos-recurrentes', usuarioId),
    fetchRecurring
  );

  const list = data ?? [];

  const createRecurring = async (payload) => {
    if (!usuarioId) return { error: 'No user' };
    try {
      const { data: row, error: e } = await supabase
        .from('pagos_recurrentes')
        .insert([{ ...payload, usuario_id: usuarioId }])
        .select(RECURRENTE_SELECT)
        .single();
      if (e) throw e;
      await mutate((prev = []) => [row, ...prev], { revalidate: false });
      return { data: row, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateRecurring = async (id, updates) => {
    if (!usuarioId) return { error: 'No user' };
    try {
      const { data: row, error: e } = await supabase
        .from('pagos_recurrentes')
        .update(updates)
        .eq('id', id)
        .eq('usuario_id', usuarioId)
        .select(RECURRENTE_SELECT)
        .single();
      if (e) throw e;
      await mutate((prev = []) => prev.map((r) => (r.id === id ? row : r)), {
        revalidate: false,
      });
      return { data: row, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const deleteRecurring = async (id) => {
    if (!usuarioId) return { error: 'No user' };
    try {
      const { error: e } = await supabase
        .from('pagos_recurrentes')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId);
      if (e) throw e;
      await mutate((prev = []) => prev.filter((r) => r.id !== id), { revalidate: false });
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  /**
   * Generate this month's movimientos for the user's active recurring rules.
   *
   * Delegates to the generar_recurrentes_del_mes RPC (see the M9 migration).
   * The previous version looped in the browser doing a SELECT + INSERT per
   * rule, and its existence check only matched on recurring_id -- so a
   * movimiento the user had typed in by hand was invisible to it and got
   * duplicated. The RPC matches on name within the month regardless of origin,
   * runs as one atomic statement, and is backed by a unique index so
   * concurrent tabs cannot both insert.
   *
   * p_hoy is the CLIENT's local date on purpose: the database runs in UTC, and
   * after 19:00 in Bogota (UTC-5) the server's current_date is already
   * tomorrow, which would fire a rule a day early.
   */
  const processRecurringForToday = useCallback(async () => {
    if (!usuarioId) return { data: null, error: null };

    const now = new Date();
    const hoyLocal = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    const { data: result, error: rpcError } = await supabase.rpc(
      'generar_recurrentes_del_mes',
      { p_hoy: hoyLocal }
    );

    // The old code discarded this error entirely, which is why six months of
    // the feature never running produced no signal at all.
    if (rpcError) {
      console.error('processRecurringForToday:', rpcError.message);
      return { data: null, error: rpcError.message };
    }

    // Only refetch when something actually changed.
    if (result?.some((r) => r.accion === 'genera')) {
      // The RPC writes MOVIMIENTOS, and this hook's own key is the recurring
      // list -- so invalidating only that key is why generated rows never
      // appeared on /dashboard or /movimientos until a manual reload.
      await Promise.all([mutate(), globalMutate(['movimientos', usuarioId])]);
    }

    return { data: result, error: null };
  }, [usuarioId, mutate]);

  return {
    list,
    loading: userLoading || isLoading,
    error: error ? error.message : null,
    refetch: () => mutate(),
    createRecurring,
    updateRecurring,
    deleteRecurring,
    processRecurringForToday,
  };
}
