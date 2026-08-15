import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { TIPO } from '../lib/constants';

export function useTiposMovimiento() {
  const [tiposMovimiento, setTiposMovimiento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userProfile } = useUser();

  const fetchTiposMovimiento = async () => {
    if (!userProfile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tipo_movimiento')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setTiposMovimiento(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching categorías:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTipoMovimiento = async (tipoData) => {
    if (!userProfile?.id) {
      return { error: 'Perfil de usuario no disponible. Por favor, recarga la página e intenta nuevamente.' };
    }

    try {
      const { data, error } = await supabase
        .from('tipo_movimiento')
        .insert([
          {
            nombre: tipoData.nombre,
            meta: tipoData.meta,
            // Must be sent explicitly. The column defaults to 'gasto', so a new
            // income or savings category would otherwise be silently counted as
            // spending.
            tipo: tipoData.tipo || TIPO.GASTO,
            usuario_id: userProfile.id,
          }
        ])
        .select('*')
        .single();

      if (error) throw error;
      
      setTiposMovimiento(prev => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      console.error('Error creating categoría:', err);
      return { error: err.message };
    }
  };

  const updateTipoMovimiento = async (id, updateData) => {
    if (!userProfile?.id) {
      return { error: 'Perfil de usuario no disponible. Por favor, recarga la página e intenta nuevamente.' };
    }

    try {
      const { data, error } = await supabase
        .from('tipo_movimiento')
        .update({
          nombre: updateData.nombre,
          meta: updateData.meta,
          // Only overwrite when the caller supplies one, so a partial update
          // cannot reset an existing category to 'gasto'.
          ...(updateData.tipo ? { tipo: updateData.tipo } : {}),
        })
        .eq('id', id)
        .eq('usuario_id', userProfile.id)
        .select('*')
        .single();

      if (error) throw error;
      
      setTiposMovimiento(prev => 
        prev.map(tipo => tipo.id === id ? data : tipo)
      );
      return { data, error: null };
    } catch (err) {
      console.error('Error updating categoría:', err);
      return { error: err.message };
    }
  };

  const deleteTipoMovimiento = async (id) => {
    if (!userProfile?.id) {
      return { error: 'Perfil de usuario no disponible. Por favor, recarga la página e intenta nuevamente.' };
    }

    try {
      const { error } = await supabase
        .from('tipo_movimiento')
        .delete()
        .eq('id', id)
        .eq('usuario_id', userProfile.id);

      if (error) throw error;
      
      setTiposMovimiento(prev => prev.filter(tipo => tipo.id !== id));
      return { error: null };
    } catch (err) {
      console.error('Error deleting categoría:', err);
      return { error: err.message };
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchTiposMovimiento();
    }
  }, [userProfile]);

  return {
    tiposMovimiento,
    loading,
    error,
    createTipoMovimiento,
    updateTipoMovimiento,
    deleteTipoMovimiento,
    refetch: fetchTiposMovimiento
  };
} 