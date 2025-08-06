import { useState } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function AhorrosPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('year');
  
  // Mock data - will be replaced with Supabase
  const ahorrosData = [
    { mes: 'Ene 2024', ahorro: 300, acumulado: 300 },
    { mes: 'Feb 2024', ahorro: 250, acumulado: 550 },
    { mes: 'Mar 2024', ahorro: 400, acumulado: 950 },
    { mes: 'Abr 2024', ahorro: 350, acumulado: 1300 },
    { mes: 'May 2024', ahorro: 300, acumulado: 1600 },
    { mes: 'Jun 2024', ahorro: 500, acumulado: 2100 },
    { mes: 'Jul 2024', ahorro: 450, acumulado: 2550 },
    { mes: 'Ago 2024', ahorro: 380, acumulado: 2930 },
    { mes: 'Sep 2024', ahorro: 320, acumulado: 3250 },
    { mes: 'Oct 2024', ahorro: 400, acumulado: 3650 },
    { mes: 'Nov 2024', ahorro: 350, acumulado: 4000 },
    { mes: 'Dic 2024', ahorro: 300, acumulado: 4300 }
  ];

  const currentMonthSavings = ahorrosData[ahorrosData.length - 1]?.ahorro || 0;
  const totalSavings = ahorrosData[ahorrosData.length - 1]?.acumulado || 0;
  const avgMonthlySavings = totalSavings / ahorrosData.length;
  const lastMonthSavings = ahorrosData[ahorrosData.length - 2]?.ahorro || 0;
  const growthRate = lastMonthSavings > 0 ? ((currentMonthSavings - lastMonthSavings) / lastMonthSavings * 100) : 0;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (value) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  // Calculate savings rate (simple mock calculation)
  const estimatedIncome = 3000; // This would come from actual income data
  const savingsRate = (avgMonthlySavings / estimatedIncome) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ahorros</h1>
          <p className="text-gray-600 mt-1">
            Seguimiento de tu progreso de ahorro
          </p>
        </div>
        
        {/* Period Filter */}
        <div className="flex items-center space-x-2">
          <select 
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="year">Este año</option>
            <option value="6months">Últimos 6 meses</option>
            <option value="3months">Últimos 3 meses</option>
            <option value="all">Todo el tiempo</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Ahorrado</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(totalSavings)}
                </p>
              </div>
              <div className="text-2xl opacity-60">🏦</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Este Mes</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(currentMonthSavings)}
                </p>
                <div className={`flex items-center mt-2 text-sm ${
                  growthRate >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="mr-1">{growthRate >= 0 ? '↗' : '↘'}</span>
                  <span>{formatPercentage(growthRate)} vs mes anterior</span>
                </div>
              </div>
              <div className="text-2xl opacity-60">💰</div>
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
              <div className="text-2xl opacity-60">📊</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Tasa de Ahorro</p>
                <p className="text-2xl font-bold text-indigo-600">
                  {savingsRate.toFixed(1)}%
                </p>
                <p className="text-xs text-gray-500 mt-1">De tus ingresos</p>
              </div>
              <div className="text-2xl opacity-60">🎯</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Savings Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ahorros Mensuales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex flex-col">
              {/* Simple bar chart representation */}
              <div className="flex-1 flex items-end justify-between space-x-1">
                {ahorrosData.slice(-6).map((data, index) => {
                  const height = (data.ahorro / Math.max(...ahorrosData.map(d => d.ahorro))) * 100;
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div 
                        className="w-full bg-blue-500 rounded-t-sm mb-2 min-h-[4px] flex items-end justify-center"
                        style={{ height: `${height}%` }}
                      >
                        <span className="text-xs text-white font-medium pb-1">
                          {Math.round(data.ahorro)}
                        </span>
                      </div>
                      <span className="text-xs text-gray-600 text-center">
                        {data.mes.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-center mt-4 text-sm text-gray-500">
                📊 Ahorros por mes (últimos 6 meses)
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Accumulated Savings Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Ahorros Acumulados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex flex-col">
              {/* Simple line chart representation */}
              <div className="flex-1 flex items-end justify-between space-x-1">
                {ahorrosData.slice(-6).map((data, index) => {
                  const height = (data.acumulado / Math.max(...ahorrosData.map(d => d.acumulado))) * 100;
                  return (
                    <div key={index} className="flex flex-col items-center flex-1">
                      <div className="flex flex-col items-center justify-end h-full">
                        <div className="w-3 h-3 bg-green-500 rounded-full mb-1"></div>
                        <div 
                          className="w-0.5 bg-green-300"
                          style={{ height: `${height - 10}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-600 text-center mt-2">
                        {data.mes.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="text-center mt-4 text-sm text-gray-500">
                📈 Progresión de ahorros acumulados
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Savings Movements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Movimientos de Ahorro Recientes</CardTitle>
            <Button variant="ghost" size="sm">
              Ver todos
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample recent savings entries */}
            {[
              { fecha: '2024-01-15', concepto: 'Ahorro mensual automático', cantidad: 300, tipo: 'Ahorro Regular' },
              { fecha: '2024-01-10', concepto: 'Extra freelance guardado', cantidad: 150, tipo: 'Ahorro Extra' },
              { fecha: '2024-01-05', concepto: 'Sobras del presupuesto', cantidad: 75, tipo: 'Ahorro Ocasional' },
              { fecha: '2024-01-01', concepto: 'Meta año nuevo', cantidad: 500, tipo: 'Ahorro Meta' }
            ].map((movimiento, index) => (
              <div key={index} className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-lg">🏦</span>
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{movimiento.concepto}</div>
                    <div className="text-sm text-gray-500">
                      {new Date(movimiento.fecha).toLocaleDateString('es-ES')} • {movimiento.tipo}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-green-600">
                    +{formatCurrency(movimiento.cantidad)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-green-900">¡Excelente progreso! 🎉</h4>
                <p className="text-sm text-green-700 mt-1">
                  Has ahorrado {formatCurrency(currentMonthSavings)} este mes. 
                  Mantén el ritmo para alcanzar tus metas.
                </p>
              </div>
              <Button variant="success" size="sm">
                Añadir Ahorro
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Savings Goals Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso hacia Metas de Ahorro</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Sample savings goals */}
            {[
              { nombre: 'Fondo de Emergencia', meta: 5000, actual: 3200, prioridad: 'alta' },
              { nombre: 'Vacaciones 2024', meta: 2000, actual: 750, prioridad: 'media' },
              { nombre: 'Nuevo Laptop', meta: 1200, actual: 1200, prioridad: 'completada' }
            ].map((meta, index) => {
              const progress = (meta.actual / meta.meta) * 100;
              const isCompleted = progress >= 100;
              
              return (
                <div key={index} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{meta.nombre}</span>
                    <span className="text-sm text-gray-600">
                      {formatCurrency(meta.actual)} / {formatCurrency(meta.meta)}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-green-500' : 
                        meta.prioridad === 'alta' ? 'bg-red-400' :
                        meta.prioridad === 'media' ? 'bg-yellow-400' : 'bg-blue-400'
                      }`}
                      style={{ width: `${Math.min(progress, 100)}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{progress.toFixed(1)}% completado</span>
                    {isCompleted ? (
                      <span className="text-green-600 font-medium">✅ Completada</span>
                    ) : (
                      <span>Faltan {formatCurrency(meta.meta - meta.actual)}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 