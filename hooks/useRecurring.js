import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

/**
 * Recurring payments: templates that generate one movimiento per month on a fixed day.
 * Use processRecurringForToday() on app load to create this month's movimientos.
 */
export function useRecurring() {
  const { userProfile } = useUser();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRecurring = useCallback(async () => {
    if (!userProfile?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: e } = await supabase
        .from('pagos_recurrentes')
        .select(`
          *,
          tipo_movimiento ( id, nombre )
        `)
        .eq('usuario_id', userProfile.id)
        .order('dia_mes', { ascending: true });
      if (e) throw e;
      setList(data || []);
    } catch (err) {
      setError(err.message);
      setList([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const createRecurring = async (payload) => {
    if (!userProfile?.id) return { error: 'No user' };
    try {
      const { data, error: e } = await supabase
        .from('pagos_recurrentes')
        .insert([{ ...payload, usuario_id: userProfile.id }])
        .select()
        .single();
      if (e) throw e;
      setList((prev) => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateRecurring = async (id, updates) => {
    try {
      const { data, error: e } = await supabase
        .from('pagos_recurrentes')
        .update(updates)
        .eq('id', id)
        .eq('usuario_id', userProfile.id)
        .select()
        .single();
      if (e) throw e;
      setList((prev) => prev.map((r) => (r.id === id ? data : r)));
      return { data, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const deleteRecurring = async (id) => {
    try {
      const { error: e } = await supabase
        .from('pagos_recurrentes')
        .delete()
        .eq('id', id)
        .eq('usuario_id', userProfile.id);
      if (e) throw e;
      setList((prev) => prev.filter((r) => r.id !== id));
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
    if (!userProfile?.id) return { data: null, error: null };

    const now = new Date();
    const hoyLocal = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');

    const { data, error: rpcError } = await supabase.rpc(
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
    if (data?.some((r) => r.accion === 'genera')) {
      await fetchRecurring();
    }

    return { data, error: null };
  }, [userProfile?.id, fetchRecurring]);

  return {
    list,
    loading,
    error,
    refetch: fetchRecurring,
    createRecurring,
    updateRecurring,
    deleteRecurring,
    processRecurringForToday,
  };
}
