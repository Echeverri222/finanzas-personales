import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createSafeDate } from '../../lib/dateUtils';

const DashboardCharts = dynamic(
  () => import('../../components/dashboard/DashboardCharts'),
  { ssr: false }
);

const ICON_BY_TYPE = {
  Ingresos: 'payments',
  Ahorro: 'savings',
  default: 'shopping_bag',
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
    weeklyChartData,
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
    <div className="px-2 md:px-0 space-y-6 max-w-md mx-auto">
      {/* Filters row - year, month, category, tag */}
      <section>
        <div className="flex flex-wrap gap-2">
          <select
            value={yearFilter}
            onChange={(e) => {
              const v = e.target.value;
              setYearFilter(v === 'all' ? 'all' : parseInt(v, 10));
            }}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="all">Todos los años</option>
            {years.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <select
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="all">Todas las categorías</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
            <option value="all">Todos los tags</option>
            {(tags || []).map((t) => (
              <option key={t.id} value={t.id}>{t.nombre}</option>
            ))}
          </select>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {getSelectedMonthName()} {getSelectedYearLabel()}
        </p>
      </section>

      {/* Total Balance Card - Stitch style */}
      <section>
        <div className="bg-primary rounded-xl p-6 shadow-xl shadow-primary/20 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary-dark/20 rounded-full -ml-12 -mb-12 blur-xl" />
          <div className="relative z-10">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm font-medium text-white/80">Balance Total</p>
              <span className="material-symbols-outlined text-sm opacity-60">info</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight mb-6">{formatCurrency(balance)}</h2>
            <div className="flex items-center gap-2 text-xs font-medium bg-white/10 w-fit px-2 py-1 rounded-lg">
              <span className="material-symbols-outlined text-xs">trending_up</span>
              <span>Este mes</span>
            </div>
          </div>
        </div>
      </section>

      {/* Stats: Income & Expenses */}
      <section className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-xl">arrow_downward</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Ingresos</p>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">+{formatCurrency(totalIngresos)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800">
          <div className="size-8 rounded-lg bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center mb-3">
            <span className="material-symbols-outlined text-rose-600 dark:text-rose-400 text-xl">arrow_upward</span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Gastos</p>
          <p className="text-lg font-bold text-rose-600 dark:text-rose-400 mt-1">-{formatCurrency(totalGastos)}</p>
        </div>
      </section>

      {/* Spending Chart - weekly bars */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Actividad de Gastos</h3>
          <Link href="/movimientos" className="text-sm font-semibold text-primary">Ver detalle</Link>
        </div>
        <div className="bg-white dark:bg-slate-900 rounded-xl p-4 shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
          <div className="h-32 flex items-end gap-2 mb-2">
            {(weeklyChartData || []).map((day, i) => (
              <div
                key={i}
                className="flex-1 bg-primary/10 rounded-t-md transition-all"
                style={{ height: `${Math.max(day.pct, 8)}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 uppercase font-bold tracking-wider px-1">
            {(weeklyChartData || []).map((day, i) => (
              <span key={i}>{day.day.slice(0, 2)}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Full charts - evolucion mensual + distribucion */}
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
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">Actividad Reciente</h3>
          <Link href="/movimientos" className="text-sm font-semibold text-primary">Ver todo</Link>
        </div>
        <div className="space-y-3">
          {recentMovimientos.length === 0 ? (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              <span className="material-symbols-outlined text-4xl mb-2 block">receipt_long</span>
              <p>No hay movimientos recientes</p>
            </div>
          ) : (
            recentMovimientos.map((mov) => {
              const isIngreso = mov.tipo_nombre === 'Ingresos';
              const icon = ICON_BY_TYPE[mov.tipo_nombre] || ICON_BY_TYPE.default;
              return (
                <div
                  key={mov.id}
                  className="flex items-center justify-between p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`size-10 rounded-full flex items-center justify-center ${
                        isIngreso
                          ? 'bg-emerald-50 dark:bg-emerald-900/20'
                          : 'bg-rose-50 dark:bg-rose-900/20'
                      }`}
                    >
                      <span
                        className={`material-symbols-outlined ${
                          isIngreso ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                        }`}
                      >
                        {icon}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                        {mov.nombre}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {createSafeDate(mov.fecha).toLocaleDateString('es-ES')} • {mov.tipo_nombre}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`text-sm font-bold flex-shrink-0 ${
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
