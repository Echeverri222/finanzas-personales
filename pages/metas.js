import { useState } from 'react';
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

  if (error) {
    return (
      <div className="rounded-lg bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 p-4 text-red-700 dark:text-red-300">
        <p className="font-bold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header - Stitch style */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          Mis Metas
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white font-semibold py-4 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all active:scale-[0.98]"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nueva Meta
        </button>
      </div>

      {/* Stats Cards - Stitch style */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Metas</p>
          <p className="text-xl font-bold text-primary mt-1">{stats.totalMetas}</p>
          <span className="material-symbols-outlined text-primary/60 text-2xl mt-2 block">track_changes</span>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completadas</p>
          <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{stats.metasCompletadas}</p>
          <span className="material-symbols-outlined text-emerald-500/60 text-2xl mt-2 block">check_circle</span>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Objetivo Total</p>
          <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrency(stats.totalObjetivo)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Ahorrado</p>
          <p className="text-xl font-bold text-primary mt-1">{formatCurrency(stats.totalAhorrado)}</p>
        </div>
      </div>

      {/* Metas Grid - Stitch style */}
      {metas.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-center">
          <span className="material-symbols-outlined text-6xl text-primary/50 mb-4 block">track_changes</span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No tienes metas de ahorro</h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Crea tu primera meta para empezar a alcanzar tus objetivos financieros.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-primary text-white font-semibold py-3 px-6 rounded-xl inline-flex items-center gap-2 shadow-lg shadow-primary/20"
          >
            <span className="material-symbols-outlined">add_circle</span>
            Crear Primera Meta
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            En progreso
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {metas.map((meta) => {
              const pct = getProgressPercentage(meta.actual, meta.objetivo);
              return (
                <div
                  key={meta.id}
                  className="bg-white dark:bg-slate-800 rounded-xl p-5 shadow-sm border border-slate-100 dark:border-slate-700"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="size-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined">savings</span>
                      </div>
                      <div>
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">{meta.nombre}</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">calendar_today</span>
                          {new Date(meta.fechaCreacion).toLocaleDateString('es-ES')}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                      {pct.toFixed(0)}%
                    </span>
                    <button
                      onClick={() => handleDeleteMeta(meta.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                      aria-label="Eliminar"
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {formatCurrency(meta.actual)} <span className="text-slate-400 font-normal">de {formatCurrency(meta.objetivo)}</span>
                      </span>
                      <span className="text-slate-400 text-xs">
                        Faltan {formatCurrency(Math.max(0, meta.objetivo - meta.actual))}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor(meta.actual, meta.objetivo)}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedMeta(meta);
                      setShowAddMoneyModal(true);
                    }}
                    className="mt-4 w-full bg-primary/10 text-primary hover:bg-primary/20 font-semibold py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-lg">add_circle</span>
                    Añadir dinero
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Meta Modal - Stitch style */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">Nueva Meta de Ahorro</h2>
              <form onSubmit={handleCreateMeta} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nombre de la meta *
                  </label>
                  <input
                    type="text"
                    value={newMeta.nombre}
                    onChange={(e) => setNewMeta({ ...newMeta, nombre: e.target.value })}
                    placeholder="Ej: Vacaciones, Emergencias..."
                    className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder-slate-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Objetivo ($) *
                  </label>
                  <input
                    type="number"
                    value={newMeta.objetivo}
                    onChange={(e) => setNewMeta({ ...newMeta, objetivo: e.target.value })}
                    placeholder="5000"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
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

      {/* Add Money Modal - Stitch style */}
      {showAddMoneyModal && selectedMeta && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                Añadir dinero a: {selectedMeta.nombre}
              </h2>
              <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-lg">
                <div className="text-sm text-slate-500 dark:text-slate-400">Progreso actual:</div>
                <div className="text-lg font-semibold text-slate-900 dark:text-white">
                  {formatCurrency(selectedMeta.actual)} / {formatCurrency(selectedMeta.objetivo)}
                </div>
              </div>
              <form onSubmit={handleAddMoney} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Cantidad a añadir ($) *
                  </label>
                  <input
                    type="number"
                    value={addMoneyForm.cantidad}
                    onChange={(e) => setAddMoneyForm({ cantidad: e.target.value })}
                    placeholder="100"
                    step="0.01"
                    min="0"
                    className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
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