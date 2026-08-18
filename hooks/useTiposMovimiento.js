import useSWR from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { userKey } from '../lib/swr';
import { TIPO } from '../lib/constants';

const NO_PROFILE = 'Perfil de usuario no disponible. Por favor, recarga la página e intenta nuevamente.';

async function fetchTiposMovimiento([, usuarioId]) {
  const { data, error } = await supabase
    .from('tipo_movimiento')
    .select('*')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  return data || [];
}

export function useTiposMovimiento() {
  const { userProfile, loading: userLoading } = useUser();
  const usuarioId = userProfile?.id ?? null;

  const { data, error, isLoading, mutate } = useSWR(
    userKey('tipos-movimiento', usuarioId),
    fetchTiposMovimiento
  );

  const tiposMovimiento = data ?? [];

  const createTipoMovimiento = async (tipoData) => {
    if (!usuarioId) return { error: NO_PROFILE };

    try {
      const { data: row, error: e } = await supabase
        .from('tipo_movimiento')
        .insert([
          {
            nombre: tipoData.nombre,
            meta: tipoData.meta,
            // Must be sent explicitly. The column defaults to 'gasto', so a new
            // income or savings category would otherwise be silently counted as
            // spending.
            tipo: tipoData.tipo || TIPO.GASTO,
            usuario_id: usuarioId,
          },
        ])
        .select('*')
        .single();

      if (e) throw e;

      await mutate((prev = []) => [...prev, row], { revalidate: false });
      return { data: row, error: null };
    } catch (err) {
      console.error('Error creating categoría:', err);
      return { error: err.message };
    }
  };

  const updateTipoMovimiento = async (id, updateData) => {
    if (!usuarioId) return { error: NO_PROFILE };

    try {
      const { data: row, error: e } = await supabase
        .from('tipo_movimiento')
        .update({
          nombre: updateData.nombre,
          meta: updateData.meta,
          // Only overwrite when the caller supplies one, so a partial update
          // cannot reset an existing category to 'gasto'.
          ...(updateData.tipo ? { tipo: updateData.tipo } : {}),
        })
        .eq('id', id)
        .eq('usuario_id', usuarioId)
        .select('*')
        .single();

      if (e) throw e;

      await mutate((prev = []) => prev.map((tipo) => (tipo.id === id ? row : tipo)), {
        revalidate: false,
      });
      return { data: row, error: null };
    } catch (err) {
      console.error('Error updating categoría:', err);
      return { error: err.message };
    }
  };

  const deleteTipoMovimiento = async (id) => {
    if (!usuarioId) return { error: NO_PROFILE };

    try {
      const { error: e } = await supabase
        .from('tipo_movimiento')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId);

      if (e) throw e;

      await mutate((prev = []) => prev.filter((tipo) => tipo.id !== id), { revalidate: false });
      return { error: null };
    } catch (err) {
      console.error('Error deleting categoría:', err);
      return { error: err.message };
    }
  };

  return {
    tiposMovimiento,
    loading: userLoading || isLoading,
    error: error ? error.message : null,
    createTipoMovimiento,
    updateTipoMovimiento,
    deleteTipoMovimiento,
    refetch: () => mutate(),
  };
}
