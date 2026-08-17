import {
  Car,
  HandCoins,
  PiggyBank,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import type { TipoCategoria } from "@/types/domain";

/**
 * How each semantic category is presented: its label, its icon, and which
 * tokens to colour it with.
 *
 * Keyed on `tipo_movimiento.tipo`, never on the category's name. Names are
 * user-editable free text -- that is the whole point of M2 -- so a map keyed on
 * "Ingresos" breaks the moment someone renames it to "Salario".
 */
export interface TipoVisual {
  /** Singular, for a single row or chip. */
  label: string;
  /** Plural, for totals and section headings. */
  labelPlural: string;
  icon: LucideIcon;
  /** Class for the amount / icon ink. */
  tone: string;
  /** Tinted surface + matching ink, for a chip or badge. */
  surface: string;
  /**
   * Sign shown in front of an amount. `importe` is always stored positive, so
   * direction is presentation, not data.
   */
  sign: "+" | "-" | "";
}

export const TIPO_VISUALS = {
  ingreso: {
    label: "Ingreso",
    labelPlural: "Ingresos",
    icon: Wallet,
    tone: "text-income",
    surface: "bg-success-muted text-success-muted-foreground",
    sign: "+",
  },
  gasto: {
    label: "Gasto",
    labelPlural: "Gastos",
    icon: ReceiptText,
    tone: "text-expense",
    surface: "bg-secondary text-secondary-foreground",
    sign: "-",
  },
  ahorro: {
    label: "Ahorro",
    labelPlural: "Ahorros",
    icon: PiggyBank,
    tone: "text-chart-3",
    surface: "bg-secondary text-secondary-foreground",
    sign: "",
  },
  inversion: {
    label: "Inversión",
    labelPlural: "Inversiones",
    icon: TrendingUp,
    tone: "text-chart-7",
    surface: "bg-secondary text-secondary-foreground",
    sign: "",
  },
  prestamo: {
    label: "Préstamo",
    labelPlural: "Préstamos",
    icon: HandCoins,
    tone: "text-chart-4",
    surface: "bg-secondary text-secondary-foreground",
    sign: "",
  },
  // `satisfies Record<TipoCategoria, ...>` is the guard that makes this file
  // worth having: TipoCategoria is generated from the Postgres enum, so if a
  // category type is added, removed or renamed in the database, `npm run
  // db:types` regenerates the union and THIS FILE STOPS COMPILING -- instead of
  // a new category rendering as an untinted, unlabelled mystery row.
} as const satisfies Record<TipoCategoria, TipoVisual>;

export function tipoVisual(tipo: TipoCategoria): TipoVisual {
  return TIPO_VISUALS[tipo];
}

/**
 * Decorative per-name icon override.
 *
 * Purely cosmetic, and deliberately separate from the semantic map above: a
 * user who names a category "Transporte" gets a car, but if they rename it, the
 * icon quietly falls back to the one for its `tipo` and nothing breaks. Never
 * branch behaviour on this.
 *
 * Consolidates the two divergent name-keyed maps that existed in
 * DashboardMobile and MovimientosMobile (which disagreed on the fallback and on
 * whether "Alimentación" carried an accent).
 */
const DECORATIVE_ICON_BY_NAME: Readonly<Record<string, LucideIcon>> = {
  transporte: Car,
  compras: ShoppingBag,
  alimentacion: UtensilsCrossed,
  "gastos fijos": ReceiptText,
  salidas: UtensilsCrossed,
};

/**
 * Keys are compared with diacritics stripped, which also fixes a live bug: the
 * old map keyed on "Alimentación" while the category is actually stored as
 * "Alimentacion", so that icon never matched and every such row silently fell
 * through to the default.
 */
const foldName = (s: string) =>
  s
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es");

export function iconForCategory(
  nombre: string | null | undefined,
  tipo: TipoCategoria,
): LucideIcon {
  return (
    DECORATIVE_ICON_BY_NAME[foldName(nombre ?? "")] ?? TIPO_VISUALS[tipo].icon
  );
}
