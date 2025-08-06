import { useState, useEffect } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
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

// Custom color scheme from old component
const COLORS = {
  'Ingresos': '#10B981',
  'Alimentacion': '#60A5FA',
  'Transporte': '#34D399',
  'Compras': '#F87171',
  'Gastos fijos': '#FBBF24',
  'Ahorro': '#6366F1',
  'Salidas': '#34D399',
  'Otros': '#A78BFA'
};

// Custom tooltip from old component
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
        <p className="font-semibold">{label}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }}>
            {entry.name}: ${entry.value.toLocaleString('es-CO')}
          </p>
        ))}
      </div>
    );
  }
  return null;
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

  // Calculate savings for this period (exact copy from old component)
  const ahorrosMes = filteredMovimientos
    .filter(mov => mov.tipo_nombre === 'Ahorro')
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
    <div className="space-y-4 md:space-y-8 px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
        <div>
          <h1 className="text-xl md:text-3xl font-bold text-gray-900">
            {categoryFilter === 'all' ? 'Dashboard' : `${categoryFilter}`}
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            {getSelectedMonthName()} {yearFilter}
          </p>
        </div>
        
        {/* Date Filters and System Status Toggle */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowSystemStatus(!showSystemStatus)}
            className="w-full sm:w-auto text-xs"
          >
            {showSystemStatus ? 'Ocultar Estado' : 'Estado Sistema'}
          </Button>
          
          <div className="grid grid-cols-3 gap-2 sm:flex sm:space-x-2">
            <select 
              value={yearFilter} 
              onChange={(e) => setYearFilter(parseInt(e.target.value))}
              className="px-2 py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
            
            <select 
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="px-2 py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {months.map((month) => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>

            <select 
              value={categoryFilter} 
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-2 py-2 border border-gray-300 rounded-lg text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Total Ingresos</p>
                  <p className="text-lg md:text-2xl font-bold text-green-600">
                    {formatCurrency(totalIngresos)}
                  </p>
                </div>
                <div className="text-xl md:text-3xl opacity-60">💰</div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Total Gastos</p>
                  <p className="text-lg md:text-2xl font-bold text-red-600">
                    {formatCurrency(totalGastos)}
                  </p>
                </div>
                <div className="text-xl md:text-3xl opacity-60">💸</div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Balance Neto</p>
                  <p className={`text-lg md:text-2xl font-bold ${totalIngresos - totalGastos >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalIngresos - totalGastos)}
                  </p>
                </div>
                <div className="text-xl md:text-3xl opacity-60">📊</div>
              </div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm font-medium text-gray-600 mb-1">Ahorrado este período</p>
                  <p className="text-lg md:text-2xl font-bold text-blue-600">
                    {formatCurrency(ahorrosMes)}
                  </p>
                </div>
                <div className="text-xl md:text-3xl opacity-60">🏦</div>
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
          <CardTitle className="text-lg md:text-xl">Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            {quickActions.map((action, index) => (
              <Link key={index} href={action.href}>
                <button
                  className={`w-full p-3 md:p-4 rounded-xl ${action.color} hover:opacity-80 transition-opacity text-center`}
                >
                  <div className="text-lg md:text-2xl mb-1 md:mb-2">{action.icon}</div>
                  <div className="font-medium text-xs md:text-sm">{action.title}</div>
                </button>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
        {/* Monthly Evolution Chart - Shows year data */}
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Evolución Mensual {yearFilter}</h3>
          <div className="h-60 md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart 
                data={monthlyData}
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <defs>
                  <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fill: '#4B5563' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  tickFormatter={(value) => new Intl.NumberFormat('es-CO', { notation: 'compact', compactDisplay: 'short' }).format(value)}
                  tick={{ fill: '#4B5563' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="ingresos" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  dot={{ fill: '#10B981', stroke: '#10B981', strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                  name="Ingresos"
                  fill="url(#colorIngresos)"
                />
                <Area 
                  type="monotone" 
                  dataKey="gastos" 
                  stroke="#EF4444" 
                  strokeWidth={2}
                  dot={{ fill: '#EF4444', stroke: '#EF4444', strokeWidth: 2 }}
                  activeDot={{ r: 8 }}
                  name="Gastos"
                  fill="url(#colorGastos)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Distribution - Donut Chart */}
        <div className="bg-white p-4 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Distribución de Gastos</h3>
          <div className="h-60 md:h-80">
            {categoryData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <Pie 
                    data={categoryData} 
                    dataKey="value" 
                    outerRadius={130}
                    innerRadius={90}
                    paddingAngle={2}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={COLORS[entry.name] || `hsl(${index * 360 / categoryData.length}, 70%, 60%)`}
                        className="transition-opacity hover:opacity-80"
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
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
        </div>
      </div>

      {/* Recent Movements - Shows filtered period */}
      <div className="bg-white p-4 rounded-xl shadow-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base md:text-lg font-semibold text-gray-800">Movimientos Recientes</h3>
          <Link href="/movimientos">
            <Button variant="ghost" size="sm" className="text-xs md:text-sm">Ver todos</Button>
          </Link>
        </div>
        <div className="space-y-3 md:space-y-4">
          {filteredMovimientos.slice(0, 5).map((movimiento) => (
            <div key={movimiento.id} className="flex items-center justify-between p-2 md:p-3 border border-gray-100 rounded-lg hover:bg-gray-50">
              <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                <div className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center ${
                  movimiento.tipo_nombre === 'Ingresos' ? 'bg-green-100' :
                  movimiento.tipo_nombre === 'Ahorro' ? 'bg-blue-100' : 'bg-red-100'
                }`}>
                  <span className="text-sm md:text-lg">
                    {movimiento.tipo_nombre === 'Ingresos' ? '💰' :
                     movimiento.tipo_nombre === 'Ahorro' ? '🏦' : '💸'}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-gray-900 text-sm md:text-base truncate">{movimiento.nombre}</div>
                  <div className="text-xs md:text-sm text-gray-500">
                    {createSafeDate(movimiento.fecha).toLocaleDateString('es-ES')} • {movimiento.tipo_nombre}
                  </div>
                </div>
              </div>
              <div className={`text-right font-semibold text-sm md:text-base flex-shrink-0 ml-2 ${
                movimiento.tipo_nombre === 'Ingresos' ? 'text-green-600' : 'text-red-600'
              }`}>
                {movimiento.tipo_nombre === 'Ingresos' ? '+' : '-'}{formatCurrency(Math.abs(movimiento.importe))}
              </div>
            </div>
          ))}
          
          {filteredMovimientos.length === 0 && (
            <div className="text-center py-6 md:py-8 text-gray-500">
              <div className="text-2xl md:text-4xl mb-2">📋</div>
              <p className="text-sm md:text-base">No hay movimientos en este período</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 