import React, { useEffect, useState } from 'react';
import { API_URL, TIPOS_MOVIMIENTO } from '../config';

export default function Movimientos() {
  const [movimientos, setMovimientos] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    fecha: '',
    nombre: '',
    importe: '',
    tipo_movimiento: ''
  });

  const cargarMovimientos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}?type=movimientos`);
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        setMovimientos(data);
      } else {
        throw new Error('Formato de datos inválido');
      }
    } catch (err) {
      console.error("Error al cargar movimientos:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMovimientos();
  }, []);

  const handleChange = (e) => {
    setFormData({...formData, [e.target.name]: e.target.value});
  };

  const validateForm = () => {
    if (!formData.fecha) return "La fecha es requerida";
    if (!formData.nombre) return "El nombre es requerido";
    if (!formData.importe) return "El importe es requerido";
    if (!formData.tipo_movimiento) return "El tipo de movimiento es requerido";
    return null;
  };

  const guardarMovimiento = async () => {
    // Formatear los datos antes de enviar
    const dataToSend = {
      ...formData,
      importe: Number(formData.importe), // Asegurar que importe sea número
      fecha: new Date(formData.fecha).toISOString().split('T')[0], // Formatear fecha como YYYY-MM-DD
      type: 'movimientos'
    };

    try {
      setLoading(true);
      console.log('Enviando datos:', dataToSend); // Para debug

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataToSend)
      });

      console.log('Response status:', response.status); // Para debug

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText); // Para debug
        throw new Error(`Error del servidor: ${response.status} - ${errorText}`);
      }

      const responseJson = await response.json();
      console.log('Response JSON:', responseJson); // Para debug

      if (responseJson.result === 'success') {
        await cargarMovimientos();
        setFormData({ fecha: '', nombre: '', importe: '', tipo_movimiento: '' });
        setShowForm(false);
        setError(null);
      } else {
        throw new Error(responseJson.error || 'Error al guardar los datos');
      }
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
      fecha: '',
      nombre: '',
      importe: '',
      tipo_movimiento: ''
    });
    setEditingId(null);
    setError(null);
  };

  const handleEdit = (mov) => {
    setFormData({
      fecha: mov.fecha.split('T')[0],
      nombre: mov.nombre,
      importe: mov.importe,
      tipo_movimiento: mov.tipo_movimiento
    });
    setEditingId(mov.id);
    setShowForm(true);
    setError(null);
  };

  const formatDate = (dateStr) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-CO', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit'
      });
    } catch (err) {
      return dateStr;
    }
  };

  const filteredMovimientos = movimientos
    .filter(mov => mov.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  if (loading && !showForm) {
    return <div className="p-4 text-center">Cargando...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Movimientos</h2>
        <button 
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) resetForm();
          }} 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          {showForm ? '❌ Cancelar' : '➕ Agregar Movimiento'}
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="🔍 Buscar por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full border p-2 rounded"
        />
      </div>

      {/* Form */}
      {showForm && (
        <div className="mb-6 bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold mb-4">
            {editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <input
              type="date"
              name="fecha"
              value={formData.fecha}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />
            <input
              name="nombre"
              placeholder="Nombre"
              value={formData.nombre}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />
            <input
              name="importe"
              type="number"
              placeholder="Importe"
              value={formData.importe}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            />
            <select
              name="tipo_movimiento"
              value={formData.tipo_movimiento}
              onChange={handleChange}
              className="border p-2 rounded"
              required
            >
              <option value="">Seleccione tipo</option>
              {TIPOS_MOVIMIENTO.map((tipo, index) => (
                <option key={index} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              className={`${loading ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'} text-white px-4 py-2 rounded flex items-center gap-2`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Guardando...
                </>
              ) : (
                editingId ? 'Actualizar' : 'Guardar'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Table Toggle */}
      <div className="flex justify-between items-center mb-4">
        <button 
          onClick={() => setShowTable(!showTable)}
          className="text-blue-500 hover:text-blue-700"
        >
          {showTable ? '🔼 Ocultar Lista' : '🔽 Mostrar Lista'} 
          ({filteredMovimientos.length} movimientos)
        </button>
      </div>

      {/* Table */}
      {showTable && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead className="bg-gray-100">
              <tr>
                <th className="border p-2">Fecha</th>
                <th className="border p-2">Nombre</th>
                <th className="border p-2">Importe</th>
                <th className="border p-2">Tipo</th>
                <th className="border p-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredMovimientos.map((mov, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border p-2">{formatDate(mov.fecha)}</td>
                  <td className="border p-2">{mov.nombre}</td>
                  <td className="border p-2 text-right">
                    ${Number(mov.importe).toLocaleString('es-CO')}
                  </td>
                  <td className="border p-2">{mov.tipo_movimiento}</td>
                  <td className="border p-2">
                    <button
                      onClick={() => handleEdit(mov)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ✏️ Editar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
