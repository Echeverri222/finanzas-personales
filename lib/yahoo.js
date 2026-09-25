/**
 * Cliente de respaldo para los tickers que Massive no tiene. **Solo servidor.**
 *
 * POR QUÉ EXISTE. Massive cubre únicamente mercados de EE. UU.: una acción de
 * la Bolsa de Valores de Colombia como `PFGRUPOARG.CL` devuelve `Ticker not
 * found` y la posición se quedaría sin valorar para siempre, en silencio. Yahoo
 * sí la sirve, y en COP.
 *
 * ES UN RESPALDO, NO UN PROVEEDOR. Yahoo no publica una API con contrato: este
 * endpoint no está documentado, no tiene llave y puede cambiar o empezar a
 * bloquear sin aviso. Por eso se llama solo para lo que Massive ya no encontró,
 * y por eso un fallo aquí nunca debe tumbar la sincronización — los cierres de
 * Massive que ya se obtuvieron siguen siendo válidos.
 *
 * NO SE ASUME USD. Massive cotiza acciones y cripto en dólares, así que el
 * sync los marca `USD` sin preguntar. Aquí no se puede: `PFGRUPOARG.CL` está en
 * pesos. La moneda sale de la respuesta (`meta.currency`), y si no viene, el
 * ticker se descarta. Guardar un precio en COP etiquetado como USD lo
 * multiplicaría por la tasa y pintaría un patrimonio ~4.000 veces mayor.
 *
 * AUTH. Desde IPs de datacenter Yahoo responde 429 a la primera. El mismo
 * endpoint, con cookie + crumb (el par que usa su propia web), suele dejar
 * pasar. La sesión se cachea en el proceso: una API route que pide tres
 * tickers no vuelve a pedir el crumb tres veces.
 */

const HOSTS = [
  'https://query1.finance.yahoo.com',
  'https://query2.finance.yahoo.com',
];

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
    '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json,text/plain,*/*',
  'Accept-Language': 'en-US,en;q=0.9',
};

export const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Espaciado mínimo entre llamadas al chart. Medido: cuatro seguidas a 300 ms
 * devuelven 429 todas. No es una cuota diaria; es concurrencia.
 */
export const ESPACIADO_MS = 1200;

/** Cotizadas que Yahoo nombra con sufijo de bolsa y Massive no tiene. */
const SUFIJO_BOLSA = /\.[A-Z]{1,3}$/;

/**
 * Traduce un ticker en forma Massive a la que usa Yahoo.
 *
 * Los tres formatos difieren: cripto es `X:BTCUSD` contra `BTC-USD`, y forex es
 * `C:USDCOP` contra `USDCOP=X`. Las acciones coinciden, sufijo de bolsa
 * incluido, que es justo el caso que motiva este módulo.
 */
export function tickerYahoo(ticker) {
  if (ticker.startsWith('C:')) return `${ticker.slice(2)}=X`;

  if (ticker.startsWith('X:')) {
    const par = ticker.slice(2);
    // La moneda de cotización va al final y no siempre mide tres letras
    // (USDT). Sin este corte, `BTCUSDT` se pediría como `BTCUS-DT`.
    const cotizacion = ['USDT', 'USDC', 'USD', 'EUR', 'BTC'].find((c) =>
      par.endsWith(c)
    );
    if (!cotizacion) return par;
    return `${par.slice(0, -cotizacion.length)}-${cotizacion}`;
  }

  return ticker;
}

/**
 * `true` si vale la pena preguntarle a Yahoo por este ticker.
 *
 * Un ticker de EE. UU. que Massive no encontró casi siempre está mal escrito, y
 * Yahoo respondería con el precio de otra cosa antes que con un error. El
 * respaldo se reserva para lo que Massive declaradamente no cubre: bolsas
 * extranjeras, que Yahoo marca con sufijo, más cripto y forex, donde el
 * respaldo cubre una caída de Massive y no un hueco de catálogo.
 */
export function candidatoYahoo(ticker) {
  return (
    ticker.startsWith('C:') || ticker.startsWith('X:') || SUFIJO_BOLSA.test(ticker)
  );
}

/**
 * Fecha `yyyy-mm-dd` de una vela, en el huso de la bolsa que la produjo.
 *
 * El desplazamiento importa: la BVC abre a las 9:30 en un huso con offset
 * negativo, así que interpretar el timestamp en UTC ya devuelve el día
 * correcto, pero una bolsa asiática no. Sumar el offset y leer en UTC da el día
 * local en todos los casos.
 */
function fechaDeVela(timestamp, gmtoffset = 0) {
  return new Date((timestamp + gmtoffset) * 1000).toISOString().slice(0, 10);
}

function cookieHeader(res) {
  const partes =
    typeof res.headers.getSetCookie === 'function'
      ? res.headers.getSetCookie()
      : [res.headers.get('set-cookie')].filter(Boolean);
  return partes
    .map((c) => String(c).split(';')[0])
    .filter(Boolean)
    .join('; ');
}

let sesionCache = null;

/**
 * Cookie + crumb. Sin esto, desde un datacenter la primera llamada al chart
 * suele ser 429. Si no se puede obtener, se sigue igual: el chart a veces
 * responde sin ellos, y el 429 se reintenta más abajo.
 */
async function sesionYahoo() {
  if (sesionCache && Date.now() - sesionCache.en < 45 * 60 * 1000) {
    return sesionCache;
  }

  try {
    const cookieRes = await fetch('https://fc.yahoo.com', {
      headers: HEADERS,
      redirect: 'manual',
    });
    const cookie = cookieHeader(cookieRes);
    if (!cookie) return null;

    // El crumb a veces da 429 y la cookie A3 sola ya basta para el chart.
    // Descartar la sesión entera por eso era tirar la parte que sí sirve.
    let crumb = null;
    try {
      const crumbRes = await fetch(`${HOSTS[0]}/v1/test/getcrumb`, {
        headers: { ...HEADERS, Cookie: cookie },
      });
      if (crumbRes.ok) {
        const texto = (await crumbRes.text()).trim();
        if (texto && texto.length <= 80 && !texto.includes('<')) crumb = texto;
      }
    } catch {
      /* se sigue con la cookie */
    }

    sesionCache = { cookie, crumb, en: Date.now() };
    return sesionCache;
  } catch {
    return null;
  }
}

async function pedirChart(simbolo, rango, sesion) {
  const headers = sesion?.cookie
    ? { ...HEADERS, Cookie: sesion.cookie }
    : HEADERS;

  let ultimo = null;
  for (const host of HOSTS) {
    const params = new URLSearchParams({ range: rango, interval: '1d' });
    if (sesion?.crumb) params.set('crumb', sesion.crumb);
    const url = `${host}/v8/finance/chart/${encodeURIComponent(simbolo)}?${params}`;

    let res = await fetch(url, { headers });
    if (res.status === 429) {
      await dormir(6000);
      res = await fetch(url, { headers });
    }
    ultimo = res;
    if (res.ok || res.status === 404) return res;
  }
  return ultimo;
}

/**
 * Cierres diarios recientes de un ticker.
 *
 * Devuelve `{ moneda, cierres: [{ fecha, cierre }] }`, o `null` si Yahoo no
 * conoce el símbolo o no trae moneda.
 *
 * Devuelve **todas** las velas del rango, no solo la última, y eso es
 * deliberado: con el mercado abierto la vela de hoy es un precio intradía, no
 * un cierre. Si solo se guardara esa, quedaría congelada como "el cierre de
 * hoy" para siempre, porque nada volvería a pedir ese día. Reenviando el rango
 * completo, la ejecución del día siguiente pisa el intradía con el cierre real
 * — el `upsert` por `(ticker, fecha)` ya se encarga — y de paso rellena los
 * días en que nadie abrió la app.
 */
export async function cierresYahoo(ticker, { rango = '5d' } = {}) {
  const simbolo = tickerYahoo(ticker);
  const sesion = await sesionYahoo();
  const res = await pedirChart(simbolo, rango, sesion);

  // Un símbolo inexistente responde 404 con `chart.error`. No es un fallo de la
  // sincronización: es la respuesta correcta a "esto tampoco lo tengo".
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`${res.status} en Yahoo para ${simbolo}`);
  }

  const data = await res.json();
  const resultado = data?.chart?.result?.[0];
  if (!resultado) return null;

  const moneda = resultado.meta?.currency?.toUpperCase();
  // La conversión a la moneda de presentación se hace por código ISO. Uno que
  // no lo sea no se puede convertir, así que guardarlo solo produciría un total
  // silenciosamente equivocado.
  if (!moneda || !/^[A-Z]{3}$/.test(moneda)) return null;

  const timestamps = resultado.timestamp || [];
  const valores = resultado.indicators?.quote?.[0]?.close || [];
  const gmtoffset = resultado.meta?.gmtoffset ?? 0;

  const cierres = [];
  for (let i = 0; i < timestamps.length; i += 1) {
    const cierre = valores[i];
    // Yahoo rellena con `null` los días sin negociación dentro del rango.
    if (cierre == null || !Number.isFinite(Number(cierre))) continue;
    cierres.push({
      fecha: fechaDeVela(timestamps[i], gmtoffset),
      cierre: Number(cierre),
    });
  }

  if (cierres.length === 0) return null;
  return { moneda, cierres };
}
