/**
 * App-level domain types.
 *
 * The important thing to know before editing this file: **no hook returns a bare
 * table row.** Every one of them either embeds a join, coerces `numeric` to
 * `number`, replaces a `date` string with a `Date`, or renames columns for the
 * UI. This file is where that divergence is written down once, so a component
 * can never guess at the shape it is handed.
 *
 * Everything here derives from `types/supabase.ts`, which is generated -- run
 * `npm run db:types` after every migration. Nothing in this file should be
 * hand-maintained if the database can tell us the answer instead.
 */
import type { Database } from './supabase';

// ── generic helpers ────────────────────────────────────────────────────────
type Tables = Database['public']['Tables'];

export type Row<T extends keyof Tables> = Tables[T]['Row'];
export type Insert<T extends keyof Tables> = Tables[T]['Insert'];
export type Update<T extends keyof Tables> = Tables[T]['Update'];
export type Enums<E extends keyof Database['public']['Enums']> =
  Database['public']['Enums'][E];

/**
 * The semantic meaning of a category: 'ingreso' | 'gasto' | 'ahorro' |
 * 'inversion' | 'prestamo'.
 *
 * Read this, never `tipo_nombre`. Category names are user-editable free text --
 * renaming one used to silently reclassify every historical movimiento, and the
 * same name means different things to different users ('Inversiones' is lending
 * for one, brokerage deposits for another). See the M2 migration.
 */
export type TipoCategoria = Enums<'tipo_categoria'>;

export type TipoMovimiento = Row<'tipo_movimiento'>;
export type Usuario = Row<'usuarios'>;

// ── movimientos ────────────────────────────────────────────────────────────

/**
 * The embed every movimiento query selects. Kept as a single exported constant
 * so the query and the type below cannot drift apart.
 *
 * `!inner` matters twice: it makes the embed non-nullable (an orphan movimiento
 * is unrepresentable), and it lets the SQL layer supply `tipo`/`nombre` so no
 * client-side re-join is needed.
 */
export const MOVIMIENTO_SELECT = `
  *,
  tipo_movimiento!inner (
    id,
    nombre,
    meta,
    tipo
  )
` as const;

/** The category fields the select above embeds. */
export type MovimientoEmbed = Pick<
  TipoMovimiento,
  'id' | 'nombre' | 'meta' | 'tipo'
>;

/** Exactly what Postgres returns for the query above. */
export type MovimientoRow = Row<'movimientos'> & {
  tipo_movimiento: MovimientoEmbed;
};

/**
 * What `useMovimientos` returns -- deliberately not `MovimientoRow`:
 *
 * - `fecha` is re-parsed to a **local** Date via `createSafeDate`, because
 *   `new Date('2026-08-16')` is UTC midnight and renders as the 15th in Bogotá.
 * - `importe` is `Number()`-coerced (Postgres `numeric` can arrive as a string).
 * - `tipo_nombre` / `tipo_categoria` are lifted out of the embed by the hook so
 *   consumers never reach into `tipo_movimiento` themselves.
 */
export type Movimiento = Omit<MovimientoRow, 'fecha' | 'importe'> & {
  fecha: Date;
  importe: number;
  /** Display only. User-editable free text -- never branch on this. */
  tipo_nombre: string;
  /** Semantics. Mirrors `tipo_movimiento.tipo`. Branch on THIS. */
  tipo_categoria: TipoCategoria;
};

/** `useDashboardData` decorates each movimiento a little further. */
export type MovimientoConTags = Movimiento & {
  tipo_meta: number;
  tagIds: string[];
};

// ── pagos recurrentes ──────────────────────────────────────────────────────

/**
 * Note the absence of `!inner`: this embed is **nullable**, unlike the
 * movimientos one. Any `r.tipo_movimiento.nombre` has to be guarded, and
 * strictNullChecks will now say so.
 */
export type PagoRecurrenteRow = Row<'pagos_recurrentes'> & {
  tipo_movimiento: Pick<TipoMovimiento, 'id' | 'nombre'> | null;
};

/**
 * Return shape of the `generar_recurrentes_del_mes` RPC. `accion` is really a
 * small union, but Postgres types it as `text`; the caller only tests for
 * 'genera'.
 */
export type RecurringGenerationResult =
  Database['public']['Functions']['generar_recurrentes_del_mes']['Returns'];

// ── metas ──────────────────────────────────────────────────────────────────

/**
 * `useMetas` renames three columns on the way out, so the UI never sees the
 * database spelling: `nombre_objetivo` -> `nombre`, `meta_total` -> `objetivo`,
 * `monto_actual` -> `actual`.
 */
export type Meta = {
  id: string;
  nombre: string;
  objetivo: number;
  actual: number;
  descripcion: string | null;
  fecha_meta: string;
  usuario_id: string | null;
};

// ── tags ───────────────────────────────────────────────────────────────────

/** `useTags` selects a narrowed shape, not the full row. */
export type Tag = Pick<Row<'tags'>, 'id' | 'nombre' | 'created_at'>;

/** movimiento id -> tag ids, as built by `useMovimientoTags`. */
export type MovimientoTagMap = Record<string, string[]>;
