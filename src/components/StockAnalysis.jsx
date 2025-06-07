import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts';

const BASE_URL = 'https://financialmodelingprep.com/api/v3';
const FMP_API_KEY = 'FAExoSELA4CoIVTlixYT42586X9MYpSb';

// Lista de tickers predefinidos con sus nombres
const DEFAULT_TICKERS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' }
];

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
    endDate: new Date().toISOString().split('T')[0] // Fecha actual como fecha final por defecto
  });
  const [selectedTicker, setSelectedTicker] = useState('AAPL');
  const [apiCallCount, setApiCallCount] = useState(0);
  const [lastFetchedData, setLastFetchedData] = useState({});
  const [peRatioData, setPeRatioData] = useState([]);
  const [medianPE, setMedianPE] = useState(null);
  const [currentSymbol, setCurrentSymbol] = useState(null);
  const [cache, setCache] = useState({});

  // Cargar datos iniciales
  useEffect(() => {
    const loadInitialData = async () => {
      if (!lastFetchedData['AAPL']) {
        await fetchStockData('AAPL');
      }
    };
    loadInitialData();
  }, []); // Solo se ejecuta al montar el componente

  // Manejar cambios de ticker
  useEffect(() => {
    const loadTickerData = async () => {
      if (selectedTicker && !lastFetchedData[selectedTicker]) {
        await fetchStockData(selectedTicker);
      } else if (lastFetchedData[selectedTicker]) {
        setStockData(lastFetchedData[selectedTicker].stockData);
        setHistoricalData(lastFetchedData[selectedTicker].historicalData);
        setSmaAnalysis(lastFetchedData[selectedTicker].smaAnalysis);
      }
    };
    loadTickerData();
  }, [selectedTicker]);

  const handleTickerChange = (newTicker) => {
    setSelectedTicker(newTicker);
    if (!lastFetchedData[newTicker]) {
      fetchStockData(newTicker);
    }
  };

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

    // Calcular ratios
    const ratios = calculateRatios(sma20, sma50);

    // Obtener el último ratio válido
    const currentRatio = ratios[ratios.length - 1];

    // Calcular niveles de compra/venta basados en tu ejemplo
    const buyLevel = 0.861608;  // Nivel de compra fijo
    const sellLevel = 1.095478; // Nivel de venta fijo

    // Calcular predicciones de precio
    const lastPrice = data[data.length - 1].close;
    const predictions = [];
    const futureDates = [];
    const today = new Date();
    
    for (let i = 1; i <= 5; i++) {
      const futureDate = new Date(today);
      futureDate.setDate(today.getDate() + i);
      futureDates.push(futureDate.toISOString().split('T')[0]);
      
      // Predicción simple basada en la tendencia actual
      const prediction = lastPrice * (1 + (currentRatio - 1) * i/5);
      predictions.push(prediction);
    }

    return {
      sma20,
      sma50,
      currentRatio,
      buyLevel,
      sellLevel,
      mean: 1.0, // Valor medio de referencia
      ratios,
      predictions,
      futureDates
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

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) return;

    const symbol = searchTerm.toUpperCase();

    // Si los datos están en caché y tienen menos de 24 horas, usarlos
    if (cache[symbol] && (Date.now() - cache[symbol].timestamp) < 24 * 60 * 60 * 1000) {
      const filteredData = filterDataByDateRange(cache[symbol].data);
      setHistoricalData(filteredData);
      setCurrentSymbol(symbol);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setApiCallCount(prev => prev + 1);

      const response = await fetch(
        `${BASE_URL}/historical-price-full/${symbol}?apikey=${FMP_API_KEY}`
      );
      const data = await response.json();

      if (!data.historical) {
        throw new Error('No se encontraron datos para este símbolo');
      }

      // Procesar datos históricos
      const sortedData = data.historical
        .sort((a, b) => new Date(a.date) - new Date(b.date));

      // Calcular SMAs
      const closes = sortedData.map(d => d.close);
      const sma20 = calculateSMA(closes, 20);
      const sma50 = calculateSMA(closes, 50);

      // Combinar datos
      const processedData = sortedData.map((day, i) => ({
        date: day.date,
        close: day.close,
        sma20: sma20[i],
        sma50: sma50[i]
      }));

      // Guardar en caché
      setCache(prev => ({
        ...prev,
        [symbol]: {
          data: processedData,
          timestamp: Date.now()
        }
      }));

      // Filtrar por rango de fechas
      const filteredData = filterDataByDateRange(processedData);
      setHistoricalData(filteredData);
      setCurrentSymbol(symbol);
      setSearchTerm('');
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
        
        {/* Quick Access Tickers */}
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {DEFAULT_TICKERS.map((ticker) => (
            <button
              key={ticker.symbol}
              onClick={() => handleTickerChange(ticker.symbol)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                selectedTicker === ticker.symbol
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <div className="flex items-center gap-2">
                {ticker.symbol}
                {lastFetchedData[ticker.symbol] && (
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                )}
              </div>
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <div className="flex gap-2">
            <input
              type="date"
              name="startDate"
              value={dateRange.startDate}
              onChange={handleDateChange}
              className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <input
              type="date"
              name="endDate"
              value={dateRange.endDate}
              onChange={handleDateChange}
              className="w-full md:w-auto px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value.toUpperCase())}
              placeholder="Ingrese símbolo (ej: AAPL)"
              className="w-full md:w-64 px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
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

      {/* Current Ticker Info */}
      {selectedTicker && lastFetchedData[selectedTicker] && (
        <div className="bg-white p-4 rounded-xl shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                {DEFAULT_TICKERS.find(t => t.symbol === selectedTicker)?.name || selectedTicker}
              </h3>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm font-medium">
                {selectedTicker}
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Última actualización: {
                new Date(lastFetchedData[selectedTicker].timestamp).toLocaleTimeString()
              }
            </div>
          </div>
        </div>
      )}

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
                {formatCurrency(stockData.change)} ({formatCurrency(stockData.changesPercentage)})
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

      {/* SMA Analysis Section */}
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

      {/* Chart Legend */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <h3 className="text-base font-semibold mb-3">Leyenda del Gráfico</h3>
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500"></div>
            <span className="text-sm text-gray-600">Precio Real</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-green-500"></div>
            <span className="text-sm text-gray-600">Media Móvil 20 días (SMA20)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-red-500"></div>
            <span className="text-sm text-gray-600">Media Móvil 50 días (SMA50)</span>
          </div>
        </div>
        <div className="mt-2 text-sm text-gray-500">
          <p>• Señal de compra: Cuando SMA20 cruza por encima de SMA50</p>
          <p>• Señal de venta: Cuando SMA20 cruza por debajo de SMA50</p>
        </div>
      </div>

      {/* Price Chart */}
      {historicalData.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
            Histórico de Precios con Medias Móviles
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
                  tickFormatter={(value) => `$${value.toFixed(2)}`}
                />
                <Tooltip 
                  formatter={(value, name) => [
                    `$${Number(value).toFixed(2)}`, 
                    name === 'close' ? 'Precio' : 
                    name === 'sma20' ? 'Media Móvil 20 días' : 
                    name === 'sma50' ? 'Media Móvil 50 días' : name
                  ]}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <Legend verticalAlign="top" height={36} />
                <Line 
                  type="monotone" 
                  dataKey="close" 
                  stroke="#3B82F6" 
                  strokeWidth={2}
                  dot={false}
                  name="Precio"
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="sma20" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={false}
                  name="Media Móvil 20 días"
                  isAnimationActive={false}
                />
                <Line 
                  type="monotone" 
                  dataKey="sma50" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={false}
                  name="Media Móvil 50 días"
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* P/E Ratio Chart */}
      {peRatioData.length > 0 && (
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
            Histórico de P/E Ratio
            {medianPE && <span className="text-sm text-gray-500 ml-2">Mediana: {medianPE.toFixed(2)}</span>}
          </h3>
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
                  formatter={(value) => [`${Number(value).toFixed(2)}`, 'P/E Ratio']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString()}
                />
                <ReferenceLine 
                  y={medianPE} 
                  stroke="#9CA3AF" 
                  strokeDasharray="3 3"
                  label={{ 
                    value: `Mediana: ${medianPE?.toFixed(2)}`,
                    position: 'right',
                    fill: '#4B5563'
                  }}
                />
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
        </div>
      )}
    </div>
  );
} 