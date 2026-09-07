/**
 * Aserciones de lib/yahoo.js que no necesitan red.
 *
 * La traducción de tickers y el filtro de candidatos son lo que decide si una
 * acción colombiana llega a Yahoo o se descarta en silencio. Un corte mal
 * hecho de `X:ETHUSDT` pediría `ETHUS-DT` y fallaría para siempre.
 *
 *   node scripts/test-yahoo.mjs
 */
import { tickerYahoo, candidatoYahoo } from '../lib/yahoo.js';

let fallos = 0;
const eq = (label, a, b) => {
  const ok = a === b;
  if (!ok) fallos++;
  console.log(ok ? '  ok  ' : ' FAIL ', label, ok ? '' : `-> ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
};

eq('BVC se queda igual', tickerYahoo('PFGRUPOARG.CL'), 'PFGRUPOARG.CL');
eq('BVC es candidato', candidatoYahoo('PFGRUPOARG.CL'), true);
eq('forex Massive → Yahoo', tickerYahoo('C:USDCOP'), 'USDCOP=X');
eq('forex es candidato', candidatoYahoo('C:USDCOP'), true);
eq('crypto USD', tickerYahoo('X:BTCUSD'), 'BTC-USD');
eq('crypto USDT no parte US-DT', tickerYahoo('X:ETHUSDT'), 'ETH-USDT');
eq('crypto es candidato', candidatoYahoo('X:BTCUSD'), true);
eq('US no se traduce', tickerYahoo('VOO'), 'VOO');
eq('US no es candidato', candidatoYahoo('VOO'), false);
eq('AAPL no es candidato', candidatoYahoo('AAPL'), false);

console.log(fallos === 0 ? '\nTODO OK' : `\n${fallos} FALLOS`);
process.exit(fallos === 0 ? 0 : 1);
