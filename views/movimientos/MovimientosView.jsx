import Link from 'next/link';
import { Search, Plus, Pencil, Trash2, ReceiptText, ArrowUp, ArrowDown } from 'lucide-react';

import { groupMovimientosByDate } from '../../lib/api/movimientosView';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect as Select } from '@/components/ui/native-select';
import { Field } from '@/components/ui/field';
import { Modal as Dialog } from '@/components/ui/modal';
import { FilterChips } from '@/components/filters/FilterChips';
import { Amount } from '@/components/money/Amount';
import { TypeIcon } from '@/components/money/TypeIcon';
import { EmptyState } from '@/components/feedback/EmptyState';

const SORT_OPTIONS = [
  { value: 'fecha', label: 'Fecha' },
  { value: 'nombre', label: 'Descripción' },
  { value: 'importe', label: 'Monto' },
];

/**
 * Net total for one day.
 *
 * A day that nets exactly zero renders untoned and unsigned: "+$0" in green
 * would read as income when nothing was earned.
 */
function DayTotal({ total }) {
  if (total === 0) {
    return <Amount value={0} size="sm" className="text-muted-foreground" />;
  }
  return <Amount value={total} tipo={total > 0 ? 'ingreso' : 'gasto'} signed toned size="sm" />;
}

/** Day label on the left, the day's net on the right — the timeline signature. */
function DayHeading({ group }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
      <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        {group.heading}
      </h2>
      <DayTotal total={group.total} />
    </div>
  );
}

/**
 * One movimientos screen for every breakpoint.
 *
 * Replaces MovimientosDesktop.jsx + MovimientosMobile.jsx (514 lines), and then
 * the table that stood in for the desktop half of it: each day is now its own
 * card with the day and its net above it, at every width. A single table with
 * day-subheader rows read as one continuous block, which is exactly what
 * grouping was supposed to break up.
 *
 * The cost of dropping the table is the sortable column headers, so sorting
 * moved to an explicit control in the filter bar rather than disappearing.
 *
 * Editing is one dialog at both sizes: desktop lost its in-row editing, which
 * was a third copy of the same form and the reason the two views had drifted.
 */
export default function MovimientosView({
  sortedMovimientos,
  tiposMovimiento,
  tags,
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
  monthFilter,
  setMonthFilter,
  sortConfig,
  onSort,
  editingId,
  editFormData,
  setEditFormData,
  onEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}) {
  const handleTagToggle = (tagId) => {
    const current = editFormData?.tagIds || [];
    setEditFormData((prev) => ({
      ...prev,
      tagIds: current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    }));
  };

  const monthOptions = [];
  const currentYear = new Date().getFullYear();
  for (let m = 1; m <= 12; m += 1) {
    const value = `${currentYear}-${String(m).padStart(2, '0')}`;
    const label = new Date(2000, m - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
    monthOptions.push({ value, label: `${label} ${currentYear}` });
  }

  // Radix ToggleGroup values are strings only, so the numeric category ids are
  // stringified on the way in and handed back as-is: the page compares with
  // String(...) on both sides already.
  const chipOptions = [
    { value: 'all', label: 'Todos' },
    ...(tiposMovimiento || []).map((t) => ({ value: String(t.id), label: t.nombre })),
  ];

  const ascending = sortConfig?.direction === 'asc';
  const DirectionIcon = ascending ? ArrowUp : ArrowDown;

  // Days run newest-first unless the sort is *on* the date, in which case the
  // direction has to reach the group order or picking "Fecha ascendente" would
  // visibly do nothing. Sorting by monto or descripción instead orders rows
  // inside each day.
  const grouped = groupMovimientosByDate(sortedMovimientos, {
    dateDirection: sortConfig?.key === 'fecha' ? sortConfig.direction : 'desc',
  });
  const showEditModal = Boolean(editingId && editFormData?.nombre !== undefined);
  const isEmpty = sortedMovimientos.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader title="Movimientos" description="Gestiona y revisa todas tus transacciones.">
        <Link href="/movimientos/nuevo" className={cn(buttonVariants(), 'hidden sm:inline-flex')}>
          <Plus className="size-4" />
          Nuevo movimiento
        </Link>
      </PageHeader>

      <Card className="space-y-3 p-3 shadow-card sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative w-full flex-1">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por comercio o concepto..."
              aria-label="Buscar movimientos"
              className="pl-9"
            />
          </div>
          <Select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            aria-label="Mes"
            className="sm:w-52"
          >
            <option value="">Todos los meses</option>
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-3 border-t pt-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <FilterChips
              label="Filtrar por categoría"
              options={chipOptions}
              value={String(typeFilter)}
              onValueChange={setTypeFilter}
            />
          </div>
          {/* Sorting used to live on the table headers. It still drives the same
              handleSort/sortConfig on the page -- only the control changed. */}
          <div className="flex shrink-0 items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Ordenar</span>
            <Select
              value={sortConfig?.key || 'fecha'}
              onChange={(e) => onSort(e.target.value)}
              aria-label="Ordenar por"
              className="w-auto"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => onSort(sortConfig?.key || 'fecha')}
              aria-label={
                ascending ? 'Orden ascendente, cambiar a descendente' : 'Orden descendente, cambiar a ascendente'
              }
              title={ascending ? 'Ascendente' : 'Descendente'}
            >
              <DirectionIcon className="size-4" />
            </Button>
          </div>
        </div>
      </Card>

      {isEmpty ? (
        <Card>
          <EmptyState
            icon={ReceiptText}
            title="No hay movimientos"
            description={
              searchTerm || typeFilter !== 'all' || monthFilter
                ? 'Ningún movimiento coincide con estos filtros.'
                : 'Registra tu primer movimiento para empezar.'
            }
            action={
              <Link href="/movimientos/nuevo" className={cn(buttonVariants())}>
                <Plus className="size-4" />
                Nuevo movimiento
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {grouped.map((group) => (
            <section key={group.date.getTime()}>
              <DayHeading group={group} />
              <Card className="overflow-hidden shadow-card">
                {group.items.map((mov) => (
                  // The action buttons are SIBLINGS of the row button, not
                  // nested inside a clickable wrapper. The old markup put an
                  // interactive element inside another one, which is invalid and
                  // leaves assistive tech unable to reach the inner control.
                  <div
                    key={mov.id}
                    className="flex items-center gap-2 border-b px-2 transition-colors last:border-0 hover:bg-secondary/40 sm:px-3"
                  >
                    <button
                      type="button"
                      onClick={() => onEdit(mov)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <TypeIcon tipo={mov.tipo_categoria} nombre={mov.tipo_nombre} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{mov.nombre}</span>
                        {/* No time here: `fecha` is a date-only column, so the
                            old toLocaleTimeString rendered "00:00" on every
                            single row. No date either -- the group heading
                            above already carries it. */}
                        <span className="block truncate text-xs text-muted-foreground">
                          {mov.tipo_nombre}
                        </span>
                      </span>
                      <Amount value={mov.importe} tipo={mov.tipo_categoria} signed toned size="sm" />
                    </button>
                    <div className="flex shrink-0 items-center">
                      {/* Redundant with clicking the row, but a desktop user
                          shouldn't have to discover that the row is clickable. */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(mov)}
                        aria-label={`Editar ${mov.nombre}`}
                        className="hidden md:inline-flex"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(mov.id)}
                        aria-label={`Eliminar ${mov.nombre}`}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}

      {/* One edit dialog, both breakpoints. */}
      <Dialog open={showEditModal} onClose={onCancelEdit} title="Editar movimiento">
        <div className="space-y-4">
          <Field label="Fecha" htmlFor="mov-fecha">
            <Input
              id="mov-fecha"
              type="date"
              value={editFormData.fecha}
              onChange={(e) => setEditFormData((p) => ({ ...p, fecha: e.target.value }))}
            />
          </Field>
          <Field label="Descripción" htmlFor="mov-nombre">
            <Input
              id="mov-nombre"
              type="text"
              value={editFormData.nombre}
              onChange={(e) => setEditFormData((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Nombre"
            />
          </Field>
          <Field label="Importe" htmlFor="mov-importe">
            <Input
              id="mov-importe"
              type="number"
              step="0.01"
              value={editFormData.importe}
              onChange={(e) => setEditFormData((p) => ({ ...p, importe: e.target.value }))}
            />
          </Field>
          <Field label="Categoría" htmlFor="mov-tipo">
            <Select
              id="mov-tipo"
              value={editFormData.id_tipo_movimiento}
              onChange={(e) =>
                setEditFormData((p) => ({ ...p, id_tipo_movimiento: e.target.value }))
              }
            >
              <option value="">Seleccionar</option>
              {(tiposMovimiento || []).map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
          </Field>
          <div>
            <p className="mb-2 text-sm font-medium">Etiquetas</p>
            {(tags || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => (
                  <label
                    key={t.id}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm hover:bg-secondary"
                  >
                    <input
                      type="checkbox"
                      checked={(editFormData.tagIds || []).includes(t.id)}
                      onChange={() => handleTagToggle(t.id)}
                      className="rounded"
                    />
                    <span>{t.nombre}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                <Link href="/etiquetas" className="text-primary hover:underline">
                  Crea etiquetas
                </Link>{' '}
                para usarlas aquí.
              </p>
            )}
          </div>
        </div>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={onCancelEdit} className="flex-1">
            Cancelar
          </Button>
          <Button onClick={onSaveEdit} className="flex-1">
            Guardar
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
