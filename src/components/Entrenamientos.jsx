import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Global, css } from '@emotion/react';

const TIPOS_ENTRENAMIENTO = ['Recovery', 'Tempo', 'Intervals', 'Long Run', 'Gym'];

const calendarStyles = {
  '.fc': {
    'font-family': 'Inter, sans-serif',
    'background-color': '#ffffff',
    'border-radius': '0.75rem',
    'box-shadow': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    'padding': '1rem'
  },
  '.fc-toolbar-title': {
    'font-size': '1.25rem !important',
    'font-weight': '600',
    'color': '#1f2937'
  },
  '.fc-button': {
    'background-color': '#3b82f6 !important',
    'border-color': '#3b82f6 !important',
    'text-transform': 'capitalize',
    'font-weight': '500',
    'padding': '0.5rem 1rem',
    'border-radius': '0.5rem'
  },
  '.fc-button-active': {
    'background-color': '#2563eb !important',
    'border-color': '#2563eb !important'
  },
  '.fc-day': {
    'background-color': '#ffffff',
    'border-color': '#e5e7eb !important'
  },
  '.fc-day-today': {
    'background-color': '#f3f4f6 !important'
  },
  '.fc-event': {
    'border-radius': '0.375rem',
    'padding': '0.25rem 0.5rem',
    'font-size': '0.875rem',
    'border': 'none',
    'cursor': 'pointer'
  },
  '.fc-event-main': {
    'padding': '2px 4px'
  },
  '.fc-view': {
    'border-radius': '0.75rem',
    'overflow': 'hidden'
  }
};

export default function Entrenamientos() {
  const [planes, setPlanes] = useState([]);
  const [sesiones, setSesiones] = useState([]);
  const [showFormPlan, setShowFormPlan] = useState(false);
  const [showFormSesion, setShowFormSesion] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [view, setView] = useState('calendar'); // 'calendar', 'plans', 'dashboard'
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null);
  const [showSesionDetails, setShowSesionDetails] = useState(false);
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
    ejercicios: {},
    completado: false
  });

  const cargarPlanes = async () => {
    if (!userProfile) {
      console.log('cargarPlanes: No userProfile available');
      return;
    }
    
    try {
      console.log('cargarPlanes: Starting to load plans');
      setLoading(true);
      setError(null);
      
      console.log('cargarPlanes: Fetching plans for user:', userProfile.id);
      const { data, error: supabaseError } = await supabase
        .from('training_plans')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('fecha_inicio', { ascending: false });

      console.log('cargarPlanes: Response received:', { data, error: supabaseError });

      if (supabaseError) {
        console.error('cargarPlanes: Supabase error:', supabaseError);
        throw new Error(supabaseError.message);
      }
      
      console.log('cargarPlanes: Setting plans:', data);
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

  // Función para cargar todas las sesiones (sin filtrar por plan)
  const cargarTodasLasSesiones = async () => {
    if (!userProfile) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('training_sessions')
        .select('*')
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
    console.log('Component mounted');
    console.log('userProfile:', userProfile);
    if (userProfile) {
      console.log('Calling cargarPlanes with userProfile:', userProfile.id);
      cargarPlanes();
      cargarTodasLasSesiones();
    } else {
      console.log('No userProfile available');
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
        ejercicios: {},
        completado: false
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

  const handleEventClick = (eventInfo) => {
    const sesion = sesiones.find(s => s.id === parseInt(eventInfo.event.id));
    if (sesion) {
      setSesionSeleccionada(sesion);
      setFormDataSesion({
        ...sesion,
        completado: sesion.completado || false
      });
      setShowSesionDetails(true);
    }
  };

  const handleUpdateSesion = async () => {
    if (!userProfile || !sesionSeleccionada) return;

    try {
      setLoading(true);
      setError(null);

      const { error: supabaseError } = await supabase
        .from('training_sessions')
        .update(formDataSesion)
        .eq('id', sesionSeleccionada.id)
        .eq('usuario_id', userProfile.id);

      if (supabaseError) throw new Error(supabaseError.message);

      await cargarTodasLasSesiones();
      setShowSesionDetails(false);
      setSesionSeleccionada(null);
    } catch (err) {
      console.error("Error al actualizar sesión:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getKilometrosPorSemana = () => {
    const sesionesCompletadas = sesiones.filter(s => s.completado);
    const kmPorSemana = {};
    
    sesionesCompletadas.forEach(sesion => {
      const fecha = new Date(sesion.fecha_programada);
      const semana = `${fecha.getFullYear()}-${getWeekNumber(fecha)}`;
      kmPorSemana[semana] = (kmPorSemana[semana] || 0) + (sesion.distancia_km || 0);
    });

    return Object.entries(kmPorSemana).map(([semana, km]) => ({
      semana: `Semana ${semana.split('-')[1]}`,
      kilometros: km
    })).sort((a, b) => a.semana.localeCompare(b.semana));
  };

  const getWeekNumber = (d) => {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  };

  const getCalendarEvents = () => {
    return sesiones.map(sesion => ({
      id: sesion.id.toString(),
      title: `${sesion.tipo}: ${sesion.titulo}`,
      start: sesion.fecha_programada,
      backgroundColor: getEventColor(sesion.tipo),
      borderColor: getEventColor(sesion.tipo),
      textColor: 'white',
      extendedProps: {
        tipo: sesion.tipo,
        completado: sesion.completado
      }
    }));
  };

  const getEventColor = (tipo) => {
    switch (tipo) {
      case 'Recovery': return '#10B981';
      case 'Tempo': return '#F59E0B';
      case 'Intervals': return '#EF4444';
      case 'Long Run': return '#3B82F6';
      case 'Gym': return '#8B5CF6';
      default: return '#6B7280';
    }
  };

  if (loading && !showFormPlan && !showFormSesion && !showSesionDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 bg-gray-50">
      <Global
        styles={css`
          ${Object.entries(calendarStyles).map(([selector, styles]) => `
            ${selector} {
              ${Object.entries(styles).map(([prop, value]) => `${prop}: ${value};`).join('\n')}
            }
          `).join('\n')}
        `}
      />
      
      {/* Navigation */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Entrenamientos</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => setView('calendar')}
            className={`px-4 py-2 rounded-lg ${
              view === 'calendar' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Calendario
          </button>
          <button 
            onClick={() => setView('plans')}
            className={`px-4 py-2 rounded-lg ${
              view === 'plans' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Planes
          </button>
          <button 
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-lg ${
              view === 'dashboard' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
            }`}
          >
            Dashboard
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-8">
            <div className="bg-white rounded-xl shadow-md overflow-hidden">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                events={getCalendarEvents()}
                eventClick={handleEventClick}
                height={600}
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: 'dayGridMonth,dayGridWeek'
                }}
                dayMaxEvents={3}
                eventTimeFormat={{
                  hour: '2-digit',
                  minute: '2-digit',
                  meridiem: false
                }}
                eventDisplay="block"
                eventClassNames="hover:opacity-90 transition-opacity"
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                firstDay={1}
                buttonText={{
                  today: 'Hoy',
                  month: 'Mes',
                  week: 'Semana'
                }}
              />
            </div>
          </div>
          <div className="md:col-span-4">
            <div className="bg-white rounded-xl shadow-md p-4">
              <h3 className="text-lg font-semibold mb-4">Próximas sesiones</h3>
              <div className="space-y-3">
                {sesiones
                  .filter(s => new Date(s.fecha_programada) >= new Date())
                  .sort((a, b) => new Date(a.fecha_programada) - new Date(b.fecha_programada))
                  .slice(0, 5)
                  .map(sesion => (
                    <div 
                      key={sesion.id}
                      className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleEventClick({ event: { id: sesion.id.toString() } })}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          sesion.tipo === 'Recovery' ? 'bg-green-100 text-green-800' :
                          sesion.tipo === 'Tempo' ? 'bg-yellow-100 text-yellow-800' :
                          sesion.tipo === 'Intervals' ? 'bg-red-100 text-red-800' :
                          sesion.tipo === 'Long Run' ? 'bg-blue-100 text-blue-800' :
                          'bg-purple-100 text-purple-800'
                        }`}>
                          {sesion.tipo}
                        </span>
                        <span className="text-sm text-gray-500">
                          {formatDate(sesion.fecha_programada)}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-medium">{sesion.titulo}</p>
                      {sesion.distancia_km && (
                        <p className="text-sm text-gray-600">{sesion.distancia_km}km</p>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dashboard View */}
      {view === 'dashboard' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-md">
            <h3 className="text-lg font-semibold mb-4">Kilómetros por Semana</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={getKilometrosPorSemana()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="semana" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="kilometros" 
                    stroke="#3B82F6" 
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6', stroke: '#3B82F6', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h4 className="text-sm font-medium text-gray-600">Total Kilómetros (Completados)</h4>
              <p className="text-2xl font-bold text-blue-600">
                {sesiones
                  .filter(s => s.completado)
                  .reduce((sum, s) => sum + (s.distancia_km || 0), 0)
                  .toFixed(1)} km
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h4 className="text-sm font-medium text-gray-600">Sesiones Completadas</h4>
              <p className="text-2xl font-bold text-green-600">
                {sesiones.filter(s => s.completado).length}
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h4 className="text-sm font-medium text-gray-600">Sesiones Pendientes</h4>
              <p className="text-2xl font-bold text-yellow-600">
                {sesiones.filter(s => !s.completado).length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Plans View - Existing plans and sessions management */}
      {view === 'plans' && (
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
      )}

      {/* Session Details Modal */}
      {showSesionDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Detalles de la Sesión</h3>
              <button 
                onClick={() => {
                  setShowSesionDetails(false);
                  setSesionSeleccionada(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Tipo</label>
                <select
                  name="tipo"
                  value={formDataSesion.tipo}
                  onChange={handleChangeSesion}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                >
                  {TIPOS_ENTRENAMIENTO.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Título</label>
                <input
                  name="titulo"
                  value={formDataSesion.titulo}
                  onChange={handleChangeSesion}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Distancia (km)</label>
                <input
                  type="number"
                  step="0.01"
                  name="distancia_km"
                  value={formDataSesion.distancia_km}
                  onChange={handleChangeSesion}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Descripción</label>
                <textarea
                  name="descripcion"
                  value={formDataSesion.descripcion}
                  onChange={handleChangeSesion}
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Estado</label>
                <select
                  name="completado"
                  value={formDataSesion.completado}
                  onChange={(e) => setFormDataSesion({
                    ...formDataSesion,
                    completado: e.target.value === 'true'
                  })}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                >
                  <option value="false">Pendiente</option>
                  <option value="true">Completado</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowSesionDetails(false);
                    setSesionSeleccionada(null);
                  }}
                  className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateSesion}
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 