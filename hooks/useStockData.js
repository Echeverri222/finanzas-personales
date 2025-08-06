import { useState, useEffect, useCallback } from 'react';

const FMP_API_BASE = 'https://financialmodelingprep.com/api/v3';

export function useStockData() {
  const [stockData, setStockData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const apiKey = process.env.NEXT_PUBLIC_FMP_API_KEY;

  const fetchStockQuote = useCallback(async (symbol) => {
    if (!apiKey) {
      setError('FMP API key not configured');
      return null;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${FMP_API_BASE}/quote/${symbol}?apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const quote = data[0];
        const formattedData = {
          name: quote.name,
          symbol: quote.symbol,
          price: quote.price,
          change: quote.change,
          changePercent: quote.changesPercentage,
          marketCap: formatMarketCap(quote.marketCap),
          pe: quote.pe || 'N/A',
          volume: formatVolume(quote.volume),
          high52w: quote.yearHigh,
          low52w: quote.yearLow,
          avgVolume: quote.avgVolume
        };
        
        setStockData(prev => ({
          ...prev,
          [symbol]: formattedData
        }));
        
        return formattedData;
      }
      
      throw new Error('No data received');
    } catch (err) {
      setError(err.message);
      console.error('Error fetching stock data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const fetchHistoricalData = useCallback(async (symbol, period = '1year') => {
    if (!apiKey) {
      setError('FMP API key not configured');
      return null;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${FMP_API_BASE}/historical-price-full/${symbol}?from=${getFromDate(period)}&apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data.historical || [];
    } catch (err) {
      setError(err.message);
      console.error('Error fetching historical data:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const fetchKeyMetrics = useCallback(async (symbol) => {
    if (!apiKey) {
      setError('FMP API key not configured');
      return null;
    }

    try {
      setLoading(true);
      const response = await fetch(
        `${FMP_API_BASE}/key-metrics-ttm/${symbol}?apikey=${apiKey}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      return data[0] || null;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching key metrics:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [apiKey]);

  const calculateSMAratios = (historicalData) => {
    if (!historicalData || historicalData.length < 200) return null;

    const prices = historicalData.map(d => d.close);
    
    const sma10 = calculateSMA(prices, 10);
    const sma20 = calculateSMA(prices, 20);
    const sma30 = calculateSMA(prices, 30);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);

    return {
      'SMA 10/30': {
        ratio: sma10 / sma30,
        signal: sma10 > sma30 ? 'Bullish' : 'Bearish',
        color: sma10 > sma30 ? 'text-green-600' : 'text-red-600'
      },
      'SMA 20/50': {
        ratio: sma20 / sma50,
        signal: sma20 > sma50 ? (sma20 / sma50 > 1.05 ? 'Strong Buy' : 'Bullish') : 'Bearish',
        color: sma20 > sma50 ? 'text-green-600' : 'text-red-600'
      },
      'SMA 50/200': {
        ratio: sma50 / sma200,
        signal: sma50 > sma200 ? 'Golden Cross' : 'Death Cross',
        color: sma50 > sma200 ? 'text-green-600' : 'text-red-600'
      }
    };
  };

  return {
    stockData,
    loading,
    error,
    fetchStockQuote,
    fetchHistoricalData,
    fetchKeyMetrics,
    calculateSMAratios,
    isConfigured: !!apiKey
  };
}

// Helper functions
function formatMarketCap(marketCap) {
  if (marketCap >= 1e12) return `${(marketCap / 1e12).toFixed(1)}T`;
  if (marketCap >= 1e9) return `${(marketCap / 1e9).toFixed(1)}B`;
  if (marketCap >= 1e6) return `${(marketCap / 1e6).toFixed(1)}M`;
  return marketCap?.toString() || 'N/A';
}

function formatVolume(volume) {
  if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`;
  if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`;
  return volume?.toString() || 'N/A';
}

function getFromDate(period) {
  const now = new Date();
  const date = new Date(now);
  
  switch (period) {
    case '1month':
      date.setMonth(date.getMonth() - 1);
      break;
    case '3months':
      date.setMonth(date.getMonth() - 3);
      break;
    case '6months':
      date.setMonth(date.getMonth() - 6);
      break;
    case '1year':
    default:
      date.setFullYear(date.getFullYear() - 1);
      break;
  }
  
  return date.toISOString().split('T')[0];
}

function calculateSMA(prices, period) {
  if (prices.length < period) return null;
  
  const recentPrices = prices.slice(0, period);
  return recentPrices.reduce((sum, price) => sum + price, 0) / period;
} 