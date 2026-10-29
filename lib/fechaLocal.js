/**
 * Local-calendar date helpers. No "@/" imports on purpose: scripts/test-*.mjs
 * import this with plain node.
 */

/**
 * A Date's LOCAL calendar day as yyyy-mm-dd (for date inputs and date columns).
 *
 * Never `toISOString().split("T")[0]` for this: that is the UTC day, and Bogotá
 * is UTC-5, so from 19:00 on it is already tomorrow -- new movimientos defaulted
 * to the next day, and on the last day of a month landed in the next month.
 */
export function toISODate(date = new Date()) {
  // A date-only string already IS a calendar day; parsing it would make it UTC
  // midnight and shift it back a day here.
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}/.test(date)) return date.slice(0, 10);
  const d = date instanceof Date ? date : new Date(date);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

/** Today's LOCAL date as yyyy-mm-dd. See toISODate. */
export function todayISO() {
  return toISODate(new Date());
}
