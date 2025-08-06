import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import DemoHelper from './DemoHelper';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const { signIn } = useAuth();

  const isDemoBypassAllowed = process.env.NEXT_PUBLIC_ALLOW_DEMO_BYPASS === 'true';

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Demo bypass for testing (only if allowed via environment variable)
    if (email === 'demo@test.com' && isDemoBypassAllowed) {
      localStorage.setItem('demo-bypass', 'true');
      window.location.reload();
      return;
    }

    try {
      setLoading(true);
      setMessage('');
      const { error } = await signIn(email);
      if (error) throw error;
      setMessage('¡Revisa tu correo para el enlace de inicio de sesión!');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Finanzas Personales
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Inicia sesión para gestionar tus finanzas
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="sr-only">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="Correo electrónico"
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Enviando...' : 'Enviar enlace mágico'}
            </button>
          </div>
          {message && (
            <div className="text-center text-sm text-gray-600">
              {message}
            </div>
          )}
          {isDemoBypassAllowed && (
            <div className="text-center">
              <p className="text-xs text-gray-500">
                Para testing: usa <code className="bg-gray-100 px-1 rounded">demo@test.com</code>
              </p>
            </div>
          )}
        </form>
      </div>
      <DemoHelper />
    </div>
  );
} 