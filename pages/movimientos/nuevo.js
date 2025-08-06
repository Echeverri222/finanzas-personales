import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useTiposMovimiento } from '../../hooks/useTiposMovimiento';
import { useMovimientos } from '../../hooks/useMovimientos';

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fecha: new Date().toISOString().split('T')[0],
    nombre: '',
    importe: '',
    id_tipo_movimiento: '',
    categoria: router.query.tipo || '',
    notas: ''
  });

  const [errors, setErrors] = useState({});

  // Use real data from Supabase
  const { tiposMovimiento, loading: tiposLoading, error: tiposError } = useTiposMovimiento();
  const { createMovimiento } = useMovimientos();

  // Get categories for the selected type
  const availableCategories = tiposMovimiento.filter(tipo => 
    !formData.categoria || tipo.categoria === formData.categoria
  );

  // Update tipo when categoria changes
  useEffect(() => {
    if (formData.categoria && formData.id_tipo_movimiento) {
      const selectedTipo = tiposMovimiento.find(t => t.categoria === formData.categoria);
      if (selectedTipo && selectedTipo.id !== parseInt(formData.id_tipo_movimiento)) {
        setFormData(prev => ({ ...prev, id_tipo_movimiento: '' }));
      }
    }
  }, [formData.categoria, formData.id_tipo_movimiento, tiposMovimiento]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.fecha) {
      newErrors.fecha = 'La fecha es obligatoria';
    }

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }

    if (!formData.importe || parseFloat(formData.importe) <= 0) {
      newErrors.importe = 'El importe debe ser mayor a 0';
    }

    if (!formData.categoria) {
      newErrors.categoria = 'El tipo es obligatorio';
    }

    if (!formData.id_tipo_movimiento) {
      newErrors.id_tipo_movimiento = 'La categoría es obligatoria';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data for database
      const movimientoData = {
        fecha: formData.fecha,
        nombre: formData.nombre.trim(),
        importe: formData.categoria === 'gastos' || formData.categoria === 'ahorros' 
          ? -Math.abs(parseFloat(formData.importe))
          : Math.abs(parseFloat(formData.importe)),
        id_tipo_movimiento: parseInt(formData.id_tipo_movimiento),
        notas: formData.notas.trim() || null
      };

      const { data, error } = await createMovimiento(movimientoData);

      if (error) {
        throw new Error(error);
      }

      console.log('Movimiento creado:', data);

      // Redirect to movements list
      router.push('/movimientos');
    } catch (error) {
      console.error('Error saving movement:', error);
      setErrors({ submit: error.message });
    } finally {
      setLoading(false);
    }
  };

  const formatImporte = (categoria, importe) => {
    const amount = parseFloat(importe);
    if (isNaN(amount)) return '';

    // For gastos and ahorros, show as negative
    if (categoria === 'gastos' || categoria === 'ahorros') {
      return `-€${amount}`;
    }
    return `+€${amount}`;
  };

  // Handle loading state for tipos
  if (tiposLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/movimientos">
            <Button variant="ghost" size="sm">
              ← Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nuevo Movimiento</h1>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-lg">Cargando categorías...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle error state for tipos
  if (tiposError) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/movimientos">
            <Button variant="ghost" size="sm">
              ← Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nuevo Movimiento</h1>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-red-600">Error: {tiposError}</div>
              <p className="text-gray-600 mt-2">
                No se pudieron cargar las categorías. 
                <Link href="/gestion-tipos" className="text-blue-600 hover:underline ml-1">
                  Configura tus tipos de movimiento aquí.
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Handle empty state for tipos
  if (!tiposLoading && tiposMovimiento.length === 0) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-4">
          <Link href="/movimientos">
            <Button variant="ghost" size="sm">
              ← Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nuevo Movimiento</h1>
          </div>
        </div>
        <Card>
          <CardContent>
            <div className="text-center py-12">
              <div className="text-6xl mb-4">⚙️</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay tipos de movimiento configurados
              </h3>
              <p className="text-gray-600 mb-6">
                Necesitas crear al menos un tipo de movimiento antes de poder añadir transacciones.
              </p>
              <Link href="/gestion-tipos">
                <Button>
                  Configurar tipos de movimiento
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link href="/movimientos">
          <Button variant="ghost" size="sm">
            ← Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Movimiento</h1>
          <p className="text-gray-600 mt-1">Registra un nuevo ingreso, gasto o ahorro</p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Movimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error message */}
            {errors.submit && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{errors.submit}</p>
              </div>
            )}

            {/* Tipo de Movimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Movimiento *
              </label>
              <div className="grid grid-cols-3 gap-3">
                {['ingresos', 'gastos', 'ahorros'].map((tipo) => (
                  <button
                    key={tipo}
                    type="button"
                    onClick={() => handleInputChange({ target: { name: 'categoria', value: tipo } })}
                    className={`p-4 rounded-lg border-2 transition-all ${
                      formData.categoria === tipo
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">
                      {tipo === 'ingresos' ? '💰' : tipo === 'gastos' ? '💸' : '🏦'}
                    </div>
                    <div className="font-medium capitalize">{tipo}</div>
                  </button>
                ))}
              </div>
              {errors.categoria && (
                <p className="mt-1 text-sm text-red-600">{errors.categoria}</p>
              )}
            </div>

            {/* Fecha e Importe */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha *
                </label>
                <input
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.fecha ? 'border-red-300' : 'border-gray-300'
                  }`}
                />
                {errors.fecha && (
                  <p className="mt-1 text-sm text-red-600">{errors.fecha}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Importe * {formData.importe && formData.categoria && (
                    <span className={`ml-2 font-semibold ${
                      formData.categoria === 'ingresos' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {formatImporte(formData.categoria, formData.importe)}
                    </span>
                  )}
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">€</span>
                  <input
                    type="number"
                    name="importe"
                    value={formData.importe}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className={`w-full pl-8 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.importe ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.importe && (
                  <p className="mt-1 text-sm text-red-600">{errors.importe}</p>
                )}
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descripción *
              </label>
              <input
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                placeholder="Ej: Compra supermercado, Salario enero, Ahorro mensual..."
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.nombre ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors.nombre && (
                <p className="mt-1 text-sm text-red-600">{errors.nombre}</p>
              )}
            </div>

            {/* Categoría */}
            {formData.categoria && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Categoría *
                </label>
                <select
                  name="id_tipo_movimiento"
                  value={formData.id_tipo_movimiento}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.id_tipo_movimiento ? 'border-red-300' : 'border-gray-300'
                  }`}
                >
                  <option value="">Seleccionar categoría</option>
                  {availableCategories.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {tipo.nombre}
                    </option>
                  ))}
                </select>
                {availableCategories.length === 0 && (
                  <p className="mt-1 text-sm text-yellow-600">
                    No hay categorías configuradas para {formData.categoria}.{' '}
                    <Link href="/gestion-tipos" className="text-blue-600 hover:underline">
                      Crear una aquí.
                    </Link>
                  </p>
                )}
                {errors.id_tipo_movimiento && (
                  <p className="mt-1 text-sm text-red-600">{errors.id_tipo_movimiento}</p>
                )}
              </div>
            )}

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notas (opcional)
              </label>
              <textarea
                name="notas"
                value={formData.notas}
                onChange={handleInputChange}
                rows={3}
                placeholder="Información adicional sobre este movimiento..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
              <Link href="/movimientos">
                <Button variant="outline">
                  Cancelar
                </Button>
              </Link>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar Movimiento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 