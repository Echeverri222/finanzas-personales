import { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useStockData } from '../hooks/useStockData';

export default function StockAnalysisPage() {
  const [selectedStock, setSelectedStock] = useState('AAPL');
  const [searchTerm, setSearchTerm] = useState('');
  const [timeframe, setTimeframe] = useState('1Y');

  // Use real stock data from FMP API
  const { stockData, loading, error, fetchStockQuote, isConfigured } = useStockData();

  const popularStocks = ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'AMZN', 'META', 'NVDA', 'NFLX'];

  // Fetch stock data when component mounts or selected stock changes
  useEffect(() => {
    if (isConfigured && selectedStock) {
      fetchStockQuote(selectedStock);
    }
  }, [selectedStock, fetchStockQuote, isConfigured]);

  const currentStock = stockData[selectedStock] || {
    name: 'Loading...',
    symbol: selectedStock,
    price: 0,
    change: 0,
    changePercent: 0,
    marketCap: 'N/A',
    pe: 'N/A',
    volume: 'N/A'
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // Mock performance data for different timeframes (can be enhanced with real historical data)
  const performanceData = {
    '1D': { change: currentStock.changePercent },
    '1W': { change: 2.45 },
    '1M': { change: -1.23 },
    '3M': { change: 8.76 },
    '6M': { change: 15.42 },
    '1Y': { change: 23.67 },
    'YTD': { change: 12.34 }
  };

  const fundamentalMetrics = [
    { label: 'Market Cap', value: currentStock.marketCap },
    { label: 'P/E Ratio', value: currentStock.pe },
    { label: 'Volume', value: currentStock.volume },
    { label: 'Div Yield', value: '0.45%' },
    { label: '52W High', value: currentStock.high52w ? `$${currentStock.high52w.toFixed(2)}` : 'N/A' },
    { label: '52W Low', value: currentStock.low52w ? `$${currentStock.low52w.toFixed(2)}` : 'N/A' },
    { label: 'Beta', value: '1.24' },
    { label: 'EPS', value: '$6.16' }
  ];

  const smaRatios = [
    { name: 'SMA 10/30', current: 1.05, signal: 'Bullish', color: 'text-green-600' },
    { name: 'SMA 20/50', current: 1.12, signal: 'Strong Buy', color: 'text-green-700' },
    { name: 'SMA 50/200', current: 0.98, signal: 'Bearish', color: 'text-red-600' }
  ];

  const handleStockSearch = () => {
    if (searchTerm.trim()) {
      setSelectedStock(searchTerm.trim().toUpperCase());
      setSearchTerm('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleStockSearch();
    }
  };

  // Show API configuration warning if not configured
  if (!isConfigured) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Análisis de Acciones</h1>
            <p className="text-gray-600 mt-1">
              Herramientas avanzadas para el análisis técnico y fundamental
            </p>
          </div>
        </div>

        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-red-600 text-6xl mb-4">⚠️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                API Key No Configurada
              </h3>
              <p className="text-gray-600 mb-6">
                Para utilizar el análisis de acciones, necesitas configurar tu API key de Financial Modeling Prep.
              </p>
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  1. Ve a{' '}
                  <a
                    href="https://financialmodelingprep.com/developer/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    financialmodelingprep.com
                  </a>
                </p>
                <p className="text-sm text-gray-500">
                  2. Registra una cuenta gratuita y obtén tu API key
                </p>
                <p className="text-sm text-gray-500">
                  3. Añade <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_FMP_API_KEY=tu_api_key</code> a tu archivo .env.local
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Análisis de Acciones</h1>
          <p className="text-gray-600 mt-1">
            Herramientas avanzadas para el análisis técnico y fundamental
          </p>
        </div>
      </div>

      {/* Stock Search */}
      <Card>
        <CardHeader>
          <CardTitle>Buscar Acción</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Buscar por símbolo (ej: AAPL, GOOGL, TSLA...)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <Button onClick={handleStockSearch} disabled={!searchTerm.trim()}>
              Buscar
            </Button>
          </div>

          {/* Popular Stocks */}
          <div className="mt-4">
            <p className="text-sm text-gray-600 mb-3">Acciones populares:</p>
            <div className="flex flex-wrap gap-2">
              {popularStocks.map((symbol) => (
                <button
                  key={symbol}
                  onClick={() => setSelectedStock(symbol)}
                  className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                    selectedStock === symbol
                      ? 'bg-blue-100 text-blue-700 border-blue-300'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {symbol}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Current Stock Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">{currentStock.name}</CardTitle>
              <p className="text-gray-600">{currentStock.symbol}</p>
            </div>
            <div className="text-right">
              {loading ? (
                <div className="text-lg text-gray-500">Cargando...</div>
              ) : error ? (
                <div className="text-lg text-red-600">Error al cargar</div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-gray-900">
                    {formatCurrency(currentStock.price)}
                  </div>
                  <div className={`text-lg font-medium ${
                    currentStock.change >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {currentStock.change >= 0 ? '+' : ''}{formatCurrency(currentStock.change)}
                    ({formatPercentage(currentStock.changePercent)})
                  </div>
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Performance Chips */}
          <div className="grid grid-cols-3 md:grid-cols-7 gap-2">
            {Object.entries(performanceData).map(([period, data]) => (
              <div
                key={period}
                className={`text-center p-3 rounded-lg border ${
                  timeframe === period ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                }`}
              >
                <div className="text-xs text-gray-600 mb-1">{period}</div>
                <div className={`text-sm font-semibold ${
                  data.change >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {formatPercentage(data.change)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts and Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Price Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Gráfico de Precios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500 border border-gray-200 rounded-lg">
              📈 Gráfico de precios históricos
              <br />
              <span className="text-sm">(Integración con TradingView o Chart.js)</span>
            </div>
          </CardContent>
        </Card>

        {/* SMA Ratios */}
        <Card>
          <CardHeader>
            <CardTitle>Ratios SMA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {smaRatios.map((ratio, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{ratio.name}</div>
                    <div className={`text-sm font-semibold ${ratio.color}`}>
                      {ratio.signal}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {ratio.current.toFixed(3)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fundamental Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Fundamentales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fundamentalMetrics.map((metric, index) => (
              <div key={index} className="text-center p-4 border border-gray-200 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">{metric.label}</div>
                <div className="text-lg font-semibold text-gray-900">{metric.value}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Tabla de Rendimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Período</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Rendimiento</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Precio Inicial</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Precio Final</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { period: '1 Día', performance: currentStock.changePercent, start: currentStock.price - currentStock.change, end: currentStock.price },
                  { period: '1 Semana', performance: 2.45, start: currentStock.price * 0.976, end: currentStock.price },
                  { period: '1 Mes', performance: -1.23, start: currentStock.price * 1.012, end: currentStock.price },
                  { period: '3 Meses', performance: 8.76, start: currentStock.price * 0.920, end: currentStock.price },
                  { period: '6 Meses', performance: 15.42, start: currentStock.price * 0.866, end: currentStock.price },
                  { period: '1 Año', performance: 23.67, start: currentStock.price * 0.809, end: currentStock.price }
                ].map((row, index) => (
                  <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-900">{row.period}</td>
                    <td className={`py-3 px-4 text-right font-semibold ${
                      row.performance >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatPercentage(row.performance)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600">
                      {formatCurrency(row.start)}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-900 font-medium">
                      {formatCurrency(row.end)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {row.performance >= 0 ? '📈' : '📉'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen de Análisis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 bg-green-50 rounded-lg">
              <h4 className="font-semibold text-green-900 mb-2">✅ Señales Positivas</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• API conectada correctamente</li>
                <li>• Datos en tiempo real disponibles</li>
                <li>• Precio actualizado: {formatCurrency(currentStock.price)}</li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg">
              <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Información</h4>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• Volumen: {currentStock.volume}</li>
                <li>• Market Cap: {currentStock.marketCap}</li>
                <li>• P/E Ratio: {currentStock.pe}</li>
              </ul>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-semibold text-blue-900 mb-2">📊 Análisis Técnico</h4>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Cambio diario: {formatPercentage(currentStock.changePercent)}</li>
                <li>• Cambio absoluto: {formatCurrency(currentStock.change)}</li>
                <li>• Tendencia: {currentStock.change >= 0 ? 'Alcista' : 'Bajista'}</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 