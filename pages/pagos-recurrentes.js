import { useState } from 'react';
import { useRecurring } from '../hooks/useRecurring';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';
import { CURRENCY } from '../lib/constants';
import Button from '../components/ui/Button';

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

export default function PagosRecurrentesPage() {
  const { list, loading, error, createRecurring, updateRecurring, deleteRecurring } = useRecurring();
  const { tiposMovimiento } = useTiposMovimiento();
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    importe: '',
    id_tipo_movimiento: '',
    dia_mes: new Date().getDate(),
  });

  const formatCurrency = (amount) =>
    new Intl.NumberFormat(CURRENCY.LOCALE, {
      style: 'currency',
      currency: CURRENCY.CURRENCY,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));

  const resetForm = () => {
    setEditingItem(null);
    setForm({
      nombre: '',
      importe: '',
      id_tipo_movimiento: '',
      dia_mes: new Date().getDate(),
    });
    setShowModal(false);
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
    if (!form.nombre.trim() || isNaN(importe) || importe === 0 || !form.id_tipo_movimiento) {
      return;
    }
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
      if (err) {
        alert('Error al actualizar: ' + err);
        return;
      }
    } else {
      const { error: err } = await createRecurring({ ...payload, activo: true });
      setSaving(false);
      if (err) {
        alert('Error al crear: ' + err);
        return;
      }
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
      <div className="flex items-center justify-center min-h-[40vh]">
        <p className="text-slate-500 dark:text-slate-400">Cargando pagos recurrentes...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Pagos recurrentes
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Se añaden automáticamente a gastos o ingresos cada mes el día elegido.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingItem(null);
            setForm({ nombre: '', importe: '', id_tipo_movimiento: '', dia_mes: new Date().getDate() });
            setShowModal(true);
          }}
          className="bg-primary hover:bg-primary/90 text-white font-semibold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-primary/20 transition-all"
        >
          <span className="material-symbols-outlined">add_circle</span>
          Nuevo pago recurrente
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 p-4 text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {list.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 text-center">
          <span className="material-symbols-outlined text-5xl text-primary/50 mb-4 block">repeat</span>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Sin pagos recurrentes</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Crea uno y se generará un movimiento automático cada mes el mismo día.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setForm({ nombre: '', importe: '', id_tipo_movimiento: '', dia_mes: new Date().getDate() });
              setShowModal(true);
            }}
            className="bg-primary text-white font-semibold py-2.5 px-5 rounded-xl inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined">add</span>
            Crear el primero
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((r) => (
            <div
              key={r.id}
              className={`bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 ${
                !r.activo ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                  <span className="material-symbols-outlined">repeat</span>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 dark:text-white truncate">{r.nombre}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {tipoNombre(r)} · Día {r.dia_mes} de cada mes
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-slate-900 dark:text-white">
                  {formatCurrency(r.importe)}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(r)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors"
                  title="Editar"
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleActivo(r)}
                  className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title={r.activo ? 'Pausar' : 'Activar'}
                >
                  <span
                    className={`material-symbols-outlined ${r.activo ? 'text-emerald-600' : 'text-slate-400'}`}
                  >
                    {r.activo ? 'toggle_on' : 'toggle_off'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(r.id)}
                  className="p-2 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-900/20 text-slate-400 hover:text-rose-500 transition-colors"
                  title="Eliminar"
                >
                  <span className="material-symbols-outlined">delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nuevo / Editar pago recurrente */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full shadow-xl border border-slate-200 dark:border-slate-800">
            <div className="p-6">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
                {editingItem ? 'Editar pago recurrente' : 'Nuevo pago recurrente'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    value={form.nombre}
                    onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                    placeholder="Ej. Alquiler, Nómina, Netflix"
                    className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary text-slate-900 dark:text-white placeholder-slate-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Importe *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.importe}
                    onChange={(e) => setForm((f) => ({ ...f, importe: e.target.value }))}
                    placeholder="0"
                    className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Categoría (gasto o ingreso) *
                  </label>
                  <select
                    value={form.id_tipo_movimiento}
                    onChange={(e) => setForm((f) => ({ ...f, id_tipo_movimiento: e.target.value }))}
                    className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                    required
                  >
                    <option value="">Elige categoría</option>
                    {(tiposMovimiento || []).map((t) => (
                      <option key={t.id} value={t.id}>{t.nombre}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Si es Ingresos, se creará como ingreso; si no, como gasto.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Día del mes (1–31) *
                  </label>
                  <select
                    value={form.dia_mes}
                    onChange={(e) => setForm((f) => ({ ...f, dia_mes: Number(e.target.value) }))}
                    className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary text-slate-900 dark:text-white"
                  >
                    {DAYS_OF_MONTH.map((d) => (
                      <option key={d} value={d}>
                        Día {d}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    En meses cortos (ej. febrero), el 29–31 se usa el último día del mes.
                  </p>
                </div>
                <div className="flex gap-3 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={resetForm}
                    className="flex-1"
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1" disabled={saving}>
                    {saving ? 'Guardando...' : editingItem ? 'Guardar cambios' : 'Crear'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
