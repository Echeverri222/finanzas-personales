import '../styles/globals.css';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';
import Layout from '../components/Layout';
import Auth from '../components/Auth';
import { useEffect, useState } from 'react';

function AppContent({ Component, pageProps }) {
  const { user, loading } = useAuth();
  const [demoBypass, setDemoBypass] = useState(false);

  useEffect(() => {
    // Check for demo bypass flag
    const bypass = localStorage.getItem('demo-bypass');
    setDemoBypass(!!bypass);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  // Allow access if user is authenticated OR demo bypass is enabled (for testing)
  if (!user && !demoBypass) {
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