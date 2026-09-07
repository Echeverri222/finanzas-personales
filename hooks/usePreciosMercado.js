/**
 * Precios de cierre, leídos de la base de datos (M22).
 *
 * Este hook NUNCA llama a la API de Massive. El plan contratado no incluye
 * precios en tiempo real (`snapshot`, `last/trade` y `conversion` responden
 * 403) pero sí los *grouped* diarios, que traen el mercado entero en una sola
 * llamada. Así que los cierres se sincronizan una vez al día a
 * `precios_mercado` — ver `pages/api/precios/sync.js` — y las pantallas leen de
 * ahí: carga instantánea, sin rate limit, y funciona sin conexión.
 *
 * Para un patrimonio el cierre diario no es una concesión, es el dato correcto:
 * nadie mide su patrimonio neto al tick.
 */
import useSWR from 'swr';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import { userKey } from '../lib/swr';

/** Igual que en useTags: sin la migración M22, la tabla simplemente no está. */
function isMissingTable(error) {
  return error.code === '42P01' || error.message?.includes('does not exist');
}

/**
 * Devuelve `{ [ticker]: { cierre, fecha, moneda } }` con el cierre MÁS RECIENTE
 * de cada ticker.
 *
 * El `order by fecha desc` + quedarse con el primero es lo que hace que un
 * sábado el patrimonio se valore al viernes en vez de quedarse en blanco: las
 * acciones y el FX no cotizan fin de semana ni festivos, y cripto sí.
 */
async function fetchPrecios() {
  const { data, error } = await supabase
    .from('precios_mercado')
    .select('ticker, fecha, cierre, moneda')
    .order('fecha', { ascending: false });

  if (error) {
    if (isMissingTable(error)) return {};
    throw new Error(error.message);
  }

  const porTicker = {};
  for (const fila of data || []) {
    if (porTicker[fila.ticker]) continue; // ya tenemos uno más reciente
    porTicker[fila.ticker] = {
      cierre: Number(fila.cierre),
      fecha: fila.fecha,
      moneda: fila.moneda,
    };
  }
  return porTicker;
}

export function usePreciosMercado() {
  const { userProfile, loading: userLoading } = useUser();
  const usuarioId = userProfile?.id ?? null;

  // La clave va scoped por usuario aunque la tabla sea global, para que al
  // cerrar sesión `clearSwrCache` se la lleve con todo lo demás.
  const { data, error, isLoading, mutate } = useSWR(
    userKey('precios-mercado', usuarioId),
    fetchPrecios
  );

  const precios = data ?? {};

  /** La fecha del cierre más viejo que se está usando, para poder avisarlo. */
  const fechaMasAntigua = Object.values(precios).reduce(
    (min, p) => (!min || (p.fecha && p.fecha < min) ? p.fecha : min),
    null
  );

  return {
    precios,
    fechaMasAntigua,
    loading: userLoading || isLoading,
    error: error ? error.message : null,
    refetch: () => mutate(),
  };
}
