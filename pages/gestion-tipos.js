import { useState } from 'react';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';

export default function GestionTiposPage() {
  const [showNewType, setShowNewType] = useState(false);
  const [editingType, setEditingType] = useState(null);
  const [newType, setNewType] = useState({
    nombre: '',
    categoria: 'gastos',
    meta: '',
    color: '#3B82F6'
  });

  // Mock data - will be replaced with Supabase
  const [tiposMovimiento, setTiposMovimiento] = useState([
    { id: 1, nombre: 'Alimentación', categoria: 'gastos', meta: 600, color: '#EF4444', gastado: 420 },
    { id: 2, nombre: 'Transporte', categoria: 'gastos', meta: 200, color: '#F59E0B', gastado: 150 },
    { id: 3, nombre: 'Entretenimiento', categoria: 'gastos', meta: 150, color: '#8B5CF6', gastado: 180 },
    { id: 4, nombre: 'Salario', categoria: 'ingresos', meta: 0, color: '#10B981', gastado: 0 },
    { id: 5, nombre: 'Freelance', categoria: 'ingresos', meta: 0, color: '#06B6D4', gastado: 0 },
    { id: 6, nombre: 'Ahorro', categoria: 'ahorros', meta: 500, color: '#3B82F6', gastado: 320 }
  ]);

  const categorias = [
    { value: 'ingresos', label: 'Ingresos', icon: '💰', color: 'text-green-600' },
    { value: 'gastos', label: 'Gastos', icon: '💸', color: 'text-red-600' },
    { value: 'ahorros', label: 'Ahorros', icon: '🏦', color: 'text-blue-600' }
  ];

  const colores = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6B7280'
  ];

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleCreateType = (e) => {
    e.preventDefault();
    const nuevoTipo = {
      id: tiposMovimiento.length + 1,
      nombre: newType.nombre,
      categoria: newType.categoria,
      meta: parseFloat(newType.meta) || 0,
      color: newType.color,
      gastado: 0
    };
    setTiposMovimiento([...tiposMovimiento, nuevoTipo]);
    setNewType({ nombre: '', categoria: 'gastos', meta: '', color: '#3B82F6' });
    setShowNewType(false);
  };

  const handleEditType = (tipo) => {
    setEditingType(tipo);
    setNewType({
      nombre: tipo.nombre,
      categoria: tipo.categoria,
      meta: tipo.meta.toString(),
      color: tipo.color
    });
    setShowNewType(true);
  };

  const handleUpdateType = (e) => {
    e.preventDefault();
    setTiposMovimiento(tiposMovimiento.map(tipo => 
      tipo.id === editingType.id 
        ? {
            ...tipo,
            nombre: newType.nombre,
            categoria: newType.categoria,
            meta: parseFloat(newType.meta) || 0,
            color: newType.color
          }
        : tipo
    ));
    setEditingType(null);
    setNewType({ nombre: '', categoria: 'gastos', meta: '', color: '#3B82F6' });
    setShowNewType(false);
  };

  const handleDeleteType = (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este tipo de movimiento?')) {
      setTiposMovimiento(tiposMovimiento.filter(tipo => tipo.id !== id));
    }
  };

  const getProgressPercentage = (gastado, meta) => {
    if (meta === 0) return 0;
    return Math.min((gastado / meta) * 100, 100);
  };

  const getProgressColor = (gastado, meta, categoria) => {
    if (categoria !== 'gastos' || meta === 0) return 'bg-blue-500';
    
    const percentage = (gastado / meta) * 100;
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTiposPorCategoria = (categoria) => {
    return tiposMovimiento.filter(tipo => tipo.categoria === categoria);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Tipos</h1>
          <p className="text-gray-600 mt-1">
            Configura las categorías de tus movimientos y sus presupuestos
          </p>
        </div>
        <Button onClick={() => setShowNewType(true)}>
          + Nuevo Tipo
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {categorias.map((categoria) => {
          const tipos = getTiposPorCategoria(categoria.value);
          const totalMeta = tipos.reduce((sum, tipo) => sum + tipo.meta, 0);
          const totalGastado = tipos.reduce((sum, tipo) => sum + tipo.gastado, 0);
          
          return (
            <Card key={categoria.value} className="hover:shadow-md transition-shadow">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">{categoria.icon}</span>
                      <h3 className={`font-semibold ${categoria.color}`}>
                        {categoria.label}
                      </h3>
                    </div>
                    <div className="space-y-1">
                      <div className="text-sm text-gray-600">
                        {tipos.length} tipos configurados
                      </div>
                      {categoria.value === 'gastos' && (
                        <div className="text-sm">
                          <span className="text-gray-600">Presupuesto: </span>
                          <span className="font-medium">{formatCurrency(totalMeta)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">
                      {tipos.length}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Types by Category */}
      {categorias.map((categoria) => {
        const tipos = getTiposPorCategoria(categoria.value);
        if (tipos.length === 0) return null;

        return (
          <Card key={categoria.value}>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <span className="text-2xl">{categoria.icon}</span>
                <span>{categoria.label}</span>
                <span className="text-sm text-gray-500">({tipos.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Nombre</th>
                      {categoria.value === 'gastos' && (
                        <>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Presupuesto</th>
                          <th className="text-right py-3 px-4 font-medium text-gray-700">Gastado</th>
                          <th className="text-center py-3 px-4 font-medium text-gray-700">Progreso</th>
                        </>
                      )}
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Color</th>
                      <th className="text-center py-3 px-4 font-medium text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tipos.map((tipo) => {
                      const progress = getProgressPercentage(tipo.gastado, tipo.meta);
                      const progressColor = getProgressColor(tipo.gastado, tipo.meta, tipo.categoria);
                      
                      return (
                        <tr key={tipo.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-4 px-4">
                            <div className="font-medium text-gray-900">{tipo.nombre}</div>
                          </td>
                          {categoria.value === 'gastos' && (
                            <>
                              <td className="py-4 px-4 text-right font-semibold text-gray-900">
                                {formatCurrency(tipo.meta)}
                              </td>
                              <td className="py-4 px-4 text-right">
                                <span className={`font-semibold ${
                                  tipo.gastado > tipo.meta ? 'text-red-600' : 'text-gray-900'
                                }`}>
                                  {formatCurrency(tipo.gastado)}
                                </span>
                              </td>
                              <td className="py-4 px-4">
                                <div className="flex items-center space-x-3">
                                  <div className="flex-1">
                                    <div className="w-full bg-gray-200 rounded-full h-2">
                                      <div
                                        className={`h-2 rounded-full transition-all duration-300 ${progressColor}`}
                                        style={{ width: `${progress}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                  <span className="text-sm text-gray-600 min-w-[3rem]">
                                    {progress.toFixed(0)}%
                                  </span>
                                </div>
                              </td>
                            </>
                          )}
                          <td className="py-4 px-4 text-center">
                            <div 
                              className="w-6 h-6 rounded-full mx-auto border border-gray-200"
                              style={{ backgroundColor: tipo.color }}
                            ></div>
                          </td>
                          <td className="py-4 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEditType(tipo)}
                              >
                                ✏️
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteType(tipo.id)}
                              >
                                🗑️
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* New/Edit Type Modal */}
      {showNewType && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editingType ? 'Editar Tipo de Movimiento' : 'Nuevo Tipo de Movimiento'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={editingType ? handleUpdateType : handleCreateType} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre del tipo
                  </label>
                  <input
                    type="text"
                    value={newType.nombre}
                    onChange={(e) => setNewType({...newType, nombre: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: Alimentación, Transporte..."
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Categoría
                  </label>
                  <select
                    value={newType.categoria}
                    onChange={(e) => setNewType({...newType, categoria: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {categorias.map((categoria) => (
                      <option key={categoria.value} value={categoria.value}>
                        {categoria.icon} {categoria.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                {newType.categoria === 'gastos' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Presupuesto mensual (€)
                    </label>
                    <input
                      type="number"
                      value={newType.meta}
                      onChange={(e) => setNewType({...newType, meta: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="600"
                      min="0"
                      step="0.01"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {colores.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewType({...newType, color})}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          newType.color === color ? 'border-gray-400 scale-110' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowNewType(false);
                      setEditingType(null);
                      setNewType({ nombre: '', categoria: 'gastos', meta: '', color: '#3B82F6' });
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1">
                    {editingType ? 'Actualizar' : 'Crear'} Tipo
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