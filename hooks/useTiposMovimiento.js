import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

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
        .order('nombre', { ascending: true });

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
            usuario_id: userProfile.id,
          }
        ])
        .select()
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
        })
        .eq('id', id)
        .eq('usuario_id', userProfile.id)
        .select()
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

  const getTiposPorCategoria = (categoria) => {
    return tiposMovimiento.filter(tipo => tipo.categoria === categoria);
  };

  useEffect(() => {
    fetchTiposMovimiento();
  }, [userProfile?.id]);

  return {
    tiposMovimiento,
    loading,
    error,
    createTipoMovimiento,
    updateTipoMovimiento,
    deleteTipoMovimiento,
    getTiposPorCategoria,
    refetch: fetchTiposMovimiento
  };
} 