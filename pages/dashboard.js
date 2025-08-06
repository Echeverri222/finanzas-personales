import { useState } from 'react';
import StatsCard from '../components/dashboard/StatsCard';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function DashboardPage() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());

  // Will be replaced with real Supabase data hooks
  const stats = {
    totalIngresos: 0,
    totalGastos: 0,
    balanceNeto: 0,
    ahorrosMes: 0
  };

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
        <StatsCard
          title="Total Ingresos"
          value={stats.totalIngresos}
          change="+12% vs mes anterior"
          trend="up"
          color="green"
          icon="💰"
        />
        <StatsCard
          title="Total Gastos"
          value={stats.totalGastos}
          change="-5% vs mes anterior"
          trend="down"
          color="red"
          icon="💸"
        />
        <StatsCard
          title="Balance Neto"
          value={stats.balanceNeto}
          change="+€320 vs mes anterior"
          trend="up"
          color="blue"
          icon="📊"
        />
        <StatsCard
          title="Ahorrado este mes"
          value={stats.ahorrosMes}
          change="Meta: €500"
          trend="neutral"
          color="green"
          icon="🏦"
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className={`p-4 rounded-xl ${action.color} hover:opacity-80 transition-opacity text-center`}
                onClick={() => window.location.href = action.href}
              >
                <div className="text-2xl mb-2">{action.icon}</div>
                <div className="font-medium text-sm">{action.title}</div>
              </button>
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
            <div className="h-64 flex items-center justify-center text-gray-500">
              📈 Gráfico de evolución mensual
              <br />
              <span className="text-sm">(Se conectará con Recharts)</span>
            </div>
          </CardContent>
        </Card>

        {/* Expenses by Category */}
        <Card>
          <CardHeader>
            <CardTitle>Gastos por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center text-gray-500">
              🎯 Gastos vs Presupuesto
              <br />
              <span className="text-sm">(Se conectará con Recharts)</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Movements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Movimientos Recientes</CardTitle>
            <Button variant="ghost" size="sm">
              Ver todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Placeholder for recent movements */}
            <div className="text-center py-8 text-gray-500">
              📋 Lista de movimientos recientes
              <br />
              <span className="text-sm">(Se conectará con Supabase)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 