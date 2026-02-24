import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

/** Returns a Map<movimientoId, tagId[]> for the current user's movimientos */
export function useMovimientoTags() {
  const [map, setMap] = useState({});
  const [loading, setLoading] = useState(true);
  const { userProfile } = useUser();

  const fetch = useCallback(async () => {
    if (!userProfile?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data: tagsData, error: tagsErr } = await supabase
        .from('tags')
        .select('id')
        .eq('usuario_id', userProfile.id);
      if (tagsErr && (tagsErr.code === '42P01' || tagsErr.message?.includes('does not exist'))) {
        setMap({});
        return;
      }
      const tagIds = (tagsData || []).map((t) => t.id);
      if (tagIds.length === 0) {
        setMap({});
        return;
      }
      const { data, error } = await supabase
        .from('movimiento_tags')
        .select('movimiento_id, tag_id')
        .in('tag_id', tagIds);

      if (error) {
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          setMap({});
        } else {
          throw error;
        }
      } else {
        const byMov = {};
        (data || []).forEach(({ movimiento_id, tag_id }) => {
          if (!byMov[movimiento_id]) byMov[movimiento_id] = [];
          byMov[movimiento_id].push(tag_id);
        });
        setMap(byMov);
      }
    } catch {
      setMap({});
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const setMovimientoTags = async (movimientoId, tagIds) => {
    try {
      await supabase
        .from('movimiento_tags')
        .delete()
        .eq('movimiento_id', movimientoId);
      if (tagIds?.length) {
        await supabase.from('movimiento_tags').insert(
          tagIds.map((tag_id) => ({ movimiento_id: movimientoId, tag_id }))
        );
      }
      await fetch();
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return { movimientoTagIds: map, loading, refetch: fetch, setMovimientoTags };
}
