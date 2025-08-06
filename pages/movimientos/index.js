import { useState, useEffect } from 'react';
import Link from 'next/link';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useMovimientos } from '../../hooks/useMovimientos';
import { useTiposMovimiento } from '../../hooks/useTiposMovimiento';

export default function MovimientosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  const { movimientos, loading, error, updateMovimiento, deleteMovimiento } = useMovimientos();
  const { tiposMovimiento, loading: tiposLoading } = useTiposMovimiento();

  // Helper function to categorize movement types
  const categorizeTipo = (tipoNombre) => {
    const ingresos = ['salario', 'freelance', 'inversiones', 'bonus', 'comision', 'dividendos'];
    const ahorros = ['ahorro', 'emergencia', 'inversion', 'meta'];
    
    const nombre = tipoNombre.toLowerCase();
    
    if (ingresos.some(ing => nombre.includes(ing))) return 'ingresos';
    if (ahorros.some(ah => nombre.includes(ah))) return 'ahorros';
    return 'gastos';
  };

  // Add categoria to movimientos based on tipo_movimiento
  const movimientosWithCategoria = movimientos.map(mov => ({
    ...mov,
    categoria: mov.tipo_movimiento ? categorizeTipo(mov.tipo_movimiento.nombre) : 'gastos'
  }));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES');
  };

  // Filtering logic
  const filteredMovimientos = movimientosWithCategoria.filter(mov => {
    const matchesSearch = mov.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (mov.notas && mov.notas.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (mov.tipo_movimiento?.nombre && mov.tipo_movimiento.nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || mov.categoria === typeFilter;
    
    let matchesDate = true;
    if (dateFilter.startDate) {
      matchesDate = matchesDate && new Date(mov.fecha) >= new Date(dateFilter.startDate);
    }
    if (dateFilter.endDate) {
      matchesDate = matchesDate && new Date(mov.fecha) <= new Date(dateFilter.endDate);
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  // Sorting logic
  const sortedMovimientos = [...filteredMovimientos].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    
    if (sortConfig.key === 'fecha') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    } else if (sortConfig.key === 'importe') {
      aVal = Math.abs(parseFloat(aVal));
      bVal = Math.abs(parseFloat(bVal));
    }
    
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEdit = (movimiento) => {
    setEditingId(movimiento.id);
    setEditFormData({
      fecha: movimiento.fecha,
      nombre: movimiento.nombre,
      importe: Math.abs(movimiento.importe).toString(),
      id_tipo_movimiento: movimiento.id_tipo_movimiento,
      notas: movimiento.notas || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    try {
      const movimiento = movimientos.find(m => m.id === editingId);
      const categoria = movimiento.categoria;
      
      const updatedData = {
        fecha: editFormData.fecha,
        nombre: editFormData.nombre,
        importe: categoria === 'gastos' || categoria === 'ahorros' 
          ? -Math.abs(parseFloat(editFormData.importe))
          : Math.abs(parseFloat(editFormData.importe)),
        id_tipo_movimiento: parseInt(editFormData.id_tipo_movimiento),
        notas: editFormData.notas || null
      };

      const { error } = await updateMovimiento(editingId, updatedData);
      if (error) throw new Error(error);
      
      setEditingId(null);
      setEditFormData({});
    } catch (error) {
      console.error('Error updating movimiento:', error);
      alert('Error al actualizar el movimiento: ' + error.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
      const { error } = await deleteMovimiento(id);
      if (error) {
        alert('Error al eliminar el movimiento: ' + error);
      }
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setDateFilter({ startDate: '', endDate: '' });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-lg">Cargando movimientos...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Movimientos</h1>
          <p className="text-gray-600 mt-1">
            Gestiona tus ingresos, gastos y ahorros
          </p>
        </div>
        <Link href="/movimientos/nuevo">
          <Button>+ Nuevo Movimiento</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, notas, categoría..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                <option value="ingresos">Ingresos</option>
                <option value="gastos">Gastos</option>
                <option value="ahorros">Ahorros</option>
              </select>
            </div>

            {/* Date From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Desde
              </label>
              <input
                type="date"
                value={dateFilter.startDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Date To */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hasta
              </label>
              <input
                type="date"
                value={dateFilter.endDate}
                onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-end">
            <Button variant="outline" onClick={clearFilters} size="sm">
              Limpiar filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(filteredMovimientos
                  .filter(m => m.categoria === 'ingresos')
                  .reduce((sum, m) => sum + Math.abs(m.importe), 0)
                )}
              </div>
              <div className="text-sm text-gray-600">Total Ingresos</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(filteredMovimientos
                  .filter(m => m.categoria === 'gastos')
                  .reduce((sum, m) => sum + Math.abs(m.importe), 0)
                )}
              </div>
              <div className="text-sm text-gray-600">Total Gastos</div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(filteredMovimientos
                  .filter(m => m.categoria === 'ahorros')
                  .reduce((sum, m) => sum + Math.abs(m.importe), 0)
                )}
              </div>
              <div className="text-sm text-gray-600">Total Ahorros</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              Movimientos ({filteredMovimientos.length})
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMovimientos.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">💸</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {movimientos.length === 0 ? 'No hay movimientos' : 'No se encontraron movimientos'}
              </h3>
              <p className="text-gray-600 mb-6">
                {movimientos.length === 0 
                  ? 'Crea tu primer movimiento para empezar a gestionar tus finanzas.'
                  : 'Intenta ajustar los filtros para encontrar los movimientos que buscas.'
                }
              </p>
              {movimientos.length === 0 && (
                <Link href="/movimientos/nuevo">
                  <Button>Crear primer movimiento</Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('fecha')}
                    >
                      Fecha {sortConfig.key === 'fecha' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th 
                      className="text-left py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('nombre')}
                    >
                      Descripción {sortConfig.key === 'nombre' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Categoría</th>
                    <th 
                      className="text-right py-3 px-4 font-medium text-gray-700 cursor-pointer hover:bg-gray-50"
                      onClick={() => handleSort('importe')}
                    >
                      Importe {sortConfig.key === 'importe' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMovimientos.map((movimiento) => (
                    <tr key={movimiento.id} className="border-b border-gray-100 hover:bg-gray-50">
                      {editingId === movimiento.id ? (
                        // Edit row
                        <>
                          <td className="py-3 px-4">
                            <input
                              type="date"
                              value={editFormData.fecha}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, fecha: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={editFormData.nombre}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, nombre: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          </td>
                          <td className="py-3 px-4">
                            <select
                              value={editFormData.id_tipo_movimiento}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, id_tipo_movimiento: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            >
                              {tiposMovimiento.map(tipo => (
                                <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                              ))}
                            </select>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="number"
                              value={editFormData.importe}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, importe: e.target.value }))}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right"
                              step="0.01"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Button variant="ghost" size="sm" onClick={handleSaveEdit}>
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
                          <td className="py-3 px-4 text-sm text-gray-900">
                            {formatDate(movimiento.fecha)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-gray-900">{movimiento.nombre}</div>
                            {movimiento.notas && (
                              <div className="text-sm text-gray-600">{movimiento.notas}</div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              movimiento.categoria === 'ingresos' ? 'bg-green-100 text-green-800' :
                              movimiento.categoria === 'ahorros' ? 'bg-blue-100 text-blue-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {movimiento.tipo_movimiento?.nombre || 'Sin categoría'}
                            </span>
                          </td>
                          <td className={`py-3 px-4 text-right font-semibold ${
                            movimiento.categoria === 'ingresos' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {movimiento.categoria === 'ingresos' ? '+' : '-'}{formatCurrency(movimiento.importe)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleEdit(movimiento)}
                              >
                                ✏️
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDelete(movimiento.id)}
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
    </div>
  );
} 