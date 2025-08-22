import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';

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

    let monthsToShow = 12;
    let startDate = new Date();
    
    switch (timePeriod) {
      case '3months':
        monthsToShow = 3;
        break;
      case 'ytd':
        // From January 1st of current year to now
        startDate = new Date(new Date().getFullYear(), 0, 1);
        monthsToShow = new Date().getMonth() + 1;
        break;
      case '1year':
      default:
        monthsToShow = 12;
        break;
    }

    const chartData = [];
    let cumulativeTotal = 0;

    for (let i = monthsToShow - 1; i >= 0; i--) {
      const date = new Date();
      
      if (timePeriod === 'ytd') {
        date.setFullYear(new Date().getFullYear(), i, 1);
      } else {
        date.setMonth(date.getMonth() - i);
      }
      
      const month = date.getMonth();
      const year = date.getFullYear();
      
      const monthAhorros = ahorrosMovimientos.filter(mov => {
        const movDate = new Date(mov.fecha);
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
    const movDate = new Date(mov.fecha);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ahorros</h1>
          <p className="text-gray-600 mt-1">
            Seguimiento de tus ahorros para {months[selectedMonth]} {selectedYear}
          </p>
        </div>
        
        {/* Date Filters */}
        <div className="flex items-center space-x-3">
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {months.map((month, index) => (
              <option key={index} value={index}>{month}</option>
            ))}
          </select>
          
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Link href="/movimientos/nuevo?tipo=ahorros">
              <button className="w-full p-3 md:p-4 rounded-xl bg-blue-50 text-blue-700 hover:opacity-80 transition-opacity text-center">
                <div className="text-lg md:text-2xl mb-1 md:mb-2">🏦</div>
                <div className="font-medium text-xs md:text-sm">Nuevo Ahorro</div>
              </button>
            </Link>
            <Link href="/metas">
              <button className="w-full p-4 rounded-xl bg-purple-50 text-purple-700 hover:opacity-80 transition-opacity text-center">
                <div className="text-2xl mb-2">🎯</div>
                <div className="font-medium text-sm">Crear Meta</div>
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Cumulative Evolution Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg md:text-xl">Evolución Acumulada de Ahorros</CardTitle>
            
            {/* Time Period Selector */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setTimePeriod('3months')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timePeriod === '3months'
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                3M
              </button>
              <button
                onClick={() => setTimePeriod('ytd')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timePeriod === 'ytd'
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                YTD
              </button>
              <button
                onClick={() => setTimePeriod('1year')}
                className={`px-3 py-1 text-sm rounded-md transition-colors ${
                  timePeriod === '1year'
                    ? 'bg-blue-100 text-blue-700 font-medium'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                1Y
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-80">
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
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No hay datos de ahorros para este período</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 