import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

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

export default function StockAnalysis() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockData, setStockData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [smaAnalysis, setSmaAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: new Date().toISOString().split('T')[0]
  });

  // Función para calcular SMA con ponderación
  const calculateSMA = (data, period) => {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
        continue;
      }
      
      let sum = 0;
      let weight = 0;
      for (let j = 0; j < period; j++) {
        // Dar más peso a los precios más recientes
        const w = (period - j) / period;
        sum += data[i - j].close * w;
        weight += w;
      }
      sma.push(sum / weight);
    }
    return sma;
  };

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

  const analyzeSMA = (data) => {
    const sma20 = calculateSMA(data, 20);
    const sma50 = calculateSMA(data, 50);
    const ratios = calculateRatios(sma20, sma50);
    const currentRatio = ratios[ratios.length - 1];

    // Calcular niveles basados en percentiles históricos
    const validRatios = ratios.filter(r => r !== null);
    const sortedRatios = [...validRatios].sort((a, b) => a - b);
    const buyLevel = sortedRatios[Math.floor(sortedRatios.length * 0.2)]; // Percentil 20
    const sellLevel = sortedRatios[Math.floor(sortedRatios.length * 0.8)]; // Percentil 80

    return {
      sma20,
      sma50,
      currentRatio,
      buyLevel,
      sellLevel,
      mean: 1.0,
      ratios
    };
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm) return;

    try {
      setLoading(true);
      setError(null);
      
      // Obtener datos en tiempo real
      const quoteResponse = await fetch(
        `${BASE_URL}/quote/${searchTerm}?apikey=${FMP_API_KEY}`
      );
      const quoteData = await quoteResponse.json();

      if (!quoteData || quoteData.length === 0) {
        throw new Error('Símbolo no encontrado');
      }

      setStockData(quoteData[0]);

      // Obtener datos históricos
      const historicalResponse = await fetch(
        `${BASE_URL}/historical-price-full/${searchTerm}?apikey=${FMP_API_KEY}`
      );
      const historicalData = await historicalResponse.json();

      if (!historicalData.historical) {
        throw new Error('No se encontraron datos históricos');
      }

      // Procesar y filtrar datos históricos
      let processedData = historicalData.historical
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (dateRange.startDate && dateRange.endDate) {
        processedData = processedData.filter(data => {
          const date = new Date(data.date);
          return date >= new Date(dateRange.startDate) && date <= new Date(dateRange.endDate);
        });
      }

      setHistoricalData(processedData);

      // Realizar análisis técnico
      const analysis = analyzeSMA(processedData);
      setSmaAnalysis(analysis);

    } catch (err) {
      console.error('Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    if (!value) return '-';
    return new Intl.NumberFormat('es-CO', {
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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

          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500">Volumen</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatLargeNumber(stockData.volume)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500">Market Cap</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              ${formatLargeNumber(stockData.marketCap)}
            </p>
          </div>

          {smaAnalysis && (
            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="text-sm font-medium text-gray-500">Ratio SMA20/SMA50</h3>
              <p className={`mt-1 text-2xl font-semibold ${
                smaAnalysis.currentRatio > smaAnalysis.sellLevel ? 'text-red-600' :
                smaAnalysis.currentRatio < smaAnalysis.buyLevel ? 'text-green-600' :
                'text-gray-900'
              }`}>
                {smaAnalysis.currentRatio?.toFixed(4)}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Gráfico de Precios */}
      {historicalData.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
            Histórico de Precios con Medias Móviles
          </h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historicalData.map((point, index) => ({
                  date: point.date,
                  close: point.close,
                  sma20: smaAnalysis?.sma20[index],
                  sma50: smaAnalysis?.sma50[index]
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
                <Tooltip 
                  formatter={(value, name) => [
                    formatCurrency(value),
                    name === 'close' ? 'Precio' :
                    name === 'sma20' ? 'Media Móvil 20' :
                    'Media Móvil 50'
                  ]}
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
                <Line 
                  type="monotone" 
                  dataKey="sma20" 
                  stroke="#10B981" 
                  strokeWidth={1}
                  dot={false}
                  name="SMA20"
                />
                <Line 
                  type="monotone" 
                  dataKey="sma50" 
                  stroke="#F59E0B" 
                  strokeWidth={1}
                  dot={false}
                  name="SMA50"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Gráfico de Ratios */}
      {smaAnalysis && (
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
            Ratio SMA20/SMA50
          </h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historicalData.map((point, index) => ({
                  date: point.date,
                  ratio: smaAnalysis.ratios[index]
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
                <Tooltip 
                  formatter={(value) => [value?.toFixed(4), 'Ratio']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <ReferenceLine y={smaAnalysis.buyLevel} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Nivel de Compra', position: 'right', fill: '#10B981' }} />
                <ReferenceLine y={smaAnalysis.sellLevel} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Nivel de Venta', position: 'right', fill: '#EF4444' }} />
                <ReferenceLine y={smaAnalysis.mean} stroke="#6B7280" strokeDasharray="3 3" label={{ value: 'Media', position: 'right', fill: '#6B7280' }} />
                <Line 
                  type="monotone" 
                  dataKey="ratio" 
                  stroke="#6366F1" 
                  strokeWidth={2}
                  dot={false}
                  name="Ratio"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 text-sm text-gray-600">
            <p>• Cuando el ratio está por debajo del nivel de compra, puede indicar una oportunidad de compra</p>
            <p>• Cuando el ratio está por encima del nivel de venta, puede indicar una oportunidad de venta</p>
          </div>
        </div>
      )}
    </div>
  );
} 