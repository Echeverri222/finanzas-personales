import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

export function useTags() {
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userProfile } = useUser();

  const fetchTags = useCallback(async () => {
    if (!userProfile?.id) {
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const { data, error: supabaseError } = await supabase
        .from('tags')
        .select('id, nombre, created_at')
        .eq('usuario_id', userProfile.id)
        .order('nombre', { ascending: true });

      if (supabaseError) {
        if (supabaseError.code === '42P01' || supabaseError.message?.includes('does not exist')) {
          setTags([]);
        } else {
          throw supabaseError;
        }
      } else {
        setTags(data || []);
      }
    } catch (err) {
      setError(err.message);
      setTags([]);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.id]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const createTag = async (nombre) => {
    if (!userProfile?.id) return { error: 'No user profile' };
    const trimmed = (nombre || '').trim();
    if (!trimmed) return { error: 'Nombre requerido' };
    try {
      const { data, error: supabaseError } = await supabase
        .from('tags')
        .insert([{ usuario_id: userProfile.id, nombre: trimmed }])
        .select()
        .single();
      if (supabaseError) throw supabaseError;
      setTags((prev) => [...prev.filter((t) => t.id !== data.id), data].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      return { data, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateTag = async (id, { nombre }) => {
    if (!userProfile?.id) return { error: 'No user profile' };
    const trimmed = (nombre || '').trim();
    if (!trimmed) return { error: 'Nombre requerido' };
    try {
      const { data, error: supabaseError } = await supabase
        .from('tags')
        .update({ nombre: trimmed })
        .eq('id', id)
        .eq('usuario_id', userProfile.id)
        .select()
        .single();
      if (supabaseError) throw supabaseError;
      setTags((prev) => prev.map((t) => (t.id === id ? data : t)));
      return { data, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const deleteTag = async (id) => {
    if (!userProfile?.id) return { error: 'No user profile' };
    try {
      const { error: supabaseError } = await supabase
        .from('tags')
        .delete()
        .eq('id', id)
        .eq('usuario_id', userProfile.id);
      if (supabaseError) throw supabaseError;
      setTags((prev) => prev.filter((t) => t.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  return {
    tags,
    loading,
    error,
    createTag,
    updateTag,
    deleteTag,
    refetch: fetchTags,
  };
}
