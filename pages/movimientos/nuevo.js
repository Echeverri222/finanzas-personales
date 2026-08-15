import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { ArrowLeft, ChevronDown } from 'lucide-react';
import { useTiposMovimiento } from '../../hooks/useTiposMovimiento';
import { useMovimientos } from '../../hooks/useMovimientos';
import { useTags } from '../../hooks/useTags';
import { useMovimientoTags } from '../../hooks/useMovimientoTags';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { Badge } from '@/components/ui/badge';

export default function NuevoMovimientoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    fecha: today,
    nombre: '',
    importe: '',
    id_tipo_movimiento: '',
    tagIds: [],
  });
  const [errors, setErrors] = useState({});
  const [tagsOpen, setTagsOpen] = useState(() => formData.tagIds.length > 0);

  const { tiposMovimiento, loading: tiposLoading, error: tiposError } = useTiposMovimiento();
  const { createMovimiento } = useMovimientos();
  const { tags } = useTags();
  const { setMovimientoTags } = useMovimientoTags();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleTagToggle = (tagId) => {
    setFormData((prev) => ({
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
    if (!validateForm()) return;
    setLoading(true);
    try {
      const [year, month, day] = formData.fecha.split('-').map(Number);
      const fecha = new Date(Date.UTC(year, month - 1, day));
      const movimientoData = {
        fecha: fecha.toISOString(),
        nombre: formData.nombre.trim(),
        importe: Number(formData.importe),
        id_tipo_movimiento: formData.id_tipo_movimiento,
      };
      const { data: created, error } = await createMovimiento(movimientoData);
      if (error) throw new Error(error);
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
    setFormData({ fecha: today, nombre: '', importe: '', id_tipo_movimiento: '', tagIds: [] });
    setErrors({});
    setTagsOpen(false);
  };

  if (tiposLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-muted-foreground">Cargando formulario...</div>
      </div>
    );
  }

  if (tiposError) {
    return (
      <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-destructive">
        Error: {tiposError}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/movimientos" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="size-4" />
          Volver
        </Link>
        <PageHeader title="Nuevo movimiento" description="Registra un nuevo ingreso, gasto o ahorro." />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del movimiento</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && (
              <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-destructive">
                <p className="font-semibold">Error</p>
                <p>{errors.submit}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Fecha *" htmlFor="fecha">
                <Input
                  id="fecha"
                  type="date"
                  name="fecha"
                  value={formData.fecha}
                  onChange={handleInputChange}
                  className={errors.fecha ? 'border-destructive' : ''}
                  required
                />
                {errors.fecha && <p className="mt-1 text-sm text-destructive">{errors.fecha}</p>}
              </Field>

              <Field label="Importe *" htmlFor="importe">
                <Input
                  id="importe"
                  name="importe"
                  type="number"
                  placeholder="0"
                  value={formData.importe}
                  onChange={handleInputChange}
                  className={errors.importe ? 'border-destructive' : ''}
                  required
                />
                {errors.importe && <p className="mt-1 text-sm text-destructive">{errors.importe}</p>}
              </Field>

              <Field label="Nombre *" htmlFor="nombre">
                <Input
                  id="nombre"
                  name="nombre"
                  placeholder="Descripción del movimiento"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  className={errors.nombre ? 'border-destructive' : ''}
                  required
                />
                {errors.nombre && <p className="mt-1 text-sm text-destructive">{errors.nombre}</p>}
              </Field>

              <Field label="Categoría *" htmlFor="id_tipo_movimiento">
                <Select
                  id="id_tipo_movimiento"
                  name="id_tipo_movimiento"
                  value={formData.id_tipo_movimiento}
                  onChange={handleInputChange}
                  className={errors.id_tipo_movimiento ? 'border-destructive' : ''}
                  required
                >
                  <option value="">Seleccione categoría</option>
                  {tiposMovimiento.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                  ))}
                </Select>
                {errors.id_tipo_movimiento && (
                  <p className="mt-1 text-sm text-destructive">{errors.id_tipo_movimiento}</p>
                )}
              </Field>

              {tags?.length > 0 && (
                <div className="space-y-2 md:col-span-2">
                  <button
                    type="button"
                    onClick={() => setTagsOpen((prev) => !prev)}
                    aria-expanded={tagsOpen}
                    aria-controls="etiquetas-panel"
                    className="flex w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-left text-sm font-medium hover:bg-secondary"
                  >
                    <span className="flex items-center gap-2">
                      Etiquetas (opcional)
                      {formData.tagIds?.length > 0 && (
                        <Badge variant="secondary">{formData.tagIds.length} seleccionada{formData.tagIds.length > 1 ? 's' : ''}</Badge>
                      )}
                    </span>
                    <ChevronDown className={`size-4 shrink-0 transition-transform ${tagsOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div
                    id="etiquetas-panel"
                    className={tagsOpen ? 'flex flex-wrap gap-2 pt-1' : 'hidden'}
                  >
                    {tags.map((t) => (
                      <label
                        key={t.id}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"
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

            <div className="flex flex-col justify-end gap-3 pt-2 md:flex-row">
              <Button type="button" variant="outline" onClick={resetForm} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : 'Guardar movimiento'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
