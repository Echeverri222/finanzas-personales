import React, { useEffect, useState } from 'react';

// URL para la hoja de Ahorros (API ya creada)
const API_URL = 'https://script.google.com/macros/s/AKfycbwrYbgURYW3kr6pNwjqA2L7vPB7gJ-2zwkaSsaYDStbPx7U0q_W_KwwuNktsWSfg0M/exec?type=ahorros';

export default function Ahorros() {
  const [ahorros, setAhorros] = useState([]);
  const [nuevo, setNuevo] = useState({
    fecha: '',
    monto: '',
    descripcion: ''
  });

  const cargarAhorros = () => {
    fetch(API_URL)
      .then(res => res.json())
      .then(data => {
        const filtrados = data.filter(item => {
          const montoNum = Number(item.monto);
          return item.fecha && !isNaN(montoNum) && montoNum > 0;
        });
        setAhorros(filtrados);
      })
      .catch(err => console.error("Error al obtener ahorros:", err));
  };

  useEffect(() => {
    cargarAhorros();
  }, []);

  const handleChange = (e) => {
    setNuevo({...nuevo, [e.target.name]: e.target.value});
  };

  const agregarAhorro = () => {
    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevo)
    })
    .then(() => {
      cargarAhorros();
      setNuevo({ fecha: '', monto: '', descripcion: '' });
    })
    .catch(err => console.error("Error al guardar ahorro:", err));
  };

  const formatDate = (fecha) => {
    try {
      return new Date(fecha).toLocaleDateString("es-CO");
    } catch {
      return fecha;
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4">Ahorros</h2>

      <div className="mb-6">
        <h3 className="font-semibold mb-2">Agregar nuevo ahorro:</h3>
        <div className="flex flex-col gap-2 mb-2">
          <input name="fecha" type="date" value={nuevo.fecha} onChange={handleChange} className="border p-2 rounded" />
          <input name="monto" type="number" placeholder="Monto" value={nuevo.monto} onChange={handleChange} className="border p-2 rounded" />
          <input name="descripcion" placeholder="Descripción" value={nuevo.descripcion} onChange={handleChange} className="border p-2 rounded" />
        </div>
        <button onClick={agregarAhorro} className="bg-green-500 text-white px-4 py-2 rounded">Agregar</button>
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
            </tr>
          </thead>
          <tbody>
            {ahorros.map((ahorro, index) => (
              <tr key={index}>
                <td className="border p-2">{formatDate(ahorro.fecha)}</td>
                <td className="border p-2">${Number(ahorro.monto).toLocaleString('es-CO')}</td>
                <td className="border p-2">{ahorro.descripcion || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
