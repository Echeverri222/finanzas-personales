import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

const FMP_API_KEY = process.env.NEXT_PUBLIC_FMP_API_KEY;
const BASE_URL = 'https://financialmodelingprep.com/api/v3';

// Custom tooltips for charts
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold">{new Date(label).toLocaleDateString()}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: ${entry.value?.toFixed(2)}
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
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold">{new Date(label).toLocaleDateString()}</p>
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

export default function StockAnalysisPage() {
  const [searchTerm, setSearchTerm] = useState('AAPL');
  const [stockData, setStockData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: new Date().toISOString().split('T')[0]
  });
  const [fundamentalMetrics, setFundamentalMetrics] = useState(null);
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

  // Calculate performance data
  const calculatePerformance = (data) => {
    if (data.length < 30) return null;

    const currentPrice = data[data.length - 1].close;
    const oneMonthAgo = data[Math.max(0, data.length - 30)]?.close || currentPrice;
    const threeMonthsAgo = data[Math.max(0, data.length - 90)]?.close || currentPrice;
    const sixMonthsAgo = data[Math.max(0, data.length - 180)]?.close || currentPrice;
    const oneYearAgo = data[Math.max(0, data.length - 365)]?.close || currentPrice;

    return {
      '1M': ((currentPrice - oneMonthAgo) / oneMonthAgo * 100),
      '3M': ((currentPrice - threeMonthsAgo) / threeMonthsAgo * 100),
      '6M': ((currentPrice - sixMonthsAgo) / sixMonthsAgo * 100),
      '1Y': ((currentPrice - oneYearAgo) / oneYearAgo * 100)
    };
  };

  // Handle search
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim() || !FMP_API_KEY) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch current stock data
      const quoteResponse = await fetch(
        `${BASE_URL}/quote/${searchTerm}?apikey=${FMP_API_KEY}`
      );
      const quoteResult = await quoteResponse.json();

      if (!quoteResponse.ok || !quoteResult.length) {
        throw new Error('Símbolo no encontrado');
      }

      setStockData(quoteResult[0]);

      // Calculate date range (default to 2 years of data)
      const endDate = dateRange.endDate || new Date().toISOString().split('T')[0];
      const startDate = dateRange.startDate || 
        new Date(Date.now() - 2 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch historical data
      const historicalResponse = await fetch(
        `${BASE_URL}/historical-price-full/${searchTerm}?from=${startDate}&to=${endDate}&apikey=${FMP_API_KEY}`
      );
      const historicalResult = await historicalResponse.json();

      if (!historicalResponse.ok || !historicalResult.historical) {
        throw new Error('No se pudieron obtener datos históricos');
      }

      const historical = historicalResult.historical.reverse();
      setHistoricalData(historical);

      // Calculate performance
      const performance = calculatePerformance(historical);
      setPerformanceData(performance);

      // Fetch fundamental data
      try {
        const fundamentalResponse = await fetch(
          `${BASE_URL}/key-metrics-ttm/${searchTerm}?apikey=${FMP_API_KEY}`
        );
        const fundamentalResult = await fundamentalResponse.json();
        
        if (fundamentalResponse.ok && fundamentalResult.length > 0) {
          setFundamentalMetrics(fundamentalResult[0]);
        } else {
          // Try alternative endpoint
          const altResponse = await fetch(
            `${BASE_URL}/key-metrics/${searchTerm}?limit=1&apikey=${FMP_API_KEY}`
          );
          const altResult = await altResponse.json();
          
          if (altResponse.ok && altResult.length > 0) {
            setFundamentalMetrics(altResult[0]);
          } else {
            setFundamentalMetrics(null);
          }
        }
      } catch (fundamentalError) {
        console.warn('Could not fetch fundamental data:', fundamentalError);
        setFundamentalMetrics(null);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Formatting functions
  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatLargeNumber = (num) => {
    if (!num) return '-';
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatNumber = (value) => {
    if (!value) return '-';
    return value.toFixed(2);
  };

  const formatPercentage = (value) => {
    if (!value) return '-';
    return (value * 100).toFixed(2) + '%';
  };

  const formatPerformancePercentage = (value) => {
    if (!value) return '-';
    const formatted = value.toFixed(2) + '%';
    return value >= 0 ? `+${formatted}` : formatted;
  };

  // Auto-search AAPL on mount if API is configured
  useEffect(() => {
    if (FMP_API_KEY && searchTerm === 'AAPL') {
      handleSearch({ preventDefault: () => {} });
    }
  }, []);

  if (!FMP_API_KEY) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-600 text-lg">⚠️ FMP API Key not configured</div>
          <p className="text-gray-600 mt-2">
            Please add your Financial Modeling Prep API key to environment variables.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Análisis Técnico</h1>
          <p className="text-gray-600 mt-1">Análisis técnico avanzado con ratios SMA</p>
        </div>
        
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="flex flex-col md:flex-row gap-2 w-full">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              placeholder="Símbolo (ej: AAPL)"
              className="w-full md:w-64 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Button
              type="submit"
              disabled={loading}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </Button>
          </div>
        </form>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Stock Information Cards */}
      {stockData && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Current Price */}
          <Card>
            <CardContent>
              <h3 className="text-sm font-medium text-gray-500">Precio Actual</h3>
              <div className="mt-1 flex items-baseline">
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(stockData.price)}</p>
                <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                  stockData.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span>{stockData.change >= 0 ? '↑' : '↓'}</span>
                  <span className="ml-1">{Math.abs(stockData.change).toFixed(2)}</span>
                  <span className="ml-1">({Math.abs(stockData.changesPercentage).toFixed(2)}%)</span>
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Fundamental Metrics */}
          {fundamentalMetrics && (
            <>
              <Card>
                <CardContent>
                  <h3 className="text-sm font-medium text-gray-500">Métricas Fundamentales</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">P/E Ratio</span>
                      <span className="font-semibold">{formatNumber(fundamentalMetrics.peRatioTTM || fundamentalMetrics.peRatio)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price/Book</span>
                      <span className="font-semibold">{formatNumber(fundamentalMetrics.pbRatioTTM || fundamentalMetrics.pbRatio)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">PEG Ratio</span>
                      <span className="font-semibold">{formatNumber(fundamentalMetrics.pegRatioTTM || fundamentalMetrics.pegRatio)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="text-sm font-medium text-gray-500">Rentabilidad</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">ROE</span>
                      <span className="font-semibold">{formatPercentage(fundamentalMetrics.roeTTM || fundamentalMetrics.roe)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">ROA</span>
                      <span className="font-semibold">{formatPercentage(fundamentalMetrics.roaTTM || fundamentalMetrics.roa)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Dividend Yield</span>
                      <span className="font-semibold">{formatPercentage(fundamentalMetrics.dividendYieldTTM || fundamentalMetrics.dividendYield)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <h3 className="text-sm font-medium text-gray-500">Estructura Financiera</h3>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Debt/Equity</span>
                      <span className="font-semibold">{formatNumber(fundamentalMetrics.debtToEquityTTM || fundamentalMetrics.debtToEquity)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">FCF Yield</span>
                      <span className="font-semibold">{formatPercentage(fundamentalMetrics.freeCashFlowYieldTTM || fundamentalMetrics.freeCashFlowYield)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Market Cap</span>
                      <span className="font-semibold">{formatLargeNumber(stockData.marketCap)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
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
                  <div className="text-sm text-gray-600">{period}</div>
                  <div className={`text-lg font-semibold ${
                    data >= 0 ? 'text-green-600' : 'text-red-600'
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
                  <Tooltip content={<CustomTooltip />} />
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">SMA10/SMA30</h4>
                <p>• Ratio &lt; Buy Level: Oportunidad de compra</p>
                <p>• Ratio &gt; Sell Level: Oportunidad de venta</p>
                <p>• Mejor para trading corto plazo</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">SMA20/SMA50</h4>
                <p>• Ratio &lt; Buy Level: Oportunidad de compra</p>
                <p>• Ratio &gt; Sell Level: Oportunidad de venta</p>
                <p>• Mejor para trading medio plazo</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">SMA50/SMA200</h4>
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