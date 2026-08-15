import Link from 'next/link';
import { Search, Plus, Trash2, Wallet, PiggyBank, Car, ShoppingBag, UtensilsCrossed, ReceiptText } from 'lucide-react';
import { groupMovimientosByDate } from '../../lib/api/movimientosView';
import { createSafeDate } from '../../lib/dateUtils';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Dialog } from '@/components/ui/dialog';
import { TIPO } from '@/lib/constants';

const CATEGORY_ICONS = {
  Ingresos: Wallet,
  Ahorro: PiggyBank,
  Transporte: Car,
  Compras: ShoppingBag,
  Alimentación: UtensilsCrossed,
  default: ReceiptText,
};

export default function MovimientosMobile({
  sortedMovimientos,
  tiposMovimiento,
  tags,
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
  monthFilter,
  setMonthFilter,
  formatCurrency,
  formatDate,
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

  const showEditModal = Boolean(editingId && editFormData?.nombre !== undefined);
  const grouped = groupMovimientosByDate(sortedMovimientos);
  const categoryOptions = [{ id: 'all', nombre: 'Todo' }, ...(tiposMovimiento || [])];
  const getIcon = (tipoNombre) => CATEGORY_ICONS[tipoNombre] || CATEGORY_ICONS.default;

  return (
    <div className="mx-auto max-w-md">
      <header className="sticky top-0 z-10 border-b bg-background/95 px-4 pb-4 pt-4 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-tight">Movimientos</h1>
        </div>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="pl-9"
            />
          </div>
          <Link
            href="/movimientos/nuevo"
            className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground"
            aria-label="Nuevo movimiento"
          >
            <Plus className="size-4" />
          </Link>
        </div>
        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto pb-1">
          {categoryOptions.map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={cn(
                'whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors',
                typeFilter === t.id
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/70'
              )}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      </header>

      <main className="space-y-6 px-4 py-4 pb-24">
        {grouped.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <ReceiptText className="mx-auto mb-2 size-8" />
            <p>No hay movimientos</p>
            <Link href="/movimientos/nuevo" className="mt-4 inline-flex items-center gap-2 font-medium text-primary">
              <Plus className="size-4" />
              Nuevo movimiento
            </Link>
          </div>
        ) : (
          grouped.map((group) => (
            <section key={group.label}>
              <h2 className="mb-3 px-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {group.label}
              </h2>
              <div className="overflow-hidden rounded-lg border bg-card">
                {group.items.map((mov) => {
                  const isIngreso = mov.tipo_categoria === TIPO.INGRESO;
                  const Icon = getIcon(mov.tipo_nombre);
                  return (
                    <div
                      key={mov.id}
                      className="flex cursor-pointer items-center border-b p-4 transition-colors last:border-0 active:bg-secondary/50"
                      onClick={() => onEdit(mov)}
                    >
                      <div
                        className={cn(
                          'mr-4 flex size-10 items-center justify-center rounded-lg',
                          isIngreso
                            ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-secondary text-primary'
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{mov.nombre}</p>
                        <p className="text-xs text-muted-foreground">
                          {createSafeDate(mov.fecha).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          • {mov.tipo_nombre}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-right">
                        <p
                          className={cn(
                            'text-sm font-semibold tabular-nums',
                            isIngreso ? 'text-emerald-600' : 'text-rose-500'
                          )}
                        >
                          {isIngreso ? '+' : '-'}
                          {formatCurrency(Math.abs(mov.importe))}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('¿Eliminar este movimiento?')) onDelete(mov.id);
                          }}
                          className="rounded-md p-1.5 text-muted-foreground hover:text-destructive"
                          aria-label="Eliminar"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </main>

      <Dialog open={showEditModal} onClose={onCancelEdit} title="Editar movimiento">
        <div className="space-y-4">
          <Field label="Fecha" htmlFor="m-fecha">
            <Input
              id="m-fecha"
              type="date"
              value={editFormData.fecha}
              onChange={(e) => setEditFormData((p) => ({ ...p, fecha: e.target.value }))}
            />
          </Field>
          <Field label="Descripción" htmlFor="m-nombre">
            <Input
              id="m-nombre"
              type="text"
              value={editFormData.nombre}
              onChange={(e) => setEditFormData((p) => ({ ...p, nombre: e.target.value }))}
              placeholder="Nombre"
            />
          </Field>
          <Field label="Importe" htmlFor="m-importe">
            <Input
              id="m-importe"
              type="number"
              value={editFormData.importe}
              onChange={(e) => setEditFormData((p) => ({ ...p, importe: e.target.value }))}
            />
          </Field>
          <Field label="Categoría" htmlFor="m-tipo">
            <Select
              id="m-tipo"
              value={editFormData.id_tipo_movimiento}
              onChange={(e) => setEditFormData((p) => ({ ...p, id_tipo_movimiento: e.target.value }))}
            >
              <option value="">Seleccionar</option>
              {(tiposMovimiento || []).map((t) => (
                <option key={t.id} value={t.id}>{t.nombre}</option>
              ))}
            </Select>
          </Field>
          {(tags || []).length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">Etiquetas</p>
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
            </div>
          )}
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
