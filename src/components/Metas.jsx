import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';

export default function Metas() {
  const [metas, setMetas] = useState([]);
  const [nueva, setNueva] = useState({
    nombre_objetivo: '',
    meta_total: '',
    fecha_meta: '',
    descripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAddMoneyForm, setShowAddMoneyForm] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [montoAAbonar, setMontoAAbonar] = useState('');
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
      nombre_objetivo: '',
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
        nombre_objetivo: nueva.nombre_objetivo,
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

  const handleAbonarClick = (meta) => {
    setSelectedMeta(meta);
    setMontoAAbonar('');
    setShowAddMoneyForm(true);
    setError(null);
  };

  const agregarDineroMeta = async () => {
    if (!selectedMeta || !montoAAbonar || Number(montoAAbonar) <= 0) {
      setError("Por favor ingrese un monto válido.");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const nuevoMontoActual = (Number(selectedMeta.monto_actual) || 0) + Number(montoAAbonar);

      const { data, error: updateError } = await supabase
        .from('metas')
        .update({ monto_actual: nuevoMontoActual })
        .eq('id', selectedMeta.id)
        .select()
        .single();
      
      if (updateError) {
        throw updateError;
      }
      
      setShowAddMoneyForm(false);
      setSelectedMeta(null);
      await cargarMetas();

    } catch (err) {
      console.error("Error al abonar a la meta:", err);
      setError(err.message || "Error al abonar a la meta.");
    } finally {
      setLoading(false);
    }
  };

  const calcularProgreso = (meta) => {
    if (!meta.meta_total || meta.meta_total === 0) {
      return 0;
    }
    const progreso = ((meta.monto_actual || 0) / meta.meta_total) * 100;
    return Math.max(0, Math.min(100, progreso));
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
                name="nombre_objetivo" 
                placeholder="Nombre de la meta" 
                value={nueva.nombre_objetivo} 
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
                        {meta.nombre_objetivo}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                        <span className="font-medium text-purple-600">
                          {formatCurrency(meta.meta_total)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          estaVencida && progreso < 100 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {formatDate(meta.fecha_meta)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                        <div>
                          <span className="font-semibold text-gray-800">{formatCurrency(meta.monto_actual || 0)}</span>
                          <span className="text-gray-500"> / {formatCurrency(meta.meta_total)}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                          <div 
                            className={`h-2 rounded-full ${progreso >= 100 ? 'bg-green-500' : 'bg-blue-600'}`}
                            style={{ width: `${progreso}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                        {meta.descripcion || '-'}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => handleAbonarClick(meta)}
                                className="text-green-600 hover:text-green-900 transition-colors p-1 rounded-full hover:bg-green-100"
                                title="Abonar a meta"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.5 2.5 0 00-1.162-.267z" />
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v1.077a4.5 4.5 0 00-1.723 1.023 1.5 1.5 0 00-1.121 2.218.97.97 0 01.36.425.97.97 0 01-.36.425V11a1.5 1.5 0 001.121 2.218 4.503 4.503 0 001.723 1.023V15a1 1 0 102 0v-1.077a4.5 4.5 0 001.723-1.023 1.5 1.5 0 001.121-2.218.97.97 0 01-.36-.425.97.97 0 01.36-.425V9a1.5 1.5 0 00-1.121-2.218A4.503 4.503 0 0011 5.777V5z" clipRule="evenodd" />
                                </svg>
                            </button>
                            <button
                              onClick={() => handleDelete(meta.id)}
                              className="text-red-600 hover:text-red-900 transition-colors p-1 rounded-full hover:bg-red-100"
                              title="Eliminar meta"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                        </div>
                      </td>
              </tr>
                  );
                })}
          </tbody>
        </table>
          </div>
        </div>
      </div>

      {showAddMoneyForm && selectedMeta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-lg font-bold text-gray-800">Abonar a Meta</h3>
                <p className="text-sm text-gray-600 mt-1">Estás abonando a: <span className="font-semibold">{selectedMeta.nombre_objetivo}</span></p>

                {error && (
                    <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 my-4 rounded-md text-sm">
                        <p>{error}</p>
                    </div>
                )}

                <div className="mt-4">
                    <label htmlFor="montoAAbonar" className="block text-sm font-medium text-gray-700">Monto a Abonar</label>
                    <input
                        type="number"
                        name="montoAAbonar"
                        id="montoAAbonar"
                        value={montoAAbonar}
                        onChange={(e) => setMontoAAbonar(e.target.value)}
                        placeholder="0"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        autoFocus
                    />
                </div>

                <div className="mt-6 flex justify-end gap-3">
                    <button
                        onClick={() => setShowAddMoneyForm(false)}
                        className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                        disabled={loading}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={agregarDineroMeta}
                        className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-400"
                        disabled={loading}
                    >
                        {loading ? 'Guardando...' : 'Confirmar Abono'}
                    </button>
                </div>
            </div>
        </div>
    )}
    </div>
  );
}
