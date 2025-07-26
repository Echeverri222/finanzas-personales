import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = 'FAExoSELA4CoIVTlixYT42586X9MYpSb';

// Debug log to check environment variables
console.log('Environment Variables:', {
  FMP_API_KEY: process.env.REACT_APP_FMP_API_KEY,
  SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL, // for comparison
});

if (!FMP_API_KEY) {
  console.error('FMP API Key not found in environment variables. Please check your .env file.');
}

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

export default function StockAnalysis() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockData, setStockData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: new Date().toISOString().split('T')[0]
  });
  const [fundamentalData, setFundamentalData] = useState(null);
  const [fundamentalMetrics, setFundamentalMetrics] = useState(null);
  const [performanceData, setPerformanceData] = useState(null);

  // Función para calcular SMA
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

  // Función para calcular ratios
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

  // Función para calcular rendimientos
  const calculatePerformance = (data) => {
    if (data.length < 30) return null;

    const currentPrice = data[data.length - 1].close;
    const oneMonthAgo = data[Math.max(0, data.length - 30)]?.close || currentPrice;
    const threeMonthsAgo = data[Math.max(0, data.length - 90)]?.close || currentPrice;
    const sixMonthsAgo = data[Math.max(0, data.length - 180)]?.close || currentPrice;
    const oneYearAgo = data[Math.max(0, data.length - 365)]?.close || currentPrice;

    // Encontrar el precio al inicio del año
    const startOfYear = new Date(new Date().getFullYear(), 0, 1);
    const ytdIndex = data.findIndex(point => new Date(point.date) >= startOfYear);
    const ytdPrice = ytdIndex >= 0 ? data[ytdIndex].close : currentPrice;

    return {
      price: {
        '1M': ((currentPrice - oneMonthAgo) / oneMonthAgo) * 100,
        '3M': ((currentPrice - threeMonthsAgo) / threeMonthsAgo) * 100,
        'YTD': ((currentPrice - ytdPrice) / ytdPrice) * 100,
        '1Y': ((currentPrice - oneYearAgo) / oneYearAgo) * 100
      },
      total: {
        '1M': ((currentPrice - oneMonthAgo) / oneMonthAgo) * 100,
        '3M': ((currentPrice - threeMonthsAgo) / threeMonthsAgo) * 100,
        'YTD': ((currentPrice - ytdPrice) / ytdPrice) * 100,
        '1Y': ((currentPrice - oneYearAgo) / oneYearAgo) * 100
      }
    };
  };

  // Función para analizar todos los ratios
  const analyzeAllRatios = (data) => {
    const sma10 = calculateSMA(data, 10);
    const sma20 = calculateSMA(data, 20);
    const sma30 = calculateSMA(data, 30);
    const sma50 = calculateSMA(data, 50);
    const sma200 = calculateSMA(data, 200);

    const ratio20_50 = calculateRatios(sma20, sma50);
    const ratio10_30 = calculateRatios(sma10, sma30);
    const ratio50_200 = calculateRatios(sma50, sma200);

    // Calcular niveles para cada ratio
    const getLevels = (ratios) => {
      const validRatios = ratios.filter(r => r !== null);
      const sortedRatios = [...validRatios].sort((a, b) => a - b);
      return {
        buyLevel: sortedRatios[Math.floor(sortedRatios.length * 0.2)],
        mean: sortedRatios[Math.floor(sortedRatios.length * 0.5)],
        sellLevel: sortedRatios[Math.floor(sortedRatios.length * 0.8)]
      };
    };

    return {
      sma10,
      sma20,
      sma30,
      sma50,
      sma200,
      ratio20_50: {
        data: ratio20_50,
        ...getLevels(ratio20_50)
      },
      ratio10_30: {
        data: ratio10_30,
        ...getLevels(ratio10_30)
      },
      ratio50_200: {
        data: ratio50_200,
        ...getLevels(ratio50_200)
      }
    };
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    setLoading(true);
    setError(null);

    try {
      // Fetch current stock data
      const stockResponse = await fetch(
        `${BASE_URL}/quote/${searchTerm}?apikey=${FMP_API_KEY}`
      );
      const stockResult = await stockResponse.json();

      if (!stockResponse.ok || !stockResult.length) {
        throw new Error('Símbolo no encontrado');
      }

      const stock = stockResult[0];
      setStockData({
        symbol: stock.symbol,
        price: stock.price,
        change: stock.change,
        changesPercentage: stock.changesPercentage
      });

      // Fetch historical data
      const startDate = dateRange.startDate || '2020-12-11';
      const endDate = dateRange.endDate || new Date().toISOString().split('T')[0];
      
      const historicalResponse = await fetch(
        `${BASE_URL}/historical-price-full/${searchTerm}?from=${startDate}&to=${endDate}&apikey=${FMP_API_KEY}`
      );
      const historicalResult = await historicalResponse.json();

      if (!historicalResponse.ok || !historicalResult.historical) {
        throw new Error('No se pudieron obtener datos históricos');
      }

      const historical = historicalResult.historical.reverse();
      setHistoricalData(historical);

      // Calculate all ratios and performance
      const ratios = analyzeAllRatios(historical);
      const performance = calculatePerformance(historical);
      
      setPerformanceData(performance);

      // Fetch fundamental data
      try {
        const fundamentalResponse = await fetch(
          `${BASE_URL}/key-metrics/${searchTerm}?limit=1&apikey=${FMP_API_KEY}`
        );
        const fundamentalResult = await fundamentalResponse.json();
        
        if (fundamentalResponse.ok && fundamentalResult.length > 0) {
          setFundamentalMetrics(fundamentalResult[0]);
        }
      } catch (fundamentalError) {
        console.warn('Could not fetch fundamental data:', fundamentalError);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 bg-gray-50">
      {/* Búsqueda y Filtros */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Análisis Técnico</h2>
        
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <div className="flex flex-col md:flex-row gap-2 w-full">
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              placeholder="Símbolo (ej: AAPL)"
              className="w-full md:w-64 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={loading}
            >
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </div>
        </form>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Información del Símbolo */}
      {stockData && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* Precio y Cambio */}
          <div className="bg-white rounded-xl shadow-md p-4">
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
          </div>

          {/* Métricas Fundamentales */}
          {fundamentalMetrics && (
            <>
              <div className="bg-white rounded-xl shadow-md p-4">
                <h3 className="text-sm font-medium text-gray-500">Métricas Fundamentales</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">P/E Ratio</span>
                    <span className="font-semibold">{formatNumber(fundamentalMetrics.peRatioTTM)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Price/Book</span>
                    <span className="font-semibold">{formatNumber(fundamentalMetrics.pbRatioTTM)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">PEG Ratio</span>
                    <span className="font-semibold">{formatNumber(fundamentalMetrics.pegRatioTTM)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4">
                <h3 className="text-sm font-medium text-gray-500">Rentabilidad</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">ROE</span>
                    <span className="font-semibold">{formatPercentage(fundamentalMetrics.roeTTM)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">ROA</span>
                    <span className="font-semibold">{formatPercentage(fundamentalMetrics.roaTTM)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dividend Yield</span>
                    <span className="font-semibold">{formatPercentage(fundamentalMetrics.dividendYieldTTM)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-md p-4">
                <h3 className="text-sm font-medium text-gray-500">Estructura Financiera</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Debt/Equity</span>
                    <span className="font-semibold">{formatNumber(fundamentalMetrics.debtToEquityTTM)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">FCF Yield</span>
                    <span className="font-semibold">{formatPercentage(fundamentalMetrics.freeCashFlowYieldTTM)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Market Cap</span>
                    <span className="font-semibold">{formatCurrency(fundamentalMetrics.marketCapTTM)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Performance Returns Table */}
      {performanceData && (
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Performance Returns</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-4 font-medium text-gray-700"></th>
                  <th className="text-center py-2 px-4 font-medium text-gray-700">1M</th>
                  <th className="text-center py-2 px-4 font-medium text-gray-700">3M</th>
                  <th className="text-center py-2 px-4 font-medium text-gray-700">YTD</th>
                  <th className="text-center py-2 px-4 font-medium text-gray-700">1Y</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="py-2 px-4 font-medium text-gray-700">Price</td>
                  <td className={`py-2 px-4 text-center font-semibold ${performanceData.price['1M'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPerformancePercentage(performanceData.price['1M'])}
                  </td>
                  <td className={`py-2 px-4 text-center font-semibold ${performanceData.price['3M'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPerformancePercentage(performanceData.price['3M'])}
                  </td>
                  <td className={`py-2 px-4 text-center font-semibold ${performanceData.price['YTD'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPerformancePercentage(performanceData.price['YTD'])}
                  </td>
                  <td className={`py-2 px-4 text-center font-semibold ${performanceData.price['1Y'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPerformancePercentage(performanceData.price['1Y'])}
                  </td>
                </tr>
                <tr>
                  <td className="py-2 px-4 font-medium text-gray-700">Total</td>
                  <td className={`py-2 px-4 text-center font-semibold ${performanceData.total['1M'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPerformancePercentage(performanceData.total['1M'])}
                  </td>
                  <td className={`py-2 px-4 text-center font-semibold ${performanceData.total['3M'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPerformancePercentage(performanceData.total['3M'])}
                  </td>
                  <td className={`py-2 px-4 text-center font-semibold ${performanceData.total['YTD'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPerformancePercentage(performanceData.total['YTD'])}
                  </td>
                  <td className={`py-2 px-4 text-center font-semibold ${performanceData.total['1Y'] >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPerformancePercentage(performanceData.total['1Y'])}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gráfico de Precios (Solo Precio) */}
      {historicalData.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
            Histórico de Precios
          </h3>
          <div className="h-[400px]">
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
                <Tooltip 
                  formatter={(value) => [formatCurrency(value), 'Precio']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
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
        </div>
      )}

      {/* Gráficos de Ratios */}
      {historicalData.length > 0 && (() => {
        const ratios = analyzeAllRatios(historicalData);
        
        return (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Ratio SMA20/SMA50 */}
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
                Ratio SMA20/SMA50
              </h3>
              <div className="h-[300px]">
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
                    <ReferenceLine y={ratios.ratio20_50.buyLevel} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Niv', position: 'right', fill: '#10B981' }} />
                    <ReferenceLine y={ratios.ratio20_50.mean} stroke="#6B7280" strokeDasharray="3 3" label={{ value: 'Me', position: 'right', fill: '#6B7280' }} />
                    <ReferenceLine y={ratios.ratio20_50.sellLevel} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Nivi', position: 'right', fill: '#EF4444' }} />
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
            </div>

            {/* Ratio SMA10/SMA30 */}
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
                Ratio SMA10/SMA30
              </h3>
              <div className="h-[300px]">
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
                    <ReferenceLine y={ratios.ratio10_30.buyLevel} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Niv', position: 'right', fill: '#10B981' }} />
                    <ReferenceLine y={ratios.ratio10_30.mean} stroke="#6B7280" strokeDasharray="3 3" label={{ value: 'Me', position: 'right', fill: '#6B7280' }} />
                    <ReferenceLine y={ratios.ratio10_30.sellLevel} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Nivi', position: 'right', fill: '#EF4444' }} />
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
            </div>

            {/* Ratio SMA50/SMA200 (Golden Cross) */}
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
                Ratio SMA50/SMA200
              </h3>
              <div className="h-[300px]">
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
                    <ReferenceLine y={ratios.ratio50_200.buyLevel} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Niv', position: 'right', fill: '#10B981' }} />
                    <ReferenceLine y={ratios.ratio50_200.mean} stroke="#6B7280" strokeDasharray="3 3" label={{ value: 'Me', position: 'right', fill: '#6B7280' }} />
                    <ReferenceLine y={ratios.ratio50_200.sellLevel} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Nivi', position: 'right', fill: '#EF4444' }} />
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
            </div>
          </div>
        );
      })()}

      {/* Información de Interpretación */}
      {historicalData.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Interpretación de Ratios</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm text-gray-600">
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">SMA20/SMA50</h4>
              <p>• Ratio &lt; Niv: Oportunidad de compra</p>
              <p>• Ratio &gt; Nivi: Oportunidad de venta</p>
              <p>• Mejor para trading medio plazo</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">SMA10/SMA30</h4>
              <p>• Ratio &lt; Niv: Oportunidad de compra</p>
              <p>• Ratio &gt; Nivi: Oportunidad de venta</p>
              <p>• Mejor para trading corto plazo</p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-800 mb-2">SMA50/SMA200</h4>
              <p>• Ratio &lt; Niv: Oportunidad de compra</p>
              <p>• Ratio &gt; Nivi: Oportunidad de venta</p>
              <p>• Mejor para inversión largo plazo</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 