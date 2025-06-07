import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts';

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
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [apiCallCount, setApiCallCount] = useState(0);
  const [currentSymbol, setCurrentSymbol] = useState(null);
  const [cache, setCache] = useState({});
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: new Date().toISOString().split('T')[0] // Fecha actual como fecha final por defecto
  });
  const [analysisResults, setAnalysisResults] = useState(null);
  const [peRatioData, setPeRatioData] = useState([]);
  const [medianPE, setMedianPE] = useState(null);
  const [showPERatio, setShowPERatio] = useState(false);
  const [loadingPE, setLoadingPE] = useState(false);
  const [ratiosChart, setRatiosChart] = useState(null);
  const [stockInfo, setStockInfo] = useState(null);

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
        const w = (period - j) / period;
        sum += data[i - j] * w;
        weight += w;
      }
      sma.push(sum / weight);
    }
    return sma;
  };

  const analyzeSignals = (data, sma20, sma50) => {
    let signals = [];
    let lastSignal = null;
    
    for (let i = 1; i < data.length; i++) {
      if (sma20[i] === null || sma50[i] === null) continue;
      
      const crossover = sma20[i] > sma50[i] && sma20[i-1] <= sma50[i-1];
      const crossunder = sma20[i] < sma50[i] && sma20[i-1] >= sma50[i-1];
      
      if (crossover && lastSignal !== 'buy') {
        signals.push({
          date: data[i].date,
          type: 'buy',
          price: data[i].close,
          description: 'SMA20 cruza por encima de SMA50'
        });
        lastSignal = 'buy';
      } else if (crossunder && lastSignal !== 'sell') {
        signals.push({
          date: data[i].date,
          type: 'sell',
          price: data[i].close,
          description: 'SMA20 cruza por debajo de SMA50'
        });
        lastSignal = 'sell';
      }
    }

    // Calcular métricas adicionales
    const currentPrice = data[data.length - 1].close;
    const currentSMA20 = sma20[sma20.length - 1];
    const currentSMA50 = sma50[sma50.length - 1];
    const trend = currentSMA20 > currentSMA50 ? 'alcista' : 'bajista';
    
    // Calcular rendimiento
    const startPrice = data[0].close;
    const performance = ((currentPrice - startPrice) / startPrice) * 100;
    
    // Calcular volatilidad (desviación estándar de los retornos diarios)
    const returns = data.slice(1).map((day, i) => 
      (day.close - data[i].close) / data[i].close
    );
    const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volatility = Math.sqrt(
      returns.reduce((a, b) => a + Math.pow(b - avgReturn, 2), 0) / returns.length
    ) * Math.sqrt(252) * 100; // Anualizada

    return {
      signals,
      lastSignal,
      trend,
      performance: performance.toFixed(2),
      volatility: volatility.toFixed(2),
      currentPrice,
      currentSMA20,
      currentSMA50,
      priceVsSMA20: ((currentPrice - currentSMA20) / currentSMA20 * 100).toFixed(2),
      priceVsSMA50: ((currentPrice - currentSMA50) / currentSMA50 * 100).toFixed(2)
    };
  };

  const filterDataByDateRange = (data) => {
    if (!dateRange.startDate && !dateRange.endDate) return data;

    return data.filter(item => {
      const itemDate = new Date(item.date);
      const start = dateRange.startDate ? new Date(dateRange.startDate) : new Date(0);
      const end = dateRange.endDate ? new Date(dateRange.endDate) : new Date();
      return itemDate >= start && itemDate <= end;
    });
  };

  const loadPERatioData = async (symbol) => {
    if (!symbol) return;
    
    try {
      setLoadingPE(true);
      setError(null);
      setApiCallCount(prev => prev + 1);

      const response = await fetch(
        `${BASE_URL}/ratios/${symbol}?period=quarter&limit=40&apikey=${FMP_API_KEY}`
      );
      const data = await response.json();

      // Verificar si la respuesta es un array y tiene datos
      if (!Array.isArray(data) || data.length === 0) {
        setPeRatioData([]);
        setMedianPE(null);
        throw new Error('No se encontraron datos de P/E ratio para este símbolo');
      }

      // Filtrar y procesar solo los datos válidos
      const processedData = data
        .filter(item => item && typeof item.peRatio === 'number' && item.peRatio > 0)
        .map(item => ({
          date: item.date,
          peRatio: Number(item.peRatio)
        }))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      if (processedData.length === 0) {
        setPeRatioData([]);
        setMedianPE(null);
        throw new Error('No hay datos válidos de P/E ratio para este símbolo');
      }

      // Calcular la mediana con los datos válidos
      const peValues = processedData.map(d => d.peRatio).sort((a, b) => a - b);
      const mid = Math.floor(peValues.length / 2);
      const median = peValues.length % 2 === 0
        ? (peValues[mid - 1] + peValues[mid]) / 2
        : peValues[mid];

      setPeRatioData(processedData);
      setMedianPE(median);
    } catch (err) {
      console.error("Error al cargar datos de P/E:", err);
      setError(err.message || "Error al obtener datos de P/E ratio");
      setPeRatioData([]);
      setMedianPE(null);
    } finally {
      setLoadingPE(false);
    }
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

  const prepareRatiosChartData = (data, sma20, sma50) => {
    const ratios = calculateRatios(sma20, sma50);
    const chartData = data.map((day, i) => ({
      date: day.date,
      ratio: ratios[i]
    }));

    // Calcular niveles de compra/venta basados en percentiles históricos
    const validRatios = ratios.filter(r => r !== null);
    const sortedRatios = [...validRatios].sort((a, b) => a - b);
    const buyLevel = sortedRatios[Math.floor(sortedRatios.length * 0.2)]; // Percentil 20
    const sellLevel = sortedRatios[Math.floor(sortedRatios.length * 0.8)]; // Percentil 80

    return {
      data: chartData,
      buyLevel,
      sellLevel,
      mean: 1.0
    };
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const symbol = searchTerm.toUpperCase();

    try {
      setLoading(true);
      setError(null);
      setApiCallCount(prev => prev + 1);

      // Obtener datos históricos
      const historyResponse = await fetch(
        `${BASE_URL}/historical-price-full/${symbol}?apikey=${FMP_API_KEY}`
      );
      const historyData = await historyResponse.json();

      if (!historyData.historical) {
        throw new Error('No se encontraron datos para este símbolo');
      }

      // Obtener información de la compañía
      const quoteResponse = await fetch(
        `${BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`
      );
      const quoteData = await quoteResponse.json();

      if (!quoteData || quoteData.length === 0) {
        throw new Error('No se encontró información actual de la compañía');
      }

      setStockInfo(quoteData[0]);

      // Procesar datos históricos
      const sortedData = historyData.historical
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calcular SMAs
      const closes = sortedData.map(d => d.close);
      const sma20 = calculateSMA(closes, 20);
      const sma50 = calculateSMA(closes, 50);

      // Preparar datos para el gráfico de ratios
      const ratiosChartData = prepareRatiosChartData(sortedData, sma20, sma50);
      setRatiosChart(ratiosChartData);

      // Combinar datos
      const combinedData = sortedData.map((day, i) => ({
        date: day.date,
        close: day.close,
        volume: day.volume
      }));

      setHistoricalData(combinedData);
      setCurrentSymbol(symbol);
      setSearchTerm('');

      // Limpiar datos de P/E ratio al cambiar de símbolo
      setPeRatioData([]);
      setMedianPE(null);
      setShowPERatio(false);
    } catch (err) {
      console.error("Error:", err);
      setError(err.message || "Error al obtener datos");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
    
    // Si hay un símbolo actual, actualizar los datos filtrados
    if (currentSymbol && cache[currentSymbol]) {
      const filteredData = filterDataByDateRange(cache[currentSymbol].data);
      setHistoricalData(filteredData);
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
    if (num >= 1e12) return (num / 1e12).toFixed(2) + 'T';
    if (num >= 1e9) return (num / 1e9).toFixed(2) + 'B';
    if (num >= 1e6) return (num / 1e6).toFixed(2) + 'M';
    if (num >= 1e3) return (num / 1e3).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 bg-gray-50">
      {/* API Usage Warning */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Versión gratuita de la API - Límite de llamados diarios.
              Llamados realizados: {apiCallCount}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          Análisis de Acciones {currentSymbol && `- ${currentSymbol}`}
        </h2>

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <div className="flex gap-2">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <div className="space-y-2 flex-1">
              <label className="block text-sm font-medium text-gray-700">Símbolo</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
                placeholder="Ej: AAPL"
                className="w-full md:w-40 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
              disabled={loading || !searchTerm.trim()}
            >
              {loading ? 'Cargando...' : 'Buscar'}
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

      {/* Stock Info Cards */}
      {stockInfo && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500">Precio Actual</h3>
            <div className="mt-1 flex items-baseline">
              <p className="text-2xl font-semibold text-gray-900">${stockInfo.price.toFixed(2)}</p>
              <p className={`ml-2 flex items-baseline text-sm font-semibold ${
                stockInfo.change >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                <span>{stockInfo.change >= 0 ? '↑' : '↓'}</span>
                <span className="ml-1">{Math.abs(stockInfo.change).toFixed(2)}</span>
                <span className="ml-1">({Math.abs(stockInfo.changesPercentage).toFixed(2)}%)</span>
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500">Market Cap</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              ${formatLargeNumber(stockInfo.marketCap)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500">Volumen</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatLargeNumber(stockInfo.volume)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500">Rango 52 Semanas</h3>
            <div className="mt-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Min: ${stockInfo.yearLow.toFixed(2)}</span>
                <span>Max: ${stockInfo.yearHigh.toFixed(2)}</span>
              </div>
              <div className="mt-2 relative">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="absolute h-2 bg-blue-500 rounded-full"
                    style={{
                      width: `${((stockInfo.price - stockInfo.yearLow) / (stockInfo.yearHigh - stockInfo.yearLow)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500">Apertura</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              ${stockInfo.open.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500">Cierre Anterior</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              ${stockInfo.previousClose.toFixed(2)}
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500">Rango del Día</h3>
            <div className="mt-1">
              <div className="flex justify-between text-sm text-gray-500">
                <span>Min: ${stockInfo.dayLow.toFixed(2)}</span>
                <span>Max: ${stockInfo.dayHigh.toFixed(2)}</span>
              </div>
              <div className="mt-2 relative">
                <div className="h-2 bg-gray-200 rounded-full">
                  <div 
                    className="absolute h-2 bg-green-500 rounded-full"
                    style={{
                      width: `${((stockInfo.price - stockInfo.dayLow) / (stockInfo.dayHigh - stockInfo.dayLow)) * 100}%`
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-4">
            <h3 className="text-sm font-medium text-gray-500">Promedio Vol. (3m)</h3>
            <p className="mt-1 text-2xl font-semibold text-gray-900">
              {formatLargeNumber(stockInfo.avgVolume)}
            </p>
          </div>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResults && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Precio y Tendencia</h3>
            <div className="space-y-2">
              <p className="text-3xl font-bold">{formatCurrency(analysisResults.currentPrice)}</p>
              <p className={`text-lg ${analysisResults.trend === 'alcista' ? 'text-green-600' : 'text-red-600'}`}>
                Tendencia {analysisResults.trend}
              </p>
              <p className="text-sm text-gray-600">
                vs SMA20: {analysisResults.priceVsSMA20}%
              </p>
              <p className="text-sm text-gray-600">
                vs SMA50: {analysisResults.priceVsSMA50}%
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Rendimiento</h3>
            <div className="space-y-2">
              <p className={`text-3xl font-bold ${Number(analysisResults.performance) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {analysisResults.performance}%
              </p>
              <p className="text-sm text-gray-600">
                Volatilidad: {analysisResults.volatility}%
              </p>
              <p className="text-sm text-gray-600">
                Última señal: {
                  analysisResults.lastSignal === 'buy' ? 
                  'Compra' : 
                  analysisResults.lastSignal === 'sell' ? 
                  'Venta' : 
                  'Neutral'
                }
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">Señales Recientes</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {analysisResults.signals.slice(-3).reverse().map((signal, index) => (
                <div 
                  key={index}
                  className={`p-2 rounded ${
                    signal.type === 'buy' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}
                >
                  <p className="font-medium">
                    Señal de {signal.type === 'buy' ? 'Compra' : 'Venta'}
                  </p>
                  <p className="text-sm">
                    {new Date(signal.date).toLocaleDateString()} - {formatCurrency(signal.price)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Price Chart */}
      {historicalData.length > 0 && (
        <>
          <div className="bg-white p-4 rounded-xl shadow-md">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
              Histórico de Precios - {currentSymbol}
            </h3>
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={historicalData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                    formatter={(value) => [`$${value.toFixed(2)}`, 'Precio']}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="close" 
                    stroke="#2563EB" 
                    strokeWidth={2}
                    dot={false}
                    name="Precio"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Ratios Chart */}
          {ratiosChart && (
            <div className="bg-white p-4 rounded-xl shadow-md mt-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
                Ratio SMA20/SMA50
              </h3>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={ratiosChart.data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                      formatter={(value) => [value.toFixed(4), 'Ratio']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    <ReferenceLine y={ratiosChart.buyLevel} stroke="#10B981" strokeDasharray="3 3" label={{ value: 'Nivel de Compra', position: 'right', fill: '#10B981' }} />
                    <ReferenceLine y={ratiosChart.sellLevel} stroke="#EF4444" strokeDasharray="3 3" label={{ value: 'Nivel de Venta', position: 'right', fill: '#EF4444' }} />
                    <ReferenceLine y={ratiosChart.mean} stroke="#6B7280" strokeDasharray="3 3" label={{ value: 'Media', position: 'right', fill: '#6B7280' }} />
                    <Line 
                      type="monotone" 
                      dataKey="ratio" 
                      stroke="#6366F1" 
                      strokeWidth={2}
                      dot={false}
                      isAnimationActive={false}
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

          {/* P/E Ratio Section */}
          <div className="bg-white p-4 rounded-xl shadow-md mt-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base md:text-lg font-semibold text-gray-800">
                P/E Ratio Histórico
              </h3>
              <button
                onClick={() => {
                  if (!showPERatio) {
                    loadPERatioData(currentSymbol);
                  }
                  setShowPERatio(!showPERatio);
                }}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
                disabled={loading || loadingPE}
              >
                {loadingPE ? 'Cargando...' : showPERatio ? 'Ocultar P/E' : 'Mostrar P/E'}
              </button>
            </div>

            {showPERatio && peRatioData.length > 0 && (
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={peRatioData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
                      formatter={(value) => [`${value.toFixed(2)}`, 'P/E Ratio']}
                      labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    />
                    {medianPE && (
                      <ReferenceLine 
                        y={medianPE} 
                        stroke="#9CA3AF" 
                        strokeDasharray="3 3"
                        label={{ 
                          value: `Mediana: ${medianPE.toFixed(2)}`,
                          position: 'right',
                          fill: '#4B5563'
                        }}
                      />
                    )}
                    <Line 
                      type="monotone" 
                      dataKey="peRatio" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={false}
                      name="P/E Ratio"
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {showPERatio && peRatioData.length === 0 && !loadingPE && (
              <div className="text-center py-8 text-gray-500">
                No hay datos de P/E ratio disponibles para este símbolo
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 