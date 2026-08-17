import Link from 'next/link';
import { Search, Plus, Pencil, Trash2, ReceiptText, ArrowUp, ArrowDown } from 'lucide-react';

import { groupMovimientosByDate } from '../../lib/api/movimientosView';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect as Select } from '@/components/ui/native-select';
import { Badge } from '@/components/ui/badge';
import { Field } from '@/components/ui/field';
import { Modal as Dialog } from '@/components/ui/modal';
import { FilterChips } from '@/components/filters/FilterChips';
import { Amount } from '@/components/money/Amount';
import { TypeIcon } from '@/components/money/TypeIcon';
import { EmptyState, TableEmptyState } from '@/components/feedback/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

/**
 * Sortable column header.
 *
 * `handleSort`/`sortConfig` existed on the page and were wired through to the
 * old desktop view, which rendered plain text -- so sorting was implemented,
 * passed down, and completely unreachable. A real <button> plus `aria-sort` is
 * what connects them.
 */
function SortHeader({ label, sortKey, sortConfig, onSort, className }) {
  const active = sortConfig?.key === sortKey;
  const direction = active ? sortConfig.direction : null;
  const Icon = direction === 'asc' ? ArrowUp : ArrowDown;
  return (
    <TableHead
      className={className}
      aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="-mx-1 inline-flex items-center gap-1 rounded px-1 uppercase transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {label}
        <Icon
          className={cn('size-3 transition-opacity', active ? 'opacity-100' : 'opacity-0')}
          aria-hidden="true"
        />
      </button>
    </TableHead>
  );
}

/**
 * One movimientos screen for every breakpoint.
 *
 * Replaces MovimientosDesktop.jsx + MovimientosMobile.jsx (514 lines). The
 * table and the date-grouped list both render and CSS chooses, because those
 * are two different ways of organising the same rows rather than one layout at
 * two widths. Everything else -- header, filters, and crucially the edit form --
 * is now single-source.
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

  const grouped = groupMovimientosByDate(sortedMovimientos);
  const showEditModal = Boolean(editingId && editFormData?.nombre !== undefined);
  const isEmpty = sortedMovimientos.length === 0;

  const emptyProps = {
    icon: ReceiptText,
    title: 'No hay movimientos',
    description: searchTerm || typeFilter !== 'all' || monthFilter
      ? 'Ningún movimiento coincide con estos filtros.'
      : 'Registra tu primer movimiento para empezar.',
  };

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
        <div className="border-t pt-3">
          <FilterChips
            label="Filtrar por categoría"
            options={chipOptions}
            value={String(typeFilter)}
            onValueChange={setTypeFilter}
          />
        </div>
      </Card>

      {/* Desktop: table */}
      <Card className="hidden overflow-hidden shadow-card md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <SortHeader
                label="Fecha"
                sortKey="fecha"
                sortConfig={sortConfig}
                onSort={onSort}
                className="w-36 pl-5"
              />
              <SortHeader
                label="Descripción"
                sortKey="nombre"
                sortConfig={sortConfig}
                onSort={onSort}
              />
              <TableHead>Categoría</TableHead>
              <SortHeader
                label="Monto"
                sortKey="importe"
                sortConfig={sortConfig}
                onSort={onSort}
                className="text-right [&>button]:flex-row-reverse"
              />
              <TableHead className="w-24 pr-5 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEmpty ? (
              <TableEmptyState colSpan={5} {...emptyProps} />
            ) : (
              sortedMovimientos.map((mov) => (
                <TableRow key={mov.id}>
                  <TableCell className="pl-5 text-muted-foreground">
                    {formatDate(mov.fecha)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <TypeIcon tipo={mov.tipo_categoria} nombre={mov.tipo_nombre} size="sm" />
                      <span className="font-medium">{mov.nombre}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-normal">
                      {mov.tipo_nombre}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Amount value={mov.importe} tipo={mov.tipo_categoria} signed toned size="sm" />
                  </TableCell>
                  <TableCell className="pr-5">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit(mov)}
                        aria-label={`Editar ${mov.nombre}`}
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
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* Mobile: grouped by date */}
      <div className="space-y-5 md:hidden">
        {isEmpty ? (
          <Card>
            <EmptyState
              {...emptyProps}
              action={
                <Link href="/movimientos/nuevo" className={cn(buttonVariants())}>
                  <Plus className="size-4" />
                  Nuevo movimiento
                </Link>
              }
            />
          </Card>
        ) : (
          grouped.map((group) => (
            <section key={group.label}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
                {group.label}
              </h2>
              <Card className="overflow-hidden shadow-card">
                {group.items.map((mov) => (
                  // The delete button is a SIBLING of the edit button, not
                  // nested inside a clickable row wrapper. The old markup put an
                  // interactive element inside another one, which is invalid and
                  // leaves assistive tech unable to reach the inner control.
                  <div
                    key={mov.id}
                    className="flex items-center gap-3 border-b px-3 py-2.5 last:border-0"
                  >
                    <button
                      type="button"
                      onClick={() => onEdit(mov)}
                      className="flex min-w-0 flex-1 items-center gap-3 rounded-md py-1 text-left transition-colors active:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <TypeIcon tipo={mov.tipo_categoria} nombre={mov.tipo_nombre} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{mov.nombre}</span>
                        {/* No time here: `fecha` is a date-only column, so the
                            old toLocaleTimeString rendered "00:00" on every
                            single row. */}
                        <span className="block truncate text-xs text-muted-foreground">
                          {mov.tipo_nombre}
                        </span>
                      </span>
                      <Amount value={mov.importe} tipo={mov.tipo_categoria} signed toned size="sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(mov.id)}
                      className="shrink-0 rounded-md p-2 text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={`Eliminar ${mov.nombre}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                ))}
              </Card>
            </section>
          ))
        )}
      </div>

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
