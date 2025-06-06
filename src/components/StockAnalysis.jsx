import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const FMP_API_KEY = process.env.REACT_APP_FMP_API_KEY;
if (!FMP_API_KEY) {
  console.error('FMP API key not found in environment variables. Make sure to create a .env.local file with REACT_APP_FMP_API_KEY');
}

const BASE_URL = 'https://financialmodelingprep.com/api/v3';

export default function StockAnalysis() {
  const [searchTerm, setSearchTerm] = useState('');
  const [stockData, setStockData] = useState(null);
  const [historicalData, setHistoricalData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchStockData = async (symbol) => {
    try {
      setLoading(true);
      setError(null);

      // Get real-time quote
      const quoteResponse = await fetch(
        `${BASE_URL}/quote/${symbol}?apikey=${FMP_API_KEY}`
      );
      const quoteData = await quoteResponse.json();

      if (!quoteData || quoteData.length === 0) {
        throw new Error('Símbolo no encontrado');
      }

      // Get historical data for the last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      const historicalResponse = await fetch(
        `${BASE_URL}/historical-price-full/${symbol}?from=${thirtyDaysAgo.toISOString().split('T')[0]}&to=${today.toISOString().split('T')[0]}&apikey=${FMP_API_KEY}`
      );
      const historicalData = await historicalResponse.json();

      setStockData(quoteData[0]);
      // Sort historical data by date in ascending order
      const sortedHistoricalData = (historicalData.historical || [])
        .sort((a, b) => new Date(a.date) - new Date(b.date));
      setHistoricalData(sortedHistoricalData);
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

      {historicalData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold mb-4">Histórico de Precios (30 días)</h3>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={historicalData}
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
                  activeDot={{ r: 8 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
} 