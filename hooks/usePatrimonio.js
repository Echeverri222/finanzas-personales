/**
 * El patrimonio neto, compuesto a partir de cuentas + posiciones + precios.
 *
 * Compone en vez de consultar: `useCuentas`, `usePosiciones` y
 * `usePreciosMercado` ya tienen su propia entrada en la caché de SWR, así que
 * este hook no dispara ninguna petición nueva y la pantalla de detalle de una
 * cuenta comparte exactamente las mismas filas que el resumen.
 *
 * También es quien escribe el snapshot del día. Va aquí y no en la página
 * porque el snapshot debe reflejar el número que se calculó, no uno que la
 * página vuelva a derivar por su cuenta.
 */
import { useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { useCuentas } from './useCuentas';
import { usePosiciones } from './usePosiciones';
import { usePreciosMercado } from './usePreciosMercado';
import { patrimonioNeto, tasasDesdePrecios } from '../lib/patrimonio';
import { todayISO } from '../lib/format';

export function usePatrimonio({ guardarSnapshot = false } = {}) {
  const { userProfile } = useUser();
  const usuarioId = userProfile?.id ?? null;

  const cuentasHook = useCuentas();
  const posicionesHook = usePosiciones();
  const preciosHook = usePreciosMercado();

  const { cuentas } = cuentasHook;
  const { posiciones } = posicionesHook;
  const { precios } = preciosHook;

  const loading = cuentasHook.loading || posicionesHook.loading || preciosHook.loading;
  const error = cuentasHook.error || posicionesHook.error || preciosHook.error;

  const tasas = useMemo(() => tasasDesdePrecios(precios), [precios]);

  const { total, desglose, sinConvertir } = useMemo(
    () => patrimonioNeto(cuentas, posiciones, precios, { tasas }),
    [cuentas, posiciones, precios, tasas]
  );

  // Un upsert por (usuario, día). El ref evita repetirlo en cada re-render:
  // sin él, cada cambio de estado de la página reescribiría la misma fila.
  const snapshotEscrito = useRef(null);

  useEffect(() => {
    if (!guardarSnapshot || loading || error || !usuarioId) return;
    // Un patrimonio de cero sin cuentas no es un dato, es el estado inicial.
    // Guardarlo llenaría el gráfico de ceros antes de que el usuario empiece.
    if (cuentas.length === 0) return;

    const fecha = todayISO();
    const marca = `${usuarioId}:${fecha}`;
    if (snapshotEscrito.current === marca) return;
    snapshotEscrito.current = marca;

    supabase
      .from('patrimonio_snapshots')
      .upsert(
        { usuario_id: usuarioId, fecha, total, desglose },
        { onConflict: 'usuario_id,fecha' }
      )
      .then(({ error: e }) => {
        // Silencioso a propósito: el snapshot alimenta el gráfico histórico,
        // no el número que el usuario está mirando. Un fallo aquí no debe
        // ensuciar una pantalla que por lo demás es correcta.
        if (e) console.warn('No se pudo guardar el snapshot de patrimonio:', e.message);
      });
  }, [guardarSnapshot, loading, error, usuarioId, cuentas.length, total, desglose]);

  return {
    cuentas,
    posiciones,
    precios,
    tasas,
    total,
    desglose,
    /** Nº de valores que no se pudieron pasar a COP por falta de tasa. */
    sinConvertir,
    loading,
    error,
    refetch: () => {
      cuentasHook.refetch();
      posicionesHook.refetch();
      preciosHook.refetch();
    },
  };
}
