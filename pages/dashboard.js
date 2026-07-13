import { useState } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import { useIsMobile } from '../hooks/useIsMobile';
import DashboardMobile from '../views/dashboard/DashboardMobile';
import DashboardDesktop from '../views/dashboard/DashboardDesktop';
import SystemStatus from '../components/SystemStatus';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const [showSystemStatus, setShowSystemStatus] = useState(false);
  const data = useDashboardData();
  const isMobile = useIsMobile();

  const { loading, error } = data;

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="text-muted-foreground">Cargando dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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
        <div className="rounded-lg border-l-4 border-destructive bg-destructive/10 p-4 text-destructive">
          <p className="font-semibold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {isMobile ? <DashboardMobile data={data} /> : <DashboardDesktop data={data} />}
    </div>
  );
}
