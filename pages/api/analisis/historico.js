/**
 * Histórico diario de un símbolo para /stock-analysis. **Solo lectura.**
 *
 *   GET /api/analisis/historico?simbolo=AAPL&desde=2025-10-28&hasta=2026-10-28
 *   Authorization: Bearer <access_token de Supabase>
 *
 *   200 { simbolo, moneda, fuente, historico: [{ date, close }],
 *         cotizacion: { precio, fecha, cambio, cambioPct } }
 *   400 { error: 'parametros', mensaje }   símbolo o fechas inválidos
 *   401 { error: 'no_autenticado' }
 *   404 { error: 'no_encontrado' }         ningún proveedor conoce el símbolo
 *   502 { error: 'proveedor', mensaje }    los proveedores fallaron (red, 429…)
 *
 * POR QUÉ EXISTE. La página llamaba a Financial Modeling Prep desde el
 * navegador con `NEXT_PUBLIC_FMP_API_KEY`: la llave viajaba en el bundle y,
 * desde que FMP cerró su API v3 a cuentas nuevas, todo respondía 403 y la UI
 * decía "Símbolo no encontrado" hasta para AAPL. Ahora se reutilizan los
 * proveedores que ya alimentan /inversiones, con sus llaves en el servidor.
 *
 * ORDEN DE PROVEEDORES:
 *   1. Massive (`/v2/aggs/ticker/.../range`), para lo que cubre: acciones de
 *      EE. UU., cripto `X:` y forex `C:`. Tiene contrato y llave.
 *   2. Yahoo, para lo que Massive no cubre (bolsas extranjeras con sufijo, como
 *      `PFGRUPOARG.CL`) o cuando Massive falla. Endpoint sin contrato: puede
 *      responder 429 desde IPs de datacenter.
 * TradingView no entra: solo da la barra del día, y aquí hace falta histórico.
 *
 * "NO ENCONTRADO" vs "FALLÓ". Son respuestas distintas a propósito: decirle a
 * alguien que AAPL no existe cuando lo que pasó es un 429 es lo que hacía la
 * versión anterior.
 */
import { createClient } from '@supabase/supabase-js';
import { claseDeTicker, dormir } from '../../../lib/massive';
import { cierresYahoo } from '../../../lib/yahoo';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY;

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
// Letras, dígitos y los separadores que usan los tres formatos de ticker:
// `BRK.B`, `PFGRUPOARG.CL`, `X:BTCUSD`, `C:USDCOP`, `BTC-USD`.
const SIMBOLO = /^[A-Z0-9.:\-^=]{1,20}$/;
const SUFIJO_BOLSA = /\.[A-Z]{1,3}$/;

/** Un error de proveedor que NO significa "el símbolo no existe". */
class ErrorProveedor extends Error {}

function diasEntre(desde, hasta) {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

/** Massive solo cubre EE. UU., cripto y forex; un sufijo de bolsa es otra cosa. */
function cubreMassive(simbolo) {
  return !SUFIJO_BOLSA.test(simbolo) || claseDeTicker(simbolo) !== 'stocks';
}

/**
 * `null` = Massive respondió y no tiene datos de ese símbolo.
 * Lanza `ErrorProveedor` si no se pudo preguntar (red, 429, 5xx).
 */
async function historicoMassive(simbolo, desde, hasta) {
  const url =
    `https://api.massive.com/v2/aggs/ticker/${encodeURIComponent(simbolo)}` +
    `/range/1/day/${desde}/${hasta}?adjusted=true&sort=asc&limit=50000`;
  const pedir = () =>
    fetch(url, { headers: { Authorization: `Bearer ${MASSIVE_API_KEY}` } });

  let res;
  try {
    res = await pedir();
    if (res.status === 429) {
      // Misma ventana de ~5 s que mide lib/massive.js.
      await dormir(6000);
      res = await pedir();
    }
  } catch (err) {
    throw new ErrorProveedor(`Massive: ${err.message}`);
  }

  if (res.status === 404) return null;
  if (!res.ok) throw new ErrorProveedor(`Massive respondió ${res.status}`);

  const data = await res.json();
  const filas = (data.results || []).filter((r) => Number.isFinite(Number(r.c)));
  if (filas.length === 0) return null;

  const clase = claseDeTicker(simbolo);
  return {
    // Acciones y cripto cotizan en USD en Massive; un par FX "cotiza" en su
    // moneda de destino (C:USDCOP → COP).
    moneda: clase === 'fx' ? simbolo.slice(-3) : 'USD',
    fuente: 'massive',
    historico: filas.map((r) => ({
      // `t` es el inicio de la sesión en ms. Para EE. UU. es medianoche ET, que
      // en UTC sigue siendo el mismo día; para cripto/FX es medianoche UTC.
      date: new Date(Number(r.t)).toISOString().slice(0, 10),
      close: Number(r.c),
    })),
  };
}

/** El rango de Yahoo más corto que cubre `desde` hasta hoy. */
function rangoYahoo(desde) {
  const dias = diasEntre(desde, new Date().toISOString().slice(0, 10));
  const rangos = [
    [31, '1mo'], [92, '3mo'], [183, '6mo'], [366, '1y'],
    [731, '2y'], [1827, '5y'], [3653, '10y'],
  ];
  return (rangos.find(([max]) => dias <= max) || [0, 'max'])[1];
}

async function historicoYahoo(simbolo, desde, hasta) {
  let resultado;
  try {
    resultado = await cierresYahoo(simbolo, { rango: rangoYahoo(desde) });
  } catch (err) {
    throw new ErrorProveedor(`Yahoo: ${err.message}`);
  }
  if (!resultado) return null;

  const historico = resultado.cierres
    .filter((c) => c.fecha >= desde && c.fecha <= hasta)
    .map((c) => ({ date: c.fecha, close: c.cierre }));
  if (historico.length === 0) return null;

  return { moneda: resultado.moneda, fuente: 'yahoo', historico };
}

function cotizacionDe(historico) {
  const ultimo = historico[historico.length - 1];
  const previo = historico[historico.length - 2];
  const cambio = previo ? ultimo.close - previo.close : null;
  return {
    precio: ultimo.close,
    fecha: ultimo.date,
    cambio,
    cambioPct: previo && previo.close ? (cambio / previo.close) * 100 : null,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'metodo' });
  }

  // ── quién llama ─────────────────────────────────────────────────────────
  // Solo usuarios con sesión: sin esto la ruta sería un proxy abierto que
  // gasta la cuota de Massive de este proyecto.
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  if (!token) return res.status(401).json({ error: 'no_autenticado' });

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: authError } = await supabase.auth.getUser(token);
  if (authError || !userData?.user) {
    return res.status(401).json({ error: 'no_autenticado' });
  }

  // ── qué se pide ─────────────────────────────────────────────────────────
  const simbolo = String(req.query.simbolo || '').trim().toUpperCase();
  const hasta = String(req.query.hasta || '');
  const desde = String(req.query.desde || '');

  if (!SIMBOLO.test(simbolo) || !FECHA.test(desde) || !FECHA.test(hasta)) {
    return res.status(400).json({
      error: 'parametros',
      mensaje: 'Indica un símbolo y un rango de fechas válido.',
    });
  }
  if (desde > hasta) {
    return res.status(400).json({
      error: 'parametros',
      mensaje: 'La fecha inicial no puede ser posterior a la final.',
    });
  }

  // ── a quién se le pregunta ──────────────────────────────────────────────
  const fallos = [];
  let resultado = null;

  if (MASSIVE_API_KEY && cubreMassive(simbolo)) {
    try {
      resultado = await historicoMassive(simbolo, desde, hasta);
    } catch (err) {
      fallos.push(err.message);
    }
  }

  if (!resultado) {
    try {
      resultado = await historicoYahoo(simbolo, desde, hasta);
    } catch (err) {
      fallos.push(err.message);
    }
  }

  if (resultado) {
    return res.status(200).json({
      simbolo,
      ...resultado,
      cotizacion: cotizacionDe(resultado.historico),
    });
  }

  // Nadie lo tiene. Si TODOS los que se consultaron fallaron, no se sabe si el
  // símbolo existe; si al menos uno respondió "no lo tengo", sí.
  const consultados = (MASSIVE_API_KEY && cubreMassive(simbolo) ? 1 : 0) + 1;
  if (fallos.length >= consultados) {
    return res.status(502).json({ error: 'proveedor', mensaje: fallos.join(' · ') });
  }
  return res.status(404).json({ error: 'no_encontrado' });
}
