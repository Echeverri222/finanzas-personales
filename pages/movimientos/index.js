import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useMovimientos } from '../../hooks/useMovimientos';
import { useTiposMovimiento } from '../../hooks/useTiposMovimiento';
import { useIsMobile } from '../../hooks/useIsMobile';
import MovimientosMobile from '../../views/movimientos/MovimientosMobile';
import MovimientosDesktop from '../../views/movimientos/MovimientosDesktop';

export default function MovimientosPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });

  const router = useRouter();
  const isMobile = useIsMobile();
  const { movimientos, loading, error, updateMovimiento, deleteMovimiento } = useMovimientos();
  const { tiposMovimiento } = useTiposMovimiento();

  useEffect(() => {
    if (router.isReady) {
      const { month, category } = router.query;
      if (month) setMonthFilter(month);
      if (category) setTypeFilter(category);
    }
  }, [router.isReady, router.query]);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));

  const formatDate = (dateInput) => {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    return d.toLocaleDateString('es-ES');
  };

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
    });
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
      const { error } = await updateMovimiento(editingId, updatedData);
      if (error) throw new Error(error);
      setEditingId(null);
      setEditFormData({});
    } catch (err) {
      console.error('Error updating movimiento:', err);
      alert('Error al actualizar: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
      const { error } = await deleteMovimiento(id);
      if (error) alert('Error al eliminar: ' + error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-slate-500 dark:text-slate-400">Cargando movimientos...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 p-4 text-red-700 dark:text-red-300">
        Error: {error}
      </div>
    );
  }

  const commonProps = {
    sortedMovimientos,
    tiposMovimiento,
    searchTerm,
    setSearchTerm,
    typeFilter,
    setTypeFilter,
    monthFilter,
    setMonthFilter,
    formatCurrency,
    formatDate,
  };

  if (isMobile) {
    return (
      <MovimientosMobile
        {...commonProps}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <MovimientosDesktop
      {...commonProps}
      sortConfig={sortConfig}
      handleSort={handleSort}
      editingId={editingId}
      editFormData={editFormData}
      setEditFormData={setEditFormData}
      handleEdit={handleEdit}
      handleCancelEdit={handleCancelEdit}
      handleSaveEdit={handleSaveEdit}
      handleDelete={handleDelete}
    />
  );
}
