/**
 * Aserciones de lo que los formularios entienden: importes escritos a la
 * colombiana, la fecha local y el calendario de los pagos recurrentes.
 *
 * Los tres bugs que esto cubre no lanzaban ningún error: "12.345" se guardaba
 * como $12, un movimiento de las 19:00 quedaba con fecha de mañana y una regla
 * creada de noche se saltaba el mes. Por eso se prueban con valores concretos.
 *
 *   npm run test:formularios
 */
import { parseMoneyInput } from '../lib/dinero.js';
import { toISODate } from '../lib/fechaLocal.js';
import { proximoCobro, cobrosRestantes, fechaDelMes, totalesMensuales } from '../lib/recurrentes.js';

let fallos = 0;
const eq = (label, a, b) => {
  const ok = a === b;
  if (!ok) fallos++;
  console.log(ok ? '  ok  ' : ' FAIL ', label, ok ? '' : `-> ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
};

// --- importes ---------------------------------------------------------------
eq('punto de miles', parseMoneyInput('12.345'), '12345');
eq('varios puntos de miles', parseMoneyInput('1.234.567'), '1234567');
eq('coma decimal', parseMoneyInput('13.777,23'), '13777.23');
eq('punto decimal suelto', parseMoneyInput('700.5'), '700.5');
eq('punto decimal con dos cifras', parseMoneyInput('13777.23'), '13777.23');
eq('con signo de pesos y espacios', parseMoneyInput('$ 45.000'), '45000');
eq('sin dígitos', parseMoneyInput('abc'), '');
eq('vacío', parseMoneyInput(''), '');
eq('entero simple', parseMoneyInput('1000'), '1000');
eq('coma final mientras se escribe', parseMoneyInput('12,'), '12');
eq('ceros a la izquierda', parseMoneyInput('007'), '7');

// --- fecha local -------------------------------------------------------------
// 28 oct 2026 a las 19:46 en Bogotá ya es 29 oct en UTC.
const nocheBogota = new Date(2026, 9, 28, 19, 46);
eq('día local, no UTC', toISODate(nocheBogota), '2026-10-28');
eq('string de fecha se respeta', toISODate('2026-10-01'), '2026-10-01');

// --- calendario de recurrentes -----------------------------------------------
eq('día 31 en febrero', fechaDelMes(31, 2027, 2), '2027-02-28');
eq('día 31 en febrero bisiesto', fechaDelMes(31, 2028, 2), '2028-02-29');

const hoy = '2026-10-28';
eq('regla de hoy cobra hoy', proximoCobro({ dia_mes: 28, generar_desde: hoy }, hoy), '2026-10-28');
eq('día ya pasado -> mes siguiente', proximoCobro({ dia_mes: 1, generar_desde: '2026-09-01' }, hoy), '2026-11-01');
eq('aún no inicia', proximoCobro({ dia_mes: 5, generar_desde: '2027-01-01' }, hoy), '2027-01-05');
eq('terminada', proximoCobro({ dia_mes: 1, generar_desde: '2026-01-01', generar_hasta: '2026-10-01' }, hoy), null);
eq('cuotas restantes', cobrosRestantes({ dia_mes: 2, generar_desde: '2026-01-01', generar_hasta: '2027-01-02' }, hoy), 3);
eq('sin fin -> null', cobrosRestantes({ dia_mes: 2, generar_desde: '2026-01-01' }, hoy), null);

const t = totalesMensuales(
  [
    { activo: true, importe: 100, ingreso: false },
    { activo: true, importe: 50, ingreso: true },
    { activo: false, importe: 999, ingreso: false },
  ],
  (r) => r.ingreso,
);
eq('total gastos solo activos', t.gastos, 100);
eq('total ingresos', t.ingresos, 50);

if (fallos) {
  console.error(`\n${fallos} FALLO(S)`);
  process.exit(1);
}
console.log('\nTODO OK');
