import { useState } from 'react';
import { Repeat, Plus, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { useRecurring } from '../hooks/useRecurring';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';
import { formatCurrency } from '@/lib/format';
import { createSafeDate } from '@/lib/dateUtils';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Field } from '@/components/ui/field';
import { Dialog } from '@/components/ui/dialog';

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
const EMPTY_FORM = { nombre: '', importe: '', id_tipo_movimiento: '', dia_mes: new Date().getDate() };

/**
 * generar_desde is the first date a rule may generate. Existing rules were
 * backfilled to the start of next month so releasing the fixed generator did
 * not create movimientos retroactively -- see the recurring_start_date
 * migration. Only worth showing while it is still in the future.
 */
function startsInFuture(generarDesde) {
  if (!generarDesde) return false;
  return createSafeDate(generarDesde) > new Date();
}

function formatStartDate(generarDesde) {
  return createSafeDate(generarDesde).toLocaleDateString('es-ES', {
    month: 'long',
    year: 'numeric',
  });
}

export default function PagosRecurrentesPage() {
  const { list, loading, error, createRecurring, updateRecurring, deleteRecurring } = useRecurring();
  const { tiposMovimiento } = useTiposMovimiento();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const resetForm = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowModal(false);
  };

  const openNew = () => {
    setEditingItem(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      nombre: item.nombre ?? '',
      importe: String(item.importe ?? ''),
      id_tipo_movimiento: item.id_tipo_movimiento ?? '',
      dia_mes: item.dia_mes ?? new Date().getDate(),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const importe = Number(form.importe);
    if (!form.nombre.trim() || isNaN(importe) || importe === 0 || !form.id_tipo_movimiento) return;
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      importe,
      id_tipo_movimiento: form.id_tipo_movimiento,
      dia_mes: Number(form.dia_mes),
    };
    if (editingItem) {
      const { error: err } = await updateRecurring(editingItem.id, payload);
      setSaving(false);
      if (err) return alert('Error al actualizar: ' + err);
    } else {
      const { error: err } = await createRecurring({ ...payload, activo: true });
      setSaving(false);
      if (err) return alert('Error al crear: ' + err);
    }
    resetForm();
  };

  const handleToggleActivo = async (item) => {
    await updateRecurring(item.id, { activo: !item.activo });
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este pago recurrente? No se borran los movimientos ya generados.')) return;
    await deleteRecurring(id);
  };

  const tipoNombre = (r) => r.tipo_movimiento?.nombre ?? '—';

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <p className="text-muted-foreground">Cargando pagos recurrentes...</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Recurrentes"
        description="Se añaden automáticamente a gastos o ingresos cada mes el día elegido."
      >
        <Button onClick={openNew}>
          <Plus className="size-4" />
          Nuevo pago recurrente
        </Button>
      </PageHeader>

      {error && (
        <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {list.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Repeat className="mx-auto mb-3 size-10 text-primary/60" />
            <h2 className="text-lg font-semibold">Sin pagos recurrentes</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea uno y se generará un movimiento automático cada mes el mismo día.
            </p>
            <Button className="mt-6" onClick={openNew}>
              <Plus className="size-4" />
              Crear el primero
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <Card key={r.id} className={!r.activo ? 'opacity-60' : ''}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Repeat className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{r.nombre}</p>
                    <p className="text-sm text-muted-foreground">
                      {tipoNombre(r)} · Día {r.dia_mes} de cada mes
                    </p>
                    {/* Without this, a rule that has not started yet looks
                        broken: it simply never generates and says nothing. */}
                    {startsInFuture(r.generar_desde) && (
                      <p className="text-xs text-muted-foreground">
                        Empieza a generarse desde {formatStartDate(r.generar_desde)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-lg font-semibold tabular-nums">{formatCurrency(r.importe)}</span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Editar">
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActivo(r)}
                    title={r.activo ? 'Pausar' : 'Activar'}
                  >
                    {r.activo ? (
                      <Power className="size-4 text-emerald-600" />
                    ) : (
                      <PowerOff className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r.id)} title="Eliminar">
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={showModal}
        onClose={resetForm}
        title={editingItem ? 'Editar pago recurrente' : 'Nuevo pago recurrente'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Nombre *" htmlFor="rec-nombre">
            <Input
              id="rec-nombre"
              type="text"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              placeholder="Ej. Alquiler, Nómina, Netflix"
              required
            />
          </Field>
          <Field label="Importe *" htmlFor="rec-importe">
            <Input
              id="rec-importe"
              type="number"
              step="0.01"
              value={form.importe}
              onChange={(e) => setForm((f) => ({ ...f, importe: e.target.value }))}
              placeholder="0"
              required
            />
          </Field>
          <Field label="Categoría (gasto o ingreso) *" htmlFor="rec-tipo">
            <Select
              id="rec-tipo"
              value={form.id_tipo_movimiento}
              onChange={(e) => setForm((f) => ({ ...f, id_tipo_movimiento: e.target.value }))}
              required
            >
              <option value="">Elige categoría</option>
              {(tiposMovimiento || []).map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              Si es Ingresos, se creará como ingreso; si no, como gasto.
            </p>
          </Field>
          <Field label="Día del mes (1–31) *" htmlFor="rec-dia">
            <Select
              id="rec-dia"
              value={form.dia_mes}
              onChange={(e) => setForm((f) => ({ ...f, dia_mes: Number(e.target.value) }))}
            >
              {DAYS_OF_MONTH.map((d) => (
                <option key={d} value={d}>Día {d}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-muted-foreground">
              En meses cortos (ej. febrero), el 29–31 se usa el último día del mes.
            </p>
          </Field>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Crear'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
