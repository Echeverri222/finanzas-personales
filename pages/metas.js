import { useState } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useMetas } from '../hooks/useMetas';
import { MetasPageSkeleton } from '../components/ui/LoadingSkeleton';

export default function MetasPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [saving, setSaving] = useState(false);
  
  // Use database hook instead of local state
  const { metas, loading, error, createMeta, deleteMeta, addMoneyToMeta } = useMetas();

  const [newMeta, setNewMeta] = useState({
    nombre: '',
    objetivo: '',
    actual: 0
  });

  const [addMoneyForm, setAddMoneyForm] = useState({
    cantidad: ''
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getProgressPercentage = (actual, objetivo) => {
    return Math.min((actual / objetivo) * 100, 100);
  };

  const getStatusColor = (actual, objetivo) => {
    const progress = getProgressPercentage(actual, objetivo);
    if (progress >= 100) return 'text-green-600';
    if (progress >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressBarColor = (actual, objetivo) => {
    const progress = getProgressPercentage(actual, objetivo);
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 70) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const handleCreateMeta = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const metaData = {
        nombre: newMeta.nombre.trim(),
        objetivo: parseFloat(newMeta.objetivo)
      };
      
      const { error } = await createMeta(metaData);
      if (error) {
        alert('Error al crear la meta: ' + error);
        return;
      }
      
      // Reset form and close modal
      setNewMeta({ nombre: '', objetivo: '', actual: 0 });
      setShowCreateModal(false);
    } catch (err) {
      alert('Error al crear la meta: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      const cantidad = parseFloat(addMoneyForm.cantidad);
      
      if (isNaN(cantidad) || cantidad <= 0) {
        alert('Por favor ingresa una cantidad válida');
        return;
      }
      
      const { error } = await addMoneyToMeta(selectedMeta.id, cantidad);
      if (error) {
        alert('Error al añadir dinero: ' + error);
        return;
      }
      
      // Reset form and close modal
      setAddMoneyForm({ cantidad: '' });
      setShowAddMoneyModal(false);
      setSelectedMeta(null);
    } catch (err) {
      alert('Error al añadir dinero: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeta = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta meta?')) {
      try {
        const { error } = await deleteMeta(id);
        if (error) {
          alert('Error al eliminar la meta: ' + error);
        }
      } catch (err) {
        alert('Error al eliminar la meta: ' + err.message);
      }
    }
  };

  const stats = {
    totalMetas: metas.length,
    metasCompletadas: metas.filter(m => m.actual >= m.objetivo).length,
    totalObjetivo: metas.reduce((sum, m) => sum + m.objetivo, 0),
    totalAhorrado: metas.reduce((sum, m) => sum + m.actual, 0)
  };

  // Add loading state
  if (loading) {
    return <MetasPageSkeleton />;
  }

  // Add error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Metas de Ahorro</h1>
          <p className="text-gray-600 mt-1">
            Gestiona y hace seguimiento a tus objetivos de ahorro
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          Nueva Meta
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Metas</p>
                <p className="text-2xl font-bold text-blue-600">
                  {stats.totalMetas}
                </p>
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
                <p className="text-2xl font-bold text-green-600">
                  {stats.metasCompletadas}
                </p>
              </div>
              <div className="text-3xl opacity-60">✅</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Objetivo Total</p>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.totalObjetivo)}
                </p>
              </div>
              <div className="text-3xl opacity-60">🏆</div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 mb-1">Total Ahorrado</p>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(stats.totalAhorrado)}
                </p>
              </div>
              <div className="text-3xl opacity-60">💰</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Metas Grid */}
      {metas.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes metas de ahorro
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primera meta de ahorro para empezar a alcanzar tus objetivos financieros.
              </p>
              <Button onClick={() => setShowCreateModal(true)}>
                Crear Primera Meta
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {metas.map((meta) => (
            <Card key={meta.id} className="hover:shadow-lg transition-shadow">
              <CardContent>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{meta.nombre}</h3>
                    <p className="text-sm text-gray-500">Creada: {new Date(meta.fechaCreacion).toLocaleDateString()}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteMeta(meta.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑️
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Progreso</span>
                    <span className={`text-sm font-bold ${getStatusColor(meta.actual, meta.objetivo)}`}>
                      {getProgressPercentage(meta.actual, meta.objetivo).toFixed(1)}%
                    </span>
                  </div>

                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${getProgressBarColor(meta.actual, meta.objetivo)}`}
                      style={{ width: `${getProgressPercentage(meta.actual, meta.objetivo)}%` }}
                    ></div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-900">
                      {formatCurrency(meta.actual)}
                    </span>
                    <span className="text-gray-600">
                      de {formatCurrency(meta.objetivo)}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedMeta(meta);
                        setShowAddMoneyModal(true);
                      }}
                      className="flex-1"
                    >
                      Añadir $
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Meta Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Nueva Meta de Ahorro</h2>
              
              <form onSubmit={handleCreateMeta} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la meta *
                  </label>
                  <input
                    type="text"
                    value={newMeta.nombre}
                    onChange={(e) => setNewMeta({ ...newMeta, nombre: e.target.value })}
                    placeholder="Ej: Vacaciones, Emergencias, Casa nueva..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Objetivo ($) *
                  </label>
                  <input
                    type="number"
                    value={newMeta.objetivo}
                    onChange={(e) => setNewMeta({ ...newMeta, objetivo: e.target.value })}
                    placeholder="5000"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? 'Creando...' : 'Crear Meta'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Money Modal */}
      {showAddMoneyModal && selectedMeta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                Añadir dinero a: {selectedMeta.nombre}
              </h2>
              
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600">Progreso actual:</div>
                <div className="text-lg font-semibold">
                  {formatCurrency(selectedMeta.actual)} / {formatCurrency(selectedMeta.objetivo)}
                </div>
              </div>

              <form onSubmit={handleAddMoney} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad a añadir ($) *
                  </label>
                  <input
                    type="number"
                    value={addMoneyForm.cantidad}
                    onChange={(e) => setAddMoneyForm({ cantidad: e.target.value })}
                    placeholder="100"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddMoneyModal(false);
                      setSelectedMeta(null);
                    }}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? 'Añadiendo...' : 'Añadir Dinero'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 