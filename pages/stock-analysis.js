import { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabaseClient';
import { formatDate, todayISO } from '@/lib/format';

/**
 * Inicio por defecto: dos años antes de `hasta`. Dos y no uno porque la SMA200
 * necesita 200 sesiones antes de dar su primer valor; con un año el ratio
 * 50/200 apenas tendría unas semanas de datos.
 *
 * Se opera sobre el texto `yyyy-mm-dd` y no sobre un `Date` para no cruzar por
 * UTC: el 29 de febrero se corrige al 28 porque dos años antes no existe.
 */
function haceDosAnios(iso) {
  const [y, m, d] = iso.split('-');
  return `${Number(y) - 2}-${m}-${m === '02' && d === '29' ? '28' : d}`;
}

/** Mensaje para cada respuesta de error de /api/analisis/historico. */
function mensajeDeError(status, cuerpo) {
  if (status === 404) return 'Símbolo no encontrado. Revisa cómo está escrito (ej: AAPL, VOO, PFGRUPOARG.CL).';
  if (status === 400) return cuerpo?.mensaje || 'Revisa el símbolo y las fechas.';
  if (status === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  return 'No pudimos obtener precios ahora. Inténtalo de nuevo en unos minutos.';
}

// Custom tooltips for charts
const CustomTooltip = ({ active, payload, label, moneda }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
        <p className="font-semibold">{formatDate(label)}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {formatPrecio(entry.value, moneda)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const RatioTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-lg border bg-popover p-4 text-popover-foreground shadow-lg">
        <p className="font-semibold">{formatDate(label)}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: {entry.value?.toFixed(4)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

/** Precio en la moneda en que cotiza el símbolo, con separadores es-CO. */
function formatPrecio(value, moneda) {
  if (value === null || value === undefined || !Number.isFinite(Number(value))) return '-';
  try {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: moneda || 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return Number(value).toFixed(2);
  }
}

function formatPerformancePercentage(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '-';
  const formatted = `${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
  return value >= 0 ? `+${formatted}` : formatted;
}

export default function StockAnalysisPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockData, setStockData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState(() => {
    const hoy = todayISO();
    return { startDate: haceDosAnios(hoy), endDate: hoy };
  });
  const [performanceData, setPerformanceData] = useState(null);

  // Calculate SMA (Simple Moving Average)
  const calculateSMA = (data, period) => {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
        continue;
      }

      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j].close;
      }
      sma.push(sum / period);
    }
    return sma;
  };

  // Calculate SMA ratios
  const calculateRatios = (shortSMA, longSMA) => {
    const ratios = [];
    for (let i = 0; i < shortSMA.length; i++) {
      if (!shortSMA[i] || !longSMA[i]) {
        ratios.push(null);
        continue;
      }
      ratios.push(shortSMA[i] / longSMA[i]);
    }
    return ratios;
  };

  // Calculate buy/sell levels using percentiles
  const calculateLevels = (ratios) => {
    const validRatios = ratios.filter(r => r !== null).sort((a, b) => a - b);
    if (validRatios.length === 0) return { buyLevel: 1, sellLevel: 1, mean: 1 };

    const buyLevel = validRatios[Math.floor(validRatios.length * 0.2)]; // 20th percentile
    const sellLevel = validRatios[Math.floor(validRatios.length * 0.8)]; // 80th percentile
    const mean = validRatios[Math.floor(validRatios.length * 0.5)]; // 50th percentile (median)

    return { buyLevel, sellLevel, mean };
  };

  // Analyze all SMA ratios
  const analyzeAllRatios = (data) => {
    const sma10 = calculateSMA(data, 10);
    const sma20 = calculateSMA(data, 20);
    const sma30 = calculateSMA(data, 30);
    const sma50 = calculateSMA(data, 50);
    const sma200 = calculateSMA(data, 200);

    const ratio10_30 = calculateRatios(sma10, sma30);
    const ratio20_50 = calculateRatios(sma20, sma50);
    const ratio50_200 = calculateRatios(sma50, sma200);

    return {
      ratio10_30: {
        data: ratio10_30,
        ...calculateLevels(ratio10_30)
      },
      ratio20_50: {
        data: ratio20_50,
        ...calculateLevels(ratio20_50)
      },
      ratio50_200: {
        data: ratio50_200,
        ...calculateLevels(ratio50_200)
      }
    };
  };

  // Rendimiento por período, medido por FECHA y no por número de filas: el
  // histórico solo trae días hábiles, así que "30 filas atrás" eran ~6 semanas
  // y "365 filas" casi año y medio.
  const calculatePerformance = (data) => {
    if (data.length < 2) return null;

    const ultimo = data[data.length - 1];
    const precioEn = (meses) => {
      const [y, m, d] = ultimo.date.split('-').map(Number);
      const objetivo = new Date(Date.UTC(y, m - 1 - meses, d)).toISOString().slice(0, 10);
      // Si el rango no llega tan atrás, ese período no se puede calcular.
      if (data[0].date > objetivo) return null;
      let previo = data[0];
      for (const punto of data) {
        if (punto.date > objetivo) break;
        previo = punto;
      }
      return previo.close;
    };

    const resultado = {};
    for (const [periodo, meses] of [['1M', 1], ['3M', 3], ['6M', 6], ['1Y', 12]]) {
      const base = precioEn(meses);
      resultado[periodo] = base ? ((ultimo.close - base) / base) * 100 : null;
    }
    return resultado;
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    const simbolo = searchTerm.trim().toUpperCase();
    if (!simbolo) return;

    setLoading(true);
    setError(null);

    try {
      const { data: sesion } = await supabase.auth.getSession();
      const token = sesion?.session?.access_token;
      if (!token) throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');

      const params = new URLSearchParams({
        simbolo,
        desde: dateRange.startDate || haceDosAnios(dateRange.endDate || todayISO()),
        hasta: dateRange.endDate || todayISO(),
      });

      let res;
      try {
        res = await fetch(`/api/analisis/historico?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        throw new Error(mensajeDeError(0));
      }
      const cuerpo = await res.json().catch(() => null);
      if (!res.ok) throw new Error(mensajeDeError(res.status, cuerpo));

      setStockData({ symbol: cuerpo.simbolo, moneda: cuerpo.moneda, ...cuerpo.cotizacion });
      setHistoricalData(cuerpo.historico);
      setPerformanceData(calculatePerformance(cuerpo.historico));
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
      setStockData(null);
      setHistoricalData([]);
      setPerformanceData(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Análisis de acciones" description="Precio e indicadores técnicos (medias móviles) de cualquier acción o cripto.">
        <form onSubmit={handleSearch} className="flex w-full flex-col gap-2 sm:flex-row md:w-auto">
          <Input
            type="date"
            aria-label="Desde"
            value={dateRange.startDate}
            max={dateRange.endDate || undefined}
            onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            className="sm:w-auto"
          />
          <Input
            type="date"
            aria-label="Hasta"
            value={dateRange.endDate}
            min={dateRange.startDate || undefined}
            onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            className="sm:w-auto"
          />
          <Input
            type="text"
            aria-label="Símbolo"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
            placeholder="Símbolo (ej: AAPL)"
            className="sm:w-48"
          />
          <Button type="submit" disabled={loading || !searchTerm.trim()}>
            {loading ? 'Buscando...' : 'Buscar'}
          </Button>
        </form>
      </PageHeader>

      {error && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Antes de la primera búsqueda la página quedaba en blanco. */}
      {!stockData && !error && !loading && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <LineChartIcon className="size-8 text-muted-foreground" aria-hidden="true" />
            <p className="font-medium text-foreground">Busca un símbolo para empezar</p>
            <p className="max-w-md text-sm text-muted-foreground">
              Escribe el ticker tal como cotiza: AAPL o VOO para EE. UU., o con el sufijo de
              la bolsa, como PFGRUPOARG.CL para Colombia. Por defecto se analizan los últimos
              dos años.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Último cierre. Las métricas fundamentales (P/E, ROE…) venían de FMP y
          ningún proveedor actual las ofrece, así que se retiraron. */}
      {stockData && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent>
              <h3 className="text-sm font-medium text-muted-foreground">Último cierre · {stockData.symbol}</h3>
              <div className="mt-1 flex flex-wrap items-baseline">
                <p className="text-2xl font-semibold text-foreground">{formatPrecio(stockData.precio, stockData.moneda)}</p>
                {stockData.cambio !== null && (
                  <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                    stockData.cambio >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    <span>{stockData.cambio >= 0 ? '↑' : '↓'}</span>
                    <span className="ml-1">{formatPrecio(Math.abs(stockData.cambio), stockData.moneda)}</span>
                    {stockData.cambioPct !== null && (
                      <span className="ml-1">
                        ({Math.abs(stockData.cambioPct).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                      </span>
                    )}
                  </p>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{formatDate(stockData.fecha)}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Table */}
      {performanceData && (
        <Card>
          <CardHeader>
            <CardTitle>Rendimiento por Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(performanceData).map(([period, data]) => (
                <div key={period} className="text-center">
                  <div className="text-sm text-muted-foreground">{period}</div>
                  <div className={`text-lg font-semibold ${
                    data === null ? 'text-muted-foreground' : data >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatPerformancePercentage(data)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Price Chart */}
      {historicalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Gráfico de Precios - {stockData?.symbol}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={historicalData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fill: '#4B5563' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis
                    tick={{ fill: '#4B5563' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                    domain={['auto', 'auto']}
                  />
                  <Tooltip content={<CustomTooltip moneda={stockData?.moneda} />} />
                  <Line 
                    type="monotone" 
                    dataKey="close" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={false}
                    name="Precio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SMA Ratio Charts */}
      {historicalData.length > 0 && (() => {
        const ratios = analyzeAllRatios(historicalData);
        
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ratio SMA10/SMA30 */}
            <Card>
              <CardHeader>
                <CardTitle>Ratio SMA10/SMA30</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historicalData.map((point, index) => ({
                        date: point.date,
                        ratio: ratios.ratio10_30.data[index]
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#4B5563' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                      />
                      <YAxis
                        tick={{ fill: '#4B5563' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={<RatioTooltip />} />
                      <ReferenceLine y={ratios.ratio10_30.buyLevel} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Buy', position: 'right', fill: '#10B981' }} />
                      <ReferenceLine y={ratios.ratio10_30.mean} stroke="#6B7280" strokeDasharray="3 3" label={{ value: 'Mean', position: 'right', fill: '#6B7280' }} />
                      <ReferenceLine y={ratios.ratio10_30.sellLevel} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Sell', position: 'right', fill: '#EF4444' }} />
                      <Line 
                        type="monotone" 
                        dataKey="ratio" 
                        stroke="#8B5CF6" 
                        strokeWidth={2}
                        dot={false}
                        name="Ratio SMA10/SMA30"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Ratio SMA20/SMA50 */}
            <Card>
              <CardHeader>
                <CardTitle>Ratio SMA20/SMA50</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historicalData.map((point, index) => ({
                        date: point.date,
                        ratio: ratios.ratio20_50.data[index]
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#4B5563' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                      />
                      <YAxis
                        tick={{ fill: '#4B5563' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={<RatioTooltip />} />
                      <ReferenceLine y={ratios.ratio20_50.buyLevel} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Buy', position: 'right', fill: '#10B981' }} />
                      <ReferenceLine y={ratios.ratio20_50.mean} stroke="#6B7280" strokeDasharray="3 3" label={{ value: 'Mean', position: 'right', fill: '#6B7280' }} />
                      <ReferenceLine y={ratios.ratio20_50.sellLevel} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Sell', position: 'right', fill: '#EF4444' }} />
                      <Line 
                        type="monotone" 
                        dataKey="ratio" 
                        stroke="#6366F1" 
                        strokeWidth={2}
                        dot={false}
                        name="Ratio SMA20/SMA50"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Ratio SMA50/SMA200 (Golden Cross) */}
            <Card>
              <CardHeader>
                <CardTitle>Ratio SMA50/SMA200</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={historicalData.map((point, index) => ({
                        date: point.date,
                        ratio: ratios.ratio50_200.data[index]
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: '#4B5563' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                      />
                      <YAxis
                        tick={{ fill: '#4B5563' }}
                        axisLine={{ stroke: '#E5E7EB' }}
                        domain={['auto', 'auto']}
                      />
                      <Tooltip content={<RatioTooltip />} />
                      <ReferenceLine y={ratios.ratio50_200.buyLevel} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Buy', position: 'right', fill: '#10B981' }} />
                      <ReferenceLine y={ratios.ratio50_200.mean} stroke="#6B7280" strokeDasharray="3 3" label={{ value: 'Mean', position: 'right', fill: '#6B7280' }} />
                      <ReferenceLine y={ratios.ratio50_200.sellLevel} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Sell', position: 'right', fill: '#EF4444' }} />
                      <Line 
                        type="monotone" 
                        dataKey="ratio" 
                        stroke="#F59E0B" 
                        strokeWidth={2}
                        dot={false}
                        name="Ratio SMA50/SMA200"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        );
      })()}

      {/* Technical Analysis Interpretation */}
      {historicalData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Interpretación de Ratios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-muted-foreground">
              <div>
                <h4 className="font-semibold text-foreground mb-2">SMA10/SMA30</h4>
                <p>• Ratio &lt; Buy Level: Oportunidad de compra</p>
                <p>• Ratio &gt; Sell Level: Oportunidad de venta</p>
                <p>• Mejor para trading corto plazo</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">SMA20/SMA50</h4>
                <p>• Ratio &lt; Buy Level: Oportunidad de compra</p>
                <p>• Ratio &gt; Sell Level: Oportunidad de venta</p>
                <p>• Mejor para trading medio plazo</p>
              </div>
              <div>
                <h4 className="font-semibold text-foreground mb-2">SMA50/SMA200</h4>
                <p>• Ratio &lt; Buy Level: Oportunidad de compra</p>
                <p>• Ratio &gt; Sell Level: Oportunidad de venta</p>
                <p>• Mejor para inversión largo plazo (Golden Cross)</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 