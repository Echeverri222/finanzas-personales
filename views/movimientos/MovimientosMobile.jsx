import Link from 'next/link';
import { groupMovimientosByDate } from '../../lib/api/movimientosView';
import { createSafeDate } from '../../lib/dateUtils';

const CATEGORY_ICONS = {
  Ingresos: 'payments',
  Ahorro: 'savings',
  Transporte: 'directions_car',
  Compras: 'shopping_bag',
  Alimentación: 'restaurant',
  default: 'receipt_long',
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
  const categoryOptions = [
    { id: 'all', nombre: 'Todo' },
    ...(tiposMovimiento || []),
  ];

  const getIcon = (tipoNombre) => CATEGORY_ICONS[tipoNombre] || CATEGORY_ICONS.default;

  return (
    <div className="max-w-md mx-auto">
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 pt-4 pb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Movimientos</h1>
          <Link
            href="/movimientos/nuevo"
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <span className="material-symbols-outlined text-primary">add</span>
          </Link>
        </div>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xl">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar..."
              className="w-full bg-slate-100 dark:bg-slate-800 border-none rounded-lg pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-primary/50 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500"
            />
          </div>
          <Link
            href="/movimientos/nuevo"
            className="bg-primary text-white p-2.5 rounded-lg flex items-center justify-center shadow-md shadow-primary/20"
          >
            <span className="material-symbols-outlined">add</span>
          </Link>
        </div>
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 no-scrollbar">
          {categoryOptions.map((t) => (
            <button
              key={t.id}
              onClick={() => setTypeFilter(t.id)}
              className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${
                typeFilter === t.id
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-primary/10'
              }`}
            >
              {t.nombre}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4 space-y-6 pb-24">
        {grouped.length === 0 ? (
          <div className="text-center py-12 text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined text-5xl mb-2 block">receipt_long</span>
            <p>No hay movimientos</p>
            <Link
              href="/movimientos/nuevo"
              className="inline-flex items-center gap-2 mt-4 text-primary font-semibold"
            >
              <span className="material-symbols-outlined">add</span>
              Nuevo movimiento
            </Link>
          </div>
        ) : (
          grouped.map((group) => (
            <section key={group.label}>
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 px-1">
                {group.label}
              </h2>
              <div className="bg-white dark:bg-slate-900 rounded-xl overflow-hidden shadow-sm border border-slate-100 dark:border-slate-800">
                {group.items.map((mov) => {
                  const isIngreso = mov.tipo_nombre === 'Ingresos';
                  const icon = getIcon(mov.tipo_nombre);
                  return (
                    <div
                      key={mov.id}
                      className="flex items-center p-4 border-b border-slate-50 dark:border-slate-800 last:border-0 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => onEdit(mov)}
                    >
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center mr-4 ${
                          isIngreso
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-800 text-primary'
                        }`}
                      >
                        <span className="material-symbols-outlined">{icon}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                          {mov.nombre}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {createSafeDate(mov.fecha).toLocaleTimeString('es-ES', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}{' '}
                          • {mov.tipo_nombre}
                        </p>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <p
                          className={`font-bold text-sm ${
                            isIngreso ? 'text-emerald-600' : 'text-rose-500'
                          }`}
                        >
                          {isIngreso ? '+' : '-'}
                          {formatCurrency(Math.abs(mov.importe))}
                        </p>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('¿Eliminar este movimiento?')) onDelete(mov.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-500 rounded"
                          aria-label="Eliminar"
                        >
                          <span className="material-symbols-outlined text-xl">delete</span>
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

      {/* Edit modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onCancelEdit}
            aria-hidden
          />
          <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-xl p-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Editar movimiento</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Fecha</label>
                <input
                  type="date"
                  value={editFormData.fecha}
                  onChange={(e) => setEditFormData((p) => ({ ...p, fecha: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Descripción</label>
                <input
                  type="text"
                  value={editFormData.nombre}
                  onChange={(e) => setEditFormData((p) => ({ ...p, nombre: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                  placeholder="Nombre"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Importe</label>
                <input
                  type="number"
                  value={editFormData.importe}
                  onChange={(e) => setEditFormData((p) => ({ ...p, importe: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">Categoría</label>
                <select
                  value={editFormData.id_tipo_movimiento}
                  onChange={(e) => setEditFormData((p) => ({ ...p, id_tipo_movimiento: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800"
                >
                  <option value="">Seleccionar</option>
                  {(tiposMovimiento || []).map((t) => (
                    <option key={t.id} value={t.id}>{t.nombre}</option>
                  ))}
                </select>
              </div>
              {(tags || []).length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">Etiquetas</label>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => (
                      <label
                        key={t.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-600 cursor-pointer"
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
            <div className="flex gap-3 mt-6">
              <button
                onClick={onCancelEdit}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                onClick={onSaveEdit}
                className="flex-1 px-4 py-2.5 rounded-lg font-medium text-white bg-primary hover:bg-primary/90"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
