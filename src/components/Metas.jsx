import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';

export default function Metas() {
  const [metas, setMetas] = useState([]);
  const [nueva, setNueva] = useState({
    nombre: '',
    meta_total: '',
    fecha_meta: '',
    descripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarMetas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${API_URL}?type=metas`);
      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      const filtrados = data.filter(item => item.nombre && item.meta_total);
      setMetas(filtrados);
    } catch (err) {
      console.error("Error al obtener metas:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarMetas();
  }, []);

  const handleChange = (e) => {
    setNueva({...nueva, [e.target.name]: e.target.value});
  };

  const agregarMeta = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...nueva,
          type: 'metas'
        })
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const responseJson = await response.json();
      if (responseJson.result === 'success') {
        await cargarMetas();
        setNueva({ nombre: '', meta_total: '', fecha_meta: '', descripcion: '' });
        setError(null);
      } else {
        throw new Error(responseJson.error || 'Error al guardar los datos');
      }
    } catch (err) {
      console.error("Error al guardar meta:", err);
      setError(err.message || "Error al guardar los datos");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (fecha) => {
    try {
      return new Date(fecha).toLocaleDateString("es-CO");
    } catch {
      return fecha;
    }
  };

  if (loading) {
    return <div className="p-4 text-center">Cargando...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Metas de Ahorro</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Agregar nueva meta:</h3>
        <div className="flex flex-col gap-2 mb-2">
          <input 
            name="nombre" 
            placeholder="Nombre" 
            value={nueva.nombre} 
            onChange={handleChange} 
            className="border p-2 rounded" 
          />
          <input 
            name="meta_total" 
            type="number" 
            placeholder="Monto objetivo" 
            value={nueva.meta_total} 
            onChange={handleChange} 
            className="border p-2 rounded" 
          />
          <input 
            name="fecha_meta" 
            type="date" 
            value={nueva.fecha_meta} 
            onChange={handleChange} 
            className="border p-2 rounded" 
          />
          <input 
            name="descripcion" 
            placeholder="Descripción" 
            value={nueva.descripcion} 
            onChange={handleChange} 
            className="border p-2 rounded" 
          />
        </div>

        <button 
          onClick={agregarMeta} 
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Agregar'}
        </button>
      </div>

      <h3 className="font-semibold mb-2">Lista de metas:</h3>
      {metas.length === 0 ? (
        <p>No hay metas registradas aún.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">Nombre</th>
              <th className="border p-2">Monto Objetivo</th>
              <th className="border p-2">Fecha Objetivo</th>
              <th className="border p-2">Descripción</th>
            </tr>
          </thead>
          <tbody>
            {metas.map((meta, index) => (
              <tr key={index}>
                <td className="border p-2">{meta.nombre}</td>
                <td className="border p-2">${Number(meta.meta_total).toLocaleString('es-CO')}</td>
                <td className="border p-2">{formatDate(meta.fecha_meta)}</td>
                <td className="border p-2">{meta.descripcion}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
