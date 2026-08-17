import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useMovimientos } from '../../hooks/useMovimientos';
import { useTiposMovimiento } from '../../hooks/useTiposMovimiento';
import { useTags } from '../../hooks/useTags';
import { useMovimientoTags } from '../../hooks/useMovimientoTags';
import MovimientosView from '../../views/movimientos/MovimientosView';
import { MovimientosSkeleton } from '@/components/feedback/skeletons';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function MovimientosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  const router = useRouter();
  const { movimientos, loading, error, updateMovimiento, deleteMovimiento } = useMovimientos();
  const { tiposMovimiento } = useTiposMovimiento();
  const { tags } = useTags();
  const { movimientoTagIds, setMovimientoTags } = useMovimientoTags();

  useEffect(() => {
    if (router.isReady) {
      const { month, category } = router.query;
      if (month) setMonthFilter(month);
      if (category) setTypeFilter(category);
    }
  }, [router.isReady, router.query]);

  const handleEdit = (movimiento) => {
    setEditingId(movimiento.id);
    let fechaString = '';
    try {
      if (movimiento.fecha instanceof Date) {
        fechaString = movimiento.fecha.toISOString().split('T')[0];
      } else if (typeof movimiento.fecha === 'string') {
        fechaString = movimiento.fecha.split('T')[0];
      } else {
        fechaString = new Date().toISOString().split('T')[0];
      }
    } catch {
      fechaString = new Date().toISOString().split('T')[0];
    }
    setEditFormData({
      fecha: fechaString,
      nombre: movimiento.nombre || '',
      importe: Math.abs(movimiento.importe).toString(),
      id_tipo_movimiento: movimiento.id_tipo_movimiento || '',
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

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditFormData({});
  };

  const handleSaveEdit = async () => {
    try {
      const [year, month, day] = editFormData.fecha.split('-').map(Number);
      const fecha = new Date(Date.UTC(year, month - 1, day));
      const updatedData = {
        fecha: fecha.toISOString(),
        nombre: editFormData.nombre.trim(),
        importe: Number(editFormData.importe),
        id_tipo_movimiento: editFormData.id_tipo_movimiento,
      };
      const { error: updateError } = await updateMovimiento(editingId, updatedData);
      if (updateError) throw new Error(updateError);
      const tagIds = editFormData.tagIds || [];
      await setMovimientoTags(editingId, tagIds);
      setEditingId(null);
      setEditFormData({});
    } catch (err) {
      console.error('Error updating movimiento:', err);
      alert('Error al actualizar: ' + err.message);
    }
  };

  // Confirmation lives HERE and nowhere else. Both views used to confirm as
  // well, so deleting a movimiento asked twice; the rule is that the owner of
  // the mutation owns the confirmation and presentational components never
  // confirm.
  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este movimiento?')) return;
    const { error: deleteError } = await deleteMovimiento(id);
    if (deleteError) alert('Error al eliminar: ' + deleteError);
  };

  if (loading) return <MovimientosSkeleton />;
  if (error) return <ErrorAlert error={error} title="No se pudieron cargar los movimientos" />;

  return (
    <MovimientosView
      sortedMovimientos={sortedMovimientos}
      tiposMovimiento={tiposMovimiento}
      tags={tags}
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
  );
}
