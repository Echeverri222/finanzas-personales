import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  Home,
  ReceiptText,
  Repeat,
  Target,
  PiggyBank,
  LineChart,
  Shapes,
  Tag,
  Wallet,
  LogOut,
  Menu,
  X,
  Plus,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { name: 'Inicio', href: '/dashboard', icon: Home },
  { name: 'Transacciones', href: '/movimientos', icon: ReceiptText },
  { name: 'Recurrentes', href: '/pagos-recurrentes', icon: Repeat },
  { name: 'Metas', href: '/metas', icon: Target },
  { name: 'Ahorros', href: '/ahorros', icon: PiggyBank },
  { name: 'Análisis', href: '/stock-analysis', icon: LineChart },
  { name: 'Categorías', href: '/gestion-tipos', icon: Shapes },
  { name: 'Etiquetas', href: '/etiquetas', icon: Tag },
];

// Items shown in the mobile bottom nav (Inicio centered, Recurrentes left).
const MOBILE_NAV = [
  { name: 'Recurrentes', href: '/pagos-recurrentes', icon: Repeat },
  { name: 'Transacciones', href: '/movimientos', icon: ReceiptText },
  { name: 'Inicio', href: '/dashboard', icon: Home },
  { name: 'Metas', href: '/metas', icon: Target },
  { name: 'Ahorros', href: '/ahorros', icon: PiggyBank },
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

  const navLinkClass = (active) =>
    cn(
      'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
      active
        ? 'bg-secondary text-secondary-foreground'
        : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
    );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r bg-card md:flex">
        <div className="flex items-center gap-2.5 px-6 py-5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Wallet className="size-5" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">Finanzas</h1>
        </div>
        <nav className="flex-1 space-y-1 px-3">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className={navLinkClass(isActive(item.href))}>
                <Icon className="size-4" />
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="border-t p-3">
          <div className="flex items-center gap-3 rounded-md px-2 py-2">
            <div className="flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <span className="text-sm font-medium">{displayName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              <p className="truncate text-xs text-muted-foreground">Cuenta</p>
            </div>
            <button
              onClick={handleSignOut}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              title="Cerrar sesión"
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/95 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Menú"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Wallet className="size-4" />
            </div>
            <span className="text-sm font-semibold">Finanzas</span>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
        </header>

        {/* Mobile slide-out menu */}
        <div
          className={cn(
            'fixed left-0 top-0 z-30 h-full w-72 transform border-r bg-card transition-transform duration-300 ease-out md:hidden',
            isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-4">
            <div className="flex items-center gap-2">
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Wallet className="size-4" />
              </div>
              <span className="font-semibold">Finanzas</span>
            </div>
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
          <nav className="space-y-1 p-3">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={navLinkClass(isActive(item.href))}
                >
                  <Icon className="size-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>
          <div className="absolute inset-x-0 bottom-0 border-t p-4">
            <p className="truncate text-sm font-medium">{displayName}</p>
            <button
              onClick={handleSignOut}
              className="mt-2 flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-destructive"
            >
              <LogOut className="size-4" />
              Cerrar sesión
            </button>
          </div>
        </div>

        <main className="flex-1 p-4 pb-24 md:p-8 md:pb-8">{children}</main>

        {/* Mobile bottom nav */}
        <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t bg-background/95 px-2 py-2 backdrop-blur md:hidden">
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 py-1 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-5" />
                <span className="text-[10px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* FAB — new transaction (mobile) */}
        <Link
          href="/movimientos/nuevo"
          className="fixed bottom-20 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 active:scale-95 md:hidden"
          aria-label="Nuevo movimiento"
        >
          <Plus className="size-6" />
        </Link>
      </div>
    </div>
  );
}
