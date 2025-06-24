import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useUser } from '../context/UserContext';

export default function GestionTiposMovimiento() {
  const { userProfile } = useUser();
  const [tipos, setTipos] = useState([]);
  const [nombre, setNombre] = useState('');
  const [meta, setMeta] = useState('');
  const [recomendados, setRecomendados] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editNombre, setEditNombre] = useState('');
  const [editMeta, setEditMeta] = useState('');

  // Cargar tipos del usuario
  const cargarTipos = async () => {
    if (!userProfile) return;
    const { data, error } = await supabase
      .from('tipo_movimiento')
      .select('*')
      .eq('usuario_id', userProfile.id)
      .order('created_at', { ascending: true });
    if (!error) setTipos(data || []);
  };

  // Cargar recomendaciones globales
  const cargarRecomendados = async () => {
    const { data, error } = await supabase
      .from('tipo_movimiento')
      .select('nombre')
      .neq('usuario_id', userProfile.id)
      .order('created_at', { ascending: true });
    if (!error) {
      const unicos = [...new Set((data || []).map(t => t.nombre))];
      setRecomendados(unicos);
    }
  };

  useEffect(() => {
    cargarTipos();
    cargarRecomendados();
  }, [userProfile]);

  const handleAdd = async () => {
    if (!nombre) return setError('El nombre es obligatorio');
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from('tipo_movimiento')
      .insert([{ usuario_id: userProfile.id, nombre, meta: meta ? Number(meta) : 0 }]);
    if (error) setError(error.message);
    setNombre('');
    setMeta('');
    await cargarTipos();
    setLoading(false);
  };

  const handleDelete = async (id) => {
    setLoading(true);
    await supabase.from('tipo_movimiento').delete().eq('id', id);
    await cargarTipos();
    setLoading(false);
  };

  const handleEdit = (tipo) => {
    setEditId(tipo.id);
    setEditNombre(tipo.nombre);
    setEditMeta(tipo.meta);
  };

  const handleUpdate = async (id) => {
    setLoading(true);
    setError(null);
    const { error } = await supabase
      .from('tipo_movimiento')
      .update({ nombre: editNombre, meta: editMeta ? Number(editMeta) : 0 })
      .eq('id', id);
    if (error) setError(error.message);
    setEditId(null);
    setEditNombre('');
    setEditMeta('');
    await cargarTipos();
    setLoading(false);
  };

  const handleCancelEdit = () => {
    setEditId(null);
    setEditNombre('');
    setEditMeta('');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md mt-6 max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-4 text-gray-800">Gestionar Tipos de Movimiento</h3>
      <form className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6" onSubmit={e => { e.preventDefault(); handleAdd(); }}>
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
        <input value={meta} onChange={e => setMeta(e.target.value)} placeholder="Meta (opcional)" type="number" className="px-3 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm" />
        <button type="submit" disabled={loading} className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">Agregar</button>
      </form>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="space-y-1 mb-6">
        {tipos.map(tipo => (
          <div key={tipo.id} className="flex flex-row items-center justify-between bg-gray-50 rounded-lg px-4 py-1 border border-gray-200">
            {editId === tipo.id ? (
              <div className="flex flex-row gap-2 w-full items-center">
                <input value={editNombre} onChange={e => setEditNombre(e.target.value)} className="px-2 py-1 rounded-lg border border-gray-300 text-sm w-32" />
                <input value={editMeta} onChange={e => setEditMeta(e.target.value)} type="number" className="px-2 py-1 rounded-lg border border-gray-300 text-sm w-24 text-center" />
                <button onClick={() => handleUpdate(tipo.id)} className="px-2 py-1 rounded bg-green-500 text-white hover:bg-green-600 text-xs font-semibold">Guardar</button>
                <button onClick={handleCancelEdit} className="px-2 py-1 rounded bg-gray-200 text-gray-700 hover:bg-gray-300 text-xs font-semibold">Cancelar</button>
              </div>
            ) : (
              <>
                <span className="font-medium text-gray-800 text-base w-32 truncate">{tipo.nombre}</span>
                <span className="text-gray-500 text-sm w-32 text-center">{tipo.meta ? `Meta: ${tipo.meta}` : ''}</span>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(tipo)} className="px-2 py-1 rounded bg-blue-500 text-white hover:bg-blue-600 text-xs font-semibold">Editar</button>
                  <button onClick={() => handleDelete(tipo.id)} className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 text-xs font-semibold">Eliminar</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      <div>
        <span className="font-semibold text-gray-700">Recomendaciones:</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {recomendados.map((rec, i) => (
            <span key={i} className="bg-gray-200 px-2 py-1 rounded text-xs">{rec}</span>
          ))}
        </div>
      </div>
    </div>
  );
} 