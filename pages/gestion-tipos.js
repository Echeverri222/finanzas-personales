import { useState } from 'react';
import { Pencil, Trash2, Check, X, FolderOpen, Plus } from 'lucide-react';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';
import { useUser } from '../contexts/UserContext';
import { formatCurrency } from '@/lib/format';
import { TIPO } from '@/lib/constants';
import { tipoVisual } from '@/lib/tipoVisuals';
import { PageHeader, SectionLabel } from '@/components/PageHeader';
import { NativeSelect as Select } from '@/components/ui/native-select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/ui/field';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { EmptyState } from '@/components/feedback/EmptyState';
import { ListSkeleton } from '@/components/feedback/skeletons';
import { TypeIcon } from '@/components/money/TypeIcon';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

export default function GestionTiposPage() {
  const [formData, setFormData] = useState({ nombre: '', meta: '', tipo: TIPO.GASTO });
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({ nombre: '', meta: '', tipo: TIPO.GASTO });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const { userProfile, loading: userLoading } = useUser();
  const {
    tiposMovimiento,
    loading,
    error: hookError,
    createTipoMovimiento,
    updateTipoMovimiento,
    deleteTipoMovimiento,
  } = useTiposMovimiento();

  // Each recommendation carries its semantic type, so picking "Ingresos" from
  // the chips creates an income category rather than silently taking the
  // 'gasto' column default.
  const recomendados = [
    { nombre: 'Ingresos', tipo: TIPO.INGRESO },
    { nombre: 'Alimentación', tipo: TIPO.GASTO },
    { nombre: 'Transporte', tipo: TIPO.GASTO },
    { nombre: 'Vivienda', tipo: TIPO.GASTO },
    { nombre: 'Servicios', tipo: TIPO.GASTO },
    { nombre: 'Entretenimiento', tipo: TIPO.GASTO },
    { nombre: 'Salud', tipo: TIPO.GASTO },
    { nombre: 'Compras', tipo: TIPO.GASTO },
    { nombre: 'Gastos fijos', tipo: TIPO.GASTO },
    { nombre: 'Ahorro', tipo: TIPO.AHORRO },
    { nombre: 'Emergencia', tipo: TIPO.AHORRO },
    { nombre: 'Inversiones', tipo: TIPO.INVERSION },
  ];

  // Labels for the tipo selector. Order matches how often they get picked.
  const TIPO_OPCIONES = [
    { value: TIPO.GASTO, label: 'Gasto', hint: 'Dinero que sale' },
    { value: TIPO.INGRESO, label: 'Ingreso', hint: 'Dinero que entra' },
    { value: TIPO.AHORRO, label: 'Ahorro', hint: 'Dinero que apartas' },
    { value: TIPO.INVERSION, label: 'Inversión', hint: 'Acciones, cripto, fondos' },
    { value: TIPO.PRESTAMO, label: 'Préstamo', hint: 'Dinero que prestas y esperas de vuelta' },
  ];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
        meta: formData.meta ? parseFloat(formData.meta) : null,
        tipo: formData.tipo,
      });
      if (createError) throw new Error(createError);
      setFormData({ nombre: '', meta: '', tipo: TIPO.GASTO });
    } catch (err) {
      setError('Error al crear tipo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (tipo) => {
    setEditingId(tipo.id);
    setEditFormData({ nombre: tipo.nombre, meta: tipo.meta || '', tipo: tipo.tipo || TIPO.GASTO });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({ nombre: '', meta: '', tipo: TIPO.GASTO });
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
        meta: editFormData.meta ? parseFloat(editFormData.meta) : null,
        tipo: editFormData.tipo,
      });
      if (updateError) throw new Error(updateError);
      setEditingId(null);
      setEditFormData({ nombre: '', meta: '', tipo: TIPO.GASTO });
    } catch (err) {
      setError('Error al actualizar tipo: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, nombre) => {
    if (confirm(`¿Estás seguro de que quieres eliminar "${nombre}"?`)) {
      const { error: deleteError } = await deleteTipoMovimiento(id);
      if (deleteError) setError('Error al eliminar tipo: ' + deleteError);
    }
  };

  const addRecommended = (r) => setFormData((prev) => ({ ...prev, nombre: r.nombre, tipo: r.tipo }));

  if (loading || userLoading) {
    return (
      <div className="space-y-5">
        <PageHeader
          title="Categorías"
          description="Gestiona tus categorías de ingresos, gastos y ahorros."
        />
        <ListSkeleton rows={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías"
        description="Gestiona tus categorías de ingresos, gastos y ahorros."
      />

      <ErrorAlert error={error || hookError} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Crear nueva categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nombre de la categoría *" htmlFor="nombre">
                <Input
                  id="nombre"
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleInputChange}
                  placeholder="Ej: Alimentación, Salario, Ahorro..."
                  required
                />
              </Field>
              <Field label="Tipo *" htmlFor="tipo">
                <Select
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleInputChange}
                >
                  {TIPO_OPCIONES.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label} — {o.hint}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-muted-foreground">
                  Define cómo se cuenta en los totales. Cambiar el nombre no lo afecta.
                </p>
              </Field>
              <Field label="Meta mensual (opcional)" htmlFor="meta">
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="meta"
                    type="number"
                    name="meta"
                    value={formData.meta}
                    onChange={handleInputChange}
                    placeholder="0"
                    step="0.01"
                    min="0"
                    className="pl-7"
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Para gastos: límite máximo. Para ingresos/ahorros: objetivo mínimo.
                </p>
              </Field>
              <Button type="submit" disabled={saving} className="w-full">
                {saving ? 'Guardando...' : 'Crear categoría'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorías recomendadas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Grouped by tipo, as in the Stitch design. Twelve chips in one
                undifferentiated wrap gave no clue that picking "Ahorro" and
                picking "Transporte" produce categories that behave completely
                differently in every total. */}
            {TIPO_OPCIONES.map((opcion) => {
              const items = recomendados.filter((r) => r.tipo === opcion.value);
              if (items.length === 0) return null;
              return (
                <div key={opcion.value}>
                  <SectionLabel className="mb-2">{opcion.label}</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {items.map((r) => (
                      // A Button, not a chip: these are actions that fill the
                      // form, not a filter state you can be "in".
                      <Button
                        key={r.nombre}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addRecommended(r)}
                      >
                        <Plus className="size-3.5" />
                        {r.nombre}
                      </Button>
                    ))}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tus categorías ({tiposMovimiento.length})</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {tiposMovimiento.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No hay categorías creadas"
              description="Crea tu primera categoría para organizar tus movimientos."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-6">Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Meta mensual</TableHead>
                  <TableHead className="pr-6 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiposMovimiento.map((tipo) => (
                  <TableRow key={tipo.id}>
                    {editingId === tipo.id ? (
                      <>
                        <TableCell className="pl-6">
                          <Input
                            value={editFormData.nombre}
                            onChange={(e) => setEditFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                            className="h-8"
                            aria-label="Nombre de la categoría"
                          />
                        </TableCell>
                        {/* `tipo` was already in editFormData and already sent
                            on save, but nothing rendered a control for it -- so
                            a category created with the wrong type could never be
                            corrected, only deleted and recreated. */}
                        <TableCell>
                          <Select
                            value={editFormData.tipo}
                            onChange={(e) => setEditFormData((prev) => ({ ...prev, tipo: e.target.value }))}
                            className="h-8"
                            aria-label="Tipo de la categoría"
                          >
                            {TIPO_OPCIONES.map((o) => (
                              <option key={o.value} value={o.value}>{o.label}</option>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={editFormData.meta}
                            onChange={(e) => setEditFormData((prev) => ({ ...prev, meta: e.target.value }))}
                            className="h-8 text-right"
                            step="0.01"
                            min="0"
                            aria-label="Meta mensual"
                          />
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleSaveEdit}
                              disabled={saving}
                              aria-label="Guardar cambios"
                            >
                              <Check className="size-4 text-success" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={handleCancelEdit}
                              aria-label="Cancelar edición"
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="pl-6">
                          <div className="flex items-center gap-3">
                            <TypeIcon tipo={tipo.tipo} nombre={tipo.nombre} size="sm" />
                            <span className="font-medium">{tipo.nombre}</span>
                          </div>
                        </TableCell>
                        {/* Surfacing `tipo` is the point: it is what decides
                            whether this category counts as money in, money out
                            or money set aside, and the name -- free text the
                            user can change at will -- decides nothing. The table
                            showed only the name, so the field that actually
                            drives every total was invisible. */}
                        <TableCell>
                          <Badge variant="secondary" className="font-normal">
                            {tipoVisual(tipo.tipo).label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm tabular-nums text-muted-foreground">
                          {tipo.meta ? formatCurrency(tipo.meta) : '—'}
                        </TableCell>
                        <TableCell className="pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(tipo)}
                              aria-label={`Editar ${tipo.nombre}`}
                            >
                              <Pencil className="size-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(tipo.id, tipo.nombre)}
                              aria-label={`Eliminar ${tipo.nombre}`}
                            >
                              <Trash2 className="size-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
