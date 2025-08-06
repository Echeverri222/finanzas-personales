import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

export function useTiposMovimiento() {
  const [tiposMovimiento, setTiposMovimiento] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userProfile } = useUser();

  const fetchTiposMovimiento = async () => {
    if (!userProfile?.id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tipo_movimiento')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('categoria', { ascending: true })
        .order('nombre', { ascending: true });

      if (error) throw error;
      setTiposMovimiento(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching tipos movimiento:', err);
    } finally {
      setLoading(false);
    }
  };

  const createTipoMovimiento = async (tipoData) => {
    if (!userProfile?.id) return { error: 'No user profile' };

    try {
      const { data, error } = await supabase
        .from('tipo_movimiento')
        .insert([
          {
            ...tipoData,
            usuario_id: userProfile.id,
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      setTiposMovimiento(prev => [...prev, data]);
      return { data, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateTipoMovimiento = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('tipo_movimiento')
        .update(updates)
        .eq('id', id)
        .eq('usuario_id', userProfile.id)
        .select()
        .single();

      if (error) throw error;

      setTiposMovimiento(prev =>
        prev.map(tipo => (tipo.id === id ? data : tipo))
      );
      return { data, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const deleteTipoMovimiento = async (id) => {
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