import '../styles/globals.css';
import { Inter } from 'next/font/google';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { UserProvider } from '../contexts/UserContext';
import Layout from '../components/Layout';
import Auth from '../components/Auth';
import RecurringProcessor from '../components/RecurringProcessor';
import ErrorBoundary from '../components/ErrorBoundary';

// Self-hosted at build time, replacing the render-blocking Google Fonts <link>
// that used to sit in _document. `variable` exposes it as --font-inter, which
// tailwind.config.js maps onto fontFamily.sans/display -- both halves are
// required, and styles/globals.css must not hardcode 'Inter' any more or it
// would keep asking for a web font that is no longer requested.
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

function AppContent({ Component, pageProps }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Cargando...</div>
      </div>
    );
  }

  // Require authentication - no demo bypass
  if (!user) {
    return <Auth />;
  }

  return (
    <ErrorBoundary>
      <UserProvider>
        <RecurringProcessor />
        <Layout>
          <ErrorBoundary>
            <Component {...pageProps} />
          </ErrorBoundary>
        </Layout>
      </UserProvider>
    </ErrorBoundary>
  );
}

export default function MyApp({ Component, pageProps }) {
  return (
    <ErrorBoundary>
      {/* ThemeProvider sits above AuthProvider on purpose: the "Cargando..."
          state and the whole Auth screen render before any user exists, and
          they need the theme too. attribute="class" matches
          darkMode: "class" in tailwind.config.js. disableTransitionOnChange
          stops every `transition-colors` in the app animating at once on
          toggle, which reads as a lag spike rather than a theme change. */}
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <div className={`${inter.variable} font-sans`}>
          <AuthProvider>
            <AppContent Component={Component} pageProps={pageProps} />
          </AuthProvider>
        </div>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
