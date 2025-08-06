import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import SystemStatus from '../components/SystemStatus';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';
import Link from 'next/link';

export default function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth().toString()); // Default to current month as string
  const [showSystemStatus, setShowSystemStatus] = useState(false);

  const { movimientos, loading } = useMovimientos();
  const { tiposMovimiento } = useTiposMovimiento();

  // Filter by selected month and year using EXACT old logic
  const filteredMovimientos = movimientos.filter(mov => {
    const movDate = new Date(mov.fecha);
    const matchesYear = movDate.getFullYear() === selectedYear;
    const matchesMonth = selectedMonth === 'all' || movDate.getMonth() === parseInt(selectedMonth);
    return matchesYear && matchesMonth;
  });

  // Year-only filtered data for monthly evolution (matches old component)
  const yearFilteredMovimientos = movimientos.filter(mov => {
    const movDate = new Date(mov.fecha);
    return movDate.getFullYear() === selectedYear;
  });

  // Calculate stats using filtered data (only selected month/year)
  const stats = {
    totalIngresos: filteredMovimientos
      .filter(m => m.tipo_nombre === 'Ingresos')
      .reduce((sum, m) => sum + Math.abs(m.importe), 0),
    totalGastos: filteredMovimientos
      .filter(m => m.tipo_nombre !== 'Ingresos' && m.tipo_nombre !== 'Ahorro')
      .reduce((sum, m) => sum + Math.abs(m.importe), 0),
    balanceNeto: filteredMovimientos.reduce((sum, m) => {
      if (m.tipo_nombre === 'Ingresos') {
        return sum + Math.abs(m.importe);
      } else {
        return sum - Math.abs(m.importe);
      }
    }, 0),
    ahorrosMes: filteredMovimientos
      .filter(m => m.tipo_nombre === 'Ahorro')
      .reduce((sum, m) => sum + Math.abs(m.importe), 0)
  };

  // Monthly evolution data using full year data (like old component)
  const monthlyData = [];
  for (let i = 0; i < 12; i++) {
    const monthMovimientos = yearFilteredMovimientos.filter(mov => {
      const movDate = new Date(mov.fecha);
      return movDate.getMonth() === i;
    });
    
    const ingresos = monthMovimientos
      .filter(m => m.tipo_nombre === 'Ingresos')
      .reduce((sum, m) => sum + Math.abs(m.importe), 0);
    const gastos = monthMovimientos
      .filter(m => m.tipo_nombre !== 'Ingresos' && m.tipo_nombre !== 'Ahorro')
      .reduce((sum, m) => sum + Math.abs(m.importe), 0);
    
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                       'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    
    monthlyData.push({
      mes: monthNames[i],
      ingresos,
      gastos,
      balance: ingresos - gastos
    });
  }

  // Expenses by category using filtered data (only selected month/year)
  const expensesByCategory = tiposMovimiento
    .filter(tipo => tipo.nombre !== 'Ingresos' && tipo.nombre !== 'Ahorro')
    .map(tipo => {
      const gastos = filteredMovimientos
        .filter(m => m.id_tipo_movimiento === tipo.id)
        .reduce((sum, m) => sum + Math.abs(m.importe), 0);
      
      return {
        nombre: tipo.nombre,
        gasto: gastos,
        meta: tipo.meta || 0,
        excedido: gastos > (tipo.meta || 0)
      };
    })
    .filter(item => item.gasto > 0);

  // Pie chart data for categories using filtered data
  const pieData = [
    { name: 'Ingresos', value: stats.totalIngresos, color: '#10B981' },
    { name: 'Gastos', value: stats.totalGastos, color: '#EF4444' },
    { name: 'Ahorros', value: stats.ahorrosMes, color: '#3B82F6' }
  ].filter(item => item.value > 0);

  const months = [
    { value: 'all', label: 'Todos' },
    { value: '0', label: 'Enero' },
    { value: '1', label: 'Febrero' },
    { value: '2', label: 'Marzo' },
    { value: '3', label: 'Abril' },
    { value: '4', label: 'Mayo' },
    { value: '5', label: 'Junio' },
    { value: '6', label: 'Julio' },
    { value: '7', label: 'Agosto' },
    { value: '8', label: 'Septiembre' },
    { value: '9', label: 'Octubre' },
    { value: '10', label: 'Noviembre' },
    { value: '11', label: 'Diciembre' }
  ];

  const years = [2022, 2023, 2024, 2025];

  const quickActions = [
    { title: 'Nuevo Ingreso', href: '/movimientos/nuevo?tipo=ingresos', color: 'bg-green-50 text-green-700', icon: '💰' },
    { title: 'Nuevo Gasto', href: '/movimientos/nuevo?tipo=gastos', color: 'bg-red-50 text-red-700', icon: '💸' },
    { title: 'Ahorrar Dinero', href: '/movimientos/nuevo?tipo=ahorros', color: 'bg-blue-50 text-blue-700', icon: '🏦' },
    { title: 'Nueva Meta', href: '/metas', color: 'bg-purple-50 text-purple-700', icon: '🎯' }
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getSelectedMonthName = () => {
    if (selectedMonth === 'all') return 'Todo el año';
    const monthObj = months.find(m => m.value === selectedMonth);
    return monthObj ? monthObj.label : '';
  };

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="text-center py-12">
          <div className="text-lg">Cargando dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Resumen de tus finanzas para {getSelectedMonthName()} {selectedYear}
          </p>
        </div>
        
        {/* Date Filters and System Status Toggle */}
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSystemStatus(!showSystemStatus)}
          >
            {showSystemStatus ? '🔧 Ocultar Estado' : '🔧 Estado Sistema'}
          </Button>
          
          <select 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
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

      {/* System Status (conditionally shown) */}
      {showSystemStatus && <SystemStatus />}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Ingresos</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalIngresos)}
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
                <p className="text-sm font-medium text-gray-600 mb-1">Total Gastos</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(stats.totalGastos)}
                </p>
              </div>
              <div className="text-3xl opacity-60">💸</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Balance Neto</p>
                <p className={`text-2xl font-bold ${stats.balanceNeto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.balanceNeto)}
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
                <p className="text-sm font-medium text-gray-600 mb-1">Ahorrado este período</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.ahorrosMes)}
                </p>
              </div>
              <div className="text-3xl opacity-60">🏦</div>
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
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <button
                  className={`w-full p-4 rounded-xl ${action.color} hover:opacity-80 transition-opacity text-center`}
                >
                  <div className="text-2xl mb-2">{action.icon}</div>
                  <div className="font-medium text-sm">{action.title}</div>
                </button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Evolution Chart - Shows full year */}
        <Card>
          <CardHeader>
            <CardTitle>Evolución Mensual {selectedYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                  <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="gastos" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expenses by Category - Shows filtered period */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {expensesByCategory.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={expensesByCategory}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" angle={-45} textAnchor="end" height={80} />
                    <YAxis tickFormatter={(value) => `$${value}`} />
                    <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                    <Bar dataKey="gasto" fill="#3B82F6" />
                    <Bar dataKey="meta" fill="#E5E7EB" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">📊</div>
                    <p>No hay gastos en este período</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Distribution and Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribution Pie Chart - Shows filtered period */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución del Dinero</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {pieData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  <div className="text-center">
                    <div className="text-4xl mb-2">🥧</div>
                    <p>No hay datos para mostrar</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Movements - Shows filtered period */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Movimientos Recientes</CardTitle>
              <Link href="/movimientos">
                <Button variant="ghost" size="sm">Ver todos</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredMovimientos.slice(0, 5).map((movimiento) => (
                <div key={movimiento.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      movimiento.tipo_nombre === 'Ingresos' ? 'bg-green-100' :
                      movimiento.tipo_nombre === 'Ahorro' ? 'bg-blue-100' : 'bg-red-100'
                    }`}>
                      <span className="text-lg">
                        {movimiento.tipo_nombre === 'Ingresos' ? '💰' :
                         movimiento.tipo_nombre === 'Ahorro' ? '🏦' : '💸'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{movimiento.nombre}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(movimiento.fecha).toLocaleDateString('es-ES')} • {movimiento.tipo_nombre}
                      </div>
                    </div>
                  </div>
                  <div className={`text-right font-semibold ${
                    movimiento.tipo_nombre === 'Ingresos' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movimiento.tipo_nombre === 'Ingresos' ? '+' : '-'}{formatCurrency(Math.abs(movimiento.importe))}
                  </div>
                </div>
              ))}
              
              {filteredMovimientos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No hay movimientos en este período</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 