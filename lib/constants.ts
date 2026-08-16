import type { TipoCategoria } from "@/types/domain";

/**
 * Semantic type of a category, mirroring the Postgres enum public.tipo_categoria
 * (see supabase/migrations/*_add_tipo_to_tipo_movimiento.sql).
 *
 * Read tipo_movimiento.tipo, never the category NAME. Names are user-editable
 * free text: renaming a category used to silently reclassify every historical
 * movimiento, and the same name means different things to different users
 * ('Inversiones' is lending for one user, brokerage deposits for another).
 *
 * The `satisfies` clause is the guard that keeps this honest. `Uppercase<
 * TipoCategoria>` expands to exactly the five keys below, so if the Postgres
 * enum gains, loses, or renames a value, `npm run db:types` regenerates
 * TipoCategoria and THIS FILE stops compiling. Before, the enum and this object
 * could drift apart in silence -- which is how a brand-new category ends up
 * quietly counted as spending.
 */
export const TIPO = {
  INGRESO: 'ingreso',
  GASTO: 'gasto',
  AHORRO: 'ahorro',
  INVERSION: 'inversion',
  PRESTAMO: 'prestamo',
} as const satisfies Record<Uppercase<TipoCategoria>, TipoCategoria>;

export const TIPO_VALUES = Object.values(TIPO) as readonly TipoCategoria[];

/**
 * Currency formatting defaults.
 *
 * Default ONLY -- the source of truth is usuarios.currency (default 'COP').
 * Amounts are Colombian pesos; formatting them as en-US/USD rendered
 * COP $29.000 as "$29,000" on every screen.
 * COP has no practical subunit in daily use, so 0 fraction digits is correct.
 */
export const CURRENCY = {
  LOCALE: 'es-CO',
  CURRENCY: 'COP' as string,
  MIN_FRACTION_DIGITS: 0,
  MAX_FRACTION_DIGITS: 0,
};
