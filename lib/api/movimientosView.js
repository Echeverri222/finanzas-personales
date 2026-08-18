/**
 * View adapters for movimientos data.
 * Use these so mobile (grouped by date) and desktop (table) can share the same data source.
 */
import { createSafeDate } from '../dateUtils';
import { TIPO } from '../constants';

/**
 * A movimiento's contribution to a net total.
 *
 * Income adds, everything else subtracts -- including AHORRO, which is the same
 * convention `useDashboardData`'s `totalGastos` uses. Read `tipo_categoria`
 * (from the SQL embed), never the category name: names are user-editable free
 * text and renaming one must not change how it is counted (M2).
 */
function signedImporte(mov) {
  const value = Number(mov.importe) || 0;
  return mov.tipo_categoria === TIPO.INGRESO ? value : -value;
}

/**
 * Groups movimientos by calendar day, newest day first, with a net total per day.
 *
 * Item order *within* a day is the order it was handed in, so an amount- or
 * name-sort from the page sorts inside each day rather than being discarded.
 *
 * @param {Array} movimientos - List with { fecha, importe, tipo_categoria, ... }
 * @param {{ dateDirection?: 'asc' | 'desc' }} [options] - Day order; defaults to
 *   newest first. Pass 'asc' when the caller's sort is itself on the date, or
 *   the direction never reaches the grouping and appears to do nothing.
 * @returns {Array<{ label: string, heading: string, date: Date, total: number, items: Array }>}
 *   `label` is the short form kept for existing callers (Hoy / Ayer / 12 oct 2023);
 *   `heading` is the long timeline form (Hoy · 17 de agosto).
 */
export function groupMovimientosByDate(movimientos, { dateDirection = 'desc' } = {}) {
  if (!movimientos?.length) return [];

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const groups = {};
  movimientos.forEach((mov) => {
    const d = createSafeDate(mov.fecha);
    // Key on the local day start, not on the parsed instant: two rows on the
    // same day must land in the same bucket even if the source strings differ.
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const key = dayStart.getTime();

    if (!groups[key]) {
      groups[key] = { date: dayStart, items: [], total: 0 };
    }
    groups[key].items.push(mov);
    groups[key].total += signedImporte(mov);
  });

  return Object.values(groups)
    .sort((a, b) => (dateDirection === 'asc' ? a.date - b.date : b.date - a.date))
    .map((g) => {
      const relative =
        g.date.getTime() === today.getTime()
          ? 'Hoy'
          : g.date.getTime() === yesterday.getTime()
            ? 'Ayer'
            : null;

      const short = g.date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
      // The year is only spelled out when it isn't the current one -- "17 de
      // agosto de 2026" on every row of a same-year list is noise.
      const long = g.date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        ...(g.date.getFullYear() === today.getFullYear() ? {} : { year: 'numeric' }),
      });

      return {
        label: relative ?? short,
        heading: relative ? `${relative} · ${long}` : long,
        date: g.date,
        total: g.total,
        items: g.items,
      };
    });
}
