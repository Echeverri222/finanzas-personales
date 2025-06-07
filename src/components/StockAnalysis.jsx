import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

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
    </div>
  );
} 