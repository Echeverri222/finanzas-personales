import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";
import { tipoVisual } from "@/lib/tipoVisuals";
import type { TipoCategoria } from "@/types/domain";

const SIZES = {
  sm: "text-sm",
  base: "text-base",
  lg: "text-lg",
  xl: "text-2xl",
  hero: "text-3xl sm:text-4xl",
} as const;

export interface AmountProps {
  /** Always the stored, positive magnitude. Direction comes from `tipo`. */
  value: number | null | undefined;
  /**
   * Semantic category, from `tipo_movimiento.tipo`. Drives both the sign and
   * the colour. Omit for a figure with no direction (a total, a goal target).
   */
  tipo?: TipoCategoria;
  /** Show the leading +/- for the tipo. Off for column totals. */
  signed?: boolean;
  /** Colour the figure by tipo. Off inside an already-tinted surface. */
  toned?: boolean;
  size?: keyof typeof SIZES;
  className?: string;
}

/**
 * A money figure.
 *
 * The point of routing every amount through one component is that direction
 * (`+`/`-`) and colour are *presentation* derived from `tipo`, while `importe`
 * is always stored positive -- so a screen can never disagree with another
 * about whether a savings row is red. The five call sites this replaces had
 * drifted into exactly that: expenses were plain on the desktop table and rose
 * on mobile, and `text-rose-600` was hardcoded next to `text-expense`.
 *
 * `font-mono` + `tabular-nums` is the shared recommendation of both reference
 * designs; `slashed-zero` keeps a lone 0 from reading as an O at small sizes.
 */
export function Amount({
  value,
  tipo,
  signed = false,
  toned = false,
  size = "base",
  className,
}: AmountProps) {
  const visual = tipo ? tipoVisual(tipo) : null;
  const sign = signed && visual ? visual.sign : "";
  // Math.abs, because the sign above is the only thing allowed to express
  // direction -- a negative `importe` slipping through would render "--1.000".
  const magnitude =
    value === null || value === undefined ? value : Math.abs(Number(value));

  return (
    <span
      className={cn(
        "font-mono font-semibold tabular-nums slashed-zero tracking-tight",
        SIZES[size],
        toned && visual ? visual.tone : undefined,
        className,
      )}
    >
      {sign}
      {formatCurrency(magnitude)}
    </span>
  );
}
