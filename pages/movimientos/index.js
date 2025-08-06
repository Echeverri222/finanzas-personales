import { useState } from 'react';
import Link from 'next/link';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useMovimientos } from '../../hooks/useMovimientos';

export default function MovimientosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('this-month');

  // Use real data from Supabase instead of mock data
  const { movimientos, loading, error, deleteMovimiento } = useMovimientos();

  // Handle loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Movimientos</h1>
        </div>
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-lg">Cargando movimientos...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Movimientos</h1>
        </div>
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-red-600">Error: {error}</div>
              <p className="text-gray-600 mt-2">
                No se pudieron cargar los movimientos. Verifica tu conexión a la base de datos.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Filter movimientos based on search and filters
  const filteredMovimientos = movimientos.filter(mov => {
    const matchesSearch = mov.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         mov.tipo_movimiento?.nombre?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || mov.tipo_movimiento?.categoria === typeFilter;
    
    // Date filter logic (simplified for now)
    const matchesDate = true; // You can implement date filtering here
    
    return matchesSearch && matchesType && matchesDate;
  });

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
      const { error } = await deleteMovimiento(id);
      if (error) {
        alert('Error al eliminar el movimiento: ' + error);
      }
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Movimientos</h1>
          <p className="text-gray-600 mt-1">Gestiona todos tus ingresos y gastos</p>
        </div>
        <Link href="/movimientos/nuevo">
          <Button size="lg">
            + Nuevo Movimiento
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por nombre o categoría..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los tipos</option>
                <option value="ingresos">Ingresos</option>
                <option value="gastos">Gastos</option>
                <option value="ahorros">Ahorros</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período
              </label>
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="this-month">Este mes</option>
                <option value="last-month">Mes anterior</option>
                <option value="this-year">Este año</option>
                <option value="all">Todos</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {filteredMovimientos.length} movimientos encontrados
            </CardTitle>
            <div className="text-sm text-gray-500">
              Total: {formatCurrency(filteredMovimientos.reduce((sum, mov) => sum + mov.importe, 0))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Descripción</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-700">Categoría</th>
                  <th className="text-right py-3 px-4 font-medium text-gray-700">Importe</th>
                  <th className="text-center py-3 px-4 font-medium text-gray-700">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredMovimientos.map((movimiento, index) => (
                  <tr
                    key={movimiento.id}
                    className={`border-b border-gray-100 hover:bg-gray-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="py-4 px-4 text-sm text-gray-600">
                      {formatDate(movimiento.fecha)}
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-medium text-gray-900">{movimiento.nombre}</div>
                      {movimiento.notas && (
                        <div className="text-sm text-gray-500">{movimiento.notas}</div>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        movimiento.tipo_movimiento?.categoria === 'ingresos'
                          ? 'bg-green-100 text-green-800'
                          : movimiento.tipo_movimiento?.categoria === 'gastos'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {movimiento.tipo_movimiento?.nombre || 'Sin categoría'}
                      </span>
                    </td>
                    <td className={`py-4 px-4 text-right font-semibold ${
                      movimiento.importe > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {movimiento.importe > 0 ? '+' : ''}{formatCurrency(movimiento.importe)}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button variant="ghost" size="sm">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredMovimientos.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 text-6xl mb-4">📋</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay movimientos
              </h3>
              <p className="text-gray-600 mb-6">
                {movimientos.length === 0 
                  ? 'No tienes movimientos registrados aún.'
                  : 'No se encontraron movimientos con los filtros seleccionados.'
                }
              </p>
              <Link href="/movimientos/nuevo">
                <Button>
                  Crear primer movimiento
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 