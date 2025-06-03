import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function Ahorros() {
  const [ahorros, setAhorros] = useState([]);
  const [nuevo, setNuevo] = useState({
    fecha: '',
    monto: '',
    descripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { userProfile } = useUser();

  const cargarAhorros = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('movimientos')
        .select(`
          id,
          fecha,
          nombre,
          importe,
          categoria:categorias(
            id,
            nombre
          )
        `)
        .eq('categoria.nombre', 'Ahorro')
        .eq('usuario_id', userProfile.id)
        .order('fecha', { ascending: true });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Transformar los datos para el gráfico acumulativo
      let acumulado = 0;
      const datosGrafico = (data || []).map(mov => {
        acumulado += mov.importe;
        return {
          fecha: formatDate(mov.fecha),
          monto: mov.importe,
          acumulado: acumulado,
          descripcion: mov.nombre
        };
      });

      setAhorros(datosGrafico);
    } catch (err) {
      console.error("Error al obtener ahorros:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
    cargarAhorros();
    }
  }, [userProfile]);

  const handleChange = (e) => {
    setNuevo({...nuevo, [e.target.name]: e.target.value});
  };

  const resetForm = () => {
    setNuevo({
      fecha: '',
      monto: '',
      descripcion: ''
    });
    setShowForm(false);
  };

  const agregarAhorro = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      setError(null);

      const [year, month, day] = nuevo.fecha.split('-').map(Number);
      const fecha = new Date(Date.UTC(year, month - 1, day));

      // Primero obtener el ID de la categoría Ahorro
      const { data: categoriaData, error: categoriaError } = await supabase
        .from('categorias')
        .select('id')
        .eq('nombre', 'Ahorro')
        .eq('usuario_id', userProfile.id)
        .single();

      if (categoriaError) {
        throw new Error(categoriaError.message);
      }

      if (!categoriaData) {
        throw new Error('No se encontró la categoría Ahorro');
      }

      const { error: supabaseError } = await supabase
        .from('movimientos')
        .insert([{
          fecha: fecha.toISOString(),
          nombre: nuevo.descripcion,
          importe: Number(nuevo.monto),
          categoria_id: categoriaData.id,
          usuario_id: userProfile.id
        }]);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      resetForm();
      await cargarAhorros();
    } catch (err) {
      console.error("Error al guardar ahorro:", err);
      setError(err.message || "Error al guardar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!userProfile) return;

    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('movimientos')
        .delete()
        .eq('id', id)
        .eq('usuario_id', userProfile.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await cargarAhorros();
    } catch (err) {
      console.error("Error al eliminar:", err);
      setError(err.message || "Error al eliminar el ahorro");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      // Convertir la fecha ISO a UTC
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC'
      });
    } catch (err) {
      return dateStr;
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200">
          <p className="font-semibold">{label}</p>
          <p className="text-green-600">
            Total Acumulado: {formatCurrency(payload[0].value)}
          </p>
          {payload[0].payload.monto && (
            <p className="text-blue-600">
              Ahorro del día: {formatCurrency(payload[0].payload.monto)}
            </p>
          )}
          {payload[0].payload.descripcion && (
            <p className="text-gray-600">
              Descripción: {payload[0].payload.descripcion}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading && !showForm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Gestión de Ahorros</h2>
        <button 
          onClick={() => setShowForm(!showForm)} 
          className={`w-full md:w-auto px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
            showForm 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {showForm ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Nuevo Ahorro
            </>
          )}
        </button>
      </div>

      {/* Total Ahorros Card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Ahorrado</p>
              <p className="text-2xl md:text-3xl font-bold text-green-600">
                {formatCurrency(ahorros.length > 0 ? ahorros[ahorros.length - 1].acumulado : 0)}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="w-6 md:w-8 h-6 md:h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg text-sm md:text-base">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Nuevo Ahorro</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input 
                name="fecha" 
                type="date" 
                value={nuevo.fecha} 
                onChange={handleChange} 
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Monto</label>
              <input 
                name="monto" 
                type="number" 
                placeholder="0" 
                value={nuevo.monto} 
                onChange={handleChange} 
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base" 
              />
            </div>
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Descripción</label>
              <input 
                name="descripcion" 
                placeholder="Descripción del ahorro" 
                value={nuevo.descripcion} 
                onChange={handleChange} 
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base" 
              />
            </div>
          </div>
          <div className="mt-6 flex flex-col md:flex-row justify-end gap-3">
            <button
              onClick={resetForm}
              className="w-full md:w-auto px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button 
              onClick={agregarAhorro} 
              className={`w-full md:w-auto px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Gráfico de Evolución de Ahorros */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
        <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Evolución de Ahorros</h3>
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={ahorros}
              margin={{
                top: 5,
                right: 30,
                left: 20,
                bottom: 5,
              }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis 
                dataKey="fecha" 
                tick={{ fill: '#4B5563' }}
                axisLine={{ stroke: '#E5E7EB' }}
              />
              <YAxis
                tick={{ fill: '#4B5563' }}
                axisLine={{ stroke: '#E5E7EB' }}
                tickFormatter={(value) => formatCurrency(value)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="acumulado"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: '#10B981', stroke: '#10B981', strokeWidth: 2 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
