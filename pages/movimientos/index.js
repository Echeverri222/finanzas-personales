import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useMovimientos } from '../../hooks/useMovimientos';
import { useTiposMovimiento } from '../../hooks/useTiposMovimiento';
import { useTags } from '../../hooks/useTags';
import { useMovimientoTags } from '../../hooks/useMovimientoTags';
import { useCuentas } from '../../hooks/useCuentas';
import { usePatrimonioFlag } from '../../hooks/usePatrimonioFlag';
import MovimientosView from '../../views/movimientos/MovimientosView';
import { MovimientosSkeleton } from '@/components/feedback/skeletons';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';
import { useConfirm } from '@/components/feedback/ConfirmProvider';
import { toISODate } from '@/lib/format';

// The direction a sort starts in when you pick it: newest, biggest, A-Z.
const DIRECCION_INICIAL = { fecha: 'desc', importe: 'desc', nombre: 'asc' };

export default function MovimientosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
  const [editError, setEditError] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const confirm = useConfirm();

  const router = useRouter();
  const { movimientos, loading, error, updateMovimiento, deleteMovimiento } = useMovimientos();
  const { tiposMovimiento } = useTiposMovimiento();
  const { tags } = useTags();
  const { movimientoTagIds, setMovimientoTags } = useMovimientoTags();
  const { habilitado: patrimonioHabilitado } = usePatrimonioFlag();
  const { cuentas } = useCuentas();

  useEffect(() => {
    if (router.isReady) {
      const { month, category } = router.query;
      if (month) setMonthFilter(month);
      if (category) setTypeFilter(category);
    }
  }, [router.isReady, router.query]);

  const handleEdit = (movimiento) => {
    setEditingId(movimiento.id);
    setEditError('');
    // Local calendar day, never toISOString(): that is the UTC day, one ahead
    // in Bogotá every evening.
    const fechaString =
      typeof movimiento.fecha === 'string'
        ? movimiento.fecha.split('T')[0]
        : toISODate(movimiento.fecha || new Date());
    setEditFormData({
      fecha: fechaString,
      nombre: movimiento.nombre || '',
      importe: Math.abs(movimiento.importe).toString(),
      id_tipo_movimiento: movimiento.id_tipo_movimiento || '',
      cuenta_id: movimiento.cuenta_id || '',
      sale_de_ahorros: Boolean(movimiento.sale_de_ahorros),
      tagIds: movimientoTagIds[movimiento.id] || [],
    });
  };

  // Open the editor straight from `?edit=<id>`, which is what the dashboard's
  // recent-movements rows link to. Without this those links landed here and did
  // nothing at all.
  //
  // The ref is what stops it re-opening: the dialog is closed by clearing
  // `editingId`, but the query param stays in the URL, so a plain guard on
  // `editingId` would immediately re-open the dialog on the next render.
  const handledEditParam = useRef(null);
  useEffect(() => {
    if (!router.isReady || loading) return;
    const requested = router.query.edit;
    if (!requested || handledEditParam.current === requested) return;
    const found = movimientos.find((m) => String(m.id) === String(requested));
    if (found) {
      handledEditParam.current = requested;
      handleEdit(found);
    }
    // handleEdit is stable enough in practice (it only calls setState); adding it
    // would mean memoising it and every value it closes over.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, router.query.edit, loading, movimientos]);

  const filteredMovimientos = movimientos.filter((mov) => {
    const matchesSearch =
      mov.nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (mov.tipo_nombre && mov.tipo_nombre.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = typeFilter === 'all' || String(mov.id_tipo_movimiento) === String(typeFilter);
    let matchesDate = true;
    if (monthFilter && monthFilter.trim() !== '') {
      const movDate = mov.fecha instanceof Date ? mov.fecha : new Date(mov.fecha);
      const [filterYear, filterMonth] = monthFilter.split('-').map(Number);
      if (filterYear && filterMonth) {
        matchesDate =
          movDate.getFullYear() === filterYear && movDate.getMonth() + 1 === filterMonth;
      }
    }
    return matchesSearch && matchesType && matchesDate;
  });

  const sortedMovimientos = [...filteredMovimientos].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];
    if (sortConfig.key === 'fecha') {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
    } else if (sortConfig.key === 'importe') {
      aVal = Math.abs(parseFloat(aVal));
      bVal = Math.abs(parseFloat(bVal));
    }
    if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
    return 0;
  });

  // Same key: flip the direction. New key: start in that key's natural
  // direction -- picking "Monto" used to start ascending, i.e. smallest first.
  const handleSort = (key) => {
    setSortConfig((prev) =>
      prev.key === key
        ? { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: DIRECCION_INICIAL[key] || 'asc' }
    );
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTypeFilter('all');
    setMonthFilter('');
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
    setEditError('');
  };

  const handleSaveEdit = async () => {
    if (!editFormData.fecha || !editFormData.nombre?.trim() || !editFormData.id_tipo_movimiento) {
      setEditError('Completa la fecha, el nombre y la categoría.');
      return;
    }
    if (!(Number(editFormData.importe) > 0)) {
      setEditError('Escribe un importe mayor que cero.');
      return;
    }
    setSavingEdit(true);
    try {
      const [year, month, day] = editFormData.fecha.split('-').map(Number);
      const fecha = new Date(Date.UTC(year, month - 1, day));
      const updatedData = {
        fecha: fecha.toISOString(),
        nombre: editFormData.nombre.trim(),
        importe: Number(editFormData.importe),
        id_tipo_movimiento: editFormData.id_tipo_movimiento,
        cuenta_id: editFormData.cuenta_id || null,
        sale_de_ahorros: Boolean(editFormData.sale_de_ahorros),
      };
      const { error: updateError } = await updateMovimiento(editingId, updatedData);
      if (updateError) throw new Error(updateError);
      const tagIds = editFormData.tagIds || [];
      await setMovimientoTags(editingId, tagIds);
      setEditingId(null);
      setEditFormData({});
      setEditError('');
    } catch (err) {
      setEditError(err.message || 'No pudimos actualizar el movimiento.');
    } finally {
      setSavingEdit(false);
    }
  };

  // Confirmation lives HERE and nowhere else. Both views used to confirm as
  // well, so deleting a movimiento asked twice; the rule is that the owner of
  // the mutation owns the confirmation and presentational components never
  // confirm.
  const [deleteError, setDeleteError] = useState('');
  const handleDelete = async (mov) => {
    const ok = await confirm({
      title: `¿Eliminar "${mov.nombre}"?`,
      description: 'Se borra el movimiento y, si estaba asociado a una cuenta, se revierte su saldo.',
    });
    if (!ok) return;
    const { error: err } = await deleteMovimiento(mov.id);
    setDeleteError(err || '');
  };

  if (loading) return <MovimientosSkeleton />;
  if (error) return <ErrorAlert error={error} title="No se pudieron cargar los movimientos" />;

  // Years present in the data, newest first, always including this one: the
  // month filter only offered the current year, so 2025 was unreachable.
  const years = [
    ...new Set([new Date().getFullYear(), ...movimientos.map((m) => new Date(m.fecha).getFullYear())]),
  ]
    .filter((y) => Number.isFinite(y))
    .sort((a, b) => b - a);

  return (
    <>
    <ErrorAlert error={deleteError} title="No se pudo eliminar" className="mb-4" />
    <MovimientosView
      years={years}
      onClearFilters={clearFilters}
      editError={editError}
      savingEdit={savingEdit}
      sortedMovimientos={sortedMovimientos}
      tiposMovimiento={tiposMovimiento}
      tags={tags}
      cuentas={cuentas}
      patrimonioHabilitado={patrimonioHabilitado}
      searchTerm={searchTerm}
      setSearchTerm={setSearchTerm}
      typeFilter={typeFilter}
      setTypeFilter={setTypeFilter}
      monthFilter={monthFilter}
      setMonthFilter={setMonthFilter}
      sortConfig={sortConfig}
      onSort={handleSort}
      editingId={editingId}
      editFormData={editFormData}
      setEditFormData={setEditFormData}
      onEdit={handleEdit}
      onCancelEdit={handleCancelEdit}
      onSaveEdit={handleSaveEdit}
      onDelete={handleDelete}
    />
    </>
  );
}
