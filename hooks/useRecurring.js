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
   * Create movimientos in the DB for recurring rules whose scheduled day has arrived.
   * For each active recurring: scheduled day = min(dia_mes, last day of month).
   * If we're on or after that day this month and no movimiento exists yet for this month,
   * insert one with fecha = that scheduled day. Runs on app load; one movimiento per recurring per month.
   */
  const processRecurringForToday = useCallback(async () => {
    if (!userProfile?.id) return;
    const now = new Date();
    const today = now.getDate();
    const year = now.getFullYear();
    const month = now.getMonth();
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();

    try {
      const { data: allActive, error: fetchErr } = await supabase
        .from('pagos_recurrentes')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .eq('activo', true);
      if (fetchErr) throw fetchErr;
      if (!allActive?.length) return;

      const startOfMonth = new Date(year, month, 1).toISOString();
      const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

      for (const rec of allActive) {
        const scheduledDay = Math.min(rec.dia_mes, lastDayOfMonth);
        if (scheduledDay > today) continue;

        const { data: existing } = await supabase
          .from('movimientos')
          .select('id')
          .eq('usuario_id', userProfile.id)
          .eq('recurring_id', rec.id)
          .gte('fecha', startOfMonth)
          .lte('fecha', endOfMonth)
          .limit(1);

        if (existing?.length > 0) continue;

        const fecha = new Date(year, month, scheduledDay);
        await supabase.from('movimientos').insert([
          {
            usuario_id: userProfile.id,
            nombre: rec.nombre,
            importe: Number(rec.importe),
            id_tipo_movimiento: rec.id_tipo_movimiento,
            fecha: fecha.toISOString(),
            recurring_id: rec.id,
          },
        ]);
      }
    } catch (err) {
      console.error('Process recurring:', err);
    }
  }, [userProfile?.id]);

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
