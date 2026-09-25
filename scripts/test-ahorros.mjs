import { ahorroAcumulado, cambioEnAhorro } from '../lib/ahorros.js';

const movimientos = [
  { importe: 1000, tipo_categoria: 'ahorro', sale_de_ahorros: false },
  { importe: 250, tipo_categoria: 'gasto', sale_de_ahorros: true },
  { importe: 90, tipo_categoria: 'gasto', sale_de_ahorros: false },
];

const saldo = ahorroAcumulado(movimientos);
if (saldo !== 750) {
  throw new Error(`Ahorro acumulado incorrecto: ${saldo}; esperado 750`);
}

const sinCuenta = cambioEnAhorro({
  importe: 100,
  tipo_categoria: 'gasto',
  sale_de_ahorros: true,
  cuenta_id: null,
});
if (sinCuenta !== -100) {
  throw new Error(`Un uso sin cuenta debe restar 100; obtuvo ${sinCuenta}`);
}

console.log('AHORROS OK');
