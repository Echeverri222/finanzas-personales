import { useState } from 'react';
import Link from 'next/link';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Plus, Target, PiggyBank } from 'lucide-react';
import { useMovimientos } from '../hooks/useMovimientos';
import { useTiposMovimiento } from '../hooks/useTiposMovimiento';
import { formatCurrency } from '@/lib/format';
import { TIPO } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/PageHeader';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import { HeroCard } from '@/components/layout/HeroCard';
import { Amount } from '@/components/money/Amount';
import { ErrorAlert } from '@/components/feedback/ErrorAlert';

const createSafeDate = (dateString) => {
  if (!dateString) return new Date();
  if (typeof dateString === 'string' && dateString.includes('-')) {
    const [year, month, day] = dateString.split('T')[0].split('-');
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }
  if (dateString instanceof Date) return dateString;
  return new Date(dateString);
};

export default function AhorrosPage() {
  // The month/year selects that used to live in the header are gone: nothing
  // ever read their state, so they were two controls that looked like filters
  // and silently did nothing. The period toggle below is the real filter.
  const [timePeriod, setTimePeriod] = useState('1year');

  const { movimientos, loading, error } = useMovimientos();
  const { tiposMovimiento } = useTiposMovimiento();

  const getTipoNombre = (id) => {
    const tipo = tiposMovimiento.find((t) => t.id === id);
    return tipo ? tipo.nombre : 'Sin categoría';
  };

  const getTipoCategoria = (id) => {
    const tipo = tiposMovimiento.find((t) => t.id === id);
    return tipo ? tipo.tipo : null;
  };

  // Keyed on the semantic type, not the category name -- renaming "Ahorro"
  // no longer empties this page.
  const ahorrosMovimientos = movimientos.filter(
    (mov) => getTipoCategoria(mov.id_tipo_movimiento) === TIPO.AHORRO
  );

  const getChartData = () => {
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    let startMonthsAgo = 11;
    switch (timePeriod) {
      case '3months':
        startMonthsAgo = 2;
        break;
      case 'ytd':
        startMonthsAgo = new Date().getMonth();
        break;
      case '1year':
      default:
        startMonthsAgo = 11;
        break;
    }

    const chartData = [];
    const periodStartDate = new Date();
    if (timePeriod === 'ytd') {
      periodStartDate.setFullYear(new Date().getFullYear(), 0, 1);
    } else {
      periodStartDate.setMonth(periodStartDate.getMonth() - startMonthsAgo);
    }

    const previousSavings = ahorrosMovimientos.filter((mov) => createSafeDate(mov.fecha) < periodStartDate);
    let cumulativeTotal = previousSavings.reduce((sum, mov) => sum + Math.abs(mov.importe), 0);

    for (let i = startMonthsAgo; i >= 0; i--) {
      const date = new Date();
      if (timePeriod === 'ytd') {
        date.setFullYear(new Date().getFullYear(), startMonthsAgo - i, 1);
      } else {
        date.setMonth(date.getMonth() - i);
      }
      const month = date.getMonth();
      const year = date.getFullYear();
      const monthAhorros = ahorrosMovimientos.filter((mov) => {
        const movDate = createSafeDate(mov.fecha);
        return movDate.getFullYear() === year && movDate.getMonth() === month;
      });
      const monthTotal = monthAhorros.reduce((sum, mov) => sum + Math.abs(mov.importe), 0);
      cumulativeTotal += monthTotal;
      chartData.push({
        mes: `${monthNames[month]} ${year.toString().slice(-2)}`,
        ahorro: monthTotal,
        acumulado: cumulativeTotal,
      });
    }
    return chartData;
  };

  const chartData = getChartData();
  const totalSavings = ahorrosMovimientos.reduce((sum, mov) => sum + Math.abs(mov.importe), 0);

  // The local `months`/`years` arrays that fed those selects are gone with them.
  // (lib/dateUtils already exports MONTHS_FULL if a real month filter lands here.)

  const PERIODS = [
    { key: '3months', label: '3M' },
    { key: 'ytd', label: 'YTD' },
    { key: '1year', label: '1Y' },
  ];

  if (loading) {
    return (
      <div className="space-y-5">
        <PageHeader title="Ahorros" description="Sigue el crecimiento de tus ahorros." />
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-72 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Ahorros" description="Sigue el crecimiento de tus ahorros." />

      {/* A failed fetch used to fall straight through to the hero, which
          rendered $0 -- indistinguishable from "you have no savings". The app
          confidently misreported money. */}
      <ErrorAlert error={error} title="No se pudieron cargar tus ahorros" />

      {/* Hero */}
      <HeroCard
        label="Saldo total ahorrado"
        value={<Amount value={totalSavings} size="hero" className="text-primary-foreground" />}
      >
          <Link
            href="/movimientos/nuevo?tipo=ahorros"
            className={cn(buttonVariants({ variant: 'secondary' }))}
          >
            <Plus className="size-4" />
            Ahorrar más
          </Link>
          <Link
            href="/metas"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'
            )}
          >
            <Target className="size-4" />
            Metas
          </Link>
      </HeroCard>

      {/* Growth chart */}
      <Card className="p-4 md:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold tracking-tight">Crecimiento</h3>
            <p className="text-xs text-muted-foreground">Evolución acumulada</p>
          </div>
          <div className="flex items-center gap-1 rounded-lg bg-secondary p-1">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setTimePeriod(p.key)}
                className={cn(
                  'rounded-md px-3 py-1 text-sm font-medium transition-colors',
                  timePeriod === p.key
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 h-80">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e1e0d9" vertical={false} />
                <XAxis dataKey="mes" stroke="#898781" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis
                  stroke="#898781"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                  formatter={(value, name) => [
                    formatCurrency(value),
                    name === 'acumulado' ? 'Acumulado' : 'Ahorro del mes',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="acumulado"
                  stroke="#2a78d6"
                  strokeWidth={2}
                  dot={{ fill: '#2a78d6', strokeWidth: 0, r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <PiggyBank className="mx-auto mb-2 size-8" />
                <p>No hay datos de ahorros para este período</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
