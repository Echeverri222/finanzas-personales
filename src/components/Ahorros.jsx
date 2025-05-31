import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { TIPOS_MOVIMIENTO } from '../config';

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

  const cargarAhorros = async () => {
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
          tipo_movimiento
        `)
        .eq('tipo_movimiento', 'Ahorro')
        .order('fecha', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      // Transformar los datos para mantener compatibilidad
      const transformedData = data.map(mov => ({
        id: mov.id,
        fecha: mov.fecha,
        monto: mov.importe,
        descripcion: mov.nombre
      }));

      setAhorros(transformedData || []);
    } catch (err) {
      console.error("Error al obtener ahorros:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAhorros();

    // Suscribirse a cambios en tiempo real de movimientos tipo Ahorro
    const subscription = supabase
      .channel('movimientos_ahorros_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'movimientos',
          filter: 'tipo_movimiento=eq.Ahorro'
        }, 
        () => {
          cargarAhorros();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
    try {
      setLoading(true);
      setError(null);

      // Crear la fecha en UTC para evitar problemas de zona horaria
      const [year, month, day] = nuevo.fecha.split('-').map(Number);
      const fecha = new Date(Date.UTC(year, month - 1, day));

      // Ahora insertamos en movimientos en lugar de ahorros
      const { error: supabaseError } = await supabase
        .from('movimientos')
        .insert([{
          fecha: fecha.toISOString(),
          nombre: nuevo.descripcion,
          importe: Number(nuevo.monto),
          tipo_movimiento: 'Ahorro'
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
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('movimientos')
        .delete()
        .eq('id', id);

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

  const totalAhorros = ahorros.reduce((sum, ahorro) => sum + Number(ahorro.monto), 0);

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
              <p className="text-2xl md:text-3xl font-bold text-green-600">{formatCurrency(totalAhorros)}</p>
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

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Monto</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {ahorros.map((ahorro) => (
                  <tr key={ahorro.id} className="hover:bg-gray-50">
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                      {formatDate(ahorro.fecha)}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                      <span className="font-medium text-green-600">
                        {formatCurrency(ahorro.monto)}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                      {ahorro.descripcion || '-'}
                    </td>
                    <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium">
                      <button
                        onClick={() => handleDelete(ahorro.id)}
                        className="text-red-600 hover:text-red-900 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
