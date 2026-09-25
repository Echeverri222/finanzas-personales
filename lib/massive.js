/**
 * Cliente de la API de Massive. **Solo servidor.**
 *
 * `MASSIVE_API_KEY` no lleva prefijo `NEXT_PUBLIC_` a propósito: eso la
 * inlinearía en el bundle y cualquiera podría extraerla —que es exactamente lo
 * que le pasa hoy a `NEXT_PUBLIC_FMP_API_KEY` en `/stock-analysis`. Esta feature
 * no arregla esa deuda, pero tampoco la amplía.
 *
 * ENTITLEMENTS DEL PLAN ACTUAL (verificado 2026-09-05 contra la API real):
 *
 *   ✅ /v2/aggs/grouped/locale/us/market/stocks/{fecha}      12.509 acciones
 *   ✅ /v2/aggs/grouped/locale/global/market/crypto/{fecha}     405 criptos
 *   ✅ /v2/aggs/grouped/locale/global/market/fx/{fecha}       1.194 pares FX
 *   ✅ /v2/aggs/ticker/{ticker}/prev, /range/..., /v1/open-close
 *   ✅ /v3/reference/tickers/{ticker}, /v1/marketstatus/now
 *   ❌ /v3/snapshot, /v2/snapshot/..., /v2/last/trade, /v1/conversion  → 403
 *
 * O sea: **no hay precios en tiempo real**, pero sí el mercado entero en una
 * sola llamada. Por eso se sincronizan cierres a la base de datos en vez de
 * consultar por ticker: tres llamadas al día cubren cualquier ticker que el
 * usuario llegue a tener, hoy o dentro de dos años.
 *
 * RATE LIMIT: no es una cuota diaria escasa, es concurrencia. La segunda
 * llamada seguida devuelve 429 y la ventana reabre en ~5 s. Espaciarlas ~1,2 s
 * basta; por eso `dormir` existe.
 */

const BASE = 'https://api.massive.com';

/** Prefijos de ticker de Massive, por clase de activo. */
export const CLASES = {
  stocks: { grouped: 'locale/us/market/stocks', prefijo: '' },
  crypto: { grouped: 'locale/global/market/crypto', prefijo: 'X:' },
  fx: { grouped: 'locale/global/market/fx', prefijo: 'C:' },
};

/** El par que convierte dólares a pesos. Llega gratis en el grouped de FX. */
export const TICKER_USDCOP = 'C:USDCOP';

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/** `Date` → `yyyy-mm-dd` en UTC, que es como Massive indexa los días. */
export function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

/** La clase a la que pertenece un ticker, deducida de su prefijo. */
export function claseDeTicker(ticker) {
  if (ticker.startsWith('X:')) return 'crypto';
  if (ticker.startsWith('C:')) return 'fx';
  return 'stocks';
}

class MassiveError extends Error {
  constructor(message, status, aunNoDisponible = false) {
    super(message);
    this.name = 'MassiveError';
    this.status = status;
    /**
     * `true` cuando el 403 significa "ese día todavía no ha cerrado", no "tu
     * plan no incluye esto". Son dos cosas muy distintas: la primera se
     * resuelve mirando el día anterior, la segunda no se resuelve nunca.
     */
    this.aunNoDisponible = aunNoDisponible;
  }
}

async function get(path, apiKey) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (res.status === 429) {
    // Una sola reintentada, tras la ventana de ~5 s que se midió. Reintentar en
    // bucle convertiría un límite de concurrencia en una espera indefinida.
    await dormir(6000);
    const reintento = await fetch(`${BASE}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!reintento.ok) {
      throw new MassiveError(`429 persistente en ${path}`, 429);
    }
    return reintento.json();
  }

  if (!res.ok) {
    const cuerpo = await res.text();
    // Pedir el día en curso antes del cierre devuelve 403, NO un 200 vacío:
    //   "Attempted to request today's data before end of day."
    // Se marca para que quien recorre los días lo trate como "todavía no",
    // igual que un fin de semana, en vez de como un fallo definitivo.
    const aunNoDisponible =
      res.status === 403 && /before end of day/i.test(cuerpo);
    throw new MassiveError(
      `${res.status} en ${path}: ${cuerpo.slice(0, 200)}`,
      res.status,
      aunNoDisponible
    );
  }

  return res.json();
}

/**
 * Cierres de una clase entera para un día. `null` si ese día no cotizó.
 *
 * Devuelve un Map ticker → cierre. Se filtra fuera, no aquí: la respuesta trae
 * el mercado completo y quién la pide sabe qué le interesa.
 */
export async function cierresDelDia(clase, fecha, apiKey) {
  const cfg = CLASES[clase];
  if (!cfg) throw new Error(`Clase desconocida: ${clase}`);

  let data;
  try {
    data = await get(`/v2/aggs/grouped/${cfg.grouped}/${fecha}?adjusted=true`, apiKey);
  } catch (err) {
    // El día de hoy antes del cierre. Mismo tratamiento que un festivo: no hay
    // datos para ESE día, pero puede haberlos para el anterior.
    if (err.aunNoDisponible) return null;
    throw err;
  }

  // Fin de semana o festivo: la API responde 200 con resultsCount 0. Eso no es
  // un error, es que ese día no hubo mercado.
  if (!data.results || data.results.length === 0) return null;

  const cierres = new Map();
  for (const fila of data.results) {
    if (fila.T && fila.c != null) cierres.set(fila.T, Number(fila.c));
  }
  return cierres;
}

/**
 * Busca el último día con cierre, retrocediendo hasta `maxDias`.
 *
 * Las acciones y el FX no cotizan fines de semana ni festivos; cripto sí, 24/7.
 * Sin este retroceso, abrir la app un sábado dejaría el patrimonio sin valorar.
 */
export async function ultimosCierres(clase, desde, apiKey, maxDias = 5) {
  const intentados = [];
  for (let i = 0; i < maxDias; i += 1) {
    const d = new Date(desde);
    d.setUTCDate(d.getUTCDate() - i);
    const fecha = isoDate(d);
    intentados.push(fecha);

    const cierres = await cierresDelDia(clase, fecha, apiKey);
    if (cierres) return { fecha, cierres };

    // Espaciado entre reintentos, por el límite de concurrencia.
    if (i < maxDias - 1) await dormir(1200);
  }
  return { fecha: null, cierres: null, intentados };
}
