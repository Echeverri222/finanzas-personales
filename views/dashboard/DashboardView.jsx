import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Link from 'next/link';
import {
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  ReceiptText,
} from 'lucide-react';

import { PageHeader } from '@/components/PageHeader';
import { buttonVariants } from '@/components/ui/button';
import { NativeSelect as Select } from '@/components/ui/native-select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HeroCard, HeroBadge } from '@/components/layout/HeroCard';
import { StatCard } from '@/components/layout/StatCard';
import { Amount } from '@/components/money/Amount';
import { TypeIcon } from '@/components/money/TypeIcon';
import { EmptyState, TableEmptyState } from '@/components/feedback/EmptyState';
import { cn } from '@/lib/utils';
import { formatDate, formatSignedPercent } from '@/lib/format';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/table';

const DashboardCharts = dynamic(
  () => import('../../components/dashboard/DashboardCharts'),
  { ssr: false }
);

/**
 * "+12 % vs septiembre" under a stat card. Fills what was a tall empty card,
 * and answers the first question anyone asks of a monthly total: more or less
 * than last month? Green/red follows whether the change is good, not its sign.
 */
function Comparacion({ actual, anterior, etiqueta, subirEsBueno = false }) {
  if (anterior === undefined || anterior === null || !etiqueta) return null;
  if (!anterior) return <span>Sin datos de {etiqueta} para comparar</span>;
  const cambio = ((actual - anterior) / anterior) * 100;
  const bueno = subirEsBueno ? cambio >= 0 : cambio <= 0;
  return (
    <span>
      <span className={cn('font-medium', bueno ? 'text-income' : 'text-expense')}>
        {formatSignedPercent(cambio, 0)}
      </span>{' '}
      vs {etiqueta}
    </span>
  );
}

/**
 * One dashboard for every breakpoint.
 *
 * Replaces DashboardDesktop.jsx + DashboardMobile.jsx (430 lines of parallel
 * trees selected at runtime by useIsMobile). That split cost an SSR/hydration
 * flash on mobile and had already let the two copies disagree about how an
 * expense is coloured. Everything here is CSS-responsive except the recent
 * movements block, where a table and a list are genuinely different information
 * architecture rather than one layout at two widths -- so both render and CSS
 * picks.
 */
export default function DashboardView({ data }) {
  const router = useRouter();
  const {
    filters,
    setFilters,
    years,
    months,
    categories,
    tags,
    totalIngresos,
    totalGastos,
    balance,
    mesAnterior,
    recentMovimientos,
    monthlyData,
    categoryData,
    formatCurrency,
    getSelectedMonthName,
    getSelectedYearLabel,
  } = data;

  const { yearFilter, monthFilter, categoryFilter, tagFilter } = filters;
  const { setYearFilter, setMonthFilter, setCategoryFilter, setTagFilter } = setFilters;

  const handleCategoryClick = (categoryName) => {
    const tipo = data.tiposMovimiento?.find((t) => t.nombre === categoryName);
    if (!tipo) return;
    const year = yearFilter === 'all' ? new Date().getFullYear() : yearFilter;
    const monthValue =
      monthFilter === 'all' ? '' : `${year}-${String(parseInt(monthFilter, 10) + 1).padStart(2, '0')}`;
    const params = new URLSearchParams();
    if (monthValue) params.set('month', monthValue);
    params.set('category', tipo.id.toString());
    router.push(`/movimientos?${params.toString()}`);
  };

  const periodo = `${getSelectedMonthName()} ${getSelectedYearLabel()}`;
  const esUnMes = filters.monthFilter !== 'all';

  return (
    <div className="space-y-5">
      <PageHeader title="Dashboard" description={periodo}>
        <Link href="/movimientos/nuevo" className={cn(buttonVariants(), 'hidden sm:inline-flex')}>
          <Plus className="size-4" />
          Añadir movimiento
        </Link>
      </PageHeader>

      {/* Filters. A 2-up grid on phones and a single row from `sm` — the four
          selects used to sit in the header's action slot, which on mobile
          stacked them into a column taller than the screen. */}
      <Card className="grid grid-cols-2 gap-3 p-3 sm:flex sm:flex-wrap sm:items-center">
        <Select
          value={yearFilter}
          onChange={(e) => {
            const v = e.target.value;
            setYearFilter(v === 'all' ? 'all' : parseInt(v, 10));
          }}
          aria-label="Año"
          className="sm:w-auto"
        >
          <option value="all">Todos los años</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          aria-label="Mes"
          className="sm:w-auto"
        >
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>
        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Categoría"
          className="sm:w-auto"
        >
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select
          value={tagFilter}
          onChange={(e) => setTagFilter(e.target.value)}
          aria-label="Etiqueta"
          className="sm:w-auto"
        >
          <option value="all">Todos los tags</option>
          {(tags || []).map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </Select>
      </Card>

      {/* Hero + stats */}
      <div className="grid gap-4 lg:grid-cols-12">
        <HeroCard
          className="lg:col-span-5"
          // It is income minus expenses for the selected period, not a
          // balance of everything you have -- that lives in Patrimonio.
          label={esUnMes ? 'Balance del mes' : 'Balance del período'}
          value={<Amount value={balance} size="hero" className="text-primary-foreground" />}
          badge={
            <HeroBadge>
              <TrendingUp className="size-3.5" />
              {periodo}
            </HeroBadge>
          }
        >
          <Link href="/movimientos" className={cn(buttonVariants({ variant: 'secondary' }))}>
            Ver movimientos
          </Link>
          <Link
            href="/metas"
            className={cn(
              buttonVariants({ variant: 'outline' }),
              'border-primary-foreground/25 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground'
            )}
          >
            Metas
          </Link>
        </HeroCard>

        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-7">
          <StatCard
            label="Ingresos"
            icon={ArrowDownLeft}
            tone="income"
            value={<Amount value={totalIngresos} size="xl" tipo="ingreso" toned />}
            hint={<Comparacion actual={totalIngresos} anterior={mesAnterior?.ingresos} etiqueta={mesAnterior?.etiqueta} subirEsBueno />}
          />
          <StatCard
            label="Gastos"
            icon={ArrowUpRight}
            tone="expense"
            value={<Amount value={totalGastos} size="xl" tipo="gasto" toned />}
            hint={<Comparacion actual={totalGastos} anterior={mesAnterior?.gastos} etiqueta={mesAnterior?.etiqueta} />}
          />
        </div>
      </div>

      {/* Charts — client-only, recharts does not survive SSR here */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <DashboardCharts
          monthlyData={monthlyData}
          categoryData={categoryData}
          formatCurrency={formatCurrency}
          onCategoryClick={handleCategoryClick}
        />
      </div>

      {/* Recent movements */}
      <Card className="overflow-hidden shadow-card">
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
          <h2 className="font-semibold tracking-tight">Movimientos recientes</h2>
          <Link
            href="/movimientos"
            className="shrink-0 text-sm font-medium text-primary hover:underline"
          >
            Ver todos
          </Link>
        </div>

        {/* Desktop: table */}
        <div className="hidden border-t md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Descripción</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead className="pr-5 text-right">Monto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentMovimientos.length === 0 ? (
                <TableEmptyState
                  colSpan={4}
                  icon={ReceiptText}
                  title="Sin movimientos en este período"
                  description="Cambia los filtros o registra tu primer movimiento."
                />
              ) : (
                recentMovimientos.map((mov) => (
                  <TableRow
                    key={mov.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/movimientos?edit=${mov.id}`)}
                  >
                    <TableCell className="pl-5">
                      <div className="flex items-center gap-3">
                        <TypeIcon
                          tipo={mov.tipo_categoria}
                          nombre={mov.tipo_nombre}
                          size="sm"
                        />
                        <span className="font-medium">{mov.nombre}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant="secondary" className="font-normal">
                          {mov.tipo_nombre}
                        </Badge>
                        {mov.sale_de_ahorros && (
                          <Badge variant="outline" className="font-normal">
                            Uso de ahorro
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(mov.fecha)}
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Amount value={mov.importe} tipo={mov.tipo_categoria} signed toned size="sm" />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Mobile: list */}
        <div className="border-t md:hidden">
          {recentMovimientos.length === 0 ? (
            <EmptyState
              icon={ReceiptText}
              title="Sin movimientos en este período"
              description="Cambia los filtros o registra tu primer movimiento."
            />
          ) : (
            <ul>
              {recentMovimientos.map((mov) => (
                <li key={mov.id} className="border-b last:border-0">
                  <Link
                    href={`/movimientos?edit=${mov.id}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors active:bg-secondary/60"
                  >
                    <TypeIcon tipo={mov.tipo_categoria} nombre={mov.tipo_nombre} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{mov.nombre}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {mov.tipo_nombre}
                        {mov.sale_de_ahorros ? ' · Uso de ahorro' : ''}
                        {' · '}
                        {formatDate(mov.fecha)}
                      </span>
                    </span>
                    <Amount value={mov.importe} tipo={mov.tipo_categoria} signed toned size="sm" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </div>
  );
}
