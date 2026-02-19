'use client';

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
import { COLORS, CHART_DIMENSIONS } from '../../lib/constants';

const CustomTooltip = ({ active, payload, label, formatCurrency }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-white dark:bg-slate-800 p-4 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700">
        <p className="font-semibold">{label}</p>
        {payload.map((entry, i) => (
          <p key={i} style={{ color: entry.color }}>
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
  return (
    <>
      <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-lg mb-6">Evolución mensual</h4>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={monthlyData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <defs>
                <linearGradient id="colorIngresos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorGastos" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="month" tick={{ fill: '#64748b' }} />
              <YAxis
                tickFormatter={(v) => new Intl.NumberFormat('es-CO', { notation: 'compact' }).format(v)}
                tick={{ fill: '#64748b' }}
              />
              <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
              <Legend />
              <Area
                type="monotone"
                dataKey="ingresos"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#colorIngresos)"
                name="Ingresos"
              />
              <Area
                type="monotone"
                dataKey="gastos"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#colorGastos)"
                name="Gastos"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-200 dark:border-slate-800">
        <h4 className="font-bold text-lg mb-6">Distribución de gastos</h4>
        <div className="h-64">
          {categoryData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="value"
                  outerRadius={CHART_DIMENSIONS.PIE_OUTER_RADIUS}
                  innerRadius={CHART_DIMENSIONS.PIE_INNER_RADIUS}
                  paddingAngle={2}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  onClick={(d) => onCategoryClick(d.name)}
                  style={{ cursor: 'pointer' }}
                >
                  {categoryData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={COLORS[entry.name] || `hsl(${(i * 360) / categoryData.length}, 70%, 60%)`}
                      className="hover:opacity-80"
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip formatCurrency={formatCurrency} />} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              No hay gastos en este período
            </div>
          )}
        </div>
      </div>
    </>
  );
}
