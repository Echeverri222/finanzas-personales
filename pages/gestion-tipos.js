import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';
import { useUser } from '../contexts/UserContext';

export default function GestionTiposPage() {
  const [formData, setFormData] = useState({ nombre: '', meta: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ nombre: '', meta: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { userProfile, loading: userLoading } = useUser();
  const { 
    tiposMovimiento, 
    loading, 
    error: hookError, 
    createTipoMovimiento, 
    updateTipoMovimiento, 
    deleteTipoMovimiento 
  } = useTiposMovimiento();

  // Categorize tipos for better organization
  const categorizeTipo = (tipoNombre) => {
    const ingresos = ['salario', 'freelance', 'inversiones', 'bonus', 'comision', 'dividendos'];
    const ahorros = ['ahorro', 'emergencia', 'inversion', 'meta'];
    
    const nombre = tipoNombre.toLowerCase();
    
    if (ingresos.some(ing => nombre.includes(ing))) return 'ingresos';
    if (ahorros.some(ah => nombre.includes(ah))) return 'ahorros';
    return 'gastos';
  };

  const tiposWithCategoria = tiposMovimiento.map(tipo => ({
    ...tipo,
    categoria: categorizeTipo(tipo.nombre)
  }));

  // Group by category
  const tiposPorCategoria = {
    ingresos: tiposWithCategoria.filter(t => t.categoria === 'ingresos'),
    gastos: tiposWithCategoria.filter(t => t.categoria === 'gastos'),
    ahorros: tiposWithCategoria.filter(t => t.categoria === 'ahorros')
  };

  // Recommended types
  const recomendados = {
    ingresos: ['Salario', 'Freelance', 'Inversiones', 'Bonificaciones', 'Comisiones', 'Dividendos'],
    gastos: ['Alimentación', 'Transporte', 'Vivienda', 'Servicios', 'Entretenimiento', 'Salud', 'Educación', 'Compras'],
    ahorros: ['Fondo de emergencia', 'Inversión a largo plazo', 'Ahorro para vacaciones', 'Ahorro para casa']
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (!userProfile?.id) {
      setError('Error: Perfil de usuario no disponible. Intenta refrescar la página.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: createError } = await createTipoMovimiento({
        nombre: formData.nombre.trim(),
        meta: formData.meta ? parseFloat(formData.meta) : null
      });

      if (createError) {
        throw new Error(createError);
      }

      setFormData({ nombre: '', meta: '' });
    } catch (err) {
      setError('Error al crear tipo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tipo) => {
    setEditingId(tipo.id);
    setEditFormData({
      nombre: tipo.nombre,
      meta: tipo.meta || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({ nombre: '', meta: '' });
  };

  const handleSaveEdit = async () => {
    if (!editFormData.nombre.trim()) {
      setError('El nombre es obligatorio');
      return;
    }

    if (!userProfile?.id) {
      setError('Error: Perfil de usuario no disponible. Intenta refrescar la página.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const { error: updateError } = await updateTipoMovimiento(editingId, {
        nombre: editFormData.nombre.trim(),
        meta: editFormData.meta ? parseFloat(editFormData.meta) : null
      });

      if (updateError) {
        throw new Error(updateError);
      }

      setEditingId(null);
      setEditFormData({ nombre: '', meta: '' });
    } catch (err) {
      setError('Error al actualizar tipo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (confirm(`¿Estás seguro de que quieres eliminar "${nombre}"?`)) {
      const { error: deleteError } = await deleteTipoMovimiento(id);
      if (deleteError) {
        setError('Error al eliminar tipo: ' + deleteError);
      }
    }
  };

  const addRecommended = (nombre) => {
    setFormData(prev => ({ ...prev, nombre }));
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading || userLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-lg">Cargando tipos de movimiento...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Configuración de Tipos</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tus categorías de ingresos, gastos y ahorros
          </p>
        </div>
        <Link href="/movimientos">
          <Button variant="outline">← Volver a Movimientos</Button>
        </Link>
      </div>

      {/* Error Message */}
      {(error || hookError) && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error || hookError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create New Type Form */}
        <Card>
          <CardHeader>
            <CardTitle>Crear Nuevo Tipo</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del tipo *
                </label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Alimentación, Salario, Ahorro..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meta mensual (opcional)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">€</span>
                  <input
                    type="number"
                    name="meta"
                    value={formData.meta}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Para gastos: límite máximo. Para ingresos/ahorros: objetivo mínimo.
                </p>
              </div>

              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Guardando...' : 'Crear Tipo'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card>
          <CardHeader>
            <CardTitle>Tipos Recomendados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(recomendados).map(([categoria, tipos]) => (
                <div key={categoria}>
                  <h4 className={`font-medium mb-2 capitalize ${
                    categoria === 'ingresos' ? 'text-green-600' :
                    categoria === 'ahorros' ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {categoria}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {tipos.map((tipo) => (
                      <button
                        key={tipo}
                        onClick={() => addRecommended(tipo)}
                        className="px-3 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors"
                      >
                        + {tipo}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current Types */}
      <div className="space-y-6">
        {Object.entries(tiposPorCategoria).map(([categoria, tipos]) => (
          <Card key={categoria}>
            <CardHeader>
              <CardTitle className={`capitalize ${
                categoria === 'ingresos' ? 'text-green-600' :
                categoria === 'ahorros' ? 'text-blue-600' : 'text-red-600'
              }`}>
                {categoria} ({tipos.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tipos.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">
                    {categoria === 'ingresos' ? '💰' :
                     categoria === 'ahorros' ? '🏦' : '💸'}
                  </div>
                  <p>No hay tipos de {categoria} configurados</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 font-medium text-gray-700">Nombre</th>
                        <th className="text-right py-3 px-4 font-medium text-gray-700">Meta Mensual</th>
                        <th className="text-center py-3 px-4 font-medium text-gray-700">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tipos.map((tipo) => (
                        <tr key={tipo.id} className="border-b border-gray-100 hover:bg-gray-50">
                          {editingId === tipo.id ? (
                            // Edit row
                            <>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={editFormData.nombre}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, nombre: e.target.value }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={editFormData.meta}
                                  onChange={(e) => setEditFormData(prev => ({ ...prev, meta: e.target.value }))}
                                  className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                                  step="0.01"
                                  min="0"
                                />
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <Button variant="ghost" size="sm" onClick={handleSaveEdit} disabled={saving}>
                                    ✓
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                                    ✕
                                  </Button>
                                </div>
                              </td>
                            </>
                          ) : (
                            // Display row
                            <>
                              <td className="py-3 px-4 font-medium text-gray-900">
                                {tipo.nombre}
                              </td>
                              <td className="py-3 px-4 text-right text-gray-600">
                                {tipo.meta ? formatCurrency(tipo.meta) : '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center space-x-2">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleEdit(tipo)}
                                  >
                                    ✏️
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => handleDelete(tipo.id, tipo.nombre)}
                                  >
                                    🗑️
                                  </Button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Resumen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {tiposPorCategoria.ingresos.length}
              </div>
              <div className="text-sm text-green-700">Tipos de Ingresos</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {tiposPorCategoria.gastos.length}
              </div>
              <div className="text-sm text-red-700">Tipos de Gastos</div>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {tiposPorCategoria.ahorros.length}
              </div>
              <div className="text-sm text-blue-700">Tipos de Ahorros</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 