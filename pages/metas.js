import { useState } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function MetasPage() {
  const [showNewGoal, setShowNewGoal] = useState(false);
  const [showAddMoney, setShowAddMoney] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [newGoal, setNewGoal] = useState({
    nombre: '',
    metaTotal: '',
    fechaLimite: ''
  });
  const [addMoneyAmount, setAddMoneyAmount] = useState('');

  // Will be replaced with real Supabase data hooks
  const [metas, setMetas] = useState([]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const calculateProgress = (current, total) => {
    return Math.min((current / total) * 100, 100);
  };

  const getDaysRemaining = (fechaLimite) => {
    const today = new Date();
    const deadline = new Date(fechaLimite);
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleCreateGoal = (e) => {
    e.preventDefault();
    const newMeta = {
      id: metas.length + 1,
      nombre: newGoal.nombre,
      metaTotal: parseFloat(newGoal.metaTotal),
      montoActual: 0,
      fechaLimite: newGoal.fechaLimite,
      fechaCreacion: new Date().toISOString().split('T')[0]
    };
    setMetas([...metas, newMeta]);
    setNewGoal({ nombre: '', metaTotal: '', fechaLimite: '' });
    setShowNewGoal(false);
  };

  const handleAddMoney = (e) => {
    e.preventDefault();
    const amount = parseFloat(addMoneyAmount);
    if (amount > 0 && selectedGoal) {
      setMetas(metas.map(meta => 
        meta.id === selectedGoal.id 
          ? { ...meta, montoActual: meta.montoActual + amount }
          : meta
      ));
      setAddMoneyAmount('');
      setShowAddMoney(false);
      setSelectedGoal(null);
    }
  };

  const getStatusColor = (progress) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-gray-400';
  };

  const getStatusText = (meta) => {
    const progress = calculateProgress(meta.montoActual, meta.metaTotal);
    const daysRemaining = getDaysRemaining(meta.fechaLimite);
    
    if (progress >= 100) return '✅ Completada';
    if (daysRemaining < 0) return '⏰ Vencida';
    if (daysRemaining <= 30) return `⚡ ${daysRemaining} días restantes`;
    return `📅 ${daysRemaining} días restantes`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Metas Financieras</h1>
          <p className="text-gray-600 mt-1">
            Establece y rastrea tus objetivos de ahorro
          </p>
        </div>
        <Button onClick={() => setShowNewGoal(true)}>
          + Nueva Meta
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {metas.length}
              </div>
              <div className="text-sm text-gray-600">Metas Activas</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {metas.filter(m => calculateProgress(m.montoActual, m.metaTotal) >= 100).length}
              </div>
              <div className="text-sm text-gray-600">Completadas</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900">
                {formatCurrency(metas.reduce((sum, m) => sum + m.montoActual, 0))}
              </div>
              <div className="text-sm text-gray-600">Total Ahorrado</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metas.map((meta) => {
          const progress = calculateProgress(meta.montoActual, meta.metaTotal);
          const isCompleted = progress >= 100;
          
          return (
            <Card key={meta.id} className="hover:shadow-md transition-shadow">
              <CardContent>
                <div className="space-y-4">
                  {/* Goal Header */}
                  <div className="flex items-start justify-between">
                    <h3 className="font-semibold text-gray-900 text-lg">
                      {meta.nombre}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {getStatusText(meta)}
                    </span>
                  </div>

                  {/* Progress */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Progreso</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-300 ${getStatusColor(progress)}`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Amounts */}
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Actual:</span>
                      <span className="font-semibold text-blue-600">
                        {formatCurrency(meta.montoActual)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Meta:</span>
                      <span className="font-semibold text-gray-900">
                        {formatCurrency(meta.metaTotal)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Restante:</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(Math.max(0, meta.metaTotal - meta.montoActual))}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex space-x-2 pt-2">
                    {!isCompleted && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => {
                          setSelectedGoal(meta);
                          setShowAddMoney(true);
                        }}
                      >
                        💰 Añadir dinero
                      </Button>
                    )}
                    <Button variant="ghost" size="sm">
                      ⚙️
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Empty State */}
      {metas.length === 0 && (
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">🎯</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No tienes metas aún
              </h3>
              <p className="text-gray-600 mb-6">
                Crea tu primera meta financiera para empezar a ahorrar con propósito.
              </p>
              <Button onClick={() => setShowNewGoal(true)}>
                Crear primera meta
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* New Goal Modal */}
      {showNewGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Nueva Meta Financiera</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateGoal} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre de la meta
                  </label>
                  <input
                    type="text"
                    value={newGoal.nombre}
                    onChange={(e) => setNewGoal({...newGoal, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Vacaciones, Nuevo auto..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meta total (€)
                  </label>
                  <input
                    type="number"
                    value={newGoal.metaTotal}
                    onChange={(e) => setNewGoal({...newGoal, metaTotal: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="1000"
                    min="1"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha límite
                  </label>
                  <input
                    type="date"
                    value={newGoal.fechaLimite}
                    onChange={(e) => setNewGoal({...newGoal, fechaLimite: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowNewGoal(false)}
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
      {showAddMoney && selectedGoal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Añadir dinero a {selectedGoal.nombre}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAddMoney} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad a añadir (€)
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
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600 space-y-1">
                    <div className="flex justify-between">
                      <span>Actual:</span>
                      <span>{formatCurrency(selectedGoal.montoActual)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Después:</span>
                      <span className="font-semibold">
                        {formatCurrency(selectedGoal.montoActual + (parseFloat(addMoneyAmount) || 0))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Meta:</span>
                      <span>{formatCurrency(selectedGoal.metaTotal)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowAddMoney(false);
                      setSelectedGoal(null);
                      setAddMoneyAmount('');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    Añadir Dinero
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