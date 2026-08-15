import { createSafeDate } from "@/lib/dateUtils";

/**
 * Shared display formatters. Amounts are Colombian pesos and dates are es-ES.
 * Empty/nullish values render as an em-dash.
 *
 * These used to format as en-US/USD, which rendered COP $29.000 as "$29,000" --
 * right digits, wrong currency and wrong separators, on every screen. The
 * currency now lives on usuarios.currency (default 'COP'); pass it in to
 * override the default once a settings UI exists.
 */

import { CURRENCY } from "@/lib/constants";

// Intl formatters are expensive to construct, so memoise per currency.
const formatterCache = new Map();

function getCurrencyFormatter(currency = CURRENCY.CURRENCY) {
  let f = formatterCache.get(currency);
  if (!f) {
    f = new Intl.NumberFormat(CURRENCY.LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: CURRENCY.MIN_FRACTION_DIGITS,
      maximumFractionDigits: CURRENCY.MAX_FRACTION_DIGITS,
    });
    formatterCache.set(currency, f);
  }
  return f;
}

/**
 * Format a number as currency, e.g. 29000 -> "$ 29.000" (COP, es-CO).
 * Nullish -> "—". Pass `currency` (ISO 4217) to override the default.
 */
export function formatCurrency(amount, currency) {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return "—";
  }
  return getCurrencyFormatter(currency).format(Number(amount));
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
