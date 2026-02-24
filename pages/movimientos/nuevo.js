import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Card, { CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { useTiposMovimiento } from '../../hooks/useTiposMovimiento';
import { useMovimientos } from '../../hooks/useMovimientos';
import { useTags } from '../../hooks/useTags';
import { useMovimientoTags } from '../../hooks/useMovimientoTags';

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // Get today's date in YYYY-MM-DD format (like old component)
  const today = new Date().toISOString().split('T')[0];
  
  const [formData, setFormData] = useState({
    fecha: today,
    nombre: '',
    importe: '',
    id_tipo_movimiento: '',
    tagIds: [],
  });

  const [errors, setErrors] = useState({});

  // Use real data from Supabase
  const { tiposMovimiento, loading: tiposLoading, error: tiposError } = useTiposMovimiento();
  const { createMovimiento } = useMovimientos();
  const { tags } = useTags();
  const { setMovimientoTags } = useMovimientoTags();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleTagToggle = (tagId) => {
    setFormData(prev => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.fecha) newErrors.fecha = 'La fecha es requerida';
    if (!formData.nombre) newErrors.nombre = 'El nombre es requerido';
    if (!formData.importe) newErrors.importe = 'El importe es requerido';
    if (!formData.id_tipo_movimiento) newErrors.id_tipo_movimiento = 'La categoría es requerida';
    
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
      // Match exact old component logic
      const [year, month, day] = formData.fecha.split('-').map(Number);
      const fecha = new Date(Date.UTC(year, month - 1, day));

      const movimientoData = {
        fecha: fecha.toISOString(),
        nombre: formData.nombre.trim(),
        importe: Number(formData.importe),
        id_tipo_movimiento: formData.id_tipo_movimiento
      };

      const { data: created, error } = await createMovimiento(movimientoData);
      
      if (error) {
        throw new Error(error);
      }

      if (created?.id && formData.tagIds?.length) {
        await setMovimientoTags(created.id, formData.tagIds);
      }

      router.push('/movimientos');
      
    } catch (error) {
      console.error('Error creating movimiento:', error);
      setErrors({ submit: error.message || 'Error al crear el movimiento' });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      fecha: today,
      nombre: '',
      importe: '',
      id_tipo_movimiento: '',
      tagIds: [],
    });
    setErrors({});
  };

  if (tiposLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-lg">Cargando formulario...</div>
        </div>
      </div>
    );
  }

  if (tiposError) {
    return (
      <div className="space-y-6">
        <div className="text-center py-12">
          <div className="text-red-600">Error: {tiposError}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link href="/movimientos" className="flex items-center text-blue-600 hover:text-blue-800 mb-2">
            ← Volver
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">Nuevo Movimiento</h1>
          <p className="text-gray-600 mt-1">
            Registra un nuevo ingreso, gasto o ahorro
          </p>
        </div>
      </div>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>Información del Movimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Display */}
            {errors.submit && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
                <p className="font-bold">Error</p>
                <p>{errors.submit}</p>
              </div>
            )}

            {/* Form Fields - Match old component layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fecha */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Fecha *
                </label>
                <input
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.fecha ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.fecha && <p className="text-red-600 text-sm">{errors.fecha}</p>}
              </div>

              {/* Importe */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Importe *
                </label>
                <input
                  name="importe"
                  type="number"
                  placeholder="0"
                  value={formData.importe}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.importe ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.importe && <p className="text-red-600 text-sm">{errors.importe}</p>}
              </div>

              {/* Nombre */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Nombre *
                </label>
                <input
                  name="nombre"
                  placeholder="Descripción del movimiento"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.nombre ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                />
                {errors.nombre && <p className="text-red-600 text-sm">{errors.nombre}</p>}
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Categoría *
                </label>
                <select
                  name="id_tipo_movimiento"
                  value={formData.id_tipo_movimiento}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.id_tipo_movimiento ? 'border-red-300' : 'border-gray-300'
                  }`}
                  required
                >
                  <option value="">Seleccione categoría</option>
                  {tiposMovimiento.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </select>
                {errors.id_tipo_movimiento && <p className="text-red-600 text-sm">{errors.id_tipo_movimiento}</p>}
              </div>

              {/* Tags */}
              {tags?.length > 0 && (
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    Etiquetas (opcional)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <label
                        key={t.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 dark:border-slate-600 cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-800"
                      >
                        <input
                          type="checkbox"
                          checked={formData.tagIds?.includes(t.id)}
                          onChange={() => handleTagToggle(t.id)}
                          className="rounded"
                        />
                        <span>{t.nombre}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex flex-col md:flex-row justify-end gap-3 pt-6">
              <Button
                type="button"
                variant="outline"
                onClick={resetForm}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Guardando...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                    Guardar Movimiento
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 