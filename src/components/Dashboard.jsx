import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, Legend } from 'recharts';

const API_URL = 'https://script.google.com/macros/s/AKfycbwrYbgURYW3kr6pNwjqA2L7vPB7gJ-2zwkaSsaYDStbPx7U0q_W_KwwuNktsWSfg0M/exec';

const COLORS = {
  Ingresos: '#4ade80',
  Alimentacion: '#63B3ED',
  Transporte: '#38B2AC',
  Compras: '#F56565',
  'Gastos fijos': '#FBD38D',
  Ahorro: '#2B6CB0',
  Salidas: '#48BB78',
  Otros: '#D6BCFA'
};

export default function Dashboard() {
  const [movimientos, setMovimientos] = useState([]);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [monthFilter, setMonthFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

  useEffect(() => {
    fetch(`${API_URL}?type=movimientos`)
      .then(res => res.text())
      .then(data => {
        try {
          const jsonData = JSON.parse(data);
          if (Array.isArray(jsonData)) {
            // Convert fecha strings to Date objects
            const processedData = jsonData.map(mov => ({
              ...mov,
              fecha: new Date(mov.fecha),
              importe: parseFloat(mov.importe)
            }));
            setMovimientos(processedData);
          }
        } catch (e) {
          console.error("Error al procesar datos:", e);
          setMovimientos([]);
        }
      })
      .catch(err => {
        console.error("Error al obtener movimientos:", err);
        setMovimientos([]);
      });
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
    .sort((a, b) => b.value - a.value);  // Sort in descending order

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

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Dashboard Resumen</h2>

      {/* Filters */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <select 
          value={yearFilter} 
          onChange={(e) => setYearFilter(parseInt(e.target.value))}
          className="border p-2 rounded"
        >
          {years.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>

        <select 
          value={monthFilter} 
          onChange={(e) => setMonthFilter(e.target.value)}
          className="border p-2 rounded"
        >
          {months.map(month => (
            <option key={month.value} value={month.value}>{month.label}</option>
          ))}
        </select>

        <select 
          value={categoryFilter} 
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border p-2 rounded"
        >
          <option value="all">Todas las categorías</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-100 p-4 rounded-lg">
          <h3 className="text-sm text-green-800">Total Ingresos</h3>
          <p className="text-2xl font-bold text-green-600">${totalIngresos.toLocaleString('es-CO')}</p>
        </div>
        <div className="bg-red-100 p-4 rounded-lg">
          <h3 className="text-sm text-red-800">Total Gastos</h3>
          <p className="text-2xl font-bold text-red-600">${totalGastos.toLocaleString('es-CO')}</p>
        </div>
        <div className="bg-blue-100 p-4 rounded-lg">
          <h3 className="text-sm text-blue-800">Balance Neto</h3>
          <p className="text-2xl font-bold text-blue-600">${(totalIngresos - totalGastos).toLocaleString('es-CO')}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Distribución de Gastos</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={categoryData} 
                  dataKey="value" 
                  outerRadius={80} 
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString('es-CO')}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Gastos por Categoría</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={categoryData} 
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={80}
                />
                <Tooltip formatter={(value) => `$${value.toLocaleString('es-CO')}`} />
                <Bar 
                  dataKey="value" 
                  fill="#4f46e5"
                  barSize={20}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Line Chart - Monthly Evolution */}
        <div className="col-span-2 bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-4">Evolución Mensual</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value.toLocaleString('es-CO')}`} />
                <Legend />
                <Line type="monotone" dataKey="ingresos" stroke="#4ade80" name="Ingresos" />
                <Line type="monotone" dataKey="gastos" stroke="#f87171" name="Gastos" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
} 