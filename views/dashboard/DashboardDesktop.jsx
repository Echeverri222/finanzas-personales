import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { createSafeDate } from '../../lib/dateUtils';

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
    totalIngresos,
    totalGastos,
    balance,
    ahorrosMes,
    recentMovimientos,
    monthlyData,
    categoryData,
    formatCurrency,
    getSelectedMonthName,
  } = data;

  const { yearFilter, monthFilter, categoryFilter } = filters;
  const { setYearFilter, setMonthFilter, setCategoryFilter } = setFilters;

  const handleCategoryClick = (categoryName) => {
    const tipo = data.tiposMovimiento?.find((t) => t.nombre === categoryName);
    if (!tipo) return;
    const monthValue =
      monthFilter === 'all' ? '' : `${yearFilter}-${String(parseInt(monthFilter, 10) + 1).padStart(2, '0')}`;
    const params = new URLSearchParams();
    if (monthValue) params.set('month', monthValue);
    params.set('category', tipo.id.toString());
    router.push(`/movimientos?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {getSelectedMonthName()} {yearFilter}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(parseInt(e.target.value, 10))}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          >
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
          <Link
            href="/movimientos/nuevo"
            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-all font-medium text-sm"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Añadir movimiento
          </Link>
        </div>
      </div>

      {/* Top row: Balance + Income + Expenses */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-6 bg-primary rounded-xl p-8 text-white relative overflow-hidden shadow-xl shadow-primary/20">
          <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
          <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
          <div className="relative z-10">
            <p className="text-white/70 font-medium">Balance Total</p>
            <h3 className="text-4xl font-bold mt-1 tracking-tight">{formatCurrency(balance)}</h3>
            <div className="mt-6 flex items-center gap-4">
              <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 text-sm">
                <span className="material-symbols-outlined text-xs">trending_up</span>
                Este mes
              </div>
            </div>
            <div className="mt-6 flex gap-4">
              <Link
                href="/movimientos"
                className="bg-white text-primary px-4 py-2 rounded-lg text-sm font-bold hover:bg-white/90"
              >
                Ver movimientos
              </Link>
              <Link
                href="/metas"
                className="border border-white/20 hover:bg-white/10 px-4 py-2 rounded-lg text-sm font-bold transition-all"
              >
                Metas
              </Link>
            </div>
          </div>
        </div>
        <div className="md:col-span-3 bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 w-fit">
            <span className="material-symbols-outlined">call_received</span>
          </div>
          <div className="mt-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Ingresos</p>
            <p className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalIngresos)}
            </p>
          </div>
        </div>
        <div className="md:col-span-3 bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 w-fit">
            <span className="material-symbols-outlined">call_made</span>
          </div>
          <div className="mt-4">
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Gastos</p>
            <p className="text-2xl font-bold mt-1 text-rose-600 dark:text-rose-400">
              {formatCurrency(totalGastos)}
            </p>
          </div>
        </div>
      </div>

      {/* Charts row - loaded client-only to avoid recharts SSR issues */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <DashboardCharts
          monthlyData={monthlyData}
          categoryData={categoryData}
          formatCurrency={formatCurrency}
          onCategoryClick={handleCategoryClick}
        />
      </div>

      {/* Recent transactions table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <h4 className="font-bold text-lg">Movimientos recientes</h4>
          <Link href="/movimientos" className="text-primary font-semibold text-sm hover:underline">
            Ver todos
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-semibold">Descripción</th>
                <th className="px-6 py-4 font-semibold">Categoría</th>
                <th className="px-6 py-4 font-semibold">Fecha</th>
                <th className="px-6 py-4 font-semibold text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentMovimientos.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                    No hay movimientos recientes
                  </td>
                </tr>
              ) : (
                recentMovimientos.map((mov) => {
                  const isIngreso = mov.tipo_nombre === 'Ingresos';
                  return (
                    <tr
                      key={mov.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                      onClick={() => router.push(`/movimientos?edit=${mov.id}`)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                            <span className="material-symbols-outlined text-primary text-lg">
                              {isIngreso ? 'payments' : 'receipt_long'}
                            </span>
                          </div>
                          <span className="font-semibold">{mov.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {mov.tipo_nombre}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                        {createSafeDate(mov.fecha).toLocaleDateString('es-ES')}
                      </td>
                      <td
                        className={`px-6 py-4 text-right font-bold ${
                          isIngreso ? 'text-emerald-600' : 'text-rose-600'
                        }`}
                      >
                        {isIngreso ? '+' : '-'}
                        {formatCurrency(Math.abs(mov.importe))}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
