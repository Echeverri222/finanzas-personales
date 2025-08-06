import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useMovimientos } from '../hooks/useMovimientos';

export default function AhorrosPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const { movimientos, loading } = useMovimientos();

  // Helper function to categorize movement types
  const categorizeTipo = (tipoNombre) => {
    const ingresos = ['salario', 'freelance', 'inversiones', 'bonus', 'comision', 'dividendos'];
    const ahorros = ['ahorro', 'emergencia', 'inversion', 'meta'];
    
    const nombre = tipoNombre.toLowerCase();
    
    if (ingresos.some(ing => nombre.includes(ing))) return 'ingresos';
    if (ahorros.some(ah => nombre.includes(ah))) return 'ahorros';
    return 'gastos';
  };

  // Filter savings movements
  const ahorrosMovimientos = movimientos.filter(mov => {
    if (!mov.tipo_movimiento) return false;
    return categorizeTipo(mov.tipo_movimiento.nombre) === 'ahorros';
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
    if (!mov.tipo_movimiento) return false;
    return categorizeTipo(mov.tipo_movimiento.nombre) === 'ingresos';
  });
  
  const estimatedMonthlyIncome = allIngresos.length > 0 ? 
    allIngresos.reduce((sum, mov) => sum + Math.abs(mov.importe), 0) / 12 : 3000;
  
  const savingsRate = avgMonthlySavings > 0 ? (avgMonthlySavings / estimatedMonthlyIncome) * 100 : 0;

  // Savings by category
  const ahorrosPorCategoria = {};
  currentMovimientos.forEach(mov => {
    const categoria = mov.tipo_movimiento?.nombre || 'Otros';
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
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Este Mes</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(currentMonthSavings)}
                </p>
              </div>
              <div className="text-3xl opacity-60">🏦</div>
            </div>
            <div className="mt-2">
              <span className={`text-sm font-medium ${
                growthRate >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {growthRate >= 0 ? '+' : ''}{growthRate.toFixed(1)}%
              </span>
              <span className="text-sm text-gray-500 ml-2">vs mes anterior</span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Acumulado</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalSavings)}
                </p>
              </div>
              <div className="text-3xl opacity-60">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Promedio Mensual</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(avgMonthlySavings)}
                </p>
              </div>
              <div className="text-3xl opacity-60">📊</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Tasa de Ahorro</p>
                <p className="text-2xl font-bold text-orange-600">
                  {savingsRate.toFixed(1)}%
                </p>
              </div>
              <div className="text-3xl opacity-60">📈</div>
            </div>
            <div className="mt-2">
              <span className="text-xs text-gray-500">
                {savingsRate >= 20 ? 'Excelente' : savingsRate >= 10 ? 'Bueno' : 'Mejorable'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link href="/movimientos/nuevo?tipo=ahorros">
              <button className="w-full p-4 rounded-xl bg-blue-50 text-blue-700 hover:opacity-80 transition-opacity text-center">
                <div className="text-2xl mb-2">🏦</div>
                <div className="font-medium text-sm">Nuevo Ahorro</div>
              </button>
            </Link>
            <Link href="/metas">
              <button className="w-full p-4 rounded-xl bg-purple-50 text-purple-700 hover:opacity-80 transition-opacity text-center">
                <div className="text-2xl mb-2">🎯</div>
                <div className="font-medium text-sm">Crear Meta</div>
              </button>
            </Link>
            <Link href="/gestion-tipos">
              <button className="w-full p-4 rounded-xl bg-green-50 text-green-700 hover:opacity-80 transition-opacity text-center">
                <div className="text-2xl mb-2">⚙️</div>
                <div className="font-medium text-sm">Tipos de Ahorro</div>
              </button>
            </Link>
            <Link href="/movimientos?tipo=ahorros">
              <button className="w-full p-4 rounded-xl bg-gray-50 text-gray-700 hover:opacity-80 transition-opacity text-center">
                <div className="text-2xl mb-2">📋</div>
                <div className="font-medium text-sm">Ver Historial</div>
              </button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Evolution */}
        <Card>
          <CardHeader>
            <CardTitle>Evolución Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {monthlyData.length > 0 ? (
                <div className="space-y-4">
                  {/* Simple chart representation */}
                  <div className="grid grid-cols-6 gap-2">
                    {monthlyData.slice(-6).map((data, index) => {
                      const maxValue = Math.max(...monthlyData.map(d => d.ahorro));
                      const height = maxValue > 0 ? (data.ahorro / maxValue) * 100 : 0;
                      
                      return (
                        <div key={index} className="text-center">
                          <div className="h-32 flex items-end justify-center">
                            <div 
                              className="w-8 bg-blue-500 rounded-t"
                              style={{ height: `${Math.max(height, 5)}%` }}
                              title={`${data.mes}: ${formatCurrency(data.ahorro)}`}
                            ></div>
                          </div>
                          <div className="text-xs text-gray-600 mt-1">{data.mes}</div>
                          <div className="text-xs font-medium">{formatCurrency(data.ahorro)}</div>
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

        {/* Savings by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Ahorros por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {categoriesData.length > 0 ? (
                <div className="space-y-4">
                  {categoriesData.map((item, index) => {
                    const percentage = (item.monto / currentMonthSavings) * 100;
                    
                    return (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">{item.categoria}</span>
                          <span className="text-sm font-bold text-blue-600">
                            {formatCurrency(item.monto)} ({percentage.toFixed(0)}%)
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 bg-blue-500 rounded-full"
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🏦</div>
                    <p>No hay ahorros este mes</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Savings and Goals Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Savings */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Ahorros Recientes</CardTitle>
              <Link href="/movimientos?tipo=ahorros">
                <Button variant="ghost" size="sm">Ver todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {currentMovimientos.slice(0, 5).map((movimiento) => (
                <div key={movimiento.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <span className="text-lg">🏦</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{movimiento.nombre}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(movimiento.fecha).toLocaleDateString('es-ES')} • {movimiento.tipo_movimiento?.nombre}
                      </div>
                    </div>
                  </div>
                  <div className="text-right font-semibold text-blue-600">
                    +{formatCurrency(Math.abs(movimiento.importe))}
                  </div>
                </div>
              ))}
              
              {currentMovimientos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🏦</div>
                  <p>No hay ahorros este mes</p>
                  <Link href="/movimientos/nuevo?tipo=ahorros" className="mt-2 inline-block">
                    <Button size="sm">Añadir ahorro</Button>
                  </Link>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Goals Progress */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Progreso de Metas</CardTitle>
              <Link href="/metas">
                <Button variant="ghost" size="sm">Ver todas</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* This would be connected to the metas data when available */}
              <div className="space-y-4">
                <div className="p-4 border border-gray-100 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">Fondo de emergencia</span>
                    <span className="text-sm text-gray-600">64%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 bg-blue-500 rounded-full" style={{ width: '64%' }}></div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">€3,200 / €5,000</div>
                </div>
                
                <div className="p-4 border border-gray-100 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium text-gray-900">Vacaciones</span>
                    <span className="text-sm text-gray-600">32%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="h-2 bg-green-500 rounded-full" style={{ width: '32%' }}></div>
                  </div>
                  <div className="text-sm text-gray-600 mt-1">€800 / €2,500</div>
                </div>
              </div>
              
              <div className="text-center pt-4">
                <Link href="/metas">
                  <Button variant="outline" size="sm">Gestionar metas</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 