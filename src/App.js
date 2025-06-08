import React, { useState } from 'react';
import Dashboard from './components/Dashboard';
import Movimientos from './components/Movimientos';
import Metas from './components/Metas';
import Ahorros from './components/Ahorros';
import StockAnalysis from './components/StockAnalysis';
import Auth from './components/Auth';
import { useAuth } from './context/AuthContext';

export default function App() {
  const [view, setView] = useState('dashboard');
  const [showMovimientosForm, setShowMovimientosForm] = useState(false);
  const [defaultMovimientoType, setDefaultMovimientoType] = useState('');
  const { user, signOut } = useAuth();

  const handleQuickMovement = (type) => {
    setDefaultMovimientoType(type);
    setShowMovimientosForm(true);
    setView('movimientos');
  };

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
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
        </div>
      </nav>

      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-wrap gap-2 mb-6">
            <button
              onClick={() => {
                setView('dashboard');
                setShowMovimientosForm(false);
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'dashboard' ? 'bg-blue-500 text-white' : 'bg-gray-300'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => {
                setView('movimientos');
                setShowMovimientosForm(false);
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'movimientos' ? 'bg-blue-500 text-white' : 'bg-gray-300'
              }`}
            >
              Movimientos
            </button>
            <button
              onClick={() => {
                setView('metas');
                setShowMovimientosForm(false);
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'metas' ? 'bg-blue-500 text-white' : 'bg-gray-300'
              }`}
            >
              Metas
            </button>
            <button
              onClick={() => {
                setView('ahorros');
                setShowMovimientosForm(false);
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'ahorros' ? 'bg-blue-500 text-white' : 'bg-gray-300'
              }`}
            >
              Ahorros
            </button>
            <button
              onClick={() => {
                setView('stocks');
                setShowMovimientosForm(false);
              }}
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === 'stocks' ? 'bg-blue-500 text-white' : 'bg-gray-300'
              }`}
            >
              Acciones
            </button>
          </div>

          {view === 'dashboard' && (
            <Dashboard onQuickMovement={handleQuickMovement} />
          )}
          {view === 'movimientos' && (
            <Movimientos
              showForm={showMovimientosForm}
              defaultType={defaultMovimientoType}
              onFormClose={() => {
                setShowMovimientosForm(false);
                setDefaultMovimientoType('');
              }}
            />
          )}
          {view === 'metas' && <Metas />}
          {view === 'ahorros' && <Ahorros />}
          {view === 'stocks' && <StockAnalysis />}
        </div>
      </div>
    </div>
  );
}
