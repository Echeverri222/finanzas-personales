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
 * Se invoca desde el botón "Actualizar precios" de /inversiones (POST con el
 * token del usuario) y, en producción, desde el cron de Vercel.
 *
 * El cron llega con la forma que Vercel impone, no con la que uno elegiría:
 * **GET**, y con el secreto en `Authorization: Bearer` porque Vercel Cron no
 * permite cabeceras propias. De ahí que se acepten los dos métodos y que el
 * secreto se busque en dos sitios: la primera versión pedía POST con
 * `x-cron-secret` y el cron habría respondido 405 todas las noches sin que
 * nadie lo notara -- un fallo silencioso, que es el peor tipo para una tarea
 * programada.
 */
import { timingSafeEqual } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import {
  CLASES,
  TICKER_USDCOP,
  claseDeTicker,
  isoDate,
  ultimosCierres,
  dormir,
} from '../../../lib/massive';
import {
  ESPACIADO_MS as ESPACIADO_YAHOO,
  candidatoYahoo,
  cierresYahoo,
} from '../../../lib/yahoo';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MASSIVE_API_KEY = process.env.MASSIVE_API_KEY;
const CRON_SECRET = process.env.CRON_SECRET;

/**
 * `true` si quien llama es el cron.
 *
 * Se comprueba ANTES de tratar el `Authorization` como token de usuario: si no,
 * el secreto del cron llegaría a `auth.getUser()` como si fuera un JWT y la
 * respuesta sería un 401 desconcertante en vez de una sincronización.
 *
 * La comparación es de longitud constante para no filtrar el secreto por el
 * tiempo que tarda en fallar.
 */
function esLlamadaDeCron(req) {
  if (!CRON_SECRET) return false;
  const candidatos = [
    req.headers['x-cron-secret'],
    (req.headers.authorization || '').replace(/^Bearer /, ''),
  ];
  return candidatos.some((c) => {
    if (typeof c !== 'string' || c.length !== CRON_SECRET.length) return false;
    return timingSafeEqual(Buffer.from(c), Buffer.from(CRON_SECRET));
  });
}

export default async function handler(req, res) {
  const esCron = esLlamadaDeCron(req);

  // El cron de Vercel invoca con GET y eso no se puede configurar; el botón de
  // la UI usa POST, que es lo correcto para algo que escribe.
  const metodoValido = req.method === 'POST' || (esCron && req.method === 'GET');
  if (!metodoValido) {
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
  // Dos caminos: un usuario con sesión (el botón), o el cron con su secreto
  // (ya resuelto arriba). El cron no tiene usuario, así que sincroniza los
  // tickers de todos.
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

    // ── respaldo: lo que Massive no cubre ───────────────────────────────────
    // Massive solo tiene mercados de EE. UU., así que una acción de la BVC
    // como `PFGRUPOARG.CL` nunca aparece en el *grouped* y la posición se
    // quedaría sin valorar en silencio. Se le pregunta a Yahoo, pero solo por
    // lo que ya faltaba: es un proveedor sin contrato y no se le da el trabajo
    // que Massive hace bien.
    const cubiertos = new Set(filas.map((f) => f.ticker));
    const pendientes = Array.from(necesarios).filter(
      (t) => !cubiertos.has(t) && candidatoYahoo(t)
    );

    let respaldados = 0;
    for (const ticker of pendientes) {
      try {
        const resultado = await cierresYahoo(ticker);
        if (!resultado) continue;

        for (const { fecha, cierre } of resultado.cierres) {
          filas.push({
            ticker,
            fecha,
            cierre,
            // A diferencia de Massive, aquí la moneda no se puede dar por
            // supuesta: esta acción cotiza en pesos, no en dólares.
            moneda: resultado.moneda,
            clase: claseDeTicker(ticker),
            fuente: 'yahoo',
            actualizado_at: new Date().toISOString(),
          });
        }
        respaldados += 1;
      } catch (err) {
        // Mismo criterio que con las clases de Massive: un ticker que falla no
        // invalida los precios que ya se obtuvieron.
        errores.push(`yahoo ${ticker}: ${err.message}`);
      }

      // Entre tickers, no después del último: el cron no tiene por qué esperar
      // 1,2 s extra cuando ya terminó.
      if (ticker !== pendientes[pendientes.length - 1]) {
        await dormir(ESPACIADO_YAHOO);
      }
    }

    if (pendientes.length > 0) {
      detalle.yahoo = { intentados: pendientes.length, encontrados: respaldados };
    }

    if (filas.length > 0) {
      const { error: upsertError } = await admin
        .from('precios_mercado')
        .upsert(filas, { onConflict: 'ticker,fecha' });
      if (upsertError) throw new Error(upsertError.message);
    }

    const resueltos = new Set(filas.map((f) => f.ticker));
    const noEncontrados = Array.from(necesarios).filter((t) => !resueltos.has(t));

    return res.status(200).json({
      // Tickers, no filas: el respaldo de Yahoo guarda varios días de una vez y
      // contar filas produciría un "7 de 3 precios actualizados" en la UI.
      actualizados: resueltos.size,
      filasEscritas: filas.length,
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
