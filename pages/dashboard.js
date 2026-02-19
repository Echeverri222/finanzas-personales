import { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useIsMobile } from '../hooks/useIsMobile';
import DashboardMobile from '../views/dashboard/DashboardMobile';
import DashboardDesktop from '../views/dashboard/DashboardDesktop';
import SystemStatus from '../components/SystemStatus';
import Button from '../components/ui/Button';

export default function DashboardPage() {
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const data = useDashboardData();
  const isMobile = useIsMobile();

  const { loading, error } = data;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <div className="text-slate-500 dark:text-slate-400">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* System status toggle - desktop only to avoid clutter on mobile */}
      {!isMobile && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSystemStatus(!showSystemStatus)}
            className="text-xs"
          >
            {showSystemStatus ? 'Ocultar Estado' : 'Estado Sistema'}
          </Button>
        </div>
      )}
      {showSystemStatus && <SystemStatus />}

      {error && (
        <div className="bg-red-100 dark:bg-red-900/20 border-l-4 border-red-500 text-red-700 dark:text-red-300 p-4 rounded-lg">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {isMobile ? <DashboardMobile data={data} /> : <DashboardDesktop data={data} />}
    </div>
  );
}
