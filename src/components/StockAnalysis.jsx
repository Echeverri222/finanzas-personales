import React, { useState, useEffect } from 'react';
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

  const calculateSMA = (data, period) => {
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
        continue;
      }
      
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, val) => acc + val.close, 0);
      sma.push(sum / period);
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
    // Calcular SMAs para diferentes períodos
    const sma20 = calculateSMA(data, 20);
    const sma50 = calculateSMA(data, 50);
    const sma200 = calculateSMA(data, 200);

    // Calcular ratios
    const ratio20_50 = calculateRatios(sma20, sma50);
    const ratio50_200 = calculateRatios(sma50, sma200);

    // Obtener el último ratio válido
    const currentRatio = ratio20_50[ratio20_50.length - 1];

    // Calcular media y desviación estándar de los ratios
    const validRatios = ratio20_50.filter(r => r !== null);
    const mean = validRatios.reduce((a, b) => a + b, 0) / validRatios.length;
    const stdDev = Math.sqrt(
      validRatios.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / validRatios.length
    );

    // Definir niveles de compra/venta
    const buyLevel = mean - stdDev;
    const sellLevel = mean + stdDev;

    return {
      sma20,
      sma50,
      sma200,
      currentRatio,
      buyLevel,
      sellLevel,
      mean,
      ratios: ratio20_50
    };
  };

  const fetchStockData = async (symbol) => {
    try {
      setLoading(true);
      setError(null);
      
      // Get real-time quote
      const quoteUrl = `${BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`;
      const quoteResponse = await fetch(quoteUrl);
      const quoteData = await quoteResponse.json();

      if (!quoteData || quoteData.length === 0) {
        throw new Error('Símbolo no encontrado');
      }

      // Get historical data - aumentamos el período para tener suficientes datos para el análisis
      const today = new Date();
      const yearAgo = new Date();
      yearAgo.setFullYear(today.getFullYear() - 1);

      const historicalUrl = `${BASE_URL}/historical-price-full/${symbol}?from=${yearAgo.toISOString().split('T')[0]}&to=${today.toISOString().split('T')[0]}&apikey=${FMP_API_KEY}`;
      const historicalResponse = await fetch(historicalUrl);
      const historicalData = await historicalResponse.json();

      setStockData(quoteData[0]);
      const sortedHistoricalData = (historicalData.historical || [])
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setHistoricalData(sortedHistoricalData);

      // Realizar análisis SMA
      const analysis = analyzeSMA(sortedHistoricalData);
      setSmaAnalysis(analysis);
    } catch (err) {
      console.error('Error fetching stock data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      fetchStockData(searchTerm.trim().toUpperCase());
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const formatPercentage = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value / 100);
  };

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Análisis de Acciones</h2>
        
        <form onSubmit={handleSearch} className="flex gap-2 w-full md:w-auto">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Símbolo (ej: AAPL, MSFT)"
            className="flex-1 md:w-64 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            disabled={loading}
          >
            {loading ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {stockData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">{stockData.name}</h3>
            <div className="space-y-2">
              <p className="text-3xl font-bold">{formatCurrency(stockData.price)}</p>
              <p className={`text-lg ${stockData.changesPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(stockData.change)} ({formatPercentage(stockData.changesPercentage)})
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Detalles</h3>
            <div className="space-y-2">
              <p>Apertura: {formatCurrency(stockData.open)}</p>
              <p>Máximo: {formatCurrency(stockData.dayHigh)}</p>
              <p>Mínimo: {formatCurrency(stockData.dayLow)}</p>
              <p>Volumen: {stockData.volume.toLocaleString()}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Métricas</h3>
            <div className="space-y-2">
              <p>P/E Ratio: {stockData.pe?.toFixed(2) || 'N/A'}</p>
              <p>Market Cap: {formatCurrency(stockData.marketCap)}</p>
              <p>52W Alto: {formatCurrency(stockData.yearHigh)}</p>
              <p>52W Bajo: {formatCurrency(stockData.yearLow)}</p>
            </div>
          </div>
        </div>
      )}

      {/* New SMA Analysis Section */}
      {smaAnalysis && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4">Análisis de Medias Móviles</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <p className="font-medium">Ratio Actual (SMA20/SMA50)</p>
              <p className={`text-xl font-bold ${
                smaAnalysis.currentRatio > smaAnalysis.sellLevel ? 'text-red-600' :
                smaAnalysis.currentRatio < smaAnalysis.buyLevel ? 'text-green-600' :
                'text-gray-600'
              }`}>
                {smaAnalysis.currentRatio?.toFixed(6)}
              </p>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Nivel de Compra</p>
              <p className="text-xl font-bold text-green-600">{smaAnalysis.buyLevel?.toFixed(6)}</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium">Nivel de Venta</p>
              <p className="text-xl font-bold text-red-600">{smaAnalysis.sellLevel?.toFixed(6)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Modified Price Chart with SMAs */}
      {historicalData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4">Histórico de Precios con Medias Móviles</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historicalData.map((point, index) => ({
                  ...point,
                  sma20: smaAnalysis?.sma20[index],
                  sma50: smaAnalysis?.sma50[index],
                  sma200: smaAnalysis?.sma200[index]
                }))}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tick={{ fill: '#4B5563' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString('es-CO', { 
                      month: '2-digit',
                      day: '2-digit'
                    });
                  }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#4B5563' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickFormatter={(value) => formatCurrency(value)}
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Precio']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('es-CO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
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
                <Line
                  type="monotone"
                  dataKey="sma200"
                  stroke="#EF4444"
                  strokeWidth={1}
                  dot={false}
                  name="SMA200"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Ratio Chart */}
      {smaAnalysis && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4">Evolución del Ratio SMA20/SMA50</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historicalData.map((point, index) => ({
                  date: point.date,
                  ratio: smaAnalysis.ratios[index]
                }))}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date"
                  tick={{ fill: '#4B5563' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fill: '#4B5563' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="ratio"
                  stroke="#6366F1"
                  strokeWidth={2}
                  dot={false}
                  name="Ratio"
                />
                {/* Líneas de referencia para niveles de compra/venta */}
                <CartesianGrid strokeDasharray="3 3" />
                <ReferenceLine y={smaAnalysis.buyLevel} stroke="#10B981" strokeDasharray="3 3" />
                <ReferenceLine y={smaAnalysis.sellLevel} stroke="#EF4444" strokeDasharray="3 3" />
                <ReferenceLine y={smaAnalysis.mean} stroke="#6B7280" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
} 