import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Movimientos from './components/Movimientos';
import Ahorros from './components/Ahorros';
import Metas from './components/Metas';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [showNewMovement, setShowNewMovement] = useState(false);
  const [defaultMovementType, setDefaultMovementType] = useState('');

  const handleQuickMovement = (type) => {
    setDefaultMovementType(type);
    setShowNewMovement(true);
    setView('movimientos');
  };

  return (
    <div className="p-2 md:p-4 w-full md:max-w-[98%] mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-4">Finanzas Personales</h1>

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
      </div>

      <div className="w-full overflow-x-hidden">
        {view === 'dashboard' && <Dashboard onQuickMovement={handleQuickMovement} />}
        {view === 'movimientos' && <Movimientos showForm={showNewMovement} defaultType={defaultMovementType} onFormClose={() => setShowNewMovement(false)} />}
        {view === 'ahorros' && <Ahorros />}
        {view === 'metas' && <Metas />}
      </div>
    </div>
  );
}
