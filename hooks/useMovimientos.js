import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

export function useMovimientos() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userProfile } = useUser();

  const fetchMovimientos = async () => {
    if (!userProfile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('movimientos')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('fecha', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setMovimientos(data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching movimientos:', err);
    } finally {
      setLoading(false);
    }
  };

  const createMovimiento = async (movimientoData) => {
    if (!userProfile?.id) return { error: 'No user profile' };

    try {
      const { data, error } = await supabase
        .from('movimientos')
        .insert([
          {
            ...movimientoData,
            usuario_id: userProfile.id,
          }
        ])
        .select('*')
        .single();

      if (error) throw error;
      
      setMovimientos(prev => [data, ...prev]);
      return { data, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateMovimiento = async (id, updates) => {
    try {
      const { data, error } = await supabase
        .from('movimientos')
        .update(updates)
        .eq('id', id)
        .eq('usuario_id', userProfile.id)
        .select('*')
        .single();

      if (error) throw error;

      setMovimientos(prev =>
        prev.map(mov => (mov.id === id ? data : mov))
      );
      return { data, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const deleteMovimiento = async (id) => {
    try {
      const { error } = await supabase
        .from('movimientos')
        .delete()
        .eq('id', id)
        .eq('usuario_id', userProfile.id);

      if (error) throw error;

      setMovimientos(prev => prev.filter(mov => mov.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchMovimientos();
    }
  }, [userProfile]);

  return {
    movimientos,
    loading,
    error,
    createMovimiento,
    updateMovimiento,
    deleteMovimiento,
    refetch: fetchMovimientos
  };
} 