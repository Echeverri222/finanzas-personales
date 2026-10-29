import { useState } from 'react';
import { Target, CheckCircle2, PiggyBank, Plus, Trash2, CalendarDays } from 'lucide-react';
import { useMetas } from '../hooks/useMetas';
import { formatCurrency, formatDate, todayISO, toISODate } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Modal as Dialog } from '@/components/ui/modal';
import { MoneyInput } from '@/components/money/MoneyInput';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { useConfirm } from '@/components/feedback/ConfirmProvider';

/** A year from today: a sensible default deadline the user can move. */
function enUnAnio() {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return toISODate(d);
}

const metaVacia = () => ({ nombre: '', objetivo: '', fecha_meta: enUnAnio() });

/** Whole months from today to `fecha` (at least 1), for "≈ $X al mes". */
function mesesHasta(fecha) {
  const hoy = new Date();
  const [y, m] = fecha.split('-').map(Number);
  return Math.max(1, (y - hoy.getFullYear()) * 12 + (m - 1 - hoy.getMonth()));
}

export default function MetasPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [selectedMeta, setSelectedMeta] = useState(null);
  const [saving, setSaving] = useState(false);

  const { metas, loading, error, createMeta, deleteMeta, addMoneyToMeta } = useMetas();

  const [newMeta, setNewMeta] = useState(metaVacia);
  const [addMoneyForm, setAddMoneyForm] = useState({ cantidad: '' });
  const [formError, setFormError] = useState('');
  const [listError, setListError] = useState('');
  const confirm = useConfirm();

  const getProgressPercentage = (actual, objetivo) => Math.min((actual / objetivo) * 100, 100);

  const getProgressBarColor = (actual, objetivo) => {
    const progress = getProgressPercentage(actual, objetivo);
    if (progress >= 100) return 'bg-success';
    if (progress >= 70) return 'bg-warning';
    return 'bg-primary';
  };

  const handleCreateMeta = async (e) => {
    e.preventDefault();
    const objetivo = parseFloat(newMeta.objetivo);
    if (!newMeta.nombre.trim() || !(objetivo > 0) || !newMeta.fecha_meta) {
      setFormError('Completa el nombre, un objetivo mayor que cero y la fecha.');
      return;
    }
    setSaving(true);
    try {
      // fecha_meta is NOT NULL in the database. The dialog used to have no date
      // field and sent null, so every "Crear meta" failed with a 400.
      const { error } = await createMeta({
        nombre: newMeta.nombre.trim(),
        objetivo,
        fecha_meta: newMeta.fecha_meta,
      });
      if (error) {
        setFormError(error);
        return;
      }
      setNewMeta(metaVacia());
      setFormError('');
      setShowCreateModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddMoney = async (e) => {
    e.preventDefault();
    const cantidad = parseFloat(addMoneyForm.cantidad);
    if (isNaN(cantidad) || cantidad <= 0) {
      setFormError('Escribe una cantidad mayor que cero.');
      return;
    }
    setSaving(true);
    try {
      const { error } = await addMoneyToMeta(selectedMeta.id, cantidad);
      if (error) {
        setFormError(error);
        return;
      }
      setAddMoneyForm({ cantidad: '' });
      setFormError('');
      setShowAddMoneyModal(false);
      setSelectedMeta(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMeta = async (meta) => {
    const ok = await confirm({
      title: `¿Eliminar la meta "${meta.nombre}"?`,
      description: 'Se pierde el progreso registrado en ella. Tus movimientos no cambian.',
    });
    if (!ok) return;
    const { error } = await deleteMeta(meta.id);
    setListError(error || '');
  };

  const openCreate = () => {
    setNewMeta(metaVacia());
    setFormError('');
    setShowCreateModal(true);
  };

  const stats = {
    totalMetas: metas.length,
    metasCompletadas: metas.filter((m) => m.actual >= m.objetivo).length,
    totalObjetivo: metas.reduce((sum, m) => sum + m.objetivo, 0),
    totalAhorrado: metas.reduce((sum, m) => sum + m.actual, 0),
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-muted-foreground">Cargando metas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-destructive">
        <p className="font-semibold">Error</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Metas" description="Alcanza tus objetivos financieros.">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Nueva meta
        </Button>
      </PageHeader>

      <ErrorAlert error={listError} />

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total metas</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{stats.totalMetas}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Completadas</p>
            <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-income">
              {stats.metasCompletadas}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Objetivo total</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{formatCurrency(stats.totalObjetivo)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-muted-foreground">Total ahorrado</p>
            <p className="mt-1 text-xl font-semibold tabular-nums text-primary">
              {formatCurrency(stats.totalAhorrado)}
            </p>
          </CardContent>
        </Card>
      </div>

      {metas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="mx-auto mb-3 size-10 text-primary/60" />
            <h3 className="text-lg font-semibold">No tienes metas de ahorro</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Crea tu primera meta para empezar a alcanzar tus objetivos financieros.
            </p>
            <Button className="mt-6" onClick={openCreate}>
              <Plus className="size-4" />
              Crear primera meta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {metas.map((meta) => {
            const pct = getProgressPercentage(meta.actual, meta.objetivo);
            return (
              <Card key={meta.id}>
                <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <PiggyBank className="size-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{meta.nombre}</h3>
                        {/* The deadline, not the creation date: "when do I
                            need this by" is the question a goal answers. */}
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <CalendarDays className="size-3" />
                          {meta.fecha_meta ? `Para el ${formatDate(meta.fecha_meta)}` : formatDate(meta.fechaCreacion)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteMeta(meta)}
                      className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive"
                      aria-label={`Eliminar meta ${meta.nombre}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium tabular-nums">
                      {formatCurrency(meta.actual)}{' '}
                      <span className="font-normal text-muted-foreground">de {formatCurrency(meta.objetivo)}</span>
                    </span>
                    <span className="text-xs font-medium text-primary">{pct.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={`h-full rounded-full transition-all ${getProgressBarColor(meta.actual, meta.objetivo)}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Faltan {formatCurrency(Math.max(0, meta.objetivo - meta.actual))}
                    {meta.fecha_meta && meta.actual < meta.objetivo && meta.fecha_meta >= todayISO()
                      ? ` · ≈ ${formatCurrency((meta.objetivo - meta.actual) / mesesHasta(meta.fecha_meta))} al mes`
                      : ''}
                  </p>
                  <Button
                    variant="secondary"
                    className="mt-4 w-full"
                    onClick={() => {
                      setSelectedMeta(meta);
                      setFormError('');
                      setShowAddMoneyModal(true);
                    }}
                  >
                    <Plus className="size-4" />
                    Añadir dinero
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create meta modal */}
      <Dialog open={showCreateModal} onClose={() => setShowCreateModal(false)} title="Nueva meta de ahorro">
        <form onSubmit={handleCreateMeta} className="space-y-4">
          {formError ? (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {formError}
            </p>
          ) : null}
          <Field label="Nombre de la meta *" htmlFor="meta-nombre">
            <Input
              id="meta-nombre"
              type="text"
              value={newMeta.nombre}
              onChange={(e) => setNewMeta({ ...newMeta, nombre: e.target.value })}
              placeholder="Ej: Vacaciones, Emergencias..."
              required
            />
          </Field>
          <Field label="Objetivo ($) *" htmlFor="meta-objetivo">
            <MoneyInput
              id="meta-objetivo"
              value={newMeta.objetivo}
              onChange={(e) => setNewMeta((m) => ({ ...m, objetivo: e.target.value }))}
              placeholder="Ej. 5.000.000"
              required
            />
          </Field>
          <Field label="Fecha objetivo *" htmlFor="meta-fecha">
            <Input
              id="meta-fecha"
              type="date"
              min={todayISO()}
              value={newMeta.fecha_meta}
              onChange={(e) => setNewMeta((m) => ({ ...m, fecha_meta: e.target.value }))}
              required
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Con ella calculamos cuánto apartar al mes.
            </p>
          </Field>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Creando...' : 'Crear meta'}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Add money modal */}
      <Dialog
        open={showAddMoneyModal && !!selectedMeta}
        onClose={() => {
          setShowAddMoneyModal(false);
          setSelectedMeta(null);
        }}
        title={selectedMeta ? `Añadir dinero a: ${selectedMeta.nombre}` : ''}
      >
        {selectedMeta && (
          <form onSubmit={handleAddMoney} className="space-y-4">
            {formError ? (
              <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {formError}
              </p>
            ) : null}
            <div className="rounded-lg bg-secondary p-3">
              <div className="text-sm text-muted-foreground">Progreso actual:</div>
              <div className="text-lg font-semibold tabular-nums">
                {formatCurrency(selectedMeta.actual)} / {formatCurrency(selectedMeta.objetivo)}
              </div>
            </div>
            <Field label="Cantidad a añadir ($) *" htmlFor="add-cantidad">
              <MoneyInput
                id="add-cantidad"
                value={addMoneyForm.cantidad}
                onChange={(e) => setAddMoneyForm({ cantidad: e.target.value })}
                placeholder="Ej. 200.000"
                required
              />
            </Field>
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddMoneyModal(false);
                  setSelectedMeta(null);
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button type="submit" className="flex-1" disabled={saving}>
                {saving ? 'Añadiendo...' : 'Añadir dinero'}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  );
}
