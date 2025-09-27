import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';

export function useMetas() {
  const [metas, setMetas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { userProfile } = useUser();

  const fetchMetas = async () => {
    if (!userProfile?.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('metas')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Process dates and ensure numbers are properly formatted
      const processedMetas = (data || []).map(meta => ({
        ...meta,
        // Map database columns to expected frontend names
        nombre: meta.nombre_objetivo,
        objetivo: Number(meta.meta_total),
        actual: Number(meta.monto_actual || 0),
        created_at: new Date(meta.created_at),
        fechaCreacion: meta.created_at ? new Date(meta.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }));

      setMetas(processedMetas);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching metas:', err);
    } finally {
      setLoading(false);
    }
  };

  const createMeta = async (metaData) => {
    if (!userProfile?.id) return { error: 'No user profile' };

    try {
      const { data, error } = await supabase
        .from('metas')
        .insert([
          {
            nombre_objetivo: metaData.nombre,
            meta_total: metaData.objetivo,
            descripcion: metaData.descripcion || '',
            fecha_meta: metaData.fecha_meta || null,
            usuario_id: userProfile.id,
            monto_actual: 0, // Always start with 0
            created_at: new Date().toISOString()
          }
        ])
        .select()
        .single();

      if (error) throw error;
      
      // Process the returned data
      const processedMeta = {
        ...data,
        // Map database columns to expected frontend names
        nombre: data.nombre_objetivo,
        objetivo: Number(data.meta_total),
        actual: Number(data.monto_actual || 0),
        created_at: new Date(data.created_at),
        fechaCreacion: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };
      
      setMetas(prev => [processedMeta, ...prev]);
      return { data: processedMeta, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const updateMeta = async (id, updates) => {
    try {
      // Map frontend field names to database column names
      const dbUpdates = {};
      if (updates.nombre) dbUpdates.nombre_objetivo = updates.nombre;
      if (updates.objetivo) dbUpdates.meta_total = updates.objetivo;
      if (updates.actual !== undefined) dbUpdates.monto_actual = updates.actual;
      if (updates.descripcion !== undefined) dbUpdates.descripcion = updates.descripcion;
      if (updates.fecha_meta) dbUpdates.fecha_meta = updates.fecha_meta;
      
      const { data, error } = await supabase
        .from('metas')
        .update(dbUpdates)
        .eq('id', id)
        .eq('usuario_id', userProfile.id)
        .select()
        .single();

      if (error) throw error;

      // Process the returned data
      const processedMeta = {
        ...data,
        // Map database columns to expected frontend names
        nombre: data.nombre_objetivo,
        objetivo: Number(data.meta_total),
        actual: Number(data.monto_actual || 0),
        created_at: new Date(data.created_at),
        fechaCreacion: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };

      setMetas(prev =>
        prev.map(meta => (meta.id === id ? processedMeta : meta))
      );
      return { data: processedMeta, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const deleteMeta = async (id) => {
    try {
      const { error } = await supabase
        .from('metas')
        .delete()
        .eq('id', id)
        .eq('usuario_id', userProfile.id);

      if (error) throw error;

      setMetas(prev => prev.filter(meta => meta.id !== id));
      return { error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  const addMoneyToMeta = async (id, amount) => {
    try {
      // First get the current meta
      const currentMeta = metas.find(meta => meta.id === id);
      if (!currentMeta) throw new Error('Meta no encontrada');

      const newAmount = currentMeta.actual + Number(amount);
      
      const { data, error } = await supabase
        .from('metas')
        .update({ monto_actual: newAmount })
        .eq('id', id)
        .eq('usuario_id', userProfile.id)
        .select()
        .single();

      if (error) throw error;

      // Process the returned data
      const processedMeta = {
        ...data,
        // Map database columns to expected frontend names
        nombre: data.nombre_objetivo,
        objetivo: Number(data.meta_total),
        actual: Number(data.monto_actual || 0),
        created_at: new Date(data.created_at),
        fechaCreacion: data.created_at ? new Date(data.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      };

      setMetas(prev =>
        prev.map(meta => (meta.id === id ? processedMeta : meta))
      );
      return { data: processedMeta, error: null };
    } catch (err) {
      return { error: err.message };
    }
  };

  useEffect(() => {
    if (userProfile) {
      fetchMetas();
    }
  }, [userProfile]);

  return {
    metas,
    loading,
    error,
    createMeta,
    updateMeta,
    deleteMeta,
    addMoneyToMeta,
    refetch: fetchMetas
  };
}
