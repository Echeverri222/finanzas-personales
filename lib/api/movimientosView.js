/**
 * View adapters for movimientos data.
 * Use these so mobile (grouped by date) and desktop (table) can share the same data source.
 */
import { createSafeDate } from '../dateUtils';

/**
 * Groups movimientos by date label for mobile list (Hoy, Ayer, 12 Oct, 2023).
 * @param {Array} movimientos - List with { fecha, ... }
 * @returns {Array<{ label: string, items: Array }>}
 */
export function groupMovimientosByDate(movimientos) {
  if (!movimientos?.length) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = {};
  movimientos.forEach((mov) => {
    const d = createSafeDate(mov.fecha);
    const key = d.getTime();
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    let label;
    if (dayStart === today.getTime()) {
      label = 'Hoy';
    } else if (dayStart === yesterday.getTime()) {
      label = 'Ayer';
    } else {
      label = d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    if (!groups[key]) {
      groups[key] = { label, date: d, items: [] };
    }
    groups[key].items.push(mov);
  });

  return Object.values(groups)
    .sort((a, b) => b.date - a.date)
    .map((g) => ({ label: g.label, items: g.items }));
}
