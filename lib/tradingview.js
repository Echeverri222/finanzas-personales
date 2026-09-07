/**
 * Primer respaldo para los tickers que Massive no tiene. **Solo servidor.**
 *
 * POR QUÉ ESTE Y NO YAHOO PRIMERO. Los dos son endpoints no documentados, pero
 * este gana en todo lo que importa aquí: pide **todos** los tickers que faltan
 * en una sola llamada (Yahoo exige una por símbolo, espaciadas), no necesita
 * cookie ni crumb, y responde desde IPs de datacenter — que es donde Yahoo
 * devuelve 429 y deja las posiciones sin valorar. Yahoo queda detrás, para lo
 * que este no encuentre.
 *
 * QUÉ NO DA. Solo la barra diaria en curso, no histórico. Basta: lo que hay
 * que responder es "cuánto vale hoy", y la evolución del patrimonio ya la
 * guardan los snapshots. Con el mercado abierto ese `close` es el precio del
 * momento y no el cierre; se sobrescribe solo, porque la clave es
 * `(ticker, fecha)` y la ejecución nocturna del cron vuelve a escribir el día.
 *
 * ALCANCE DELIBERADAMENTE ESTRECHO. `BOLSA_POR_SUFIJO` solo lleva lo que se
 * verificó contra la API real. Un sufijo adivinado no falla con un error:
 * devuelve el precio de otra empresa, que es mucho peor.
 */

const URL_SCAN = 'https://scanner.tradingview.com/global/scan';

const HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
};

/**
 * Sufijo de bolsa al estilo Yahoo → prefijo de TradingView.
 *
 * `.CL` es Colombia en la nomenclatura de Yahoo (Chile es `.SN`), y `BVC` es
 * como TradingView llama a la Bolsa de Valores de Colombia. Verificado con
 * PFGRUPOARG, ECOPETROL, ISA y CELSIA.
 */
const BOLSA_POR_SUFIJO = { CL: 'BVC' };

/** `PFGRUPOARG.CL` → `BVC:PFGRUPOARG`. `null` si la bolsa no está soportada. */
export function simboloTradingView(ticker) {
  const partes = /^([A-Z0-9._-]+)\.([A-Z]{1,3})$/.exec(ticker);
  if (!partes) return null;

  const bolsa = BOLSA_POR_SUFIJO[partes[2]];
  if (!bolsa) return null;

  return `${bolsa}:${partes[1]}`;
}

/**
 * Cierres de varios tickers en **una** llamada.
 *
 * Devuelve un `Map` de ticker original → `{ cierre, moneda, fecha }`. Los que
 * TradingView no conoce simplemente no vienen en la respuesta: no da error por
 * ellos, así que la ausencia en el Map es la señal de "no lo tiene".
 */
export async function cierresTradingView(tickers) {
  const porSimbolo = new Map();
  for (const ticker of tickers) {
    const simbolo = simboloTradingView(ticker);
    if (simbolo) porSimbolo.set(simbolo, ticker);
  }

  const resultado = new Map();
  if (porSimbolo.size === 0) return resultado;

  const res = await fetch(URL_SCAN, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify({
      symbols: { tickers: Array.from(porSimbolo.keys()) },
      columns: ['close', 'currency', 'time'],
    }),
  });

  if (!res.ok) {
    throw new Error(`${res.status} en TradingView`);
  }

  const data = await res.json();

  for (const fila of data?.data || []) {
    const ticker = porSimbolo.get(fila.s);
    if (!ticker) continue;

    const [cierre, moneda, time] = fila.d || [];
    if (!Number.isFinite(Number(cierre))) continue;
    // Sin moneda no se puede convertir a pesos, y suponerla es cómo un precio
    // en COP acabaría multiplicado por la tasa del dólar.
    if (typeof moneda !== 'string' || !/^[A-Z]{3}$/.test(moneda)) continue;
    if (!Number.isFinite(Number(time))) continue;

    resultado.set(ticker, {
      cierre: Number(cierre),
      moneda,
      // `time` es la apertura de la sesión de la barra. Para la BVC son las
      // 8:30 en UTC-5, o sea las 13:30 UTC: el día en UTC y el local coinciden.
      // Con otra bolsa habría que mirar su huso antes de añadirla arriba.
      fecha: new Date(Number(time) * 1000).toISOString().slice(0, 10),
    });
  }

  return resultado;
}
