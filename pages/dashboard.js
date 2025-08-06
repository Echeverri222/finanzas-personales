import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import SystemStatus from '../components/SystemStatus';
import { supabase } from '../lib/supabaseClient';
import { useUser } from '../contexts/UserContext';
import Link from 'next/link';

// Safe date creation function (exact copy from old component)
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

export default function DashboardPage() {
  const [movimientos, setMovimientos] = useState([]);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState(new Date().getMonth().toString());
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const { userProfile } = useUser();
  const [tiposMovimiento, setTiposMovimiento] = useState([]);

  // Load movimientos (exact copy from old component)
  const cargarMovimientos = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data: movimientosData, error: movimientosError } = await supabase
        .from('movimientos')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('fecha', { ascending: false });

      if (movimientosError) {
        throw new Error(movimientosError.message);
      }

      // Convert dates to proper format and ensure numbers (exact copy)
      const processedData = (movimientosData || []).map(mov => ({
        ...mov,
        fecha: createSafeDate(mov.fecha),
        importe: Number(mov.importe)
      }));

      setMovimientos(processedData);
    } catch (err) {
      console.error("Error al obtener movimientos:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load tipos (exact copy from old component)
  const cargarTiposMovimiento = async () => {
    if (!userProfile) return;
    const { data, error } = await supabase
      .from('tipo_movimiento')
      .select('*')
      .eq('usuario_id', userProfile.id)
      .order('created_at', { ascending: true });
    if (!error) setTiposMovimiento(data || []);
  };

  useEffect(() => {
    if (userProfile) {
      cargarMovimientos();
      cargarTiposMovimiento();
    }
  }, [userProfile]);

  // Local join to add tipo info (exact copy from old component)
  const movimientosConTipo = movimientos.map(mov => {
    const tipo = tiposMovimiento.find(t => t.id === mov.id_tipo_movimiento);
    return {
      ...mov,
      tipo_nombre: tipo ? tipo.nombre : '',
      tipo_meta: tipo ? tipo.meta : 0
    };
  });

  // Get categories for filter (exact copy from old component)
  const categories = tiposMovimiento.map(tipo => tipo.nombre);

  // Filter data based on selected filters (exact copy from old component)
  const filteredMovimientos = movimientosConTipo.filter(mov => {
    const movDate = createSafeDate(mov.fecha);
    const matchesYear = movDate.getFullYear() === yearFilter;
    const matchesMonth = monthFilter === 'all' || movDate.getMonth() === parseInt(monthFilter);
    const matchesCategory = categoryFilter === 'all' || mov.tipo_nombre === categoryFilter;
    return matchesYear && matchesMonth && matchesCategory;
  });

  // Year-only filtered data for monthly evolution (exact copy from old component)
  const yearFilteredMovimientos = movimientosConTipo.filter(mov => {
    const movDate = createSafeDate(mov.fecha);
    const matchesYear = movDate.getFullYear() === yearFilter;
    const matchesCategory = categoryFilter === 'all' || mov.tipo_nombre === categoryFilter;
    return matchesYear && matchesCategory;
  });

  // Calculate totals (exact copy from old component)
  const totalIngresos = filteredMovimientos
    .filter(mov => mov.tipo_nombre === 'Ingresos')
    .reduce((sum, mov) => sum + Number(mov.importe), 0);

  const totalGastos = filteredMovimientos
    .filter(mov => mov.tipo_nombre !== 'Ingresos')
    .reduce((sum, mov) => sum + Number(mov.importe), 0);

  // Monthly evolution data (exact copy from old component)
  const monthlyData = Object.entries(
    yearFilteredMovimientos.reduce((acc, mov) => {
      const movDate = createSafeDate(mov.fecha);
      
      const year = movDate.getFullYear();
      const month = movDate.getMonth();
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                         'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthYear = `${monthNames[month]} ${year.toString().slice(-2)}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = { 
          month: monthYear,
          timestamp: new Date(year, month, 1).getTime()
        };
      }
      
      if (categoryFilter === 'all') {
        if (mov.tipo_nombre === 'Ingresos') {
          acc[monthYear].ingresos = (acc[monthYear].ingresos || 0) + Number(mov.importe);
        } else if (mov.tipo_nombre !== 'Ahorro') {
          acc[monthYear].gastos = (acc[monthYear].gastos || 0) + Number(mov.importe);
        }
      } else if (mov.tipo_nombre === categoryFilter) {
        acc[monthYear].categoria = (acc[monthYear].categoria || 0) + Number(mov.importe);
      }
      
      return acc;
    }, {})
  )
    .map(([_, data]) => data)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Category data for charts (exact copy from old component)
  const categoryData = Object.entries(
    filteredMovimientos
      .filter(mov => mov.tipo_nombre !== 'Ingresos')
      .reduce((acc, mov) => {
        const categoria = mov.tipo_nombre;
        if (!acc[categoria]) {
          acc[categoria] = {
            name: categoria,
            value: 0,
            meta: 0
          };
        }
        acc[categoria].value += mov.importe;
        return acc;
      }, {})
  )
    .map(([_, data]) => data)
    .sort((a, b) => b.value - a.value);

  // Get unique years from actual data (exact copy from old component)
  const years = [...new Set(movimientosConTipo.map(mov => createSafeDate(mov.fecha).getFullYear()))]
    .sort((a, b) => b - a);

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
    if (monthFilter === 'all') return 'Todo el año';
    const monthObj = months.find(m => m.value === monthFilter);
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
          <h1 className="text-3xl font-bold text-gray-900">
            {categoryFilter === 'all' ? 'Dashboard Financiero' : `Análisis de ${categoryFilter}`}
          </h1>
          <p className="text-gray-600 mt-1">
            Resumen de tus finanzas para {getSelectedMonthName()} {yearFilter}
          </p>
        </div>
        
        {/* Date Filters and System Status Toggle */}
        <div className="flex items-center space-x-3">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSystemStatus(!showSystemStatus)}
          >
            {showSystemStatus ? 'Ocultar Estado' : 'Estado Sistema'}
          </Button>
          
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          
          <select 
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {months.map((month) => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>

          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* System Status (conditionally shown) */}
      {showSystemStatus && <SystemStatus />}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Stats Cards - Show different stats based on categoryFilter */}
      {categoryFilter === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Ingresos</p>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(totalIngresos)}
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
                    {formatCurrency(totalGastos)}
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
                  <p className={`text-2xl font-bold ${totalIngresos - totalGastos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalIngresos - totalGastos)}
                  </p>
                </div>
                <div className="text-3xl opacity-60">📊</div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // Category-specific stats would go here (like in old component)
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardContent>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(filteredMovimientos
                    .filter(mov => mov.tipo_nombre === categoryFilter)
                    .reduce((sum, mov) => sum + Number(mov.importe), 0)
                  )}
                </div>
                <div className="text-sm text-gray-600">Total en {categoryFilter}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

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
        {/* Monthly Evolution Chart - Shows year data */}
        <Card>
          <CardHeader>
            <CardTitle>Evolución Mensual {yearFilter}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis tickFormatter={(value) => `$${(value/1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                  <Area type="monotone" dataKey="ingresos" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="gastos" stackId="2" stroke="#EF4444" fill="#EF4444" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Gastos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`hsl(${index * 360 / categoryData.length}, 70%, 60%)`} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value), '']} />
                  </PieChart>
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
                      {createSafeDate(movimiento.fecha).toLocaleDateString('es-ES')} • {movimiento.tipo_nombre}
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
  );
} 