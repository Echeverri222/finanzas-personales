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
  /**
   * With a `tipo`, the stored positive magnitude -- direction comes from the
   * tipo. Without one, a signed net figure (a balance) rendered as given.
   */
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
  // With a `tipo`, direction is the tipo's business: Math.abs, so a negative
  // `importe` slipping through cannot render "--1.000". Without one the figure
  // is a net total (a balance), and its own sign is the only thing that can say
  // it is negative -- stripping it there showed an overdrawn month as a win.
  const magnitude =
    value === null || value === undefined
      ? value
      : visual
        ? Math.abs(Number(value))
        : Number(value);

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
