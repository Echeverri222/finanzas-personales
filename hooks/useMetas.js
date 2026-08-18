import useSWR from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { userKey } from '../lib/swr';

/**
 * Row -> what the UI sees. The database spells three of these differently
 * (`nombre_objetivo`, `meta_total`, `monto_actual`) and this mapping was
 * duplicated verbatim in four places, so a fix to one copy silently left the
 * other three wrong. One function now, called from every path.
 */
function toMeta(row) {
  return {
    ...row,
    nombre: row.nombre_objetivo,
    objetivo: Number(row.meta_total),
    actual: Number(row.monto_actual || 0),
    created_at: new Date(row.created_at),
    fechaCreacion: row.created_at
      ? new Date(row.created_at).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
  };
}

async function fetchMetas([, usuarioId]) {
  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false });

  if (error) throw new Error(error.message);
  return (data || []).map(toMeta);
}

export function useMetas() {
  const { userProfile, loading: userLoading } = useUser();
  const usuarioId = userProfile?.id ?? null;

  const { data, error, isLoading, mutate } = useSWR(userKey('metas', usuarioId), fetchMetas);

  const metas = data ?? [];

  const createMeta = async (metaData) => {
    if (!usuarioId) return { error: 'No user profile' };

    try {
      const { data: row, error: e } = await supabase
        .from('metas')
        .insert([
          {
            nombre_objetivo: metaData.nombre,
            meta_total: metaData.objetivo,
            descripcion: metaData.descripcion || '',
            fecha_meta: metaData.fecha_meta || null,
            usuario_id: usuarioId,
            monto_actual: 0, // Always start with 0
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (e) throw e;

      const created = toMeta(row);
      await mutate((prev = []) => [created, ...prev], { revalidate: false });
      return { data: created, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateMeta = async (id, updates) => {
    if (!usuarioId) return { error: 'No user profile' };

    try {
      // Map frontend field names to database column names
      const dbUpdates = {};
      if (updates.nombre) dbUpdates.nombre_objetivo = updates.nombre;
      if (updates.objetivo) dbUpdates.meta_total = updates.objetivo;
      if (updates.actual !== undefined) dbUpdates.monto_actual = updates.actual;
      if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
      if (updates.fecha_meta) dbUpdates.fecha_meta = updates.fecha_meta;

      const { data: row, error: e } = await supabase
        .from('metas')
        .update(dbUpdates)
        .eq('id', id)
        .eq('usuario_id', usuarioId)
        .select()
        .single();

      if (e) throw e;

      const updated = toMeta(row);
      await mutate((prev = []) => prev.map((meta) => (meta.id === id ? updated : meta)), {
        revalidate: false,
      });
      return { data: updated, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const deleteMeta = async (id) => {
    if (!usuarioId) return { error: 'No user profile' };

    try {
      const { error: e } = await supabase
        .from('metas')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId);

      if (e) throw e;

      await mutate((prev = []) => prev.filter((meta) => meta.id !== id), { revalidate: false });
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  /**
   * Read-modify-write with no optimistic locking: two tabs adding money at the
   * same time will lose one of the contributions. Deliberately NOT given
   * `optimisticData` -- an optimistic update would render the lost amount as if
   * it had been saved, turning a visible race into an invisible one.
   */
  const addMoneyToMeta = async (id, amount) => {
    if (!usuarioId) return { error: 'No user profile' };

    try {
      const currentMeta = metas.find((meta) => meta.id === id);
      if (!currentMeta) throw new Error('Meta no encontrada');

      const newAmount = currentMeta.actual + Number(amount);

      const { data: row, error: e } = await supabase
        .from('metas')
        .update({ monto_actual: newAmount })
        .eq('id', id)
        .eq('usuario_id', usuarioId)
        .select()
        .single();

      if (e) throw e;

      const updated = toMeta(row);
      await mutate((prev = []) => prev.map((meta) => (meta.id === id ? updated : meta)), {
        revalidate: false,
      });
      return { data: updated, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return {
    metas,
    loading: userLoading || isLoading,
    error: error ? error.message : null,
    createMeta,
    updateMeta,
    deleteMeta,
    addMoneyToMeta,
    refetch: () => mutate(),
  };
}
