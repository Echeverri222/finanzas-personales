/**
 * La aritmética del patrimonio. Funciones puras: sin red, sin Supabase, sin
 * React.
 *
 * Está separado del hook a propósito. El repo no tiene runner de tests, así que
 * la única forma de verificar estos números sin abrir el navegador es poder
 * llamarlos desde `node -e` con casos conocidos. Si esta lógica viviera dentro
 * de `usePatrimonio`, comprobar un promedio ponderado exigiría montar React.
 *
 * Convención de moneda: cada cuenta y cada posición declara la suya. Todo se
 * convierte a la moneda de presentación del usuario (COP) con la tasa que se
 * pase. Sin tasa, un valor en otra moneda se devuelve SIN convertir y marcado
 * -- inventar un número sería peor que mostrar uno incompleto.
 */

/** Suma tolerante: null, undefined, '' y NaN cuentan como 0. */
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Convierte a la moneda base.
 *
 * Devuelve `{ valor, convertido }`. `convertido: false` significa que el número
 * sigue en su moneda original porque no había tasa: la UI debe decirlo en vez
 * de sumarlo como si fuera COP.
 */
export function convertir(monto, moneda, monedaBase = 'COP', tasas = {}) {
  const valor = num(monto);
  if (!moneda || moneda === monedaBase) return { valor, convertido: true };

  const tasa = tasas[`${moneda}${monedaBase}`];
  if (!Number.isFinite(tasa) || tasa <= 0) {
    return { valor, convertido: false, moneda };
  }
  return { valor: valor * tasa, convertido: true };
}

/**
 * Valor de una cuenta, **en la moneda de presentación** (COP por defecto).
 *
 * Devuelve la moneda base, no la de la cuenta, y eso no es un detalle: la
 * primera versión devolvía la moneda propia, así que un broker con 12.564 USD
 * se pintaba como "$ 12.591" —pesos— justo al lado de un total que sí estaba
 * convertido. Los dos números eran correctos por separado y la pantalla
 * mentía. Si la fila y el total se muestran juntos, tienen que estar en la
 * misma moneda.
 *
 * Un activo vale `valor_total − valor_deuda`, y solo resta deuda si está
 * activada: no siempre hay deuda sobre un activo. Las demás cuentas valen su
 * saldo, al que una cuenta de inversión suma el valor de mercado de sus
 * posiciones abiertas.
 */
export function valorCuenta(cuenta, posiciones = [], precios = {}, tasas = {}, monedaBase = 'COP') {
  if (!cuenta) return 0;

  if (cuenta.tipo === 'activo') {
    const bruto = num(cuenta.valor_total);
    const neto = cuenta.tiene_deuda ? bruto - num(cuenta.valor_deuda) : bruto;
    return convertir(neto, cuenta.moneda, monedaBase, tasas).valor;
  }

  if (cuenta.tipo !== 'inversion') {
    return convertir(cuenta.saldo, cuenta.moneda, monedaBase, tasas).valor;
  }

  return desgloseInversion(cuenta, posiciones, precios, tasas, monedaBase).total;
}

/**
 * Las dos partes de una cuenta de inversión, en `monedaBase`: el efectivo sin
 * invertir y el valor de mercado de las posiciones abiertas.
 *
 * Existe para que la pantalla pueda ENSEÑAR de qué se compone el total en vez
 * de mostrar un número que el usuario no puede cuadrar. El caso que lo motivó:
 * comprar descuenta el costo del efectivo, así que si el aporte al broker nunca
 * se registró, el saldo queda negativo y se resta del valor de las acciones. El
 * total era correcto y aun así parecía un error, porque nada decía que dentro
 * había un efectivo en rojo.
 *
 * `valorCuenta` la usa en vez de repetir la suma: el repo ya tuvo un fallo por
 * calcular el mismo número en dos sitios, y la fila y el total acabaron en
 * monedas distintas.
 */
export function desgloseInversion(
  cuenta,
  posiciones = [],
  precios = {},
  tasas = {},
  monedaBase = 'COP'
) {
  const { valor: efectivo } = convertir(cuenta.saldo, cuenta.moneda, monedaBase, tasas);

  const invertido = posiciones
    .filter((p) => p.cuenta_id === cuenta.id && p.estado === 'abierta')
    .reduce((total, p) => {
      const { valor } = valorMercadoPosicion(p, precios, monedaBase, tasas);
      return total + valor;
    }, 0);

  return { efectivo, invertido, total: efectivo + invertido };
}

/**
 * Valor de mercado de una posición abierta, en `monedaBase`.
 *
 * `precios` es `{ [ticker]: { cierre, fecha, moneda } }` tal como lo entrega
 * `usePreciosMercado` desde la tabla `precios_mercado` -- nunca una llamada a
 * la API en caliente.
 *
 * Sin precio conocido cae al precio de compra: el patrimonio queda
 * desactualizado, no en blanco. `estimado: true` es lo que la UI usa para
 * avisarlo.
 */
export function valorMercadoPosicion(posicion, precios = {}, monedaBase = 'COP', tasas = {}) {
  const cantidad = num(posicion.cantidad);
  const precio = precios[posicion.ticker];
  const unitario = precio?.cierre != null ? num(precio.cierre) : num(posicion.precio_compra);
  const estimado = precio?.cierre == null;

  const { valor, convertido } = convertir(
    cantidad * unitario,
    precio?.moneda || posicion.moneda,
    monedaBase,
    tasas
  );

  return { valor, estimado, convertido, fecha: precio?.fecha ?? null, unitario };
}

/**
 * Patrimonio neto y su desglose por tipo de cuenta.
 *
 * `deuda` sale POSITIVA y ya está restada del total. Guardarla negada haría que
 * un snapshot viejo se leyera al revés en cuanto alguien mire el jsonb crudo.
 */
export function patrimonioNeto(cuentas = [], posiciones = [], precios = {}, opciones = {}) {
  const { monedaBase = 'COP', tasas = {} } = opciones;

  const desglose = { ahorros: 0, efectivo: 0, inversion: 0, activos: 0, deuda: 0 };
  let sinConvertir = 0;

  for (const cuenta of cuentas) {
    if (cuenta.activa === false) continue;

    if (cuenta.tipo === 'activo') {
      // Convertidos igual que todo lo demas: un activo en otra moneda tiene que
      // sumar lo mismo aqui que en `valorCuenta`, o la fila y el total se
      // contradicen.
      desglose.activos += convertir(cuenta.valor_total, cuenta.moneda, monedaBase, tasas).valor;
      if (cuenta.tiene_deuda) {
        desglose.deuda += convertir(cuenta.valor_deuda, cuenta.moneda, monedaBase, tasas).valor;
      }
      continue;
    }

    const { valor } = convertir(cuenta.saldo, cuenta.moneda, monedaBase, tasas);

    if (cuenta.tipo === 'inversion') {
      desglose.inversion += valor;
      for (const p of posiciones) {
        if (p.cuenta_id !== cuenta.id || p.estado !== 'abierta') continue;
        const m = valorMercadoPosicion(p, precios, monedaBase, tasas);
        desglose.inversion += m.valor;
        if (!m.convertido) sinConvertir += 1;
      }
    } else if (cuenta.tipo === 'ahorros') {
      desglose.ahorros += valor;
    } else {
      desglose.efectivo += valor;
    }
  }

  const total =
    desglose.ahorros +
    desglose.efectivo +
    desglose.inversion +
    desglose.activos -
    desglose.deuda;

  return { total, desglose, sinConvertir };
}

/**
 * Consolida las posiciones ABIERTAS por ticker, a través de todas las cuentas.
 *
 * El promedio de compra es **ponderado por cantidad**, no la media aritmética
 * de los precios: comprar 1 acción a 100 y 9 a 200 da 190, no 150. Es
 * exactamente el caso que motiva guardar un lote por compra.
 */
export function resumenPorTicker(posiciones = [], precios = {}, opciones = {}) {
  const { monedaBase = 'COP', tasas = {} } = opciones;
  const porTicker = new Map();

  for (const p of posiciones) {
    if (p.estado !== 'abierta') continue;

    const actual = porTicker.get(p.ticker) || {
      ticker: p.ticker,
      nombre: p.nombre || p.ticker,
      clase: p.clase,
      moneda: p.moneda,
      cantidad: 0,
      costoTotal: 0,
      lotes: 0,
    };

    actual.cantidad += num(p.cantidad);
    actual.costoTotal += num(p.cantidad) * num(p.precio_compra);
    actual.lotes += 1;
    porTicker.set(p.ticker, actual);
  }

  return Array.from(porTicker.values())
    .map((t) => {
      const precio = precios[t.ticker];
      const precioActual = precio?.cierre != null ? num(precio.cierre) : null;
      const precioPromedio = t.cantidad > 0 ? t.costoTotal / t.cantidad : 0;

      // En moneda de la posición, para que el % sea comparable con el precio
      // que muestra el broker; la conversión solo aplica al valor en pesos.
      const valorMercado = precioActual != null ? t.cantidad * precioActual : t.costoTotal;
      const ganancia = valorMercado - t.costoTotal;

      return {
        ...t,
        precioPromedio,
        precioActual,
        fechaPrecio: precio?.fecha ?? null,
        valorMercado,
        ganancia,
        rendimiento: t.costoTotal > 0 ? (ganancia / t.costoTotal) * 100 : 0,
        valorMercadoBase: convertir(valorMercado, t.moneda, monedaBase, tasas).valor,
        estimado: precioActual == null,
      };
    })
    .sort((a, b) => b.valorMercado - a.valorMercado);
}

/** Rentabilidad no realizada de un lote abierto. */
export function rentabilidadNoRealizada(posicion, precios = {}) {
  const costo = num(posicion.cantidad) * num(posicion.precio_compra);
  const precio = precios[posicion.ticker]?.cierre;
  const actual = precio != null ? num(posicion.cantidad) * num(precio) : costo;
  const ganancia = actual - costo;
  return {
    costo,
    actual,
    ganancia,
    rendimiento: costo > 0 ? (ganancia / costo) * 100 : 0,
    estimado: precio == null,
  };
}

/**
 * Rentabilidad realizada de un lote cerrado.
 *
 * Devuelve `null` para un lote abierto en vez de un cero: cero significaría
 * "no ganó nada", que es una afirmación distinta de "todavía no se sabe".
 */
export function rentabilidadRealizada(posicion) {
  if (posicion.estado !== 'cerrada' || posicion.precio_venta == null) return null;

  const cantidad = num(posicion.cantidad);
  const costo = cantidad * num(posicion.precio_compra);
  const ingreso = cantidad * num(posicion.precio_venta);
  const ganancia = ingreso - costo;

  return {
    costo,
    ingreso,
    ganancia,
    rendimiento: costo > 0 ? (ganancia / costo) * 100 : 0,
    dias: diasEntre(posicion.fecha_compra, posicion.fecha_venta),
  };
}

/** Días de tenencia. Fechas `yyyy-mm-dd`, sin zona horaria de por medio. */
export function diasEntre(desde, hasta) {
  if (!desde || !hasta) return null;
  const a = Date.parse(`${desde}T00:00:00Z`);
  const b = Date.parse(`${hasta}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b)) return null;
  return Math.round((b - a) / 86_400_000);
}

/**
 * La tasa USD→COP más reciente que haya en `precios_mercado`.
 *
 * `C:USDCOP` es el ticker de Massive para el par, y llega gratis dentro del
 * *grouped* de FX que ya se sincroniza. Devuelve `{}` si no hay tasa, y ese
 * vacío es lo que hace que `convertir` marque los valores como no convertidos.
 */
export function tasasDesdePrecios(precios = {}) {
  const usdcop = precios['C:USDCOP']?.cierre;
  return Number.isFinite(Number(usdcop)) ? { USDCOP: Number(usdcop) } : {};
}
