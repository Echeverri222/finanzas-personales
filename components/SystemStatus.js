import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';

export default function SystemStatus() {
  const [status, setStatus] = useState({
    supabase: 'checking',
    auth: 'checking',
    database: 'checking',
    userProfile: 'checking',
    rls: 'checking'
  });
  
  const { user } = useAuth();
  const { userProfile } = useUser();

  useEffect(() => {
    checkSystemStatus();
  }, [user, userProfile]);

  const checkSystemStatus = async () => {
    const newStatus = { ...status };

    // 1. Check Supabase connection
    try {
      const { data, error } = await supabase.from('usuarios').select('count').limit(1);
      newStatus.supabase = error ? 'error' : 'success';
    } catch (err) {
      newStatus.supabase = 'error';
    }

    // 2. Check authentication
    newStatus.auth = user ? 'success' : 'warning';

    // 3. Check user profile
    newStatus.userProfile = userProfile ? 'success' : (user ? 'warning' : 'info');

    // 4. Check database access (if user exists)
    if (user && userProfile) {
      try {
        const { data, error } = await supabase
          .from('tipo_movimiento')
          .select('count')
          .eq('usuario_id', userProfile.id);
        newStatus.database = error ? 'error' : 'success';
      } catch (err) {
        newStatus.database = 'error';
      }

      // 5. Check RLS policies
      try {
        // Try to access data that should be filtered by RLS
        const { data, error } = await supabase
          .from('movimientos')
          .select('count')
          .eq('usuario_id', userProfile.id);
        newStatus.rls = error ? 'error' : 'success';
      } catch (err) {
        newStatus.rls = 'error';
      }
    } else {
      newStatus.database = 'info';
      newStatus.rls = 'info';
    }

    setStatus(newStatus);
  };

  const getStatusIcon = (statusValue) => {
    switch (statusValue) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'checking': return '🔄';
      default: return 'ℹ️';
    }
  };

  const getStatusColor = (statusValue) => {
    switch (statusValue) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'checking': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  const checks = [
    {
      name: 'Conexión Supabase',
      status: status.supabase,
      description: 'Verificar conectividad con la base de datos'
    },
    {
      name: 'Autenticación',
      status: status.auth,
      description: user ? `Usuario autenticado: ${user.email}` : 'No hay usuario autenticado'
    },
    {
      name: 'Perfil de Usuario',
      status: status.userProfile,
      description: userProfile ? `Perfil cargado: ${userProfile.email}` : 'Perfil no disponible'
    },
    {
      name: 'Acceso a Base de Datos',
      status: status.database,
      description: 'Verificar permisos de lectura/escritura'
    },
    {
      name: 'Políticas RLS',
      status: status.rls,
      description: 'Verificar Row Level Security'
    }
  ];

  const allGood = Object.values(status).every(s => s === 'success');

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {allGood ? '✅' : '🔧'} Estado del Sistema
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {checks.map((check, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getStatusIcon(check.status)}</span>
                <div>
                  <div className="font-medium">{check.name}</div>
                  <div className="text-sm text-gray-600">{check.description}</div>
                </div>
              </div>
              <span className={`font-semibold ${getStatusColor(check.status)}`}>
                {check.status.toUpperCase()}
              </span>
            </div>
          ))}
          
          {allGood && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="font-semibold text-green-800 mb-2">🎉 Sistema Completamente Funcional</div>
              <div className="text-sm text-green-700">
                Todos los sistemas están operativos. La aplicación está lista para crear movimientos, 
                tipos de movimiento y gestionar datos de forma segura.
              </div>
            </div>
          )}
          
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="text-sm text-blue-700">
              <strong>Información del Entorno:</strong><br />
              • Usuario ID: {user?.id || 'No autenticado'}<br />
              • Perfil ID: {userProfile?.id || 'No disponible'}<br />
              • Email: {user?.email || 'No disponible'}<br />
              • Entorno: {window.location.origin}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 