import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Movimientos from './components/Movimientos';
import Ahorros from './components/Ahorros';
import Metas from './components/Metas';

export default function App() {
  const [view, setView] = useState('dashboard');

  return (
    <div className="p-2 max-w-[98%] mx-auto">
      <h1 className="text-3xl font-bold mb-4">Finanzas Personales</h1>

      <div className="flex gap-2 mb-4">
        <button onClick={() => setView('dashboard')} className={`px-4 py-2 rounded ${view === 'dashboard' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
          Dashboard
        </button>
        <button onClick={() => setView('movimientos')} className={`px-4 py-2 rounded ${view === 'movimientos' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
          Movimientos
        </button>
        <button onClick={() => setView('ahorros')} className={`px-4 py-2 rounded ${view === 'ahorros' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
          Ahorros
        </button>
        <button onClick={() => setView('metas')} className={`px-4 py-2 rounded ${view === 'metas' ? 'bg-blue-500 text-white' : 'bg-gray-300'}`}>
          Metas
        </button>
      </div>

      {view === 'dashboard' && <Dashboard />}
      {view === 'movimientos' && <Movimientos />}
      {view === 'ahorros' && <Ahorros />}
      {view === 'metas' && <Metas />}
    </div>
  );
}
