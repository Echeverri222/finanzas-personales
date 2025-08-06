import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';

export default function AhorrosPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

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

  // Calculate monthly data for the last 12 months
  const monthlyData = [];
  const monthNames = [
    'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
    'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
  ];

  for (let i = 11; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const monthAhorros = ahorrosMovimientos.filter(mov => {
      const movDate = new Date(mov.fecha);
      return movDate.getFullYear() === year && movDate.getMonth() === month;
    });
    
    const monthTotal = monthAhorros.reduce((sum, mov) => sum + Math.abs(mov.importe), 0);
    
    monthlyData.push({
      mes: `${monthNames[month]} ${year.toString().slice(-2)}`,
      ahorro: monthTotal,
      acumulado: monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].acumulado + monthTotal : monthTotal
    });
  }

  // Current month data
  const currentMovimientos = ahorrosMovimientos.filter(mov => {
    const movDate = new Date(mov.fecha);
    return movDate.getFullYear() === selectedYear && movDate.getMonth() === selectedMonth;
  });

  const currentMonthSavings = currentMovimientos.reduce((sum, mov) => sum + Math.abs(mov.importe), 0);
  const totalSavings = ahorrosMovimientos.reduce((sum, mov) => sum + Math.abs(mov.importe), 0);
  
  // Calculate averages and rates
  const avgMonthlySavings = monthlyData.length > 0 ? totalSavings / 12 : 0;
  const lastMonthSavings = monthlyData.length > 1 ? monthlyData[monthlyData.length - 2].ahorro : 0;
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
          <CardTitle className="text-lg md:text-xl">Evolución Acumulada de Ahorros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            {monthlyData.length > 0 ? (
              <div className="space-y-4">
                {/* Simple chart representation */}
                <div className="grid grid-cols-6 gap-2">
                  {monthlyData.slice(-6).map((data, index) => {
                    const maxValue = Math.max(...monthlyData.map(d => d.acumulado));
                    const height = maxValue > 0 ? (data.acumulado / maxValue) * 100 : 0;
                    
                    return (
                      <div key={index} className="text-center">
                        <div className="h-32 flex items-end justify-center">
                          <div 
                            className="w-8 bg-blue-500 rounded-t"
                            style={{ height: `${Math.max(height, 5)}%` }}
                            title={`${data.mes}: ${formatCurrency(data.acumulado)} acumulado`}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">{data.mes}</div>
                        <div className="text-xs font-medium">{formatCurrency(data.acumulado)}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-500">
                <div className="text-center">
                  <div className="text-4xl mb-2">📊</div>
                  <p>No hay datos de ahorros</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 