/**
 * Money parsing. No "@/" imports on purpose: scripts/test-*.mjs import this
 * with plain node.
 */

/**
 * Parse an amount typed the Colombian way into a canonical numeric string.
 *
 *   "12.345"     -> "12345"      (dot = thousands; a type="number" input read
 *                                 this as 12.345 and saved $12, silently)
 *   "1.234.567"  -> "1234567"
 *   "13.777,23"  -> "13777.23"   (comma = decimals)
 *   "700.5"      -> "700.5"      (a lone dot NOT followed by exactly three
 *   "13777.23"   -> "13777.23"    digits can only be a decimal point)
 *
 * Returns "" for anything with no digits, so callers can keep treating an
 * empty string as "not filled in".
 */
export function parseMoneyInput(text) {
  if (text === null || text === undefined) return "";
  let s = String(text).replace(/[^\d.,-]/g, "");
  if (!/\d/.test(s)) return "";
  const negative = s.startsWith("-");
  s = s.replace(/-/g, "");
  if (s.includes(",")) {
    const [intPart, ...rest] = s.split(",");
    s = `${intPart.replace(/\./g, "")}.${rest.join("").replace(/\./g, "")}`;
  } else {
    const dots = (s.match(/\./g) || []).length;
    if (dots > 1 || (dots === 1 && /\.\d{3}$/.test(s))) s = s.replace(/\./g, "");
  }
  if (s.startsWith(".")) s = `0${s}`;
  if (s.endsWith(".")) s = s.slice(0, -1);
  const n = Number(s);
  if (!Number.isFinite(n)) return "";
  return `${negative ? "-" : ""}${s.replace(/^0+(?=\d)/, "")}`;
}
