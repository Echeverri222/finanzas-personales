import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';

const NAV_ITEMS = [
  { name: 'Inicio', href: '/dashboard', icon: 'home' },
  { name: 'Transacciones', href: '/movimientos', icon: 'receipt_long' },
  { name: 'Recurrentes', href: '/pagos-recurrentes', icon: 'repeat' },
  { name: 'Metas', href: '/metas', icon: 'track_changes' },
  { name: 'Ahorros', href: '/ahorros', icon: 'savings' },
  { name: 'Análisis', href: '/stock-analysis', icon: 'analytics' },
  { name: 'Categorías', href: '/gestion-tipos', icon: 'category' },
  { name: 'Etiquetas', href: '/etiquetas', icon: 'label' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { userProfile } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActive = (href) => {
    if (href === '/movimientos') return router.pathname.startsWith('/movimientos');
    return router.pathname === href;
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/');
    } catch {
      router.push('/');
    }
  };

  const displayName = userProfile?.nombre || userProfile?.email?.split('@')[0] || 'Usuario';

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark text-slate-900 dark:text-slate-100 font-display flex">
      {/* Desktop Sidebar - Stitch style */}
      <aside className="hidden md:flex w-64 flex-shrink-0 bg-primary text-white flex-col">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-lg">
            <span className="material-symbols-outlined text-white">account_balance_wallet</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight leading-none">Finanzas</h1>
        </div>
        <nav className="flex-1 px-4 mt-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-colors ${
                  active ? 'bg-white/15 text-white' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined ${active ? 'fill' : ''}`}>{item.icon}</span>
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 mt-auto border-t border-white/10">
          <div className="flex items-center gap-3 px-2 py-3 rounded-lg hover:bg-white/5 cursor-pointer">
            <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex items-center justify-center">
              <span className="material-symbols-outlined text-white">person</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate">{displayName}</p>
              <p className="text-xs text-white/60 truncate">Cuenta</p>
            </div>
            <button
              onClick={handleSignOut}
              className="p-1 rounded hover:bg-white/10 text-white/70 hover:text-white"
              title="Cerrar sesión"
            >
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-20 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md px-4 py-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
            aria-label="Menú"
          >
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">menu</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
              <span className="material-symbols-outlined text-primary">account_balance_wallet</span>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Hola,</p>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-tight truncate max-w-[140px]">
                {displayName}
              </h1>
            </div>
          </div>
          <button className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors relative">
            <span className="material-symbols-outlined text-slate-600 dark:text-slate-300">notifications</span>
          </button>
        </header>

        {/* Mobile slide-out menu */}
        <div
          className={`fixed top-0 left-0 z-30 h-full w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transform transition-transform duration-300 ease-out md:hidden ${
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="font-bold text-slate-900 dark:text-white">Menú</span>
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          <nav className="p-4 space-y-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-3 rounded-lg font-medium transition-colors ${
                    active ? 'bg-primary/10 text-primary' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`material-symbols-outlined ${active ? 'fill' : ''}`}>{item.icon}</span>
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-800">
            <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{displayName}</p>
            <button
              onClick={handleSignOut}
              className="mt-2 flex items-center gap-2 text-sm text-slate-500 hover:text-red-600"
            >
              <span className="material-symbols-outlined text-lg">logout</span>
              Cerrar sesión
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 md:p-6 lg:p-8 pb-24 md:pb-8">
          {children}
        </main>

        {/* Mobile bottom nav - Stitch style */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center justify-between z-40">
          <Link
            href="/dashboard"
            className={`flex flex-col items-center gap-1 ${isActive('/dashboard') ? 'text-primary' : 'text-slate-400 hover:text-primary transition-colors'}`}
          >
            <span className={`material-symbols-outlined ${isActive('/dashboard') ? 'fill' : ''}`}>home</span>
            <span className="text-[10px] font-bold">Inicio</span>
          </Link>
          <Link
            href="/movimientos"
            className={`flex flex-col items-center gap-1 ${router.pathname.startsWith('/movimientos') ? 'text-primary' : 'text-slate-400 hover:text-primary transition-colors'}`}
          >
            <span className={`material-symbols-outlined ${router.pathname.startsWith('/movimientos') ? 'fill' : ''}`}>receipt_long</span>
            <span className="text-[10px] font-bold">Transacciones</span>
          </Link>
          <div className="w-12 h-1" aria-hidden="true" />
          <Link
            href="/metas"
            className={`flex flex-col items-center gap-1 ${isActive('/metas') ? 'text-primary' : 'text-slate-400 hover:text-primary transition-colors'}`}
          >
            <span className={`material-symbols-outlined ${isActive('/metas') ? 'fill' : ''}`}>track_changes</span>
            <span className="text-[10px] font-bold">Metas</span>
          </Link>
          <Link
            href="/ahorros"
            className={`flex flex-col items-center gap-1 ${isActive('/ahorros') ? 'text-primary' : 'text-slate-400 hover:text-primary transition-colors'}`}
          >
            <span className={`material-symbols-outlined ${isActive('/ahorros') ? 'fill' : ''}`}>savings</span>
            <span className="text-[10px] font-bold">Ahorros</span>
          </Link>
        </nav>

        {/* FAB - Add movement (mobile) */}
        <Link
          href="/movimientos/nuevo"
          className="md:hidden fixed bottom-24 right-6 size-14 bg-primary text-white rounded-full shadow-lg shadow-primary/40 flex items-center justify-center z-50 hover:scale-105 active:scale-95 transition-transform"
          aria-label="Nuevo movimiento"
        >
          <span className="material-symbols-outlined text-3xl">add</span>
        </Link>
      </div>
    </div>
  );
}
