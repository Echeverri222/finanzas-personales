/**
 * Sincroniza los cierres de mercado a `precios_mercado`.
 *
 * Primera API route del proyecto. Existe porque `MASSIVE_API_KEY` no puede
 * salir del servidor y porque escribir en `precios_mercado` requiere la
 * `service_role`: esa tabla es global —el cierre de VOO es el mismo para todos—
 * así que si un usuario cualquiera pudiera escribirla, podría envenenar el
 * precio que ven los demás.
 *
 * **Solo sincroniza tickers que el usuario tiene o tuvo**, abiertos y cerrados:
 * los cerrados hacen falta para que el historial de rentabilidades siga siendo
 * reconstruible. Más `C:USDCOP`, que es la tasa para pasar dólares a pesos.
 *
 * Se invoca desde el botón "Actualizar precios" de /inversiones y, en
 * producción, desde un cron diario con `x-cron-secret`.
 */
import { createClient } from '@supabase/supabase-js';
import {
  CLASES,
  TICKER_USDCOP,
  claseDeTicker,
  isoDate,
  ultimosCierres,
  dormir,
} from '../../../lib/massive';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Método no permitido' });
  }

  if (!MASSIVE_API_KEY) {
    return res.status(500).json({
      error: 'Falta MASSIVE_API_KEY en el servidor.',
    });
  }
  if (!SERVICE_ROLE_KEY || !SUPABASE_URL) {
    return res.status(500).json({
      error:
        'Falta SUPABASE_SERVICE_ROLE_KEY o NEXT_PUBLIC_SUPABASE_URL. ' +
        'La tabla precios_mercado es global y solo la escribe service_role.',
    });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // ── quién llama ───────────────────────────────────────────────────────────
  // Dos caminos: un usuario con sesión (el botón), o el cron con su secreto.
  // El cron no tiene usuario, así que sincroniza los tickers de todos.
  const esCron = Boolean(CRON_SECRET) && req.headers['x-cron-secret'] === CRON_SECRET;
  let usuarioId = null;

  if (!esCron) {
    const token = (req.headers.authorization || '').replace(/^Bearer /, '');
    if (!token) return res.status(401).json({ error: 'No autenticado' });

    const { data: userData, error: authError } = await admin.auth.getUser(token);
    if (authError || !userData?.user) {
      return res.status(401).json({ error: 'Sesión inválida' });
    }

    const { data: perfil } = await admin
      .from('usuarios')
      .select('id')
      .eq('user_id', userData.user.id)
      .single();

    if (!perfil) return res.status(401).json({ error: 'Sin perfil de usuario' });
    usuarioId = perfil.id;
  }

  try {
    // ── qué tickers hacen falta ─────────────────────────────────────────────
    let query = admin.from('posiciones').select('ticker, clase');
    if (usuarioId) query = query.eq('usuario_id', usuarioId);

    const { data: posiciones, error: posError } = await query;
    if (posError) throw new Error(posError.message);

    const necesarios = new Set([TICKER_USDCOP]);
    for (const p of posiciones || []) necesarios.add(p.ticker);

    // Solo se piden las clases que realmente se usan. Sin cripto en cartera no
    // tiene sentido gastar una llamada en traer 405 monedas.
    const clasesNecesarias = new Set(
      Array.from(necesarios).map((t) => claseDeTicker(t))
    );

    const hoy = new Date();
    const filas = [];
    const detalle = {};
    const errores = [];

    let primera = true;
    for (const clase of clasesNecesarias) {
      if (!CLASES[clase]) continue;
      // Espaciado entre clases: la 2ª llamada seguida devuelve 429.
      if (!primera) await dormir(1200);
      primera = false;

      try {
        const { fecha, cierres } = await ultimosCierres(clase, hoy, MASSIVE_API_KEY);

        if (!cierres) {
          detalle[clase] = { fecha: null, encontrados: 0, nota: 'sin cierres recientes' };
          continue;
        }

        let encontrados = 0;
        for (const ticker of necesarios) {
          if (claseDeTicker(ticker) !== clase) continue;
          const cierre = cierres.get(ticker);
          if (cierre == null) continue;

          filas.push({
            ticker,
            fecha,
            cierre,
            // Las acciones y las criptos de Massive cotizan en USD; el par FX
            // ya ES la tasa, y su "moneda" es la de destino.
            moneda: clase === 'fx' ? ticker.slice(-3) : 'USD',
            clase,
            fuente: 'massive',
            actualizado_at: new Date().toISOString(),
          });
          encontrados += 1;
        }

        detalle[clase] = { fecha, encontrados };
      } catch (err) {
        // Una clase que falla no debe tumbar a las demás: si cripto responde
        // 429, los precios de acciones que ya se obtuvieron siguen siendo
        // válidos y vale la pena guardarlos.
        errores.push(`${clase}: ${err.message}`);
        detalle[clase] = { fecha: null, encontrados: 0, error: err.message };
      }
    }

    if (filas.length > 0) {
      const { error: upsertError } = await admin
        .from('precios_mercado')
        .upsert(filas, { onConflict: 'ticker,fecha' });
      if (upsertError) throw new Error(upsertError.message);
    }

    const noEncontrados = Array.from(necesarios).filter(
      (t) => !filas.some((f) => f.ticker === t)
    );

    return res.status(200).json({
      actualizados: filas.length,
      solicitados: necesarios.size,
      detalle,
      noEncontrados,
      errores,
      hoy: isoDate(hoy),
    });
  } catch (err) {
    return res.status(502).json({ error: err.message });
  }
}
