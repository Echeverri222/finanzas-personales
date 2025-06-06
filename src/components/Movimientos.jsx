import React, { useEffect, useState } from 'react';
import { TIPOS_MOVIMIENTO } from '../config';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';

export default function Movimientos({ showForm: initialShowForm = false, defaultType = '', onFormClose }) {
  const [movimientos, setMovimientos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [showForm, setShowForm] = useState(initialShowForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'fecha', direction: 'desc' });
  const [dateFilter, setDateFilter] = useState({ startDate: '', endDate: '' });
  const [typeFilter, setTypeFilter] = useState('all');
  const { userProfile } = useUser();

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    fecha: today,
    nombre: '',
    importe: '',
    tipo_movimiento: '',
    usuario_id: userProfile?.id
  });

  // Cargar categorías
  const cargarCategorias = async () => {
    if (!userProfile) return;
    
    try {
      setCategorias(TIPOS_MOVIMIENTO);
    } catch (err) {
      console.error("Error al cargar categorías:", err);
      setError(`Error: ${err.message}`);
    }
  };

  // Update form visibility and data when props change
  useEffect(() => {
    setShowForm(initialShowForm);
    if (initialShowForm) {
      setFormData(prev => ({
        ...prev,
        fecha: today,
        tipo_movimiento: defaultType === 'Ingresos' ? 'Ingresos' : ''
      }));
    }
  }, [initialShowForm, defaultType, today]);

  const cargarMovimientos = async () => {
    if (!userProfile) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('movimientos')
        .select('*')
        .eq('usuario_id', userProfile.id)
        .order('fecha', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setMovimientos(data || []);
    } catch (err) {
      console.error("Error al cargar movimientos:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
    cargarMovimientos();
      cargarCategorias();
    }
  }, [userProfile]);

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const validateForm = () => {
    if (!formData.fecha) return "La fecha es requerida";
    if (!formData.nombre) return "El nombre es requerido";
    if (!formData.importe) return "El importe es requerido";
    if (!formData.tipo_movimiento) return "La categoría es requerida";
    return null;
  };

  const guardarMovimiento = async () => {
    if (!userProfile) return;

    try {
      setLoading(true);
      setError(null);

      const validationError = validateForm();
      if (validationError) {
        setError(validationError);
        return;
      }

      const [year, month, day] = formData.fecha.split('-').map(Number);
      const fecha = new Date(Date.UTC(year, month - 1, day));

      const movimientoData = {
        fecha: fecha.toISOString(),
        nombre: formData.nombre.trim(),
        importe: Number(formData.importe),
        tipo_movimiento: formData.tipo_movimiento,
        usuario_id: userProfile.id
      };

      let response;
      if (editingId) {
        response = await supabase
          .from('movimientos')
          .update(movimientoData)
          .eq('id', editingId)
          .eq('usuario_id', userProfile.id);
      } else {
        response = await supabase
          .from('movimientos')
          .insert([movimientoData]);
      }

      if (response.error) {
        throw new Error(response.error.message);
      }

      setFormData({ 
        fecha: today, 
        nombre: '', 
        importe: '', 
        tipo_movimiento: '',
        usuario_id: userProfile.id 
      });
      setEditingId(null);
      setShowForm(false);
      if (onFormClose) onFormClose();
      await cargarMovimientos();
    } catch (err) {
      console.error("ERROR:", err);
      setError(err.message || "Error al guardar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    await guardarMovimiento();
  };

  const resetForm = () => {
    setFormData({
      fecha: today,
      nombre: '',
      importe: '',
      tipo_movimiento: '',
      usuario_id: userProfile?.id
    });
    setEditingId(null);
    setShowForm(false);
    if (onFormClose) {
      onFormClose();
    }
  };

  const handleEdit = (mov) => {
    // Convertir la fecha ISO a formato YYYY-MM-DD para el input date
    const fecha = mov.fecha ? mov.fecha.split('T')[0] : '';
    
    setFormData({
      fecha: fecha,
      nombre: mov.nombre || '',
      importe: mov.importe ? mov.importe.toString() : '',
      tipo_movimiento: mov.tipo_movimiento || '',
      usuario_id: userProfile?.id
    });
    setEditingId(mov.id);
    setShowForm(true);
    setError(null);
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('movimientos')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await cargarMovimientos();
    } catch (err) {
      console.error("Error al eliminar:", err);
      setError(err.message || "Error al eliminar el movimiento");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    try {
      // Convertir la fecha ISO a UTC
      const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
      const date = new Date(Date.UTC(year, month - 1, day));
      
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        timeZone: 'UTC'
      });
    } catch (err) {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleString('es-CO', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'UTC'
      });
    } catch (err) {
      return dateStr;
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortedMovimientos = (movs) => {
    const sortedMovs = [...movs];
    sortedMovs.sort((a, b) => {
      if (sortConfig.key === 'fecha') {
        return sortConfig.direction === 'asc'
          ? new Date(a.fecha) - new Date(b.fecha)
          : new Date(b.fecha) - new Date(a.fecha);
      }
      if (sortConfig.key === 'importe') {
        return sortConfig.direction === 'asc'
          ? a.importe - b.importe
          : b.importe - a.importe;
      }
      if (sortConfig.key === 'nombre' || sortConfig.key === 'tipo_movimiento') {
        return sortConfig.direction === 'asc'
          ? a[sortConfig.key].localeCompare(b[sortConfig.key])
          : b[sortConfig.key].localeCompare(a[sortConfig.key]);
      }
      return 0;
    });
    return sortedMovs;
  };

  const filteredMovimientos = getSortedMovimientos(
    movimientos.filter(mov => {
      const matchesSearch = mov.nombre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === 'all' || mov.tipo_movimiento === typeFilter;
      const matchesDate = (!dateFilter.startDate || new Date(mov.fecha) >= new Date(dateFilter.startDate)) &&
                         (!dateFilter.endDate || new Date(mov.fecha) <= new Date(dateFilter.endDate));
      return matchesSearch && matchesType && matchesDate;
    })
  );

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return '↕️';
    }
    return sortConfig.direction === 'asc' ? '↑' : '↓';
  };

  if (loading && !showForm) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-2 md:p-6 space-y-4 md:space-y-6 bg-gray-50">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl md:text-2xl font-bold text-gray-800">Gestión de Movimientos</h2>
        {!showForm && (
          <button 
            onClick={() => setShowForm(true)} 
            className="w-full md:w-auto px-4 py-2 rounded-lg flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Nuevo Movimiento
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md">
          <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">
            {editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Fecha</label>
              <input
                type="date"
                name="fecha"
                value={formData.fecha}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Nombre</label>
              <input
                name="nombre"
                placeholder="Descripción del movimiento"
                value={formData.nombre}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Importe</label>
              <input
                name="importe"
                type="number"
                placeholder="0"
                value={formData.importe}
                onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-700">Categoría</label>
          <select
            name="tipo_movimiento"
                value={formData.tipo_movimiento}
            onChange={handleChange}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Seleccione categoría</option>
                {categorias.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="mt-6 flex flex-col md:flex-row justify-end gap-3">
            <button
              onClick={resetForm}
              className="w-full md:w-auto px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className={`w-full md:w-auto px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                  {editingId ? 'Actualizar' : 'Guardar'}
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          />
          <svg 
            className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
          <input
            type="date"
            value={dateFilter.startDate}
            onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
          <input
            type="date"
            value={dateFilter.endDate}
            onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Tipo</label>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm md:text-base"
          >
            <option value="all">Todos</option>
            {TIPOS_MOVIMIENTO.map((tipo, index) => (
              <option key={index} value={tipo}>{tipo}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table with horizontal scroll on mobile */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="overflow-x-auto">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    onClick={() => handleSort('fecha')}
                    className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Fecha {getSortIcon('fecha')}
                  </th>
                  <th 
                    onClick={() => handleSort('nombre')}
                    className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Nombre {getSortIcon('nombre')}
                  </th>
                  <th 
                    onClick={() => handleSort('importe')}
                    className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Importe {getSortIcon('importe')}
                  </th>
                  <th 
                    onClick={() => handleSort('tipo_movimiento')}
                    className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                  >
                    Categoría {getSortIcon('tipo_movimiento')}
                  </th>
                  <th className="px-4 md:px-6 py-3 text-left text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Última Modificación
                  </th>
                  <th className="px-4 md:px-6 py-3 text-right text-xs md:text-sm font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
            </tr>
          </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMovimientos.map((mov) => (
                  <React.Fragment key={mov.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                        {formatDate(mov.fecha)}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-900">
                        {mov.nombre}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                        <span className={`font-medium ${
                          mov.tipo_movimiento === 'Ingresos' ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(mov.importe)}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          mov.tipo_movimiento === 'Ingresos' 
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {mov.tipo_movimiento || 'Sin categoría'}
                        </span>
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-xs md:text-sm text-gray-500">
                        {formatDateTime(mov.updated_at)}
                      </td>
                      <td className="px-4 md:px-6 py-4 whitespace-nowrap text-right text-xs md:text-sm font-medium">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => handleEdit(mov)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(mov.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingId === mov.id && (
                      <tr>
                        <td colSpan="5" className="px-4 md:px-6 py-4">
                          <div className="bg-blue-50 p-4 rounded-lg">
                            <h3 className="text-base md:text-lg font-semibold text-gray-800 mb-4">Editar Movimiento</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Fecha</label>
                                <input
                                  type="date"
                                  name="fecha"
                                  value={formData.fecha}
                                  onChange={handleChange}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Nombre</label>
                                <input
                                  name="nombre"
                                  placeholder="Descripción del movimiento"
                                  value={formData.nombre}
                                  onChange={handleChange}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Importe</label>
                                <input
                                  name="importe"
                                  type="number"
                                  placeholder="0"
                                  value={formData.importe}
                                  onChange={handleChange}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">Categoría</label>
                                <select
                                  name="tipo_movimiento"
                                  value={formData.tipo_movimiento}
                                  onChange={handleChange}
                                  className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                  required
                                >
                                  <option value="">Seleccione categoría</option>
                                  {categorias.map((cat) => (
                                    <option key={cat} value={cat}>{cat}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                            <div className="mt-6 flex justify-end gap-3">
                              <button
                                onClick={() => {
                                  setEditingId(null);
                                  resetForm();
                                }}
                                className="px-4 py-2 rounded-lg text-gray-700 hover:bg-gray-100 transition-colors"
                                disabled={loading}
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={handleSubmit}
                                className={`px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors flex items-center gap-2 ${
                                  loading ? 'opacity-50 cursor-not-allowed' : ''
                                }`}
                                disabled={loading}
                              >
                                {loading ? (
                                  <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    Guardando...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                                    </svg>
                                    Actualizar
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        </td>
              </tr>
                    )}
                  </React.Fragment>
            ))}
          </tbody>
        </table>
          </div>
        </div>
      </div>
    </div>
  );
}
