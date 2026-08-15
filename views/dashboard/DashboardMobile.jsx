import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { TrendingUp, ArrowDownLeft, ArrowUpRight, ReceiptText, Wallet, PiggyBank, ShoppingBag } from 'lucide-react';
import { createSafeDate } from '../../lib/dateUtils';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { TIPO } from '@/lib/constants';

const DashboardCharts = dynamic(
  () => import('../../components/dashboard/DashboardCharts'),
  { ssr: false }
);

const ICON_BY_TYPE = {
  Ingresos: Wallet,
  Ahorro: PiggyBank,
  default: ShoppingBag,
};

export default function DashboardMobile({ data }) {
  const router = useRouter();
  const {
    filters,
    setFilters,
    years,
    months,
    categories,
    tags,
    balance,
    totalIngresos,
    totalGastos,
    recentMovimientos,
    monthlyData,
    categoryData,
    formatCurrency,
    getSelectedMonthName,
    getSelectedYearLabel,
    tiposMovimiento,
  } = data;

  const { yearFilter, monthFilter, categoryFilter, tagFilter } = filters;
  const { setYearFilter, setMonthFilter, setCategoryFilter, setTagFilter } = setFilters;

  const handleCategoryClick = (categoryName) => {
    const tipo = tiposMovimiento?.find((t) => t.nombre === categoryName);
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
    <div className="mx-auto max-w-md space-y-6">
      {/* Filters */}
      <section>
        <div className="flex flex-wrap gap-2">
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
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {getSelectedMonthName()} {getSelectedYearLabel()}
        </p>
      </section>

      {/* Total Balance */}
      <section>
        <div className="rounded-lg bg-primary p-6 text-primary-foreground shadow-sm">
          <p className="text-sm font-medium text-primary-foreground/70">Balance Total</p>
          <h2 className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
            {formatCurrency(balance)}
          </h2>
          <span className="mt-4 inline-flex items-center gap-1 rounded-full bg-primary-foreground/15 px-2 py-1 text-xs font-medium">
            <TrendingUp className="size-3.5" />
            {getSelectedMonthName()}
          </span>
        </div>
      </section>

      {/* Income & Expenses */}
      <section className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
              <ArrowDownLeft className="size-4" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Ingresos</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
              +{formatCurrency(totalIngresos)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex size-8 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400">
              <ArrowUpRight className="size-4" />
            </div>
            <p className="text-xs font-medium text-muted-foreground">Gastos</p>
            <p className="mt-1 text-lg font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              -{formatCurrency(totalGastos)}
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Charts */}
      <section>
        <DashboardCharts
          monthlyData={monthlyData}
          categoryData={categoryData}
          formatCurrency={formatCurrency}
          onCategoryClick={handleCategoryClick}
        />
      </section>

      {/* Recent Activity */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold tracking-tight">Actividad Reciente</h3>
          <Link href="/movimientos" className="text-sm font-medium text-primary hover:underline">
            Ver todo
          </Link>
        </div>
        <div className="space-y-3">
          {recentMovimientos.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <ReceiptText className="mx-auto mb-2 size-8" />
              <p>No hay movimientos recientes</p>
            </div>
          ) : (
            recentMovimientos.map((mov) => {
              const isIngreso = mov.tipo_categoria === TIPO.INGRESO;
              const Icon = ICON_BY_TYPE[mov.tipo_nombre] || ICON_BY_TYPE.default;
              return (
                <div
                  key={mov.id}
                  className="flex items-center justify-between rounded-lg border bg-card p-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex size-10 items-center justify-center rounded-full ${
                        isIngreso
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                      }`}
                    >
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="max-w-[180px] truncate text-sm font-medium">{mov.nombre}</p>
                      <p className="text-xs text-muted-foreground">
                        {createSafeDate(mov.fecha).toLocaleDateString('es-ES')} • {mov.tipo_nombre}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`flex-shrink-0 text-sm font-semibold tabular-nums ${
                      isIngreso ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {isIngreso ? '+' : '-'}
                    {formatCurrency(Math.abs(mov.importe))}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
