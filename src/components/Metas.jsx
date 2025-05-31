import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';

export default function Metas() {
  const [metas, setMetas] = useState([]);
  const [nueva, setNueva] = useState({
    nombre: '',
    meta_total: '',
    fecha_meta: '',
    descripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const { userProfile } = useUser();

  const cargarMetas = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('metas')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('fecha_meta', { ascending: true });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setMetas(data || []);
    } catch (err) {
      console.error("Error al obtener metas:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      cargarMetas();
    }
  }, [userProfile]);

  const handleChange = (e) => {
    setNueva({...nueva, [e.target.name]: e.target.value});
  };

  const resetForm = () => {
    setNueva({
      nombre: '',
      meta_total: '',
      fecha_meta: '',
      descripcion: ''
    });
    setShowForm(false);
  };

  const agregarMeta = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      setError(null);

      const [year, month, day] = nueva.fecha_meta.split('-').map(Number);
      const fecha = new Date(Date.UTC(year, month - 1, day));

      const metaData = {
        nombre: nueva.nombre,
        meta_total: Number(nueva.meta_total),
        fecha_meta: fecha.toISOString(),
        descripcion: nueva.descripcion,
        usuario_id: userProfile.id
      };

      const { error: supabaseError } = await supabase
        .from('metas')
        .insert([metaData]);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      resetForm();
      await cargarMetas();
    } catch (err) {
      console.error("Error al guardar meta:", err);
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
        .from('metas')
        .delete()
        .eq('id', id)
        .eq('usuario_id', userProfile.id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await cargarMetas();
    } catch (err) {
      console.error("Error al eliminar:", err);
      setError(err.message || "Error al eliminar la meta");
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

  const calcularProgreso = (meta) => {
    const hoy = new Date();
    const fechaCreacion = meta.created_at ? new Date(Date.UTC(
      new Date(meta.created_at).getFullYear(),
      new Date(meta.created_at).getMonth(),
      new Date(meta.created_at).getDate()
    )) : hoy;
    
    const fechaMeta = new Date(Date.UTC(
      new Date(meta.fecha_meta).getFullYear(),
      new Date(meta.fecha_meta).getMonth(),
      new Date(meta.fecha_meta).getDate()
    ));
    
    const diasTotales = (fechaMeta - fechaCreacion) / (1000 * 60 * 60 * 24);
    const diasRestantes = (fechaMeta - hoy) / (1000 * 60 * 60 * 24);
    return Math.max(0, Math.min(100, ((diasTotales - diasRestantes) / diasTotales) * 100));
  };

  const totalMetas = metas.reduce((sum, meta) => sum + Number(meta.meta_total), 0);
  const metasPendientes = metas.filter(meta => new Date(meta.fecha_meta) > new Date()).length;
  const metasVencidas = metas.filter(meta => new Date(meta.fecha_meta) < new Date()).length;

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
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Gestión de Metas</h2>
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
              Nueva Meta
            </>
          )}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total en Metas</p>
                <p className="text-2xl md:text-3xl font-bold text-purple-600">{formatCurrency(totalMetas)}</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 md:w-8 h-6 md:h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Metas Pendientes</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600">{metasPendientes}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 md:w-8 h-6 md:h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Metas Vencidas</p>
                <p className="text-2xl md:text-3xl font-bold text-red-600">{metasVencidas}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 md:w-8 h-6 md:h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
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
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Nueva Meta</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input 
                name="nombre" 
                placeholder="Nombre de la meta" 
                value={nueva.nombre} 
                onChange={handleChange} 
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Monto Objetivo</label>
              <input 
                name="meta_total" 
                type="number" 
                placeholder="0" 
                value={nueva.meta_total} 
                onChange={handleChange} 
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Fecha Objetivo</label>
              <input 
                name="fecha_meta" 
                type="date" 
                value={nueva.fecha_meta} 
                onChange={handleChange} 
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base" 
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Descripción</label>
              <input 
                name="descripcion" 
                placeholder="Descripción de la meta" 
                value={nueva.descripcion} 
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
              onClick={agregarMeta} 
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
                  <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Monto Objetivo</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Fecha Objetivo</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Progreso</th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Descripción</th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {metas.map((meta) => {
                  const progreso = calcularProgreso(meta);
                  const fechaMeta = new Date(meta.fecha_meta);
                  const hoy = new Date();
                  const estaVencida = fechaMeta < hoy;

                  return (
                    <tr key={meta.id} className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                        {meta.nombre}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                        <span className="font-medium text-purple-600">
                          {formatCurrency(meta.meta_total)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          estaVencida ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {formatDate(meta.fecha_meta)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${
                              estaVencida ? 'bg-red-600' : 'bg-blue-600'
                            }`}
                            style={{ width: `${progreso}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{Math.round(progreso)}% completado</span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                        {meta.descripcion || '-'}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium">
                        <button
                          onClick={() => handleDelete(meta.id)}
                          className="text-red-600 hover:text-red-900 transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
