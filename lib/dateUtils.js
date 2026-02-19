/**
 * Shared date utilities for consistent parsing across dashboard, movimientos, etc.
 * Use this so any UI (mobile/desktop) gets the same date behavior.
 */

export function createSafeDate(dateString) {
  if (!dateString) return new Date();
  if (typeof dateString === 'string' && dateString.includes('-')) {
    const [year, month, day] = dateString.split('T')[0].split('-');
    return new Date(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10));
  }
  if (dateString instanceof Date) return dateString;
  return new Date(dateString);
}

export const MONTH_NAMES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'
];

export const MONTHS_FULL = [
  { value: 'all', label: 'Todos' },
  { value: '0', label: 'Enero' }, { value: '1', label: 'Febrero' },
  { value: '2', label: 'Marzo' }, { value: '3', label: 'Abril' },
  { value: '4', label: 'Mayo' }, { value: '5', label: 'Junio' },
  { value: '6', label: 'Julio' }, { value: '7', label: 'Agosto' },
  { value: '8', label: 'Septiembre' }, { value: '9', label: 'Octubre' },
  { value: '10', label: 'Noviembre' }, { value: '11', label: 'Diciembre' }
];

export const WEEKDAY_LABELS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
