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
      
      // Fetch movimientos with JOIN to get tipo_movimiento name
      const { data, error: supabaseError } = await supabase
        .from('movimientos')
        .select(`
          *,
          tipo_movimiento!inner (
            id,
            nombre,
            meta
          )
        `)
        .eq('usuario_id', userProfile.id)
        .order('fecha', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Add tipo_nombre field to match old structure
      const movimientosConTipo = (data || []).map(mov => ({
        ...mov,
        tipo_nombre: mov.tipo_movimiento?.nombre || 'Sin categoría'
      }));

      setMovimientos(movimientosConTipo);
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
        .select(`
          *,
          tipo_movimiento!inner (
            id,
            nombre,
            meta
          )
        `)
        .single();

      if (error) throw error;
      
      // Add tipo_nombre field
      const movimientoConTipo = {
        ...data,
        tipo_nombre: data.tipo_movimiento?.nombre || 'Sin categoría'
      };
      
      setMovimientos(prev => [movimientoConTipo, ...prev]);
      return { data: movimientoConTipo, error: null };
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
        .select(`
          *,
          tipo_movimiento!inner (
            id,
            nombre,
            meta
          )
        `)
        .single();

      if (error) throw error;

      // Add tipo_nombre field
      const movimientoConTipo = {
        ...data,
        tipo_nombre: data.tipo_movimiento?.nombre || 'Sin categoría'
      };

      setMovimientos(prev =>
        prev.map(mov => (mov.id === id ? movimientoConTipo : mov))
      );
      return { data: movimientoConTipo, error: null };
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