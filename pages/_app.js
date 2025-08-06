import '../styles/globals.css';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';
import Layout from '../components/Layout';
import Auth from '../components/Auth';
import { useEffect, useState } from 'react';

function AppContent({ Component, pageProps }) {
  const { user, loading } = useAuth();
  const [demoBypass, setDemoBypass] = useState(false);

  // Only allow demo bypass if explicitly enabled via environment variable
  const isDemoBypassAllowed = process.env.NEXT_PUBLIC_ALLOW_DEMO_BYPASS === 'true';

  useEffect(() => {
    if (isDemoBypassAllowed) {
      // Check for demo bypass flag only if allowed
      const bypass = localStorage.getItem('demo-bypass');
      setDemoBypass(!!bypass);
    }
  }, [isDemoBypassAllowed]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  // Allow access if user is authenticated OR (demo bypass is enabled AND allowed)
  if (!user && !(demoBypass && isDemoBypassAllowed)) {
    return <Auth />;
  }

  return (
    <UserProvider>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </UserProvider>
  );
}

export default function MyApp({ Component, pageProps }) {
  return (
    <AuthProvider>
      <AppContent Component={Component} pageProps={pageProps} />
    </AuthProvider>
  );
} 