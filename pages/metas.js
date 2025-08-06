import { useState, useEffect } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Link from 'next/link';

export default function MetasPage() {
  const [metas, setMetas] = useState([]);
  const [showNewMeta, setShowNewMeta] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [newMeta, setNewMeta] = useState({
    nombre: '',
    objetivo: '',
    descripcion: ''
  });
  const [addMoneyAmount, setAddMoneyAmount] = useState('');

  // Mock data for demonstration - will be replaced with Supabase integration
  useEffect(() => {
    const mockMetas = [
      {
        id: 1,
        nombre: 'Fondo de emergencia',
        objetivo: 5000,
        ahorrado: 3200,
        descripcion: 'Reserva para 6 meses de gastos',
        fechaCreacion: '2024-01-15',
        fechaObjetivo: '2024-12-31'
      },
      {
        id: 2,
        nombre: 'Vacaciones en Europa',
        objetivo: 2500,
        ahorrado: 800,
        descripcion: 'Viaje de 2 semanas por Europa',
        fechaCreacion: '2024-02-01',
        fechaObjetivo: '2024-08-15'
      },
      {
        id: 3,
        nombre: 'Nuevo laptop',
        objetivo: 1200,
        ahorrado: 1200,
        descripcion: 'MacBook Pro para trabajo',
        fechaCreacion: '2024-01-01',
        fechaObjetivo: '2024-03-31'
      }
    ];
    setMetas(mockMetas);
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressPercentage = (ahorrado, objetivo) => {
    return Math.min((ahorrado / objetivo) * 100, 100);
  };

  const getStatusColor = (ahorrado, objetivo) => {
    const progress = (ahorrado / objetivo) * 100;
    if (progress >= 100) return 'text-green-600';
    if (progress >= 75) return 'text-blue-600';
    if (progress >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (ahorrado, objetivo) => {
    const progress = (ahorrado / objetivo) * 100;
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const handleCreateMeta = (e) => {
    e.preventDefault();
    const nuevaMeta = {
      id: metas.length + 1,
      nombre: newMeta.nombre,
      objetivo: parseFloat(newMeta.objetivo),
      ahorrado: 0,
      descripcion: newMeta.descripcion,
      fechaCreacion: new Date().toISOString().split('T')[0],
      fechaObjetivo: null
    };
    setMetas([...metas, nuevaMeta]);
    setNewMeta({ nombre: '', objetivo: '', descripcion: '' });
    setShowNewMeta(false);
  };

  const handleAddMoney = (e) => {
    e.preventDefault();
    const amount = parseFloat(addMoneyAmount);
    if (amount > 0 && selectedMeta) {
      setMetas(metas.map(meta => 
        meta.id === selectedMeta.id 
          ? { ...meta, ahorrado: meta.ahorrado + amount }
          : meta
      ));
      setAddMoneyAmount('');
      setShowAddMoney(false);
      setSelectedMeta(null);
    }
  };

  const handleDeleteMeta = (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta meta?')) {
      setMetas(metas.filter(meta => meta.id !== id));
    }
  };

  const totalObjetivo = metas.reduce((sum, meta) => sum + meta.objetivo, 0);
  const totalAhorrado = metas.reduce((sum, meta) => sum + meta.ahorrado, 0);
  const metasCompletadas = metas.filter(meta => meta.ahorrado >= meta.objetivo).length;
  const progresoGeneral = totalObjetivo > 0 ? (totalAhorrado / totalObjetivo) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Metas de Ahorro</h1>
          <p className="text-gray-600 mt-1">
            Define y alcanza tus objetivos financieros
          </p>
        </div>
        <Button onClick={() => setShowNewMeta(true)}>
          + Nueva Meta
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Metas</p>
                <p className="text-2xl font-bold text-gray-900">{metas.length}</p>
              </div>
              <div className="text-3xl opacity-60">🎯</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Completadas</p>
                <p className="text-2xl font-bold text-green-600">{metasCompletadas}</p>
              </div>
              <div className="text-3xl opacity-60">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Ahorrado</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalAhorrado)}</p>
              </div>
              <div className="text-3xl opacity-60">💰</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Progreso General</p>
                <p className="text-2xl font-bold text-purple-600">{progresoGeneral.toFixed(0)}%</p>
              </div>
              <div className="text-3xl opacity-60">📊</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      {metas.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes metas de ahorro
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primera meta para empezar a ahorrar con un objetivo claro.
              </p>
              <Button onClick={() => setShowNewMeta(true)}>
                Crear primera meta
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metas.map((meta) => {
            const progress = getProgressPercentage(meta.ahorrado, meta.objetivo);
            const isCompleted = meta.ahorrado >= meta.objetivo;
            
            return (
              <Card key={meta.id} className={`hover:shadow-lg transition-shadow ${
                isCompleted ? 'ring-2 ring-green-500 ring-opacity-20' : ''
              }`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{meta.nombre}</CardTitle>
                      {meta.descripcion && (
                        <p className="text-sm text-gray-600 mt-1">{meta.descripcion}</p>
                      )}
                    </div>
                    {isCompleted && (
                      <div className="text-2xl">🏆</div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Progress */}
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Progreso</span>
                        <span className={`text-sm font-bold ${getStatusColor(meta.ahorrado, meta.objetivo)}`}>
                          {progress.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(meta.ahorrado, meta.objetivo)}`}
                          style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {/* Amounts */}
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm text-gray-600">Ahorrado</p>
                        <p className="text-lg font-bold text-blue-600">
                          {formatCurrency(meta.ahorrado)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">Objetivo</p>
                        <p className="text-lg font-bold text-gray-900">
                          {formatCurrency(meta.objetivo)}
                        </p>
                      </div>
                    </div>

                    {/* Remaining */}
                    {!isCompleted && (
                      <div className="text-center p-2 bg-gray-50 rounded-lg">
                        <p className="text-sm text-gray-600">Faltan</p>
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(meta.objetivo - meta.ahorrado)}
                        </p>
                      </div>
                    )}

                    {isCompleted && (
                      <div className="text-center p-2 bg-green-50 rounded-lg">
                        <p className="text-sm text-green-700">¡Meta completada!</p>
                        <p className="font-semibold text-green-800">
                          🎉 Objetivo alcanzado
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex space-x-2">
                      {!isCompleted && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            setSelectedMeta(meta);
                            setShowAddMoney(true);
                          }}
                        >
                          💰 Añadir dinero
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDeleteMeta(meta.id)}
                      >
                        🗑️
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* New Meta Modal */}
      {showNewMeta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Nueva Meta de Ahorro</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateMeta} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la meta *
                  </label>
                  <input
                    type="text"
                    value={newMeta.nombre}
                    onChange={(e) => setNewMeta({...newMeta, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Fondo de emergencia, Vacaciones..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objetivo (€) *
                  </label>
                  <input
                    type="number"
                    value={newMeta.objetivo}
                    onChange={(e) => setNewMeta({...newMeta, objetivo: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000"
                    min="1"
                    step="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={newMeta.descripcion}
                    onChange={(e) => setNewMeta({...newMeta, descripcion: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="¿Para qué es esta meta?"
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowNewMeta(false);
                      setNewMeta({ nombre: '', objetivo: '', descripcion: '' });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Crear Meta
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Add Money Modal */}
      {showAddMoney && selectedMeta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Añadir dinero a "{selectedMeta.nombre}"</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMoney} className="space-y-4">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-600">Progreso actual</p>
                  <p className="text-lg font-bold">
                    {formatCurrency(selectedMeta.ahorrado)} / {formatCurrency(selectedMeta.objetivo)}
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${getProgressBarColor(selectedMeta.ahorrado, selectedMeta.objetivo)}`}
                      style={{ width: `${getProgressPercentage(selectedMeta.ahorrado, selectedMeta.objetivo)}%` }}
                    ></div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad a añadir (€) *
                  </label>
                  <input
                    type="number"
                    value={addMoneyAmount}
                    onChange={(e) => setAddMoneyAmount(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="100"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddMoney(false);
                      setSelectedMeta(null);
                      setAddMoneyAmount('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Añadir {addMoneyAmount && `${formatCurrency(parseFloat(addMoneyAmount))}`}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 