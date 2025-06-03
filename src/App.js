import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Movimientos from './components/Movimientos';
import Ahorros from './components/Ahorros';
import Metas from './components/Metas';
import Entrenamientos from './components/Entrenamientos';
import Auth from './components/Auth';
import { useAuth } from './context/AuthContext';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [showNewMovement, setShowNewMovement] = useState(false);
  const [defaultMovementType, setDefaultMovementType] = useState('');
  const { user, signOut } = useAuth();

  const handleQuickMovement = (type) => {
    setDefaultMovementType(type);
    setShowNewMovement(true);
    setView('movimientos');
  };

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="p-2 md:p-4 w-full md:max-w-[98%] mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl md:text-3xl font-bold">Finanzas Personales</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">{user.email}</span>
          <button
            onClick={signOut}
            className="px-3 py-1 text-sm rounded-md bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4 overflow-x-auto">
        <button 
          onClick={() => setView('dashboard')} 
          className={`flex-1 min-w-[120px] px-3 md:px-4 py-2 rounded text-sm md:text-base ${
            view === 'dashboard' ? 'bg-blue-500 text-white' : 'bg-gray-300'
          }`}
        >
          Dashboard
        </button>
        <button 
          onClick={() => setView('movimientos')} 
          className={`flex-1 min-w-[120px] px-3 md:px-4 py-2 rounded text-sm md:text-base ${
            view === 'movimientos' ? 'bg-blue-500 text-white' : 'bg-gray-300'
          }`}
        >
          Movimientos
        </button>
        <button 
          onClick={() => setView('ahorros')} 
          className={`flex-1 min-w-[120px] px-3 md:px-4 py-2 rounded text-sm md:text-base ${
            view === 'ahorros' ? 'bg-blue-500 text-white' : 'bg-gray-300'
          }`}
        >
          Ahorros
        </button>
        <button 
          onClick={() => setView('metas')} 
          className={`flex-1 min-w-[120px] px-3 md:px-4 py-2 rounded text-sm md:text-base ${
            view === 'metas' ? 'bg-blue-500 text-white' : 'bg-gray-300'
          }`}
        >
          Metas
        </button>
        <button 
          onClick={() => setView('entrenamientos')} 
          className={`flex-1 min-w-[120px] px-3 md:px-4 py-2 rounded text-sm md:text-base ${
            view === 'entrenamientos' ? 'bg-blue-500 text-white' : 'bg-gray-300'
          }`}
        >
          Entrenamientos
        </button>
      </div>

      <div className="w-full overflow-x-hidden">
        {view === 'dashboard' && <Dashboard onQuickMovement={handleQuickMovement} />}
        {view === 'movimientos' && <Movimientos showForm={showNewMovement} defaultType={defaultMovementType} onFormClose={() => setShowNewMovement(false)} />}
        {view === 'ahorros' && <Ahorros />}
        {view === 'metas' && <Metas />}
        {view === 'entrenamientos' && <Entrenamientos />}
      </div>
    </div>
  );
}
