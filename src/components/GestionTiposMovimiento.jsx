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

  return (
    <div className="bg-white p-4 rounded-xl shadow-md mt-6">
      <h3 className="text-lg font-bold mb-2">Gestionar Tipos de Movimiento</h3>
      <div className="flex gap-2 mb-4">
        <input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre" className="border rounded px-2 py-1" />
        <input value={meta} onChange={e => setMeta(e.target.value)} placeholder="Meta (opcional)" type="number" className="border rounded px-2 py-1" />
        <button onClick={handleAdd} disabled={loading} className="bg-blue-500 text-white px-3 py-1 rounded">Agregar</button>
      </div>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <ul className="mb-4">
        {tipos.map(tipo => (
          <li key={tipo.id} className="flex justify-between items-center border-b py-1">
            <span>{tipo.nombre} {tipo.meta ? `(Meta: ${tipo.meta})` : ''}</span>
            <button onClick={() => handleDelete(tipo.id)} className="text-red-500">Eliminar</button>
          </li>
        ))}
      </ul>
      <div>
        <span className="font-semibold">Recomendaciones:</span>
        <div className="flex flex-wrap gap-2 mt-2">
          {recomendados.map((rec, i) => (
            <span key={i} className="bg-gray-200 px-2 py-1 rounded text-xs">{rec}</span>
          ))}
        </div>
      </div>
    </div>
  );
} 