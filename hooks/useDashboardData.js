/**
 * Single API for dashboard: one hook returns all data needed by any UI (mobile/desktop).
 * Change filters or add fields here; UIs stay dumb and easy to swap.
 */
import { useState, useMemo } from 'react';
import { useMovimientos } from './useMovimientos';
import { useTiposMovimiento } from './useTiposMovimiento';
import { useTags } from './useTags';
import { useMovimientoTags } from './useMovimientoTags';
import { createSafeDate, MONTH_NAMES, MONTHS_FULL } from '../lib/dateUtils';
import { TIPO } from '../lib/constants';
import { formatCurrency } from '../lib/format';

const DEFAULT_YEAR = new Date().getFullYear();
const DEFAULT_MONTH = new Date().getMonth().toString();

export function useDashboardData() {
  const { movimientos, loading: movimientosLoading, error } = useMovimientos();
  const { tiposMovimiento, loading: tiposLoading } = useTiposMovimiento();
  const { tags, loading: tagsLoading } = useTags();
  const { movimientoTagIds, loading: movimientoTagsLoading } = useMovimientoTags();

  // Gated on ALL FOUR, not just movimientos. Forwarding one flag meant the
  // dashboard declared itself ready while three of its inputs were still empty,
  // which is what let the charts render a frame built from missing categories.
  const loading =
    movimientosLoading || tiposLoading || tagsLoading || movimientoTagsLoading;

  const [yearFilter, setYearFilter] = useState(DEFAULT_YEAR);
  const [monthFilter, setMonthFilter] = useState(DEFAULT_MONTH);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [tagFilter, setTagFilter] = useState('all');

  /**
   * Decorates each movimiento with the two fields the dashboard needs and
   * `useMovimientos` does not provide.
   *
   * It used to re-join against `tiposMovimiento` and rebuild `tipo_nombre` /
   * `tipo_categoria` from the result -- overwriting the values the SQL `!inner`
   * embed had already supplied correctly. While the categories list was still
   * loading, every `.find()` missed, so every row became a blank-named expense.
   * `colorForCategory` hashes the NAME, so all of them hashed to the same slot
   * and the donut rendered as a single solid colour for a frame.
   *
   * `tipo_meta` comes from the same embed. Only `tagIds` genuinely needs a
   * second source.
   */
  const movimientosConTipo = useMemo(() => {
    return movimientos.map((mov) => ({
      ...mov,
      tipo_meta: mov.tipo_movimiento?.meta ?? 0,
      tagIds: movimientoTagIds[mov.id] || [],
    }));
  }, [movimientos, movimientoTagIds]);

  const categories = useMemo(() => tiposMovimiento.map((t) => t.nombre), [tiposMovimiento]);

  const filteredMovimientos = useMemo(() => {
    return movimientosConTipo.filter((mov) => {
      const movDate = createSafeDate(mov.fecha);
      const matchesYear = yearFilter === 'all' || movDate.getFullYear() === yearFilter;
      const matchesMonth = monthFilter === 'all' || movDate.getMonth() === parseInt(monthFilter, 10);
      const matchesCategory = categoryFilter === 'all' || mov.tipo_nombre === categoryFilter;
      const matchesTag = tagFilter === 'all' || (mov.tagIds && mov.tagIds.includes(tagFilter));
      return matchesYear && matchesMonth && matchesCategory && matchesTag;
    });
  }, [movimientosConTipo, yearFilter, monthFilter, categoryFilter, tagFilter]);

  const yearFilteredMovimientos = useMemo(() => {
    return movimientosConTipo.filter((mov) => {
      const movDate = createSafeDate(mov.fecha);
      const matchesYear = yearFilter === 'all' || movDate.getFullYear() === yearFilter;
      const matchesCategory = categoryFilter === 'all' || mov.tipo_nombre === categoryFilter;
      const matchesTag = tagFilter === 'all' || (mov.tagIds && mov.tagIds.includes(tagFilter));
      return matchesYear && matchesCategory && matchesTag;
    });
  }, [movimientosConTipo, yearFilter, categoryFilter, tagFilter]);

  // Un consumo de ahorro es stock, no flujo: sigue en recientes y conserva sus
  // filtros/trazabilidad, pero no participa en ningún total o gráfico del mes.
  const movimientosDeFlujo = useMemo(
    () => filteredMovimientos.filter((mov) => !mov.sale_de_ahorros),
    [filteredMovimientos]
  );
  const movimientosDeFlujoAnual = useMemo(
    () => yearFilteredMovimientos.filter((mov) => !mov.sale_de_ahorros),
    [yearFilteredMovimientos]
  );

  const totalIngresos = useMemo(
    () =>
      movimientosDeFlujo
        .filter((m) => m.tipo_categoria === TIPO.INGRESO)
        .reduce((sum, m) => sum + Number(m.importe), 0),
    [movimientosDeFlujo]
  );

  // NOTE: this counts AHORRO as an expense, while monthlyData below excludes it.
  // That inconsistency predates the tipo migration and is preserved deliberately
  // so this refactor changes no displayed number. Worth resolving separately.
  const totalGastos = useMemo(
    () =>
      movimientosDeFlujo
        .filter((m) => m.tipo_categoria !== TIPO.INGRESO)
        .reduce((sum, m) => sum + Number(m.importe), 0),
    [movimientosDeFlujo]
  );

  const balance = totalIngresos - totalGastos;

  // The month before the selected one, with the same category/tag filters and
  // the same income/expense rule as the totals above -- so the cards can say
  // "+12 % vs septiembre". Null when the view is a whole year or all years.
  const mesAnterior = useMemo(() => {
    if (monthFilter === 'all' || yearFilter === 'all') return null;
    const m = parseInt(monthFilter, 10);
    const ref = new Date(yearFilter, m - 1, 1);
    const totales = { ingresos: 0, gastos: 0 };
    movimientosConTipo.forEach((mov) => {
      if (mov.sale_de_ahorros) return;
      const d = createSafeDate(mov.fecha);
      if (d.getFullYear() !== ref.getFullYear() || d.getMonth() !== ref.getMonth()) return;
      if (categoryFilter !== 'all' && mov.tipo_nombre !== categoryFilter) return;
      if (tagFilter !== 'all' && !(mov.tagIds && mov.tagIds.includes(tagFilter))) return;
      if (mov.tipo_categoria === TIPO.INGRESO) totales.ingresos += Number(mov.importe);
      else totales.gastos += Number(mov.importe);
    });
    return {
      ...totales,
      etiqueta: ref.toLocaleDateString('es-ES', { month: 'long' }),
    };
  }, [movimientosConTipo, yearFilter, monthFilter, categoryFilter, tagFilter]);

  const ahorrosMes = useMemo(
    () =>
      movimientosDeFlujo
        .filter((m) => m.tipo_categoria === TIPO.AHORRO)
        .reduce((sum, m) => sum + Number(m.importe), 0),
    [movimientosDeFlujo]
  );

  const monthlyData = useMemo(() => {
    const acc = movimientosDeFlujoAnual.reduce((acc, mov) => {
      const movDate = createSafeDate(mov.fecha);
      const year = movDate.getFullYear();
      const month = movDate.getMonth();
      const monthYear = `${MONTH_NAMES[month]} ${year.toString().slice(-2)}`;
      if (!acc[monthYear]) {
        acc[monthYear] = { month: monthYear, timestamp: new Date(year, month, 1).getTime() };
      }
      if (categoryFilter === 'all') {
        if (mov.tipo_categoria === TIPO.INGRESO) {
          acc[monthYear].ingresos = (acc[monthYear].ingresos || 0) + Number(mov.importe);
        } else if (mov.tipo_categoria !== TIPO.AHORRO) {
          acc[monthYear].gastos = (acc[monthYear].gastos || 0) + Number(mov.importe);
        }
      } else if (mov.tipo_nombre === categoryFilter) {
        acc[monthYear].categoria = (acc[monthYear].categoria || 0) + Number(mov.importe);
      }
      return acc;
    }, {});
    return Object.values(acc).sort((a, b) => a.timestamp - b.timestamp);
  }, [movimientosDeFlujoAnual, categoryFilter]);

  // One colour slot per non-income category, from the user's whole category
  // list in alphabetical order: stable from month to month, and distinct for
  // up to 8 categories. Hashing each name independently (the old way) put
  // "Gastos fijos" and "Alimentacion" on the same violet.
  const slotPorCategoria = useMemo(() => {
    const nombres = tiposMovimiento
      .filter((t) => t.tipo !== TIPO.INGRESO)
      .map((t) => t.nombre)
      .sort((a, b) => a.localeCompare(b, 'es'));
    return new Map(nombres.map((n, i) => [n, i % 8]));
  }, [tiposMovimiento]);

  const categoryData = useMemo(() => {
    const acc = {};
    movimientosDeFlujo
      .filter((m) => m.tipo_categoria !== TIPO.INGRESO)
      .forEach((mov) => {
        const cat = mov.tipo_nombre;
        if (!acc[cat]) {
          acc[cat] = { name: cat, value: 0, meta: mov.tipo_meta || 0, slot: slotPorCategoria.get(cat) };
        }
        acc[cat].value += mov.importe;
      });
    return Object.values(acc).sort((a, b) => b.value - a.value);
  }, [movimientosDeFlujo, slotPorCategoria]);

  // Weekly bars for "Actividad de Gastos" (last 7 days)
  const weeklyChartData = useMemo(() => {
    const days = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(23, 59, 59, 999);
      const total = movimientosDeFlujo
        .filter((m) => {
          const fd = createSafeDate(m.fecha);
          return fd >= d && fd <= dayEnd && m.tipo_categoria !== TIPO.INGRESO;
        })
        .reduce((s, m) => s + Math.abs(Number(m.importe)), 0);
      days.push({
        day: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][d.getDay()],
        value: total,
        pct: 0,
      });
    }
    const max = Math.max(...days.map((x) => x.value), 1);
    days.forEach((d) => {
      d.pct = (d.value / max) * 100;
    });
    return days;
  }, [movimientosDeFlujo]);

  const years = useMemo(() => {
    const fromData = [...new Set(movimientosConTipo.map((m) => createSafeDate(m.fecha).getFullYear()))].sort(
      (a, b) => b - a
    );
    return fromData.length ? fromData : [new Date().getFullYear()];
  }, [movimientosConTipo]);

  // Re-exported from lib/format so the dashboard and the rest of the app cannot
  // drift apart. This used to be a second inline Intl formatter that returned
  // "$NaN" for nullish where lib/format returns an em-dash.

  const getSelectedMonthName = () => {
    if (monthFilter === 'all') return 'Todo el año';
    const m = MONTHS_FULL.find((x) => x.value === monthFilter);
    return m ? m.label : '';
  };

  const getSelectedYearLabel = () => {
    if (yearFilter === 'all') return 'Todos los años';
    return String(yearFilter);
  };

  return {
    loading,
    error,
    filters: { yearFilter, monthFilter, categoryFilter, tagFilter },
    setFilters: { setYearFilter, setMonthFilter, setCategoryFilter, setTagFilter },
    years,
    months: MONTHS_FULL,
    categories,
    tags,
    totalIngresos,
    totalGastos,
    balance,
    mesAnterior,
    ahorrosMes,
    filteredMovimientos,
    recentMovimientos: filteredMovimientos.slice(0, 5),
    monthlyData,
    categoryData,
    weeklyChartData,
    formatCurrency,
    getSelectedMonthName,
    getSelectedYearLabel,
    tiposMovimiento,
  };
}
