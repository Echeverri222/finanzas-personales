import { createSafeDate } from "@/lib/dateUtils";

/**
 * Shared display formatters. Currency is USD / en-US and dates are es-ES,
 * matching the app's existing conventions (see lib/constants.js CURRENCY and
 * the DATE_FORMATS.DISPLAY locale). Empty/nullish values render as an em-dash.
 */

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

/** Format a number as USD, e.g. 1234 -> "$1,234". Nullish -> "—". */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "—";
  }
  return currencyFormatter.format(Number(amount));
}

/** Format a plain number with thousands separators. Nullish -> "—". */
export function formatNumber(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return new Intl.NumberFormat("en-US").format(Number(value));
}

/** Format a 0–100 value as a percent, e.g. 42.5 -> "43%". */
export function formatPercent(value, fractionDigits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return "—";
  }
  return `${Number(value).toFixed(fractionDigits)}%`;
}

/** Format a date/date-string as es-ES, e.g. "12 jul 2026". Nullish -> "—". */
export function formatDate(date) {
  if (!date) return "—";
  return createSafeDate(date).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Today's date as an ISO yyyy-mm-dd string (for date inputs). */
export function todayISO() {
  return new Date().toISOString().split("T")[0];
}
