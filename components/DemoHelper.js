import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';

export default function DemoHelper() {
  const [demoBypass, setDemoBypass] = useState(false);
  const [showHelper, setShowHelper] = useState(false);
  const { user } = useAuth();
  
  const isDemoBypassAllowed = process.env.NEXT_PUBLIC_ALLOW_DEMO_BYPASS === 'true';

  useEffect(() => {
    if (isDemoBypassAllowed) {
      const bypass = localStorage.getItem('demo-bypass');
      setDemoBypass(!!bypass);
      setShowHelper(true);
    }
  }, [isDemoBypassAllowed]);

  const toggleDemoBypass = () => {
    if (demoBypass) {
      localStorage.removeItem('demo-bypass');
      setDemoBypass(false);
    } else {
      localStorage.setItem('demo-bypass', 'true');
      setDemoBypass(true);
    }
    // Reload page to apply changes
    window.location.reload();
  };

  // Only show if demo bypass is allowed and user is not authenticated
  if (!isDemoBypassAllowed || user) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 shadow-lg max-w-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-blue-600 text-lg">🧪</span>
          <div className="font-semibold text-blue-800">Modo Demo</div>
        </div>
        <p className="text-sm text-blue-700 mb-3">
          {demoBypass 
            ? 'Demo bypass activo. Puedes navegar sin autenticación.' 
            : 'Activa el modo demo para probar la aplicación sin autenticación.'
          }
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={demoBypass ? "outline" : "default"}
            onClick={toggleDemoBypass}
          >
            {demoBypass ? 'Desactivar Demo' : 'Activar Demo'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowHelper(false)}
          >
            ✕
          </Button>
        </div>
      </div>
    </div>
  );
} 