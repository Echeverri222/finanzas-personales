import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';
import { supabase } from '../supabaseClient';

const COLORS = {
  Ingresos: '#10B981',
  Alimentacion: '#60A5FA',
  Transporte: '#34D399',
  Compras: '#F87171',
  'Gastos fijos': '#FBBF24',
  Ahorro: '#6366F1',
  Salidas: '#34D399',
  Otros: '#A78BFA'
};

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

// Función para crear fecha correcta sin problemas de zona horaria
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

export default function Dashboard({ onQuickMovement }) {
  const [movimientos, setMovimientos] = useState([]);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarMovimientos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('movimientos')
        .select('*')
        .order('fecha', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Convert dates to proper format and ensure numbers
      const processedData = (data || []).map(mov => ({
        ...mov,
        fecha: createSafeDate(mov.fecha), // Usar función segura para fechas
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

  useEffect(() => {
    cargarMovimientos();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('movimientos_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'movimientos' 
        }, 
        () => {
          cargarMovimientos();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Filter data based on selected filters - CORREGIDO
  const filteredMovimientos = movimientos.filter(mov => {
    const movDate = createSafeDate(mov.fecha); // Usar función segura
    const matchesYear = movDate.getFullYear() === yearFilter;
    const matchesMonth = monthFilter === 'all' || movDate.getMonth() === parseInt(monthFilter);
    const matchesCategory = categoryFilter === 'all' || mov.tipo_movimiento === categoryFilter;
    return matchesYear && matchesMonth && matchesCategory;
  });

  // Calculate totals
  const totalIngresos = filteredMovimientos
    .filter(mov => mov.tipo_movimiento === 'Ingresos')
    .reduce((sum, mov) => sum + Number(mov.importe), 0);

  const totalGastos = filteredMovimientos
    .filter(mov => mov.tipo_movimiento !== 'Ingresos')
    .reduce((sum, mov) => sum + Number(mov.importe), 0);

  // Prepare data for category pie chart
  const categoryData = Object.entries(
    filteredMovimientos
      .filter(mov => mov.tipo_movimiento !== 'Ingresos')
      .reduce((acc, mov) => {
        acc[mov.tipo_movimiento] = (acc[mov.tipo_movimiento] || 0) + mov.importe;
        return acc;
      }, {})
  )
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // Prepare data for monthly evolution - CORREGIDO
  const monthlyData = Object.entries(
    filteredMovimientos.reduce((acc, mov) => {
      const movDate = createSafeDate(mov.fecha); // Usar función segura
      
      // Crear clave de mes-año de forma más segura
      const year = movDate.getFullYear();
      const month = movDate.getMonth();
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 
                         'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const monthYear = `${monthNames[month]} ${year.toString().slice(-2)}`;
      
      if (!acc[monthYear]) {
        acc[monthYear] = { 
          month: monthYear,
          timestamp: new Date(year, month, 1).getTime() // Timestamp del primer día del mes
        };
      }
      
      if (categoryFilter === 'all') {
        if (mov.tipo_movimiento === 'Ingresos') {
          acc[monthYear].ingresos = (acc[monthYear].ingresos || 0) + Number(mov.importe);
        } else {
          acc[monthYear].gastos = (acc[monthYear].gastos || 0) + Number(mov.importe);
        }
      } else if (mov.tipo_movimiento === categoryFilter) {
        acc[monthYear].categoria = (acc[monthYear].categoria || 0) + Number(mov.importe);
      }
      
      return acc;
    }, {})
  )
    .map(([_, data]) => data)
    .sort((a, b) => a.timestamp - b.timestamp); // Ordenar por timestamp

  // Get unique years from actual data - CORREGIDO
  const years = [...new Set(movimientos.map(mov => createSafeDate(mov.fecha).getFullYear()))]
    .sort((a, b) => b - a);
  
  const categories = [...new Set(movimientos.map(mov => mov.tipo_movimiento))];
  
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

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getPercentageChange = (current, previous) => {
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
  };

  // Calculate previous month data correctly - CORREGIDO
  const getPreviousMonthData = () => {
    const today = new Date();
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1);
    
    const previousMonthMovimientos = movimientos.filter(mov => {
      const movDate = createSafeDate(mov.fecha); // Usar función segura
      return movDate.getMonth() === previousMonth.getMonth() && 
             movDate.getFullYear() === previousMonth.getFullYear();
    });

    return {
      ingresos: previousMonthMovimientos
        .filter(mov => mov.tipo_movimiento === 'Ingresos')
        .reduce((sum, mov) => sum + Number(mov.importe), 0),
      gastos: previousMonthMovimientos
        .filter(mov => mov.tipo_movimiento !== 'Ingresos')
        .reduce((sum, mov) => sum + Number(mov.importe), 0)
    };
  };

  const previousMonthData = getPreviousMonthData();

  const getCategoryStats = () => {
    if (categoryFilter === 'all') return null;

    const categoryMovimientos = movimientos.filter(mov => mov.tipo_movimiento === categoryFilter);
    const total = categoryMovimientos.reduce((sum, mov) => sum + mov.importe, 0);
    const promedio = total / (categoryMovimientos.length || 1);
    const maximo = Math.max(...categoryMovimientos.map(mov => mov.importe), 0);
    const minimo = Math.min(...categoryMovimientos.map(mov => mov.importe), 0);
    
    // Calcular tendencia (últimos 3 meses) - CORREGIDO
    const today = new Date();
    const tresMesesAtras = new Date(today.getFullYear(), today.getMonth() - 3);
    
    const movimientosPorMes = categoryMovimientos
      .filter(mov => createSafeDate(mov.fecha) >= tresMesesAtras) // Usar función segura
      .reduce((acc, mov) => {
        const fecha = createSafeDate(mov.fecha); // Usar función segura
        const mesKey = `${fecha.getFullYear()}-${fecha.getMonth()}`;
        if (!acc[mesKey]) acc[mesKey] = 0;
        acc[mesKey] += mov.importe;
        return acc;
      }, {});

    const tendencia = Object.values(movimientosPorMes).length >= 2 
      ? (Object.values(movimientosPorMes)[Object.values(movimientosPorMes).length - 1] - 
         Object.values(movimientosPorMes)[0]) / Object.values(movimientosPorMes)[0] * 100
      : 0;

    return { total, promedio, maximo, minimo, tendencia };
  };

  const categoryStats = getCategoryStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 bg-gray-50">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">
          {categoryFilter === 'all' ? 'Dashboard Financiero' : `Análisis de ${categoryFilter}`}
        </h2>
        
        {/* Filtros con diseño moderno y responsivo */}
        <div className="flex flex-col md:flex-row gap-2 md:gap-4">
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(parseInt(e.target.value))}
            className="px-3 md:px-4 py-2 rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select 
            value={monthFilter} 
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 md:px-4 py-2 rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>

          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 md:px-4 py-2 rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="all">Todas las categorías</option>
            {categories.filter(cat => cat !== 'Ingresos').map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg text-sm md:text-base">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Tarjetas de resumen */}
      {categoryFilter === 'all' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          <div className="bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:scale-105">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Ingresos</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIngresos)}</p>
                </div>
                <button 
                  onClick={() => onQuickMovement('Ingresos')}
                  className="bg-green-100 p-3 rounded-full hover:bg-green-200 transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
              {previousMonthData.ingresos && (
                <div className="mt-4 flex items-center">
                  <span className={`text-sm ${getPercentageChange(totalIngresos, previousMonthData.ingresos) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {getPercentageChange(totalIngresos, previousMonthData.ingresos).toFixed(1)}% vs mes anterior
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:scale-105">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Gastos</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(totalGastos)}</p>
                </div>
                <button 
                  onClick={() => onQuickMovement('Gastos')}
                  className="bg-red-100 p-3 rounded-full hover:bg-red-200 transition-colors cursor-pointer"
                >
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                  </svg>
                </button>
              </div>
              {previousMonthData.gastos && (
                <div className="mt-4 flex items-center">
                  <span className={`text-sm ${getPercentageChange(totalGastos, previousMonthData.gastos) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {getPercentageChange(totalGastos, previousMonthData.gastos).toFixed(1)}% vs mes anterior
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:scale-105">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Balance Neto</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalIngresos - totalGastos)}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
              </div>
              <div className="mt-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full ${totalIngresos - totalGastos > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                    style={{ width: `${Math.min(Math.abs((totalIngresos - totalGastos) / totalIngresos * 100), 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total en {categoryFilter}</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(categoryStats.total)}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Promedio por Movimiento</p>
                  <p className="text-2xl font-bold text-indigo-600">{formatCurrency(categoryStats.promedio)}</p>
                </div>
                <div className="bg-indigo-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Máximo Gasto</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(categoryStats.maximo)}</p>
                </div>
                <div className="bg-red-100 p-3 rounded-full">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Tendencia (3 meses)</p>
                  <div className="flex items-center">
                    <p className={`text-2xl font-bold ${categoryStats.tendencia > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {categoryStats.tendencia.toFixed(1)}%
                    </p>
                    {categoryStats.tendencia !== 0 && (
                      <svg 
                        className={`w-6 h-6 ml-2 ${categoryStats.tendencia > 0 ? 'text-red-600' : 'text-green-600'}`} 
                        fill="none" 
                        stroke="currentColor" 
                        viewBox="0 0 24 24"
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          strokeWidth="2" 
                          d={categoryStats.tendencia > 0 
                            ? "M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" 
                            : "M13 17h8m0 0V9m0 8l-8-8-4 4-6-6"} 
                        />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {categoryFilter === 'all' ? (
          <>
            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Distribución de Gastos</h3>
              <div className="h-60 md:h-80">
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
                          fill={COLORS[entry.name]}
                          className="transition-opacity hover:opacity-80"
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-md">
              <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Gastos por Categoría</h3>
              <div className="h-60 md:h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={categoryData} 
                    layout="vertical"
                    margin={{ top: 5, right: 20, left: 60, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      width={60}
                      tick={{ fill: '#4B5563' }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar 
                      dataKey="value" 
                      radius={[0, 4, 4, 0]}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[entry.name]}
                          className="transition-opacity hover:opacity-80"
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <div className="col-span-1 md:col-span-2 bg-white p-4 rounded-xl shadow-md">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Evolución de {categoryFilter}</h3>
            <div className="h-60 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={monthlyData}
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#4B5563' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fill: '#4B5563' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="categoria"
                    stroke={COLORS[categoryFilter]}
                    strokeWidth={2}
                    dot={{ fill: COLORS[categoryFilter], stroke: COLORS[categoryFilter], strokeWidth: 2 }}
                    activeDot={{ r: 8 }}
                    name={categoryFilter}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {categoryFilter === 'all' && (
          <div className="col-span-1 md:col-span-2 bg-white p-4 rounded-xl shadow-md">
            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Evolución Mensual</h3>
            <div className="h-60 md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart 
                  data={monthlyData}
                  margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fill: '#4B5563' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <YAxis 
                    tick={{ fill: '#4B5563' }}
                    axisLine={{ stroke: '#E5E7EB' }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="ingresos" 
                    stroke="#10B981" 
                    strokeWidth={2}
                    dot={{ fill: '#10B981', stroke: '#10B981', strokeWidth: 2 }}
                    activeDot={{ r: 8 }}
                    name="Ingresos"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="gastos" 
                    stroke="#EF4444" 
                    strokeWidth={2}
                    dot={{ fill: '#EF4444', stroke: '#EF4444', strokeWidth: 2 }}
                    activeDot={{ r: 8 }}
                    name="Gastos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}