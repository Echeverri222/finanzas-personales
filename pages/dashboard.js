import { useDashboardData } from '../hooks/useDashboardData';
import DashboardView from '../views/dashboard/DashboardView';
import { DashboardSkeleton } from '@/components/feedback/skeletons';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

export default function DashboardPage() {
  const data = useDashboardData();
  const { loading, error } = data;

  if (loading) return <DashboardSkeleton />;

  return (
    <div className="space-y-4">
      <ErrorAlert error={error} title="No se pudo cargar el dashboard" />
      <DashboardView data={data} />
    </div>
  );
}
