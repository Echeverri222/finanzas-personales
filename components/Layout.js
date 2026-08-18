import React, { useEffect, useState } from 'react';
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
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../contexts/UserContext';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';

// Grouped, because eight flat items gave no hint that "Metas"/"Ahorros" are
// where you plan and "Categorías"/"Etiquetas" are where you configure. Both
// reference designs render one flat list; this is the one place the synthesis
// deliberately departs from both of them.
const NAV_GROUPS = [
  {
    label: null,
    items: [
      { name: 'Inicio', href: '/dashboard', icon: Home },
      { name: 'Movimientos', href: '/movimientos', icon: ReceiptText },
      { name: 'Recurrentes', href: '/pagos-recurrentes', icon: Repeat },
    ],
  },
  {
    label: 'Planeación',
    items: [
      { name: 'Metas', href: '/metas', icon: Target },
      { name: 'Ahorros', href: '/ahorros', icon: PiggyBank },
      { name: 'Análisis', href: '/stock-analysis', icon: LineChart },
    ],
  },
  {
    label: 'Configuración',
    items: [
      { name: 'Categorías', href: '/gestion-tipos', icon: Shapes },
      { name: 'Etiquetas', href: '/etiquetas', icon: Tag },
    ],
  },
];

// Items shown in the mobile bottom nav (Inicio centered, Recurrentes left).
const MOBILE_NAV = [
  { name: 'Recurrentes', href: '/pagos-recurrentes', icon: Repeat },
  { name: 'Movimientos', href: '/movimientos', icon: ReceiptText },
  { name: 'Inicio', href: '/dashboard', icon: Home },
  { name: 'Metas', href: '/metas', icon: Target },
  { name: 'Ahorros', href: '/ahorros', icon: PiggyBank },
];

// Remembers the collapsed sidebar across navigations and reloads. Read in an
// effect rather than during render: reading localStorage while rendering would
// make the server and client markup disagree.
const SIDEBAR_STORAGE_KEY = 'finanzas:sidebar-collapsed';

function Logo({ size = 'base', showWordmark = true }) {
  const box = size === 'sm' ? 'size-8' : 'size-9';
  const glyph = size === 'sm' ? 'size-4' : 'size-[18px]';
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={cn(
          'flex shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-card',
          box
        )}
      >
        <Wallet className={glyph} strokeWidth={2.2} />
      </div>
      {showWordmark ? <span className="text-base font-bold tracking-tight">Finanzas</span> : null}
    </div>
  );
}

export default function Layout({ children }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const { userProfile } = useUser();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      setIsCollapsed(window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1');
    } catch {
      // Private mode / storage disabled — the sidebar just starts expanded.
    }
  }, []);

  const toggleCollapsed = () => {
    // `next` is computed outside the updater on purpose: writing to
    // localStorage inside it would run twice under StrictMode's double-invoke.
    const next = !isCollapsed;
    setIsCollapsed(next);
    try {
      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, next ? '1' : '0');
    } catch {
      // Ignore — the toggle still works for this session.
    }
  };

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

  // The 4px left accent bar on the active item is the shared signature of both
  // designs. It is a `before:` pseudo-element rather than a border so the item's
  // text never shifts by 4px when it becomes active.
  const navLinkClass = (active, collapsed) =>
    cn(
      'relative flex items-center gap-3 rounded-lg py-2.5 text-sm transition-colors',
      collapsed ? 'justify-center px-0' : 'px-3',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
      'before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:transition-colors',
      active
        ? 'bg-primary/10 font-semibold text-primary before:bg-primary'
        : 'font-medium text-muted-foreground before:bg-transparent hover:bg-secondary hover:text-foreground'
    );

  const renderNav = (onNavigate, collapsed = false) =>
    NAV_GROUPS.map((group, i) => (
      <div key={group.label || 'main'} className={i > 0 ? 'mt-6' : undefined}>
        {/* Collapsed, a group's name has nowhere to go without reintroducing
            the width it was collapsed to avoid — so the grouping survives as a
            rule instead of a caption. */}
        {group.label && collapsed ? <div className="mx-2 mb-2 border-t" /> : null}
        {group.label && !collapsed ? (
          <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/70">
            {group.label}
          </p>
        ) : null}
        <div className="space-y-0.5">
          {group.items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                // `title` is the hover tooltip; the label stays in the DOM as
                // sr-only text so the link keeps its accessible name either way.
                title={collapsed ? item.name : undefined}
                className={navLinkClass(active, collapsed)}
              >
                <Icon className="size-[18px] shrink-0" strokeWidth={active ? 2.4 : 2} />
                <span className={collapsed ? 'sr-only' : undefined}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    ));

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Skip link — first thing in the tab order, and the only way for a
          keyboard user to get past ~14 nav links on every page. */}
      <a
        href="#contenido"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
      >
        Saltar al contenido
      </a>

      {/* Desktop sidebar. Collapses to an icon rail; the width is animated but
          nothing inside it is, so labels appear and vanish cleanly instead of
          squeezing. */}
      <aside
        id="barra-lateral"
        className={cn(
          // `sticky top-0 h-screen self-start` is what keeps the footer -- name,
          // theme, sign out -- at the bottom of the SCREEN rather than the
          // bottom of the page. Without it the aside stretched to the height of
          // the content (flex `align-items: stretch`), so on a long dashboard
          // you had to scroll past every chart to reach the sign-out button and
          // the nav links had scrolled away above.
          //
          // `self-start` is load-bearing, not tidying: a stretched flex item is
          // already as tall as its container, leaving sticky nothing to travel
          // within, so `top-0` alone would do nothing.
          'hidden self-start border-r bg-card transition-[width] duration-200 ease-out md:flex',
          'sticky top-0 h-screen flex-shrink-0 flex-col overflow-hidden',
          isCollapsed ? 'w-[76px]' : 'w-[280px]'
        )}
      >
        <div
          className={cn(
            'flex items-center gap-2 py-5',
            isCollapsed ? 'flex-col px-3' : 'justify-between px-5'
          )}
        >
          <Logo showWordmark={!isCollapsed} />
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!isCollapsed}
            aria-controls="barra-lateral"
            aria-label={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            title={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {isCollapsed ? (
              <PanelLeftOpen className="size-[18px]" />
            ) : (
              <PanelLeftClose className="size-[18px]" />
            )}
          </button>
        </div>
        <nav aria-label="Navegación principal" className="flex-1 overflow-y-auto px-3 pb-4">
          {renderNav(undefined, isCollapsed)}
        </nav>
        <div className="border-t p-3">
          <div
            className={cn(
              'rounded-lg',
              isCollapsed
                ? 'flex flex-col items-center gap-2'
                : 'flex items-center gap-2.5 px-2 py-2'
            )}
          >
            <div
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary"
              title={isCollapsed ? displayName : undefined}
            >
              {displayName.charAt(0).toUpperCase()}
            </div>
            {isCollapsed ? null : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">Cuenta</p>
              </div>
            )}
            <ThemeToggle className="size-8" />
            <button
              onClick={handleSignOut}
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-secondary hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Cerrar sesión"
              title={isCollapsed ? 'Cerrar sesión' : undefined}
            >
              <LogOut className="size-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-20 bg-foreground/40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header */}
        <header className="sticky top-0 z-40 flex items-center justify-between border-b bg-background/90 px-4 py-3 backdrop-blur md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="-ml-2 rounded-md p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Abrir menú"
            aria-expanded={isMobileMenuOpen}
          >
            <Menu className="size-5" />
          </button>
          <Logo size="sm" />
          <div className="flex items-center gap-1">
            <ThemeToggle className="size-8" />
            <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Mobile slide-out menu.
            `invisible` when closed is not decoration: with only
            `-translate-x-full`, every link in here stayed focusable, so a
            keyboard user tabbing through any page fell into an off-screen menu
            with no way to see where focus had gone. visibility:hidden is what
            takes them out of the tab order. */}
        <div
          id="menu-movil"
          aria-hidden={!isMobileMenuOpen}
          className={cn(
            'fixed left-0 top-0 z-30 flex h-full w-[280px] transform flex-col border-r bg-card transition-transform duration-300 ease-out md:hidden',
            isMobileMenuOpen ? 'translate-x-0' : 'invisible -translate-x-full'
          )}
        >
          <div className="flex items-center justify-between border-b px-4 py-4">
            <Logo size="sm" />
            <button
              onClick={() => setIsMobileMenuOpen(false)}
              className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Cerrar menú"
            >
              <X className="size-4" />
            </button>
          </div>
          <nav aria-label="Navegación principal (móvil)" className="flex-1 overflow-y-auto p-3">
            {renderNav(() => setIsMobileMenuOpen(false))}
          </nav>
          <div className="border-t p-4">
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

        <main id="contenido" className="flex-1 p-4 pb-24 md:p-8 md:pb-8">
          <div className="mx-auto w-full max-w-[1440px]">{children}</div>
        </main>

        {/* Mobile bottom nav */}
        <nav
          aria-label="Navegación rápida"
          className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between border-t bg-background/95 px-2 pb-1 pt-2 backdrop-blur md:hidden"
        >
          {MOBILE_NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex min-w-0 flex-1 flex-col items-center gap-1 rounded-md py-1 transition-colors',
                  active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="size-5" strokeWidth={active ? 2.4 : 2} />
                {/* 11px, up from 10px — the old size was below the floor where
                    a label is reliably readable on a phone. */}
                <span className="truncate text-[11px] font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* FAB — new transaction (mobile) */}
        <Link
          href="/movimientos/nuevo"
          className="fixed bottom-20 right-5 z-40 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-primary-lg transition-transform hover:scale-105 active:scale-95 md:hidden"
          aria-label="Nuevo movimiento"
        >
          <Plus className="size-6" strokeWidth={2.4} />
        </Link>
      </div>
    </div>
  );
}
