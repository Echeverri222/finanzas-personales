/**
 * Dispara la sincronización de precios (`POST /api/precios/sync`).
 *
 * Va contra una API route y no contra Supabase directamente por dos razones que
 * no se pueden salvar en el cliente: `MASSIVE_API_KEY` es server-side, y
 * `precios_mercado` es una tabla compartida que solo `service_role` puede
 * escribir —si cualquier usuario pudiera, podría envenenar el precio que ven
 * los demás.
 */
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export function useSyncPrecios() {
  const [sincronizando, setSincronizando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [errorSync, setErrorSync] = useState(null);

  const sincronizar = async () => {
    setSincronizando(true);
    setErrorSync(null);
    setResultado(null);
    try {
      // La ruta valida la sesión con este token: sin él no sabría de quién son
      // los tickers que hay que sincronizar.
      const { data: sesion } = await supabase.auth.getSession();
      const token = sesion?.session?.access_token;
      if (!token) throw new Error('No hay sesión activa');

      const res = await fetch('/api/precios/sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const cuerpo = await res.json();
      if (!res.ok) throw new Error(cuerpo.error || `Error ${res.status}`);

      setResultado(cuerpo);
      return { data: cuerpo, error: null };
    } catch (err) {
      setErrorSync(err.message);
      return { error: err.message };
    } finally {
      setSincronizando(false);
    }
  };

  return { sincronizar, sincronizando, resultado, errorSync };
}
