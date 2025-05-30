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

export default function Dashboard() {
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

      // Convert fecha strings to Date objects and importe to numbers
      const processedData = (data || []).map(mov => ({
        ...mov,
        fecha: new Date(mov.fecha),
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

  // Filter data based on selected filters
  const filteredMovimientos = movimientos.filter(mov => {
    const matchesYear = mov.fecha.getFullYear() === yearFilter;
    const matchesMonth = monthFilter === 'all' || mov.fecha.getMonth() === parseInt(monthFilter);
    const matchesCategory = categoryFilter === 'all' || mov.tipo_movimiento === categoryFilter;
    return matchesYear && matchesMonth && matchesCategory;
  });

  // Calculate totals
  const totalIngresos = filteredMovimientos
    .filter(mov => mov.tipo_movimiento === 'Ingresos')
    .reduce((sum, mov) => sum + mov.importe, 0);

  const totalGastos = filteredMovimientos
    .filter(mov => mov.tipo_movimiento !== 'Ingresos')
    .reduce((sum, mov) => sum + mov.importe, 0);

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

  // Prepare data for monthly evolution
  const monthlyData = Object.entries(
    filteredMovimientos.reduce((acc, mov) => {
      const monthYear = mov.fecha.toLocaleString('es-CO', { month: 'short', year: '2-digit' });
      if (!acc[monthYear]) {
        acc[monthYear] = { month: monthYear };
      }
      if (mov.tipo_movimiento === 'Ingresos') {
        acc[monthYear].ingresos = (acc[monthYear].ingresos || 0) + mov.importe;
      } else {
        acc[monthYear].gastos = (acc[monthYear].gastos || 0) + mov.importe;
      }
      return acc;
    }, {})
  ).map(([_, data]) => data);

  // Get unique years and categories for filters
  const years = [...new Set(movimientos.map(mov => mov.fecha.getFullYear()))];
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

  // Calcular totales del mes anterior para comparación
  const getPreviousMonthData = () => {
    const today = new Date();
    const previousMonth = new Date(today.getFullYear(), today.getMonth() - 1);
    
    const previousMonthMovimientos = movimientos.filter(mov => {
      const movDate = new Date(mov.fecha);
      return movDate.getMonth() === previousMonth.getMonth() && 
             movDate.getFullYear() === previousMonth.getFullYear();
    });

    return {
      ingresos: previousMonthMovimientos
        .filter(mov => mov.tipo_movimiento === 'Ingresos')
        .reduce((sum, mov) => sum + mov.importe, 0),
      gastos: previousMonthMovimientos
        .filter(mov => mov.tipo_movimiento !== 'Ingresos')
        .reduce((sum, mov) => sum + mov.importe, 0)
    };
  };

  const previousMonthData = getPreviousMonthData();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-gray-50">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard Financiero</h2>
        
        {/* Filtros con diseño moderno */}
        <div className="flex gap-4">
          <select 
            value={yearFilter} 
            onChange={(e) => setYearFilter(parseInt(e.target.value))}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select 
            value={monthFilter} 
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {months.map(month => (
              <option key={month.value} value={month.value}>{month.label}</option>
            ))}
          </select>

          <select 
            value={categoryFilter} 
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">Todas las categorías</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Tarjetas de resumen mejoradas */}
      <div className="grid grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-md overflow-hidden transition-transform hover:scale-105">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Ingresos</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalIngresos)}</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </div>
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
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4" />
                </svg>
              </div>
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

      {/* Gráficos mejorados */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Distribución de Gastos</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={categoryData} 
                  dataKey="value" 
                  outerRadius={100}
                  innerRadius={60}
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

        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Gastos por Categoría</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={categoryData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
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

        <div className="col-span-2 bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Evolución Mensual</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
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
      </div>
    </div>
  );
} 