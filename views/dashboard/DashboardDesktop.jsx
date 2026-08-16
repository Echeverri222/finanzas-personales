import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { Plus, ArrowDownLeft, ArrowUpRight, TrendingUp } from 'lucide-react';
import { createSafeDate } from '../../lib/dateUtils';
import { PageHeader } from '@/components/PageHeader';
import { buttonVariants } from '@/components/ui/button';
import { NativeSelect as Select } from '@/components/ui/native-select';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { TIPO } from '@/lib/constants';
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

export default function DashboardDesktop({ data }) {
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
    ahorrosMes,
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

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" description={`${getSelectedMonthName()} ${getSelectedYearLabel()}`}>
        <Select
          value={yearFilter}
          onChange={(e) => {
            const v = e.target.value;
            setYearFilter(v === 'all' ? 'all' : parseInt(v, 10));
          }}
          className="w-auto"
        >
          <option value="all">Todos los años</option>
          {years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </Select>
        <Select value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} className="w-auto">
          {months.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </Select>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className="w-auto">
          <option value="all">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </Select>
        <Select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} className="w-auto">
          <option value="all">Todos los tags</option>
          {(tags || []).map((t) => (
            <option key={t.id} value={t.id}>{t.nombre}</option>
          ))}
        </Select>
        <Link href="/movimientos/nuevo" className={cn(buttonVariants())}>
          <Plus className="size-4" />
          Añadir movimiento
        </Link>
      </PageHeader>

      {/* Top row: Balance + Income + Expenses */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
        <div className="relative overflow-hidden rounded-lg bg-primary p-8 text-primary-foreground shadow-sm md:col-span-6">
          <div className="relative z-10">
            <p className="font-medium text-primary-foreground/70">Balance Total</p>
            <h3 className="mt-1 text-4xl font-semibold tracking-tight tabular-nums">
              {formatCurrency(balance)}
            </h3>
            <div className="mt-6">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-3 py-1 text-sm">
                <TrendingUp className="size-3.5" />
                {getSelectedMonthName()}
              </span>
            </div>
            <div className="mt-6 flex gap-3">
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
            </div>
          </div>
        </div>

        <Card className="flex flex-col justify-between md:col-span-3">
          <CardContent className="p-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
              <ArrowDownLeft className="size-5" />
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Ingresos</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
                {formatCurrency(totalIngresos)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col justify-between md:col-span-3">
          <CardContent className="p-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400">
              <ArrowUpRight className="size-5" />
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-muted-foreground">Gastos</p>
              <p className="mt-1 text-2xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                {formatCurrency(totalGastos)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts row - loaded client-only to avoid recharts SSR issues */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <DashboardCharts
          monthlyData={monthlyData}
          categoryData={categoryData}
          formatCurrency={formatCurrency}
          onCategoryClick={handleCategoryClick}
        />
      </div>

      {/* Recent transactions */}
      <Card>
        <div className="flex items-center justify-between border-b p-6">
          <h4 className="text-lg font-semibold tracking-tight">Movimientos recientes</h4>
          <Link href="/movimientos" className="text-sm font-medium text-primary hover:underline">
            Ver todos
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="pl-6">Descripción</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="pr-6 text-right">Monto</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {recentMovimientos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                  No hay movimientos recientes
                </TableCell>
              </TableRow>
            ) : (
              recentMovimientos.map((mov) => {
                const isIngreso = mov.tipo_categoria === TIPO.INGRESO;
                return (
                  <TableRow
                    key={mov.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/movimientos?edit=${mov.id}`)}
                  >
                    <TableCell className="pl-6 font-medium">{mov.nombre}</TableCell>
                    <TableCell className="text-muted-foreground">{mov.tipo_nombre}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {createSafeDate(mov.fecha).toLocaleDateString('es-ES')}
                    </TableCell>
                    <TableCell
                      className={`pr-6 text-right font-semibold tabular-nums ${
                        isIngreso ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {isIngreso ? '+' : '-'}
                      {formatCurrency(Math.abs(mov.importe))}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
