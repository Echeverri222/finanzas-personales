'use client';

import { useEffect, useMemo, useState } from 'react';
import { useTheme } from 'next-themes';
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { CURRENCY } from '@/lib/constants';

// Validated categorical palette, in slot order: blue, orange, aqua, yellow,
// magenta, green, violet, red.
//
// The ORDER is the colour-blindness safety mechanism, not decoration: adjacent
// slots are the pairs most likely to appear together, so they are the ones
// checked for perceptual distance. The previous order put orange next to
// magenta (ΔE 12.9 normal vision, below the 15 floor) and orange next to green
// (ΔE 3.2 under protanopia — effectively identical). This order passes every
// check. Do not reorder without re-validating.
//
// These values now live as --chart-1..8 in styles/globals.css, converted
// losslessly from the hexes below (each round-trips byte-for-byte), with a
// separately validated dark set. The array is kept as the literal fallback for
// the first paint, before the effect below can read the real tokens.
const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'];

const FALLBACK = {
  grid: '#e1e0d9',
  axis: '#898781',
  income: '#1baf7a',
  expense: '#e34948',
  categorical: CATEGORICAL,
};

/**
 * Resolve the chart tokens to concrete colours.
 *
 * Why this is not just `stroke="hsl(var(--chart-grid))"`: `var()` is invalid in
 * an SVG *presentation attribute*, which is what Recharts renders these as. The
 * browser drops it silently -- the grid simply disappears rather than erroring.
 * Tailwind classes are no help either, since Recharts wants a colour value for
 * `stroke`, `tick.fill`, gradient `stopColor` and the tooltip's `entry.color`.
 *
 * So read the computed values off <html> instead, and re-read them whenever the
 * resolved theme changes -- that dependency is the whole point, otherwise the
 * charts keep the previous theme's colours until the next remount.
 */
function useChartColors() {
  const { resolvedTheme } = useTheme();
  const [colors, setColors] = useState(FALLBACK);

  useEffect(() => {
    const cs = getComputedStyle(document.documentElement);
    const read = (name, fallback) => {
      const raw = cs.getPropertyValue(name).trim();
      return raw ? `hsl(${raw})` : fallback;
    };
    setColors({
      grid: read('--chart-grid', FALLBACK.grid),
      axis: read('--chart-axis', FALLBACK.axis),
      income: read('--income', FALLBACK.income),
      expense: read('--expense', FALLBACK.expense),
      categorical: CATEGORICAL.map((hex, i) => read(`--chart-${i + 1}`, hex)),
    });
  }, [resolvedTheme]);

  return colors;
}

/**
 * Pick a colour slot from the category NAME, never from its position in the
 * value-sorted array.
 *
 * Colour has to follow the entity: indexing by rank meant a category changed
 * colour whenever its spending rank changed between months, and the same colour
 * meant different categories in different periods — which makes comparing one
 * month to the next actively misleading.
 *
 * Beyond 8 categories two can share a slot; the legend labels every slice, so
 * identity never rests on colour alone.
 */
function slotForCategory(name) {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) % CATEGORICAL.length;
}

const CustomTooltip = ({ active, payload, label, formatCurrency }) => {
  if (active && payload?.length) {
    return (
      <div className="rounded-lg border bg-background p-3 shadow-lg">
        {label ? <p className="mb-1 font-medium">{label}</p> : null}
        {payload.map((entry, i) => (
          <p key={i} className="text-sm tabular-nums" style={{ color: entry.color }}>
            {entry.name}: {formatCurrency(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

export default function DashboardCharts({
  monthlyData,
  categoryData,
  formatCurrency,
  onCategoryClick,
}) {
  const colors = useChartColors();
  const totalGastos = categoryData.reduce((sum, c) => sum + Number(c.value), 0);

  // Hoisted out of the tickFormatter, which built a fresh Intl.NumberFormat on
  // every tick of every render.
  const compact = useMemo(
    () => new Intl.NumberFormat(CURRENCY.LOCALE, { notation: 'compact' }),
    [],
  );

  return (
    <>
      <Card className="p-6 lg:col-span-8">
        <h4 className="mb-6 text-lg font-semibold tracking-tight">Evolución mensual</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.income} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={colors.income} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={colors.expense} stopOpacity={0.5} />
                  <stop offset="95%" stopColor={colors.expense} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
              <XAxis dataKey="month" tick={{ fill: colors.axis, fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis
                tickFormatter={(v) => compact.format(v)}
                tick={{ fill: colors.axis, fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
              <Legend iconType="plainline" wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
              <Area type="monotone" dataKey="ingresos" stroke={colors.income} strokeWidth={2} fill="url(#colorIngresos)" name="Ingresos" />
              <Area type="monotone" dataKey="gastos" stroke={colors.expense} strokeWidth={2} fill="url(#colorGastos)" name="Gastos" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-6 lg:col-span-4">
        <h4 className="mb-6 text-lg font-semibold tracking-tight">Distribución de gastos</h4>
        {categoryData.length > 0 ? (
          <div className="flex flex-col gap-4">
            {/* Donut with centered total */}
            <div className="relative mx-auto h-44 w-44">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="66%"
                    outerRadius="100%"
                    paddingAngle={2}
                    stroke="none"
                    onClick={(d) => onCategoryClick(d.name)}
                    style={{ cursor: 'pointer', outline: 'none' }}
                  >
                    {categoryData.map((entry) => (
                      <Cell key={entry.name} fill={colors.categorical[slotForCategory(entry.name)]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-muted-foreground">Total</span>
                <span className="text-lg font-semibold tabular-nums">{formatCurrency(totalGastos)}</span>
              </div>
            </div>

            {/* Legend list — carries name + amount + % so identity isn't color-only */}
            <ul className="space-y-1">
              {categoryData.map((entry) => {
                const pct = totalGastos > 0 ? Math.round((entry.value / totalGastos) * 100) : 0;
                return (
                  <li key={entry.name}>
                    <button
                      type="button"
                      onClick={() => onCategoryClick(entry.name)}
                      className="flex w-full items-center justify-between gap-2 rounded-md px-1.5 py-1 text-sm transition-colors hover:bg-secondary"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: colors.categorical[slotForCategory(entry.name)] }}
                        />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className="flex shrink-0 items-center gap-2 tabular-nums">
                        <span className="font-medium">{formatCurrency(entry.value)}</span>
                        <span className="w-8 text-right text-xs text-muted-foreground">{pct}%</span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="flex h-44 items-center justify-center text-muted-foreground">
            No hay gastos en este período
          </div>
        )}
      </Card>
    </>
  );
}
