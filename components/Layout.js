import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useAuth } from '../contexts/AuthContext';

const navigationItems = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Movimientos', href: '/movimientos', icon: '💰' },
  { name: 'Metas', href: '/metas', icon: '🎯' },
  { name: 'Ahorros', href: '/ahorros', icon: '🏦' },
  { name: 'Análisis', href: '/stock-analysis', icon: '📈' },
  { name: 'Categorías', href: '/gestion-tipos', icon: '⚙️' },
];

export default function Layout({ children }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/'); // Redirect to home page after sign out
    } catch (error) {
      router.push('/'); // Redirect anyway
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${isCollapsed ? 'w-16' : 'w-64'} 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        fixed lg:static inset-y-0 left-0 z-30
        bg-white border-r border-gray-200 flex flex-col
        transition-all duration-300 ease-in-out
      `}>
        {/* Logo and Toggle */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          {!isCollapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">💰 Finanzas</h1>
              <p className="text-sm text-gray-500 mt-1">Gestión Personal</p>
            </div>
          )}
          
          {/* Toggle button - hidden on mobile, always shown on desktop */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 transition-colors"
            title={isCollapsed ? 'Expandir sidebar' : 'Contraer sidebar'}
          >
            <span className="text-lg">
              {isCollapsed ? '▶️' : '◀️'}
            </span>
          </button>
          
          {/* Mobile close button */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-lg">✕</span>
          </button>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const isActive = router.pathname === item.href || 
              (item.href === '/movimientos' && router.pathname.startsWith('/movimientos'));
            
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
                title={isCollapsed ? item.name : ''}
              >
                <span className={`text-lg ${isCollapsed ? 'mx-auto' : 'mr-3'}`}>
                  {item.icon}
                </span>
                {!isCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
                
                {/* Tooltip for collapsed state */}
                {isCollapsed && (
                  <div className="absolute left-16 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                    {item.name}
                  </div>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User section */}
        <div className="p-3 border-t border-gray-200">
          <button
            onClick={handleSignOut}
            className={`w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors group ${
              isCollapsed ? 'justify-center' : ''
            }`}
            title={isCollapsed ? 'Cerrar Sesión' : ''}
          >
            <span className={`text-lg ${isCollapsed ? 'mx-auto' : 'mr-3'}`}>🚪</span>
            {!isCollapsed && 'Cerrar Sesión'}
            
            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="absolute left-16 bg-gray-900 text-white text-xs rounded px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                Cerrar Sesión
              </div>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-lg">☰</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">💰 Finanzas</h1>
          <div className="w-10"></div> {/* Spacer for center alignment */}
        </div>

        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
} 