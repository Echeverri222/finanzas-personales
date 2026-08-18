import useSWR from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { userKey } from '../lib/swr';

function isMissingTable(error) {
  return error.code === '42P01' || error.message?.includes('does not exist');
}

/**
 * Both queries stay in ONE fetcher: the join table is filtered by the user's tag
 * ids, so the second query cannot be issued until the first has answered. Two
 * SWR keys would let a consumer observe the half-loaded state in between.
 */
async function fetchMovimientoTags([, usuarioId]) {
  const { data: tagsData, error: tagsErr } = await supabase
    .from('tags')
    .select('id')
    .eq('usuario_id', usuarioId);

  if (tagsErr) {
    if (isMissingTable(tagsErr)) return {};
    throw new Error(tagsErr.message);
  }

  const tagIds = (tagsData || []).map((t) => t.id);
  if (tagIds.length === 0) return {};

  const { data, error } = await supabase
    .from('movimiento_tags')
    .select('movimiento_id, tag_id')
    .in('tag_id', tagIds);

  if (error) {
    if (isMissingTable(error)) return {};
    throw new Error(error.message);
  }

  const byMov = {};
  (data || []).forEach(({ movimiento_id, tag_id }) => {
    if (!byMov[movimiento_id]) byMov[movimiento_id] = [];
    byMov[movimiento_id].push(tag_id);
  });
  return byMov;
}

/** Returns a Record<movimientoId, tagId[]> for the current user's movimientos */
export function useMovimientoTags() {
  const { userProfile, loading: userLoading } = useUser();
  const usuarioId = userProfile?.id ?? null;

  const { data, isLoading, mutate } = useSWR(
    userKey('movimiento-tags', usuarioId),
    fetchMovimientoTags
  );

  const setMovimientoTags = async (movimientoId, tagIds) => {
    try {
      await supabase.from('movimiento_tags').delete().eq('movimiento_id', movimientoId);
      if (tagIds?.length) {
        await supabase
          .from('movimiento_tags')
          .insert(tagIds.map((tag_id) => ({ movimiento_id: movimientoId, tag_id })));
      }
      // A delete-then-insert returns nothing to graft onto the cache, so this is
      // the one place a real refetch is the cheapest correct option.
      await mutate();
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return {
    movimientoTagIds: data ?? {},
    loading: userLoading || isLoading,
    refetch: () => mutate(),
    setMovimientoTags,
  };
}
