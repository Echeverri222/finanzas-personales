import Link from 'next/link';
import { Search, Plus, Pencil, Trash2, ReceiptText, ArrowUp, ArrowDown, X } from 'lucide-react';

import { groupMovimientosByDate } from '../../lib/api/movimientosView';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect as Select } from '@/components/ui/native-select';
import { Modal as Dialog } from '@/components/ui/modal';
import { Badge } from '@/components/ui/badge';
import { MovimientoFields } from '@/components/movimientos/MovimientoFields';
import { formatDate } from '@/lib/format';
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
  years = [new Date().getFullYear()],
  onClearFilters,
  editError,
  savingEdit,
  sortedMovimientos,
  tiposMovimiento,
  tags,
  cuentas,
  patrimonioHabilitado,
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
  // Every month of every year that has data, newest first -- not just the
  // current year, which left all of 2025 unreachable from this filter.
  const monthGroups = years.map((year) => ({
    year,
    options: Array.from({ length: 12 }, (_, i) => 12 - i).map((m) => ({
      value: `${year}-${String(m).padStart(2, '0')}`,
      label: `${new Date(2000, m - 1, 1).toLocaleDateString('es-ES', { month: 'long' })} ${year}`,
    })),
  }));
  const hasFilters = Boolean(searchTerm || typeFilter !== 'all' || monthFilter);

  // Radix ToggleGroup values are strings only, so the numeric category ids are
  // stringified on the way in and handed back as-is: the page compares with
  // String(...) on both sides already.
  const chipOptions = [
    { value: 'all', label: 'Todos' },
    ...(tiposMovimiento || []).map((t) => ({ value: String(t.id), label: t.nombre })),
  ];

  const ascending = sortConfig?.direction === 'asc';
  const DirectionIcon = ascending ? ArrowUp : ArrowDown;

  // Sorted by date: the day-grouped timeline. Sorted by monto or descripción:
  // one flat list with the date on each row. Grouping a monto sort by day only
  // reordered rows inside each day, so on a mostly one-per-day list choosing
  // "Monto" visibly did nothing -- and "what were my biggest expenses?" is the
  // whole reason to pick it.
  const byDate = (sortConfig?.key || 'fecha') === 'fecha';
  const groups = byDate
    ? groupMovimientosByDate(sortedMovimientos, { dateDirection: sortConfig?.direction || 'desc' })
    : [{ key: 'flat', heading: null, items: sortedMovimientos }];
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
            {monthGroups.map((g) => (
              <optgroup key={g.year} label={String(g.year)}>
                {g.options.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </optgroup>
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
              hasFilters ? (
                <Button variant="outline" onClick={onClearFilters}>
                  <X className="size-4" />
                  Limpiar filtros
                </Button>
              ) : (
                <Link href="/movimientos/nuevo" className={cn(buttonVariants())}>
                  <Plus className="size-4" />
                  Nuevo movimiento
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.key ?? group.date.getTime()}>
              {group.heading ? <DayHeading group={group} /> : null}
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
                          {/* In the flat (monto/descripción) list there is no
                              day heading, so the row carries its own date. */}
                          {!byDate ? ` · ${formatDate(mov.fecha)}` : ''}
                        </span>
                        {mov.sale_de_ahorros && (
                          <Badge variant="secondary" className="mt-1">
                            Uso de ahorro
                          </Badge>
                        )}
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
                        onClick={() => onDelete(mov)}
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

      {/* One edit dialog, both breakpoints, built from the same fields as
          /movimientos/nuevo. */}
      <Dialog open={showEditModal} onClose={onCancelEdit} title="Editar movimiento">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSaveEdit();
          }}
          className="space-y-4"
        >
          {editError ? (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {editError}
            </p>
          ) : null}
          {showEditModal && (
            <MovimientoFields
              key={editingId}
              data={editFormData}
              setData={setEditFormData}
              tiposMovimiento={tiposMovimiento}
              cuentas={cuentas}
              patrimonioHabilitado={patrimonioHabilitado}
              tags={tags}
              idPrefix="editar"
              compact
            />
          )}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onCancelEdit} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" className="flex-1" disabled={savingEdit}>
              {savingEdit ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
