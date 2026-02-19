import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';

// Safe date creation function (same as dashboard)
const createSafeDate = (dateString) => {
  if (!dateString) return new Date();
  
  // Si es string de fecha (YYYY-MM-DD), crear fecha local
  if (typeof dateString === 'string' && dateString.includes('-')) {
    const [year, month, day] = dateString.split('T')[0].split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  
  // Si ya es objeto Date, devolverlo tal como está
  if (dateString instanceof Date) {
    return dateString;
  }
  
  // Para otros casos, intentar parsear normalmente
  return new Date(dateString);
};

export default function AhorrosPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [timePeriod, setTimePeriod] = useState('1year'); // 3months, ytd, 1year

  const { movimientos, loading } = useMovimientos();
  const { tiposMovimiento } = useTiposMovimiento();

  // Helper function to get tipo name by ID
  const getTipoNombre = (id) => {
    const tipo = tiposMovimiento.find(t => t.id === id);
    return tipo ? tipo.nombre : 'Sin categoría';
  };

  // Filter savings movements (using proper database logic)
  const ahorrosMovimientos = movimientos.filter(mov => {
    const tipoNombre = getTipoNombre(mov.id_tipo_movimiento);
    return tipoNombre === 'Ahorro';
  });

  // Calculate chart data based on selected time period
  const getChartData = () => {
    const monthNames = [
      'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
      'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
    ];

    let startMonthsAgo = 11; // For 1 year, start 11 months ago
    
    switch (timePeriod) {
      case '3months':
        startMonthsAgo = 2; // For 3 months, start 2 months ago
        break;
      case 'ytd':
        // From January 1st of current year to current month
        const currentMonth = new Date().getMonth();
        startMonthsAgo = currentMonth; // Start from January of current year
        break;
      case '1year':
      default:
        startMonthsAgo = 11;
        break;
    }

    const chartData = [];
    
    // Calculate the true cumulative total up to the start of our period
    // This ensures we show the real accumulated amount at each point in time
    
    // First, get all savings before our period starts
    const periodStartDate = new Date();
    if (timePeriod === 'ytd') {
      periodStartDate.setFullYear(new Date().getFullYear(), 0, 1); // January 1st of current year
    } else {
      periodStartDate.setMonth(periodStartDate.getMonth() - startMonthsAgo);
    }
    
    // Calculate all savings before the period starts
    const previousSavings = ahorrosMovimientos.filter(mov => {
      const movDate = createSafeDate(mov.fecha);
      return movDate < periodStartDate;
    });
    
    let cumulativeTotal = previousSavings.reduce((sum, mov) => sum + Math.abs(mov.importe), 0);
    
    // Now collect data for the selected period in chronological order
    for (let i = startMonthsAgo; i >= 0; i--) {
      const date = new Date();
      
      if (timePeriod === 'ytd') {
        // For YTD, start from January of current year
        date.setFullYear(new Date().getFullYear(), startMonthsAgo - i, 1);
      } else {
        date.setMonth(date.getMonth() - i);
      }
      
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthAhorros = ahorrosMovimientos.filter(mov => {
        const movDate = createSafeDate(mov.fecha);
        return movDate.getFullYear() === year && movDate.getMonth() === month;
      });
      
      const monthTotal = monthAhorros.reduce((sum, mov) => sum + Math.abs(mov.importe), 0);
      cumulativeTotal += monthTotal;
      
      chartData.push({
        mes: `${monthNames[month]} ${year.toString().slice(-2)}`,
        ahorro: monthTotal,
        acumulado: cumulativeTotal
      });
    }

    return chartData;
  };

  const chartData = getChartData();

  // Current month data
  const currentMovimientos = ahorrosMovimientos.filter(mov => {
    const movDate = createSafeDate(mov.fecha);
    return movDate.getFullYear() === selectedYear && movDate.getMonth() === selectedMonth;
  });

  const currentMonthSavings = currentMovimientos.reduce((sum, mov) => sum + Math.abs(mov.importe), 0);
  const totalSavings = ahorrosMovimientos.reduce((sum, mov) => sum + Math.abs(mov.importe), 0);
  
  // Calculate averages and rates
  const avgMonthlySavings = chartData.length > 0 ? totalSavings / 12 : 0;
  const lastMonthSavings = chartData.length > 1 ? chartData[chartData.length - 2].ahorro : 0;
  const growthRate = lastMonthSavings > 0 ? ((currentMonthSavings - lastMonthSavings) / lastMonthSavings * 100) : 0;

  // Estimate savings rate (simple calculation based on total movements)
  const allIngresos = movimientos.filter(mov => {
    const tipoNombre = getTipoNombre(mov.id_tipo_movimiento);
    return tipoNombre === 'Ingresos';
  });
  
  const estimatedMonthlyIncome = allIngresos.length > 0 ? 
    allIngresos.reduce((sum, mov) => sum + Math.abs(mov.importe), 0) / 12 : 3000;
  
  const savingsRate = avgMonthlySavings > 0 ? (avgMonthlySavings / estimatedMonthlyIncome) * 100 : 0;

  // Savings by category
  const ahorrosPorCategoria = {};
  currentMovimientos.forEach(mov => {
    const categoria = getTipoNombre(mov.id_tipo_movimiento);
    if (!ahorrosPorCategoria[categoria]) {
      ahorrosPorCategoria[categoria] = 0;
    }
    ahorrosPorCategoria[categoria] += Math.abs(mov.importe);
  });

  const categoriesData = Object.entries(ahorrosPorCategoria).map(([categoria, monto]) => ({
    categoria,
    monto
  }));

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const years = [2022, 2023, 2024, 2025];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-lg">Cargando datos de ahorros...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header - Stitch style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Mis Ahorros
        </h1>
        <div className="flex items-center gap-2">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
          >
            {years.map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Hero card - Stitch style */}
      <div className="rounded-xl p-6 shadow-lg bg-primary text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
        <div className="relative z-10">
          <p className="text-white/80 text-sm font-medium mb-1">Saldo Total Ahorrado</p>
          <p className="text-3xl font-bold tracking-tight">{formatCurrency(totalSavings)}</p>
          <div className="mt-6 flex gap-3 flex-wrap">
            <Link href="/movimientos/nuevo?tipo=ahorros">
              <button className="flex-1 flex items-center justify-center gap-2 bg-white text-primary rounded-lg py-2.5 px-4 font-bold text-sm hover:bg-blue-50 transition-colors">
                <span className="material-symbols-outlined text-sm">add_circle</span>
                Ahorrar más
              </button>
            </Link>
            <Link href="/metas">
              <button className="flex-1 flex items-center justify-center gap-2 bg-primary/20 border border-white/30 text-white rounded-lg py-2.5 px-4 font-bold text-sm hover:bg-primary/40 transition-colors">
                <span className="material-symbols-outlined text-sm">track_changes</span>
                Metas
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Cumulative Evolution Chart - Stitch style */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-4 md:p-6 shadow-sm border border-slate-100 dark:border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-slate-900 dark:text-white text-base font-bold">Crecimiento</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs">Evolución acumulada</p>
          </div>
            
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTimePeriod('3months')}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                timePeriod === '3months' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10'
              }`}
            >
              3M
            </button>
            <button
              onClick={() => setTimePeriod('ytd')}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                timePeriod === 'ytd' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10'
              }`}
            >
              YTD
            </button>
            <button
              onClick={() => setTimePeriod('1year')}
              className={`px-3 py-1.5 text-sm rounded-lg font-medium transition-colors ${
                timePeriod === '1year' ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10'
              }`}
            >
              1Y
            </button>
          </div>
        </div>
        <div className="h-80 mt-4">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={chartData}
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="mes" 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#6b7280"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                    formatter={(value, name) => [
                      formatCurrency(value),
                      name === 'acumulado' ? 'Acumulado' : 'Ahorro del mes'
                    ]}
                    labelStyle={{ color: '#374151', fontWeight: 'medium' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="acumulado"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: '#3b82f6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
                <div className="text-center">
                  <span className="material-symbols-outlined text-4xl mb-2 block">savings</span>
                  <p>No hay datos de ahorros para este período</p>
                </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
} 