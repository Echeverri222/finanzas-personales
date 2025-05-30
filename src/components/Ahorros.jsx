import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export default function Ahorros() {
  const [ahorros, setAhorros] = useState([]);
  const [nuevo, setNuevo] = useState({
    fecha: '',
    monto: '',
    descripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarAhorros = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error: supabaseError } = await supabase
        .from('ahorros')
        .select('*')
        .order('fecha', { ascending: false });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setAhorros(data || []);
    } catch (err) {
      console.error("Error al obtener ahorros:", err);
      setError(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarAhorros();

    // Suscribirse a cambios en tiempo real
    const subscription = supabase
      .channel('ahorros_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'ahorros' 
        }, 
        () => {
          cargarAhorros();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleChange = (e) => {
    setNuevo({...nuevo, [e.target.name]: e.target.value});
  };

  const agregarAhorro = async () => {
    try {
      setLoading(true);
      setError(null);

      const ahorroData = {
        fecha: new Date(nuevo.fecha).toISOString(),
        monto: Number(nuevo.monto),
        descripcion: nuevo.descripcion
      };

      const { error: supabaseError } = await supabase
        .from('ahorros')
        .insert([ahorroData]);

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setNuevo({ fecha: '', monto: '', descripcion: '' });
      await cargarAhorros();
    } catch (err) {
      console.error("Error al guardar ahorro:", err);
      setError(err.message || "Error al guardar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      setLoading(true);
      setError(null);

      const { error: deleteError } = await supabase
        .from('ahorros')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      await cargarAhorros();
    } catch (err) {
      console.error("Error al eliminar:", err);
      setError(err.message || "Error al eliminar el ahorro");
    } finally {
      setLoading(false);
    }
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

  if (loading) {
    return <div className="p-4 text-center">Cargando...</div>;
  }

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Ahorros</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Agregar nuevo ahorro:</h3>
        <div className="flex flex-col gap-2 mb-2">
          <input 
            name="fecha" 
            type="date" 
            value={nuevo.fecha} 
            onChange={handleChange} 
            className="border p-2 rounded" 
          />
          <input 
            name="monto" 
            type="number" 
            placeholder="Monto" 
            value={nuevo.monto} 
            onChange={handleChange} 
            className="border p-2 rounded" 
          />
          <input 
            name="descripcion" 
            placeholder="Descripción" 
            value={nuevo.descripcion} 
            onChange={handleChange} 
            className="border p-2 rounded" 
          />
        </div>
        <button 
          onClick={agregarAhorro} 
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          disabled={loading}
        >
          {loading ? 'Guardando...' : 'Agregar'}
        </button>
      </div>

      <h3 className="font-semibold mb-2">Lista de ahorros:</h3>
      {ahorros.length === 0 ? (
        <p>No hay ahorros registrados aún.</p>
      ) : (
        <table className="w-full border-collapse border border-gray-300">
          <thead className="bg-gray-200">
            <tr>
              <th className="border p-2">Fecha</th>
              <th className="border p-2">Monto</th>
              <th className="border p-2">Descripción</th>
              <th className="border p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ahorros.map((ahorro) => (
              <tr key={ahorro.id}>
                <td className="border p-2">{formatDate(ahorro.fecha)}</td>
                <td className="border p-2">${Number(ahorro.monto).toLocaleString('es-CO')}</td>
                <td className="border p-2">{ahorro.descripcion || '-'}</td>
                <td className="border p-2">
                  <button
                    onClick={() => handleDelete(ahorro.id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    🗑️ Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
