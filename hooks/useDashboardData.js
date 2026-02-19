/**
 * Single API for dashboard: one hook returns all data needed by any UI (mobile/desktop).
 * Change filters or add fields here; UIs stay dumb and easy to swap.
 */
import { useState, useMemo } from 'react';
import { useMovimientos } from './useMovimientos';
import { useTiposMovimiento } from './useTiposMovimiento';
import { createSafeDate, MONTH_NAMES, MONTHS_FULL } from '../lib/dateUtils';
import { CURRENCY } from '../lib/constants';

const DEFAULT_YEAR = new Date().getFullYear();
const DEFAULT_MONTH = new Date().getMonth().toString();

export function useDashboardData() {
  const { movimientos, loading, error } = useMovimientos();
  const { tiposMovimiento } = useTiposMovimiento();

  const [yearFilter, setYearFilter] = useState(DEFAULT_YEAR);
  const [monthFilter, setMonthFilter] = useState(DEFAULT_MONTH);
  const [categoryFilter, setCategoryFilter] = useState('all');

  const movimientosConTipo = useMemo(() => {
    return movimientos.map((mov) => {
      const tipo = tiposMovimiento.find((t) => t.id === mov.id_tipo_movimiento);
      return {
        ...mov,
        tipo_nombre: tipo ? tipo.nombre : '',
        tipo_meta: tipo ? tipo.meta : 0,
      };
    });
  }, [movimientos, tiposMovimiento]);

  const categories = useMemo(() => tiposMovimiento.map((t) => t.nombre), [tiposMovimiento]);

  const filteredMovimientos = useMemo(() => {
    return movimientosConTipo.filter((mov) => {
      const movDate = createSafeDate(mov.fecha);
      const matchesYear = movDate.getFullYear() === yearFilter;
      const matchesMonth = monthFilter === 'all' || movDate.getMonth() === parseInt(monthFilter, 10);
      const matchesCategory = categoryFilter === 'all' || mov.tipo_nombre === categoryFilter;
      return matchesYear && matchesMonth && matchesCategory;
    });
  }, [movimientosConTipo, yearFilter, monthFilter, categoryFilter]);

  const yearFilteredMovimientos = useMemo(() => {
    return movimientosConTipo.filter((mov) => {
      const movDate = createSafeDate(mov.fecha);
      const matchesYear = movDate.getFullYear() === yearFilter;
      const matchesCategory = categoryFilter === 'all' || mov.tipo_nombre === categoryFilter;
      return matchesYear && matchesCategory;
    });
  }, [movimientosConTipo, yearFilter, categoryFilter]);

  const totalIngresos = useMemo(
    () =>
      filteredMovimientos
        .filter((m) => m.tipo_nombre === 'Ingresos')
        .reduce((sum, m) => sum + Number(m.importe), 0),
    [filteredMovimientos]
  );

  const totalGastos = useMemo(
    () =>
      filteredMovimientos
        .filter((m) => m.tipo_nombre !== 'Ingresos')
        .reduce((sum, m) => sum + Number(m.importe), 0),
    [filteredMovimientos]
  );

  const balance = totalIngresos - totalGastos;

  const ahorrosMes = useMemo(
    () =>
      filteredMovimientos
        .filter((m) => m.tipo_nombre === 'Ahorro')
        .reduce((sum, m) => sum + Number(m.importe), 0),
    [filteredMovimientos]
  );

  const monthlyData = useMemo(() => {
    const acc = yearFilteredMovimientos.reduce((acc, mov) => {
      const movDate = createSafeDate(mov.fecha);
      const year = movDate.getFullYear();
      const month = movDate.getMonth();
      const monthYear = `${MONTH_NAMES[month]} ${year.toString().slice(-2)}`;
      if (!acc[monthYear]) {
        acc[monthYear] = { month: monthYear, timestamp: new Date(year, month, 1).getTime() };
      }
      if (categoryFilter === 'all') {
        if (mov.tipo_nombre === 'Ingresos') {
          acc[monthYear].ingresos = (acc[monthYear].ingresos || 0) + Number(mov.importe);
        } else if (mov.tipo_nombre !== 'Ahorro') {
          acc[monthYear].gastos = (acc[monthYear].gastos || 0) + Number(mov.importe);
        }
      } else if (mov.tipo_nombre === categoryFilter) {
        acc[monthYear].categoria = (acc[monthYear].categoria || 0) + Number(mov.importe);
      }
      return acc;
    }, {});
    return Object.values(acc).sort((a, b) => a.timestamp - b.timestamp);
  }, [yearFilteredMovimientos, categoryFilter]);

  const categoryData = useMemo(() => {
    const acc = {};
    filteredMovimientos
      .filter((m) => m.tipo_nombre !== 'Ingresos')
      .forEach((mov) => {
        const cat = mov.tipo_nombre;
        if (!acc[cat]) acc[cat] = { name: cat, value: 0, meta: mov.tipo_meta || 0 };
        acc[cat].value += mov.importe;
      });
    return Object.values(acc).sort((a, b) => b.value - a.value);
  }, [filteredMovimientos]);

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
      const total = filteredMovimientos
        .filter((m) => {
          const fd = createSafeDate(m.fecha);
          return fd >= d && fd <= dayEnd && m.tipo_nombre !== 'Ingresos';
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
  }, [filteredMovimientos]);

  const years = useMemo(
    () =>
      [...new Set(movimientosConTipo.map((m) => createSafeDate(m.fecha).getFullYear()))].sort(
        (a, b) => b - a
      ),
    [movimientosConTipo]
  );

  const formatCurrency = (amount) =>
    new Intl.NumberFormat(CURRENCY.LOCALE, {
      style: 'currency',
      currency: CURRENCY.CURRENCY,
      minimumFractionDigits: CURRENCY.MIN_FRACTION_DIGITS,
      maximumFractionDigits: CURRENCY.MAX_FRACTION_DIGITS,
    }).format(amount);

  const getSelectedMonthName = () => {
    if (monthFilter === 'all') return 'Todo el año';
    const m = MONTHS_FULL.find((x) => x.value === monthFilter);
    return m ? m.label : '';
  };

  return {
    loading,
    error,
    filters: { yearFilter, monthFilter, categoryFilter },
    setFilters: { setYearFilter, setMonthFilter, setCategoryFilter },
    years,
    months: MONTHS_FULL,
    categories,
    totalIngresos,
    totalGastos,
    balance,
    ahorrosMes,
    filteredMovimientos,
    recentMovimientos: filteredMovimientos.slice(0, 5),
    monthlyData,
    categoryData,
    weeklyChartData,
    formatCurrency,
    getSelectedMonthName,
    tiposMovimiento,
  };
}
