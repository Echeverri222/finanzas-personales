import React from 'react';
import Link from 'next/link';
import { createSafeDate } from '../../lib/dateUtils';

export default function MovimientosDesktop({
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
  handleSort,
  formatCurrency,
  formatDate,
  editingId,
  editFormData,
  setEditFormData,
  handleEdit,
  handleCancelEdit,
  handleSaveEdit,
  handleDelete,
}) {
  const handleTagToggle = (tagId) => {
    const current = editFormData.tagIds || [];
    setEditFormData((prev) => ({
      ...prev,
      tagIds: current.includes(tagId) ? current.filter((id) => id !== tagId) : [...current, tagId],
    }));
  };
  const monthOptions = [];
  const year = new Date().getFullYear();
  for (let m = 1; m <= 12; m++) {
    const v = `${year}-${String(m).padStart(2, '0')}`;
    const label = new Date(2000, m - 1, 1).toLocaleDateString('es-ES', { month: 'long' });
    monthOptions.push({ value: v, label: `${label} ${year}` });
  }

  return (
    <div className="max-w-6xl mx-auto">
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Movimientos
          </h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Gestiona y revisa todas tus transacciones.
          </p>
        </div>
        <Link
          href="/movimientos/nuevo"
          className="bg-primary hover:bg-primary/90 text-white flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all shadow-lg shadow-primary/20"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nuevo Movimiento
        </Link>
      </header>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-6 space-y-4">
        <div className="flex flex-col md:flex-row gap-4 items-center">
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por comercio o concepto..."
              className="w-full pl-12 pr-4 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-lg focus:ring-2 focus:ring-primary text-sm text-slate-900 dark:text-slate-100 placeholder-slate-500"
            />
          </div>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-pointer text-slate-600 dark:text-slate-300 text-sm border-0"
          >
            <option value="">Todos los meses</option>
            {monthOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              typeFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            Todos
          </button>
          {(tiposMovimiento || []).map((tipo) => (
            <button
              key={tipo.id}
              onClick={() => setTypeFilter(tipo.id)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                typeFilter === tipo.id
                  ? 'bg-primary text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {tipo.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Descripción
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                  Monto
                </th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-center">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {sortedMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                    No hay movimientos
                  </td>
                </tr>
              ) : (
                sortedMovimientos.map((mov) => {
                  const isIngreso = mov.tipo_nombre === 'Ingresos';
                  const isEditing = editingId === mov.id;
                  if (isEditing) {
                    return (
                      <React.Fragment key={mov.id}>
                      <tr className="bg-primary/5">
                        <td className="px-6 py-4">
                          <input
                            type="date"
                            value={editFormData.fecha}
                            onChange={(e) =>
                              setEditFormData((prev) => ({ ...prev, fecha: e.target.value }))
                            }
                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="text"
                            value={editFormData.nombre}
                            onChange={(e) =>
                              setEditFormData((prev) => ({ ...prev, nombre: e.target.value }))
                            }
                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            placeholder="Descripción"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={editFormData.id_tipo_movimiento}
                            onChange={(e) =>
                              setEditFormData((prev) => ({
                                ...prev,
                                id_tipo_movimiento: e.target.value,
                              }))
                            }
                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                          >
                            <option value="">Categoría</option>
                            {(tiposMovimiento || []).map((t) => (
                              <option key={t.id} value={t.id}>{t.nombre}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-6 py-4">
                          <input
                            type="number"
                            value={editFormData.importe}
                            onChange={(e) =>
                              setEditFormData((prev) => ({ ...prev, importe: e.target.value }))
                            }
                            className="w-full px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-right bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                            step="0.01"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-center gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90"
                            >
                              Guardar
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                              Cancelar
                            </button>
                          </div>
                        </td>
                      </tr>
                      <tr className="bg-primary/5">
                        <td colSpan={5} className="px-6 py-3 border-t border-slate-200 dark:border-slate-700">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-2">Etiquetas:</span>
                            {(tags || []).length > 0 ? (
                              tags.map((t) => (
                                <label
                                  key={t.id}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-sm border border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  <input
                                    type="checkbox"
                                    checked={(editFormData.tagIds || []).includes(t.id)}
                                    onChange={() => handleTagToggle(t.id)}
                                    className="rounded"
                                  />
                                  {t.nombre}
                                </label>
                              ))
                            ) : (
                              <span className="text-sm text-slate-400">
                                <Link href="/etiquetas" className="text-primary hover:underline">Crea etiquetas</Link> para usarlas aquí
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                      </React.Fragment>
                    );
                  }
                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {formatDate(mov.fecha)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-8 rounded-lg flex items-center justify-center ${
                              isIngreso
                                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600'
                                : 'bg-rose-100 dark:bg-rose-900/30 text-rose-600'
                            }`}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isIngreso ? 'payments' : 'receipt_long'}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-slate-900 dark:text-white">
                            {mov.nombre}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-bold uppercase ${
                            isIngreso
                              ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {mov.tipo_nombre}
                        </span>
                      </td>
                      <td
                        className={`px-6 py-4 text-sm font-bold text-right ${
                          isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {isIngreso ? '+' : '-'}
                        {formatCurrency(Math.abs(mov.importe))}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleEdit(mov)}
                            className="p-1.5 text-slate-400 hover:text-primary transition-colors"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-xl">edit</span>
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('¿Eliminar este movimiento?')) handleDelete(mov.id);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                            title="Eliminar"
                          >
                            <span className="material-symbols-outlined text-xl">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
