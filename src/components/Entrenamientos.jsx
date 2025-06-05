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
      const { data: planesData, error: planesError } = await supabase
        .from('training_plans')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('fecha_inicio', { ascending: false });

      if (planesError) {
        console.error('cargarPlanes: Error fetching plans:', planesError);
        throw new Error(planesError.message);
      }

      console.log('cargarPlanes: Plans loaded:', planesData);
      setPlanes(planesData || []);

      // Si hay planes, cargar las sesiones del primer plan
      if (planesData && planesData.length > 0) {
        const primerPlan = planesData[0];
        setPlanSeleccionado(primerPlan);
        await cargarSesiones(primerPlan.id);
      }
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

  const cargarTodasLasSesiones = async () => {
    if (!userProfile) {
      console.log('No userProfile available');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading all sessions for user:', userProfile.id);
      const { data: sesionesData, error: sesionesError } = await supabase
        .from('training_sessions')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('fecha_programada', { ascending: true });

      if (sesionesError) {
        console.error('Error loading sessions:', sesionesError);
        throw new Error(sesionesError.message);
      }

      // Process the dates to ensure they're in the correct format
      const processedSessions = (sesionesData || []).map(session => {
        // Ensure the date is in YYYY-MM-DD format
        const fechaProgramada = session.fecha_programada ? 
          new Date(session.fecha_programada).toISOString().split('T')[0] : 
          new Date().toISOString().split('T')[0];

        return {
          ...session,
          fecha_programada: fechaProgramada,
          completado: Boolean(session.completado),
          distancia_km: session.distancia_km ? parseFloat(session.distancia_km) : null
        };
      });

      console.log('Processed sessions:', processedSessions);
      setSesiones(processedSessions);
    } catch (err) {
      console.error("Error loading sessions:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      console.log('Component mounted, loading data...');
      cargarPlanes();
      cargarTodasLasSesiones();
    }
  }, [userProfile]);

  useEffect(() => {
    if (planSeleccionado) {
      cargarSesiones(planSeleccionado.id);
    }
  }, [planSeleccionado]);

  useEffect(() => {
    console.log('Sessions state updated:', sesiones);
  }, [sesiones]);

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
    console.log('Event clicked:', eventInfo.event);
    console.log('Event ID:', eventInfo.event.id);
    console.log('All sessions in state:', sesiones);
    
    const sesionId = parseInt(eventInfo.event.id);
    console.log('Looking for session with ID:', sesionId);
    
    const sesion = sesiones.find(s => s.id === sesionId);
    console.log('Found session:', sesion);
    
    if (!sesion) {
      console.error('Session not found in state. Event ID:', eventInfo.event.id);
      console.error('Available session IDs:', sesiones.map(s => s.id));
      setError('No se pudo encontrar la sesión seleccionada');
      return;
    }

    setSesionSeleccionada(sesion);
    setFormDataSesion({
      tipo: sesion.tipo || '',
      titulo: sesion.titulo || '',
      descripcion: sesion.descripcion || '',
      distancia_km: sesion.distancia_km?.toString() || '',
      ritmo_objetivo: sesion.ritmo_objetivo || '',
      series: sesion.series || '',
      descanso: sesion.descanso || '',
      completado: Boolean(sesion.completado),
      fecha_programada: sesion.fecha_programada,
      hora_programada: sesion.hora_programada || ''
    });
    setShowSesionDetails(true);
  };

  const handleUpdateSesion = async () => {
    if (!userProfile || !sesionSeleccionada) {
      console.error('Missing userProfile or sesionSeleccionada');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log('Updating session:', sesionSeleccionada.id);
      console.log('Update data:', formDataSesion);

      // Prepare the update data
      const updateData = {
        tipo: formDataSesion.tipo,
        titulo: formDataSesion.titulo,
        descripcion: formDataSesion.descripcion,
        distancia_km: formDataSesion.distancia_km ? parseFloat(formDataSesion.distancia_km) : null,
        fecha_programada: formDataSesion.fecha_programada,
        hora_programada: formDataSesion.hora_programada || null,
        completado: formDataSesion.completado,
        ritmo_objetivo: formDataSesion.ritmo_objetivo || null,
        series: formDataSesion.series || null,
        descanso: formDataSesion.descanso || null,
        usuario_id: userProfile.id
      };

      console.log('Sending update with data:', updateData);

      const { data, error: supabaseError } = await supabase
        .from('training_sessions')
        .update(updateData)
        .eq('id', sesionSeleccionada.id)
        .eq('usuario_id', userProfile.id)
        .select();

      if (supabaseError) {
        console.error('Error updating session:', supabaseError);
        throw new Error(supabaseError.message);
      }

      console.log('Session updated successfully:', data);
      
      // Reload all sessions to update the calendar
      await cargarTodasLasSesiones();
      
      // Close the modal and reset selection
      setShowSesionDetails(false);
      setSesionSeleccionada(null);
      
      // Show success message
      setError(null);
    } catch (err) {
      console.error("Error updating session:", err);
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
    console.log('Creating calendar events from sessions:', sesiones);
    return sesiones.map(sesion => {
      console.log('Processing session for calendar:', sesion);
      const eventId = sesion.id?.toString() || '';
      console.log('Event ID being set:', eventId);
      
      return {
        id: eventId,
        title: sesion.tipo ? `${sesion.tipo}: ${sesion.titulo || ''}` : 'Sin tipo',
        start: sesion.fecha_programada,
        backgroundColor: getEventColor(sesion.tipo),
        borderColor: getEventColor(sesion.tipo),
        textColor: 'white',
        extendedProps: {
          tipo: sesion.tipo,
          completado: Boolean(sesion.completado),
          descripcion: sesion.descripcion,
          distancia_km: sesion.distancia_km,
          id: sesion.id
        }
      };
    });
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
                eventClassNames="hover:opacity-90 transition-opacity cursor-pointer"
                eventContent={(eventInfo) => {
                  return (
                    <div className="p-1">
                      <div className="font-semibold">{eventInfo.event.title}</div>
                      {eventInfo.event.extendedProps.distancia_km && (
                        <div className="text-sm">{eventInfo.event.extendedProps.distancia_km}km</div>
                      )}
                      <div className={`text-xs mt-1 ${
                        eventInfo.event.extendedProps.completado 
                          ? 'text-green-200' 
                          : 'text-yellow-200'
                      }`}>
                        {eventInfo.event.extendedProps.completado ? '✓ Completado' : '○ Pendiente'}
                      </div>
                    </div>
                  );
                }}
                slotMinTime="06:00:00"
                slotMaxTime="22:00:00"
                allDaySlot={false}
                firstDay={1}
                buttonText={{
                  today: 'Hoy',
                  month: 'Mes',
                  week: 'Semana'
                }}
                locale="es"
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
                      className="p-3 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
                      onClick={() => {
                        setSesionSeleccionada(sesion);
                        setFormDataSesion({
                          ...sesion,
                          completado: sesion.completado || false,
                          fecha_programada: sesion.fecha_programada.split('T')[0],
                          hora_programada: sesion.hora_programada || ''
                        });
                        setShowSesionDetails(true);
                      }}
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
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          sesion.completado 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {sesion.completado ? 'Completado' : 'Pendiente'}
                        </span>
                      </div>
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

      {/* Plans View */}
      {view === 'plans' && (
        <div className="space-y-6">
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

          {showFormPlan && (
            <div className="bg-white p-6 rounded-xl shadow-md">
              <h3 className="text-lg font-semibold mb-4">Nuevo Plan de Entrenamiento</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Nombre</label>
                  <input
                    type="text"
                    name="nombre"
                    value={formDataPlan.nombre}
                    onChange={handleChangePlan}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                  <input
                    type="date"
                    name="fecha_inicio"
                    value={formDataPlan.fecha_inicio}
                    onChange={handleChangePlan}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
                  <input
                    type="date"
                    name="fecha_fin"
                    value={formDataPlan.fecha_fin}
                    onChange={handleChangePlan}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Objetivo</label>
                  <input
                    type="text"
                    name="objetivo"
                    value={formDataPlan.objetivo}
                    onChange={handleChangePlan}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700">Notas</label>
                  <textarea
                    name="notas"
                    value={formDataPlan.notas}
                    onChange={handleChangePlan}
                    rows={3}
                    className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setShowFormPlan(false)}
                  className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarPlan}
                  className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
                  disabled={loading}
                >
                  {loading ? 'Guardando...' : 'Guardar Plan'}
                </button>
              </div>
            </div>
          )}

          {/* Lista de planes */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {planes.map(plan => (
              <div 
                key={plan.id}
                className={`bg-white p-6 rounded-xl shadow-md cursor-pointer transition-all ${
                  planSeleccionado?.id === plan.id ? 'ring-2 ring-blue-500' : 'hover:shadow-lg'
                }`}
                onClick={() => setPlanSeleccionado(plan)}
              >
                <div className="flex justify-between items-start">
                  <h4 className="text-lg font-semibold text-gray-800">{plan.nombre}</h4>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {formatDate(plan.fecha_inicio)} - {formatDate(plan.fecha_fin)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-gray-600">{plan.objetivo}</p>
                {plan.notas && (
                  <p className="mt-2 text-sm text-gray-500">{plan.notas}</p>
                )}
                {planSeleccionado?.id === plan.id && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowFormSesion(true);
                      }}
                      className="w-full px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                      </svg>
                      Añadir Sesión
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Session Details Modal */}
      {showSesionDetails && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50" onClick={() => setShowSesionDetails(false)}>
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white" onClick={e => e.stopPropagation()}>
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
                  <option value="">Seleccione tipo</option>
                  {TIPOS_ENTRENAMIENTO.map(tipo => (
                    <option key={tipo} value={tipo}>{tipo}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Fecha</label>
                <input
                  type="date"
                  name="fecha_programada"
                  value={formDataSesion.fecha_programada}
                  onChange={handleChangeSesion}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Título</label>
                <input
                  name="titulo"
                  value={formDataSesion.titulo}
                  onChange={handleChangeSesion}
                  className="mt-1 w-full px-3 py-2 rounded-lg border border-gray-300"
                  placeholder="Título de la sesión"
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
                  placeholder="0.00"
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
                  placeholder="Detalles de la sesión"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Estado</label>
                <select
                  name="completado"
                  value={formDataSesion.completado.toString()}
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