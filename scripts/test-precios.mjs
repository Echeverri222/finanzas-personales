/**
 * Aserciones de los respaldos de precios (lib/tradingview.js, lib/yahoo.js).
 *
 * Traducir un ticker es lo que decide si una acción colombiana llega al
 * proveedor o se descarta en silencio, y un sufijo mal mapeado no falla con un
 * error: devuelve el precio de otra empresa. Sin red, para poder correrlo
 * siempre.
 *
 *   npm run test:precios
 */
import { simboloTradingView } from '../lib/tradingview.js';
import { tickerYahoo, candidatoYahoo } from '../lib/yahoo.js';

let fallos = 0;
const eq = (label, a, b) => {
  const ok = a === b;
  if (!ok) fallos++;
  console.log(
    ok ? '  ok  ' : ' FAIL ',
    label,
    ok ? '' : `-> ${JSON.stringify(a)} != ${JSON.stringify(b)}`
  );
};

console.log('TradingView');
eq('BVC lleva prefijo de bolsa', simboloTradingView('PFGRUPOARG.CL'), 'BVC:PFGRUPOARG');
eq('otra colombiana igual', simboloTradingView('ECOPETROL.CL'), 'BVC:ECOPETROL');
// Un sufijo sin verificar debe descartarse, no inventarse una bolsa: pedir el
// símbolo equivocado devolvería el precio de otra empresa sin avisar.
eq('sufijo no soportado se descarta', simboloTradingView('BMW.DE'), null);
eq('ticker de EE. UU. se descarta', simboloTradingView('VOO'), null);
eq('cripto se descarta', simboloTradingView('X:BTCUSD'), null);
eq('forex se descarta', simboloTradingView('C:USDCOP'), null);

console.log('\nYahoo');
eq('BVC se queda igual', tickerYahoo('PFGRUPOARG.CL'), 'PFGRUPOARG.CL');
eq('BVC es candidato', candidatoYahoo('PFGRUPOARG.CL'), true);
eq('forex Massive → Yahoo', tickerYahoo('C:USDCOP'), 'USDCOP=X');
eq('forex es candidato', candidatoYahoo('C:USDCOP'), true);
eq('crypto USD', tickerYahoo('X:BTCUSD'), 'BTC-USD');
eq('crypto USDT no parte US-DT', tickerYahoo('X:ETHUSDT'), 'ETH-USDT');
eq('US no se traduce', tickerYahoo('VOO'), 'VOO');
eq('US no es candidato', candidatoYahoo('VOO'), false);

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
