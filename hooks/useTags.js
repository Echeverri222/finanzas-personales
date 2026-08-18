import useSWR from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { userKey } from '../lib/swr';

/** The tags feature is optional: on an installation without the migration the
 *  table simply is not there, and that is not an error worth showing. */
function isMissingTable(error) {
  return error.code === '42P01' || error.message?.includes('does not exist');
}

async function fetchTags([, usuarioId]) {
  const { data, error } = await supabase
    .from('tags')
    .select('id, nombre, created_at')
    .eq('usuario_id', usuarioId)
    .order('nombre', { ascending: true });

  // Swallowed inside the FETCHER on purpose. Returning it would make a missing
  // optional table a permanent SWR `error`, and every consumer would render an
  // alert for a feature the user simply does not have.
  if (error) {
    if (isMissingTable(error)) return [];
    throw new Error(error.message);
  }
  return data || [];
}

export function useTags() {
  const { userProfile, loading: userLoading } = useUser();
  const usuarioId = userProfile?.id ?? null;

  const { data, error, isLoading, mutate } = useSWR(userKey('tags', usuarioId), fetchTags);

  const tags = data ?? [];
  const byNombre = (a, b) => a.nombre.localeCompare(b.nombre);

  const createTag = async (nombre) => {
    if (!usuarioId) return { error: 'No user profile' };
    const trimmed = (nombre || '').trim();
    if (!trimmed) return { error: 'Nombre requerido' };
    try {
      const { data: row, error: e } = await supabase
        .from('tags')
        .insert([{ usuario_id: usuarioId, nombre: trimmed }])
        .select()
        .single();
      if (e) throw e;
      await mutate(
        (prev = []) => [...prev.filter((t) => t.id !== row.id), row].sort(byNombre),
        { revalidate: false }
      );
      return { data: row, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateTag = async (id, { nombre }) => {
    if (!usuarioId) return { error: 'No user profile' };
    const trimmed = (nombre || '').trim();
    if (!trimmed) return { error: 'Nombre requerido' };
    try {
      const { data: row, error: e } = await supabase
        .from('tags')
        .update({ nombre: trimmed })
        .eq('id', id)
        .eq('usuario_id', usuarioId)
        .select()
        .single();
      if (e) throw e;
      // Re-sorted, not just replaced: the list is ordered by name and a rename
      // can move it.
      await mutate((prev = []) => prev.map((t) => (t.id === id ? row : t)).sort(byNombre), {
        revalidate: false,
      });
      return { data: row, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const deleteTag = async (id) => {
    if (!usuarioId) return { error: 'No user profile' };
    try {
      const { error: e } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)
        .eq('usuario_id', usuarioId);
      if (e) throw e;
      await mutate((prev = []) => prev.filter((t) => t.id !== id), { revalidate: false });
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return {
    tags,
    loading: userLoading || isLoading,
    error: error ? error.message : null,
    createTag,
    updateTag,
    deleteTag,
    refetch: () => mutate(),
  };
}
