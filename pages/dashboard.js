import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';
import Link from 'next/link';

export default function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  const { movimientos, loading } = useMovimientos();
  const { tiposMovimiento } = useTiposMovimiento();

  // Helper function to categorize movement types (same as in movimientos)
  const categorizeTipo = (tipoNombre) => {
    const ingresos = ['salario', 'freelance', 'inversiones', 'bonus', 'comision', 'dividendos'];
    const ahorros = ['ahorro', 'emergencia', 'inversion', 'meta'];
    
    const nombre = tipoNombre.toLowerCase();
    
    if (ingresos.some(ing => nombre.includes(ing))) return 'ingresos';
    if (ahorros.some(ah => nombre.includes(ah))) return 'ahorros';
    return 'gastos';
  };

  // Add categoria to movimientos
  const movimientosWithCategoria = movimientos.map(mov => ({
    ...mov,
    categoria: mov.tipo_movimiento ? categorizeTipo(mov.tipo_movimiento.nombre) : 'gastos',
    fecha: new Date(mov.fecha)
  }));

  // Filter by selected month and year
  const currentMovimientos = movimientosWithCategoria.filter(mov => {
    const movDate = new Date(mov.fecha);
    return movDate.getFullYear() === selectedYear && movDate.getMonth() === selectedMonth;
  });

  // Calculate stats
  const stats = {
    totalIngresos: currentMovimientos.filter(m => m.categoria === 'ingresos').reduce((sum, m) => sum + Math.abs(m.importe), 0),
    totalGastos: currentMovimientos.filter(m => m.categoria === 'gastos').reduce((sum, m) => sum + Math.abs(m.importe), 0),
    balanceNeto: currentMovimientos.reduce((sum, m) => sum + m.importe, 0),
    ahorrosMes: currentMovimientos.filter(m => m.categoria === 'ahorros').reduce((sum, m) => sum + Math.abs(m.importe), 0)
  };

  // Monthly evolution data (last 6 months)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const month = date.getMonth();
    const year = date.getFullYear();
    
    const monthMovimientos = movimientosWithCategoria.filter(mov => {
      const movDate = new Date(mov.fecha);
      return movDate.getFullYear() === year && movDate.getMonth() === month;
    });
    
    const ingresos = monthMovimientos.filter(m => m.categoria === 'ingresos').reduce((sum, m) => sum + Math.abs(m.importe), 0);
    const gastos = monthMovimientos.filter(m => m.categoria === 'gastos').reduce((sum, m) => sum + Math.abs(m.importe), 0);
    
    monthlyData.push({
      mes: date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' }),
      ingresos,
      gastos,
      balance: ingresos - gastos
    });
  }

  // Expenses by category
  const expensesByCategory = tiposMovimiento
    .filter(tipo => categorizeTipo(tipo.nombre) === 'gastos')
    .map(tipo => {
      const gastos = currentMovimientos
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

  // Pie chart data for categories
  const pieData = [
    { name: 'Ingresos', value: stats.totalIngresos, color: '#10B981' },
    { name: 'Gastos', value: stats.totalGastos, color: '#EF4444' },
    { name: 'Ahorros', value: stats.ahorrosMes, color: '#3B82F6' }
  ].filter(item => item.value > 0);

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const years = [2022, 2023, 2024, 2025];

  const quickActions = [
    { title: 'Nuevo Ingreso', href: '/movimientos/nuevo?tipo=ingresos', color: 'bg-green-50 text-green-700', icon: '💰' },
    { title: 'Nuevo Gasto', href: '/movimientos/nuevo?tipo=gastos', color: 'bg-red-50 text-red-700', icon: '💸' },
    { title: 'Ahorrar Dinero', href: '/movimientos/nuevo?tipo=ahorros', color: 'bg-blue-50 text-blue-700', icon: '🏦' },
    { title: 'Nueva Meta', href: '/metas', color: 'bg-purple-50 text-purple-700', icon: '🎯' }
  ];

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
            Resumen de tus finanzas para {months[selectedMonth]} {selectedYear}
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
                <p className="text-sm font-medium text-gray-600 mb-1">Ahorrado este mes</p>
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
        {/* Monthly Evolution Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolución Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(value) => `€${(value/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                  <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="gastos" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
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
                    <YAxis tickFormatter={(value) => `€${value}`} />
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
        {/* Distribution Pie Chart */}
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

        {/* Recent Movements */}
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
              {currentMovimientos.slice(0, 5).map((movimiento) => (
                <div key={movimiento.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      movimiento.categoria === 'ingresos' ? 'bg-green-100' :
                      movimiento.categoria === 'ahorros' ? 'bg-blue-100' : 'bg-red-100'
                    }`}>
                      <span className="text-lg">
                        {movimiento.categoria === 'ingresos' ? '💰' :
                         movimiento.categoria === 'ahorros' ? '🏦' : '💸'}
                      </span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{movimiento.nombre}</div>
                      <div className="text-sm text-gray-500">
                        {new Date(movimiento.fecha).toLocaleDateString('es-ES')} • {movimiento.tipo_movimiento?.nombre}
                      </div>
                    </div>
                  </div>
                  <div className={`text-right font-semibold ${
                    movimiento.categoria === 'ingresos' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {movimiento.categoria === 'ingresos' ? '+' : '-'}{formatCurrency(Math.abs(movimiento.importe))}
                  </div>
                </div>
              ))}
              
              {currentMovimientos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📋</div>
                  <p>No hay movimientos este mes</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
} 