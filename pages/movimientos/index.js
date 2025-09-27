import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useMovimientos } from '../../hooks/useMovimientos';
import { useTiposMovimiento } from '../../hooks/useTiposMovimiento';

export default function MovimientosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  const router = useRouter();
  const { movimientos, loading, error, updateMovimiento, deleteMovimiento } = useMovimientos();
  const { tiposMovimiento, loading: tiposLoading } = useTiposMovimiento();

  // Handle URL parameters for filtering
  useEffect(() => {
    if (router.isReady) {
      const { month, category } = router.query;
      
      if (month) {
        setMonthFilter(month);
      }
      
      if (category) {
        setTypeFilter(category);
      }
    }
  }, [router.isReady, router.query]);

  // Function to get tipo name by ID (exactly like old component)
  const getTipoNombre = (id) => {
    const tipo = tiposMovimiento.find(t => t.id === id);
    return tipo ? tipo.nombre : 'Sin categoría';
  };

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

  // Filtering logic (matching old component)
  const filteredMovimientos = movimientos.filter(mov => {
    const matchesSearch = mov.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (mov.tipo_nombre && mov.tipo_nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || mov.id_tipo_movimiento === typeFilter;
    
    let matchesDate = true;
    if (monthFilter) {
      const movDate = new Date(mov.fecha);
      const [filterYear, filterMonth] = monthFilter.split('-').map(Number);
      matchesDate = movDate.getFullYear() === filterYear && movDate.getMonth() === filterMonth - 1;
    }
    
    return matchesSearch && matchesType && matchesDate;
  });

  // Sorting logic (matching old component)
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
    
    // Handle date conversion properly - movimiento.fecha is already a Date object from useMovimientos
    let fechaString = '';
    try {
      if (movimiento.fecha instanceof Date) {
        // If it's already a Date object, convert to YYYY-MM-DD format
        fechaString = movimiento.fecha.toISOString().split('T')[0];
      } else if (typeof movimiento.fecha === 'string') {
        // If it's a string, extract the date part
        fechaString = movimiento.fecha.split('T')[0];
      } else {
        // Fallback to today's date
        fechaString = new Date().toISOString().split('T')[0];
      }
    } catch (error) {
      console.error('Error processing date:', error);
      fechaString = new Date().toISOString().split('T')[0];
    }
    
    setEditFormData({
      fecha: fechaString,
      nombre: movimiento.nombre || '',
      importe: Math.abs(movimiento.importe).toString(),
      id_tipo_movimiento: movimiento.id_tipo_movimiento || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    try {
      // Match exact old component logic
      const [year, month, day] = editFormData.fecha.split('-').map(Number);
      const fecha = new Date(Date.UTC(year, month - 1, day));
      
      const updatedData = {
        fecha: fecha.toISOString(),
        nombre: editFormData.nombre.trim(),
        importe: Number(editFormData.importe),
        id_tipo_movimiento: editFormData.id_tipo_movimiento
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
    setMonthFilter('');
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
    <div className="space-y-4 md:space-y-6 px-2 md:px-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Movimientos</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Gestiona tus ingresos, gastos y ahorros
          </p>
        </div>
        <Link href="/movimientos/nuevo">
          <Button className="w-full sm:w-auto">+ Nuevo Movimiento</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-xl">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nombre, categoría..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Type Filter - Show tipos from database */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Todos</option>
                {tiposMovimiento.map((tipo) => (
                  <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                ))}
              </select>
            </div>

            {/* Month Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes
              </label>
              <input
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
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

      {/* Movements */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg md:text-xl">
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
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
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
                                placeholder="Descripción del movimiento"
                              />
                            </td>
                            <td className="py-3 px-4">
                              <select
                                value={editFormData.id_tipo_movimiento}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, id_tipo_movimiento: e.target.value }))}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">Seleccione categoría</option>
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
                                placeholder="0"
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
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                movimiento.tipo_nombre === 'Ingresos' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {movimiento.tipo_nombre}
                              </span>
                            </td>
                            <td className={`py-3 px-4 text-right font-semibold ${
                              movimiento.tipo_nombre === 'Ingresos' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(movimiento.importe)}
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

              {/* Mobile Card View */}
              <div className="lg:hidden space-y-3">
                {sortedMovimientos.map((movimiento) => (
                  <div key={movimiento.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                    {editingId === movimiento.id ? (
                      // Edit form for mobile
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Fecha</label>
                          <input
                            type="date"
                            value={editFormData.fecha}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, fecha: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Descripción</label>
                          <input
                            type="text"
                            value={editFormData.nombre}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, nombre: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            placeholder="Descripción del movimiento"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Categoría</label>
                          <select
                            value={editFormData.id_tipo_movimiento}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, id_tipo_movimiento: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          >
                            <option value="">Seleccione categoría</option>
                            {tiposMovimiento.map(tipo => (
                              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Importe</label>
                          <input
                            type="number"
                            value={editFormData.importe}
                            onChange={(e) => setEditFormData(prev => ({ ...prev, importe: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                            step="0.01"
                            placeholder="0"
                          />
                        </div>
                        <div className="flex space-x-2 pt-2">
                          <Button variant="outline" onClick={handleCancelEdit} className="flex-1">
                            Cancelar
                          </Button>
                          <Button onClick={handleSaveEdit} className="flex-1">
                            Guardar
                          </Button>
                        </div>
                      </div>
                    ) : (
                      // Display card for mobile
                      <>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              movimiento.tipo_nombre === 'Ingresos' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {movimiento.tipo_nombre}
                            </span>
                            <span className="text-xs text-gray-500">{formatDate(movimiento.fecha)}</span>
                          </div>
                          <div className="flex space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEdit(movimiento)}
                              className="p-1"
                            >
                              ✏️
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleDelete(movimiento.id)}
                              className="p-1"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{movimiento.nombre}</div>
                          </div>
                          <div className={`font-semibold ${
                            movimiento.tipo_nombre === 'Ingresos' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatCurrency(movimiento.importe)}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 