import React, { useEffect, useState } from 'react';
import { API_URL } from '../config';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';

export default function Ahorros() {
  const [ahorros, setAhorros] = useState([]);
  const [nuevo, setNuevo] = useState({
    fecha: '',
    monto: '',
    descripcion: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [accessToken, setAccessToken] = useState(null);

  const login = useGoogleLogin({
    onSuccess: tokenResponse => {
      console.log('Token obtenido:', tokenResponse);
      setAccessToken(tokenResponse.access_token);
      cargarAhorros(tokenResponse.access_token);
    },
    onError: error => {
      console.error('Error de login:', error);
      setError('Error al autenticar con Google');
    },
    scope: 'https://www.googleapis.com/auth/spreadsheets',
  });

  const cargarAhorros = async (token) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_URL, {
        headers: {
          'Authorization': `Bearer ${token || accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const data = await response.json();
      const filtrados = data.filter(item => {
        const montoNum = Number(item.monto);
        return item.fecha && !isNaN(montoNum) && montoNum > 0;
      });
      setAhorros(filtrados);
    } catch (err) {
      console.error("Error al obtener ahorros:", err);
      if (err.message.includes('401')) {
        setError('Sesión expirada. Por favor, vuelve a iniciar sesión.');
        login();
      } else {
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!accessToken) {
      login();
    } else {
      cargarAhorros();
    }
  }, []);

  const handleChange = (e) => {
    setNuevo({...nuevo, [e.target.name]: e.target.value});
  };

  const agregarAhorro = async () => {
    if (!accessToken) {
      setError('No hay sesión activa. Por favor, inicia sesión.');
      login();
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify(nuevo)
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError('Sesión expirada. Por favor, vuelve a iniciar sesión.');
          login();
          return;
        }
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const responseJson = await response.json();
      if (responseJson.result === 'success') {
        await cargarAhorros();
        setNuevo({ fecha: '', monto: '', descripcion: '' });
        setError(null);
      } else {
        throw new Error(responseJson.error || 'Error al guardar los datos');
      }
    } catch (err) {
      console.error("Error al guardar ahorro:", err);
      setError(err.message || "Error al guardar los datos");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    googleLogout();
    setAccessToken(null);
    setAhorros([]);
    setError('Sesión cerrada. Inicia sesión para continuar.');
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
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Ahorros</h2>
        {accessToken ? (
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
          >
            Cerrar Sesión
          </button>
        ) : (
          <button
            onClick={() => login()}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
          >
            Iniciar Sesión con Google
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {accessToken && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Agregar nuevo ahorro:</h3>
          <div className="flex flex-col gap-2 mb-2">
            <input name="fecha" type="date" value={nuevo.fecha} onChange={handleChange} className="border p-2 rounded" />
            <input name="monto" type="number" placeholder="Monto" value={nuevo.monto} onChange={handleChange} className="border p-2 rounded" />
            <input name="descripcion" placeholder="Descripción" value={nuevo.descripcion} onChange={handleChange} className="border p-2 rounded" />
          </div>
          <button 
            onClick={agregarAhorro} 
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            disabled={loading}
          >
            {loading ? 'Guardando...' : 'Agregar'}
          </button>
        </div>
      )}

      {accessToken && (
        <>
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
        </>
      )}
    </div>
  );
}
