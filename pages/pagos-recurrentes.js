import { useState } from 'react';
import { Repeat, Plus, Pencil, Power, PowerOff, Trash2 } from 'lucide-react';
import { useRecurring } from '../hooks/useRecurring';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';
import { formatCurrency, formatDate, todayISO } from '@/lib/format';
import { TIPO } from '@/lib/constants';
import { proximoCobro, cobrosRestantes, totalesMensuales } from '@/lib/recurrentes';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect as Select } from '@/components/ui/native-select';
import { Field } from '@/components/ui/field';
import { Modal as Dialog } from '@/components/ui/modal';
import { MoneyInput } from '@/components/money/MoneyInput';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { useConfirm } from '@/components/feedback/ConfirmProvider';

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);
// A function, not a constant: evaluated once at module load, the default day
// would freeze at whatever day the tab was opened and be stale after midnight.
const emptyForm = () => ({
  nombre: '', importe: '', id_tipo_movimiento: '', dia_mes: new Date().getDate(), generar_hasta: '',
});

const esIngreso = (r) => r.tipo_movimiento?.tipo === TIPO.INGRESO;

/**
 * One line under the rule's name saying when it next fires. It replaces "Empieza
 * a generarse desde <mes>", which named the month generar_desde falls in --
 * not the month of the first charge, so a rule that would skip October still
 * claimed to start in October.
 */
function estadoCobro(r, hoy) {
  if (!r.activo) return 'Pausado';
  const proximo = proximoCobro(r, hoy);
  if (!proximo) return 'Terminado';
  const cuando = proximo === hoy ? 'hoy' : formatDate(proximo);
  const restantes = cobrosRestantes(r, hoy);
  return restantes
    ? `Próximo cobro: ${cuando} · ${restantes === 1 ? 'último' : `quedan ${restantes}`}`
    : `Próximo cobro: ${cuando}`;
}

export default function PagosRecurrentesPage() {
  const { list, loading, error, createRecurring, updateRecurring, deleteRecurring } = useRecurring();
  const { tiposMovimiento } = useTiposMovimiento();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');
  const confirm = useConfirm();
  const hoy = todayISO();

  const resetForm = () => {
    setFormError('');
    setEditingItem(null);
    setForm(emptyForm());
    setShowModal(false);
  };

  const openNew = () => {
    setFormError('');
    setEditingItem(null);
    setForm(emptyForm());
    setShowModal(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setForm({
      nombre: item.nombre ?? '',
      importe: String(item.importe ?? ''),
      id_tipo_movimiento: item.id_tipo_movimiento ?? '',
      dia_mes: item.dia_mes ?? new Date().getDate(),
      generar_hasta: item.generar_hasta ?? '',
    });
    setFormError('');
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const importe = Number(form.importe);
    if (!form.nombre.trim() || isNaN(importe) || importe <= 0 || !form.id_tipo_movimiento) {
      setFormError('Completa el nombre, un importe mayor que cero y la categoría.');
      return;
    }
    if (form.generar_hasta && form.generar_hasta < hoy) {
      setFormError('El último cobro no puede ser una fecha pasada.');
      return;
    }
    setSaving(true);
    const payload = {
      nombre: form.nombre.trim(),
      importe,
      id_tipo_movimiento: form.id_tipo_movimiento,
      dia_mes: Number(form.dia_mes),
      // Only sent when it means something: an empty end date on a new rule is
      // simply "no end", and leaving the key out keeps older databases happy.
      ...(form.generar_hasta || editingItem?.generar_hasta
        ? { generar_hasta: form.generar_hasta || null }
        : {}),
    };
    const { error: err } = editingItem
      ? await updateRecurring(editingItem.id, payload)
      : await createRecurring({ ...payload, activo: true });
    setSaving(false);
    if (err) {
      setFormError(err);
      return;
    }
    resetForm();
  };

  const handleToggleActivo = async (item) => {
    const { error: err } = await updateRecurring(item.id, { activo: !item.activo });
    setListError(err || '');
  };

  const handleDelete = async (item) => {
    const ok = await confirm({
      title: `¿Eliminar "${item.nombre}"?`,
      description: 'Deja de generarse cada mes. Los movimientos que ya generó se conservan.',
    });
    if (!ok) return;
    const { error: err } = await deleteRecurring(item.id);
    setListError(err || '');
  };

  const totales = totalesMensuales(list, esIngreso);

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

      <ErrorAlert error={error || listError} />

      {list.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 p-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Gastos fijos al mes
              </p>
              <p className="font-mono text-2xl font-semibold tabular-nums text-expense">
                {formatCurrency(totales.gastos)}
              </p>
            </div>
            {totales.ingresos > 0 && (
              <div className="text-right">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Ingresos fijos al mes
                </p>
                <p className="font-mono text-2xl font-semibold tabular-nums text-income">
                  {formatCurrency(totales.ingresos)}
                </p>
              </div>
            )}
            <p className="w-full text-xs text-muted-foreground">Solo cuenta los pagos activos.</p>
          </CardContent>
        </Card>
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
                    {/* Without this, a rule that has not started yet (or has
                        ended) looks broken: it simply never generates. */}
                    <p className="text-xs text-muted-foreground">{estadoCobro(r, hoy)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span
                    className={`mr-1 font-mono text-lg font-semibold tabular-nums ${esIngreso(r) ? 'text-income' : ''}`}
                  >
                    {esIngreso(r) ? '+' : ''}
                    {formatCurrency(Math.abs(r.importe))}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => openEdit(r)} title="Editar" aria-label={`Editar ${r.nombre}`}>
                    <Pencil className="size-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleToggleActivo(r)}
                    title={r.activo ? 'Pausar' : 'Activar'}
                    aria-label={`${r.activo ? 'Pausar' : 'Activar'} ${r.nombre}`}
                  >
                    {r.activo ? (
                      <Power className="size-4 text-success" />
                    ) : (
                      <PowerOff className="size-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(r)} title="Eliminar" aria-label={`Eliminar ${r.nombre}`}>
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
          {formError ? (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </p>
          ) : null}
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
            <MoneyInput
              id="rec-importe"
              value={form.importe}
              onChange={(e) => setForm((f) => ({ ...f, importe: e.target.value }))}
              placeholder="Ej. 64.000"
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
          <Field label="Último cobro (opcional)" htmlFor="rec-hasta">
            <Input
              id="rec-hasta"
              type="date"
              min={hoy}
              value={form.generar_hasta}
              onChange={(e) => setForm((f) => ({ ...f, generar_hasta: e.target.value }))}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Para cuotas: después de esta fecha deja de generarse solo. Vacío = sin fin.
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
