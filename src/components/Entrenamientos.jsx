import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';

const TIPOS_ENTRENAMIENTO = ['Recovery', 'Tempo', 'Intervals', 'Long Run', 'Gym'];

export default function Entrenamientos() {
  const [planes, setPlanes] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [showFormPlan, setShowFormPlan] = useState(false);
  const [showFormSesion, setShowFormSesion] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { userProfile } = useUser();

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const [formDataPlan, setFormDataPlan] = useState({
    nombre: '',
    fecha_inicio: today,
    fecha_fin: '',
    objetivo: '',
    notas: ''
  });

  const [formDataSesion, setFormDataSesion] = useState({
    tipo: '',
    fecha_programada: today,
    hora_programada: '',
    titulo: '',
    descripcion: '',
    distancia_km: '',
    ritmo_objetivo: '',
    series: '',
    descanso: '',
    ejercicios: {}
  });

  const cargarPlanes = async () => {
    if (!userProfile) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Cargando planes para usuario:', userProfile.id);
      const { data, error: supabaseError } = await supabase
        .from('training_plans')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('fecha_inicio', { ascending: false });

      if (supabaseError) throw new Error(supabaseError.message);
      
      console.log('Planes cargados:', data);
      setPlanes(data || []);
    } catch (err) {
      console.error("Error al cargar planes:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const cargarSesiones = async (planId) => {
    if (!userProfile || !planId) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('plan_id', planId)
        .eq('usuario_id', userProfile.id)
        .order('fecha_programada', { ascending: true });

      if (supabaseError) throw new Error(supabaseError.message);
      
      setSesiones(data || []);
    } catch (err) {
      console.error("Error al cargar sesiones:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log('userProfile:', userProfile);
    if (userProfile) {
      cargarPlanes();
    }
  }, [userProfile]);

  useEffect(() => {
    if (planSeleccionado) {
      cargarSesiones(planSeleccionado.id);
    }
  }, [planSeleccionado]);

  const handleChangePlan = (e) => {
    setFormDataPlan({...formDataPlan, [e.target.name]: e.target.value});
  };

  const handleChangeSesion = (e) => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setFormDataSesion({...formDataSesion, [e.target.name]: value});
  };

  const handleChangeEjercicios = (ejercicios) => {
    setFormDataSesion(prev => ({
      ...prev,
      ejercicios: {
        ...prev.ejercicios,
        ...ejercicios
      }
    }));
  };

  const guardarPlan = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      setError(null);

      const planData = {
        ...formDataPlan,
        usuario_id: userProfile.id
      };

      const { data, error: supabaseError } = await supabase
        .from('training_plans')
        .insert([planData])
        .select()
        .single();

      if (supabaseError) throw new Error(supabaseError.message);

      setPlanes(prev => [data, ...prev]);
      setShowFormPlan(false);
      setFormDataPlan({
        nombre: '',
        fecha_inicio: today,
        fecha_fin: '',
        objetivo: '',
        notas: ''
      });
    } catch (err) {
      console.error("Error al guardar plan:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const guardarSesion = async () => {
    if (!userProfile || !planSeleccionado) return;

    try {
      setLoading(true);
      setError(null);

      const sesionData = {
        ...formDataSesion,
        plan_id: planSeleccionado.id,
        usuario_id: userProfile.id
      };

      const { data, error: supabaseError } = await supabase
        .from('training_sessions')
        .insert([sesionData])
        .select()
        .single();

      if (supabaseError) throw new Error(supabaseError.message);

      setSesiones(prev => [...prev, data]);
      setShowFormSesion(false);
      setFormDataSesion({
        tipo: '',
        fecha_programada: today,
        hora_programada: '',
        titulo: '',
        descripcion: '',
        distancia_km: '',
        ritmo_objetivo: '',
        series: '',
        descanso: '',
        ejercicios: {}
      });
    } catch (err) {
      console.error("Error al guardar sesión:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
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

  if (loading && !showFormPlan && !showFormSesion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Planes de Entrenamiento</h2>
        <button 
          onClick={() => setShowFormPlan(!showFormPlan)} 
          className={`w-full md:w-auto px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${
            showFormPlan 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {showFormPlan ? (
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
              Nuevo Plan
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {showFormPlan && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Nuevo Plan de Entrenamiento</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nombre del Plan</label>
              <input
                name="nombre"
                value={formDataPlan.nombre}
                onChange={handleChangePlan}
                placeholder="ej: Preparación 5K Julio 2024"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
              <input
                type="date"
                name="fecha_inicio"
                value={formDataPlan.fecha_inicio}
                onChange={handleChangePlan}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
              <input
                type="date"
                name="fecha_fin"
                value={formDataPlan.fecha_fin}
                onChange={handleChangePlan}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Objetivo</label>
              <input
                name="objetivo"
                value={formDataPlan.objetivo}
                onChange={handleChangePlan}
                placeholder="ej: 5K en 24:40-24:50"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="col-span-1 md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-gray-700">Notas</label>
              <textarea
                name="notas"
                value={formDataPlan.notas}
                onChange={handleChangePlan}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowFormPlan(false)}
              className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={guardarPlan}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar Plan'}
            </button>
          </div>
        </div>
      )}

      {/* Lista de Planes */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Periodo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Objetivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {planes.map((plan) => (
                <tr 
                  key={plan.id}
                  className={`hover:bg-gray-50 ${planSeleccionado?.id === plan.id ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {plan.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(plan.fecha_inicio)} - {formatDate(plan.fecha_fin)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {plan.objetivo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => setPlanSeleccionado(plan)}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      Ver Sesiones
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sesiones del Plan Seleccionado */}
      {planSeleccionado && (
        <>
          <div className="flex justify-between items-center mt-8">
            <h3 className="text-lg font-semibold text-gray-800">
              Sesiones de: {planSeleccionado.nombre}
            </h3>
            <button
              onClick={() => setShowFormSesion(!showFormSesion)}
              className={`px-4 py-2 rounded-lg ${
                showFormSesion
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-green-500 hover:bg-green-600 text-white'
              }`}
            >
              {showFormSesion ? 'Cancelar' : 'Nueva Sesión'}
            </button>
          </div>

          {showFormSesion && (
            <div className="bg-white p-6 rounded-xl shadow-md">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Tipo</label>
                  <select
                    name="tipo"
                    value={formDataSesion.tipo}
                    onChange={handleChangeSesion}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Seleccione tipo</option>
                    {TIPOS_ENTRENAMIENTO.map(tipo => (
                      <option key={tipo} value={tipo}>{tipo}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Fecha</label>
                  <input
                    type="date"
                    name="fecha_programada"
                    value={formDataSesion.fecha_programada}
                    onChange={handleChangeSesion}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Hora</label>
                  <input
                    type="time"
                    name="hora_programada"
                    value={formDataSesion.hora_programada}
                    onChange={handleChangeSesion}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Título</label>
                  <input
                    name="titulo"
                    value={formDataSesion.titulo}
                    onChange={handleChangeSesion}
                    placeholder="ej: Intervalos de velocidad"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Distancia (km)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="distancia_km"
                    value={formDataSesion.distancia_km}
                    onChange={handleChangeSesion}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Ritmo Objetivo</label>
                  <input
                    name="ritmo_objetivo"
                    value={formDataSesion.ritmo_objetivo}
                    onChange={handleChangeSesion}
                    placeholder="ej: 5:25/km"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Series</label>
                  <input
                    name="series"
                    value={formDataSesion.series}
                    onChange={handleChangeSesion}
                    placeholder="ej: 6x400m"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Descanso</label>
                  <input
                    name="descanso"
                    value={formDataSesion.descanso}
                    onChange={handleChangeSesion}
                    placeholder="ej: 90s rest"
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div className="col-span-1 md:col-span-3 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Descripción</label>
                  <textarea
                    name="descripcion"
                    value={formDataSesion.descripcion}
                    onChange={handleChangeSesion}
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowFormSesion(false)}
                  className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarSesion}
                  className="px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 transition-colors"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Sesión'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de Sesiones */}
          <div className="bg-white rounded-xl shadow-md overflow-hidden mt-4">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha/Hora
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Título
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Detalles
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sesiones.map((sesion) => (
                    <tr key={sesion.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(sesion.fecha_programada)}
                        {sesion.hora_programada && (
                          <span className="text-gray-400 ml-2">
                            {sesion.hora_programada}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sesion.tipo === 'Recovery' ? 'bg-green-100 text-green-800' :
                          sesion.tipo === 'Tempo' ? 'bg-yellow-100 text-yellow-800' :
                          sesion.tipo === 'Intervals' ? 'bg-red-100 text-red-800' :
                          sesion.tipo === 'Long Run' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {sesion.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {sesion.titulo}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {sesion.distancia_km && <span className="mr-2">{sesion.distancia_km}km</span>}
                        {sesion.ritmo_objetivo && <span className="mr-2">@ {sesion.ritmo_objetivo}</span>}
                        {sesion.series && <span className="mr-2">{sesion.series}</span>}
                        {sesion.descanso && <span>({sesion.descanso})</span>}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          sesion.completado
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {sesion.completado ? 'Completado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
} 