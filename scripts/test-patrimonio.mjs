/**
 * Aserciones de lib/patrimonio.js.
 *
 * El repo no tiene runner de tests, y esta es la aritmética de la que sale el
 * patrimonio neto: un promedio mal ponderado o una deuda mal restada no lanzan
 * ningún error, solo muestran un número equivocado con total confianza. Por eso
 * las funciones son puras y por eso esto se puede correr con `node`.
 *
 *   npm run test:patrimonio
 */
import { patrimonioNeto, resumenPorTicker, rentabilidadRealizada, valorCuenta, convertir } from '../lib/patrimonio.js';
let fallos = 0;
const eq = (label, a, b) => {
  const ok = Math.abs(a - b) < 1e-6;
  if (!ok) fallos++;
  console.log(ok ? '  ok  ' : ' FAIL ', label, ok ? '' : `-> ${a} != ${b}`);
};

// Promedio ponderado: 1@100 y 9@200 => 190, NO 150.
const r = resumenPorTicker([
  { ticker:'VOO', estado:'abierta', cantidad:1, precio_compra:100, moneda:'USD', cuenta_id:'x' },
  { ticker:'VOO', estado:'abierta', cantidad:9, precio_compra:200, moneda:'USD', cuenta_id:'x' },
], { VOO: { cierre: 210, moneda:'USD', fecha:'2026-09-03' } });
eq('promedio ponderado = 190', r[0].precioPromedio, 190);
eq('cantidad total = 10', r[0].cantidad, 10);
eq('valor mercado = 2100', r[0].valorMercado, 2100);
eq('ganancia = 200', r[0].ganancia, 200);
eq('lotes = 2', r[0].lotes, 2);

// Activo con y sin deuda
eq('activo con deuda', valorCuenta({tipo:'activo', valor_total:90e6, tiene_deuda:true, valor_deuda:30e6}), 60e6);
eq('activo sin deuda', valorCuenta({tipo:'activo', valor_total:90e6, tiene_deuda:false, valor_deuda:null}), 90e6);

// Neto completo, con posicion USD convertida a COP
const cuentas = [
  { id:'a', tipo:'ahorros',  saldo:1_000_000, moneda:'COP', activa:true },
  { id:'e', tipo:'efectivo', saldo:  200_000, moneda:'COP', activa:true },
  { id:'i', tipo:'inversion',saldo:      500, moneda:'USD', activa:true },
  { id:'k', tipo:'activo',   valor_total:90e6, tiene_deuda:true, valor_deuda:30e6, activa:true },
];
const pos = [{ cuenta_id:'i', ticker:'VOO', estado:'abierta', cantidad:2, precio_compra:700, moneda:'USD' }];
const precios = { VOO:{cierre:710, moneda:'USD'}, 'C:USDCOP':{cierre:4000, moneda:'COP'} };
const { total, desglose } = patrimonioNeto(cuentas, pos, precios, { tasas:{ USDCOP:4000 } });
eq('ahorros', desglose.ahorros, 1_000_000);
eq('inversion = (500 + 2*710) * 4000', desglose.inversion, (500 + 1420) * 4000);
eq('activos', desglose.activos, 90e6);
eq('deuda positiva', desglose.deuda, 30e6);
eq('total', total, 1_000_000 + 200_000 + (500+1420)*4000 + 90e6 - 30e6);

// Cuenta inactiva no suma
const sinInactiva = patrimonioNeto([{...cuentas[0], activa:false}], [], {});
eq('cuenta inactiva no suma', sinInactiva.total, 0);

// Sin tasa: no inventa numeros
const sinTasa = convertir(100, 'USD', 'COP', {});
eq('sin tasa devuelve el valor crudo', sinTasa.valor, 100);
console.log(sinTasa.convertido === false ? '  ok   sin tasa marca convertido=false' : ' FAIL  convertido');
if (sinTasa.convertido !== false) fallos++;

// Realizada: null si esta abierta, numero si cerrada
console.log(rentabilidadRealizada({estado:'abierta'}) === null ? '  ok   abierta -> null' : ' FAIL  abierta');
if (rentabilidadRealizada({estado:'abierta'}) !== null) fallos++;
const real = rentabilidadRealizada({estado:'cerrada', cantidad:2, precio_compra:700, precio_venta:750, fecha_compra:'2026-01-01', fecha_venta:'2026-03-02'});
eq('ganancia realizada', real.ganancia, 100);
eq('rendimiento %', real.rendimiento, 100/1400*100);
eq('dias de tenencia', real.dias, 60);

// Coherencia fila-vs-total. Este caso nacio de un bug real: valorCuenta
// devolvia la moneda de la cuenta y patrimonioNeto la de presentacion, asi que
// un broker con 12.564 USD se pintaba como "$ 12.591" pesos justo al lado de un
// total que si estaba convertido. Ninguno de los dos numeros estaba "mal" por
// separado; la pantalla mentia igual.
const filas = cuentas.map(c => valorCuenta(c, pos, precios, { USDCOP: 4000 }));
const sumaFilas = filas.reduce((a, b) => a + b, 0);
eq('la suma de las filas es el total', sumaFilas, total);

// Y la cuenta en USD debe salir YA convertida a pesos, no en dolares.
eq('cuenta USD convertida a COP', valorCuenta(cuentas[2], pos, precios, { USDCOP: 4000 }), (500 + 1420) * 4000);

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(fallos ? 1 : 0);
