import { cn } from "@/lib/utils";
import { iconForCategory, tipoVisual } from "@/lib/tipoVisuals";
import type { TipoCategoria } from "@/types/domain";

const BOXES = {
  sm: "size-8 rounded-md [&>svg]:size-4",
  base: "size-10 rounded-lg [&>svg]:size-5",
  lg: "size-11 rounded-lg [&>svg]:size-5",
} as const;

export interface TypeIconProps {
  /**
   * Semantic category. Decides the tint and the fallback glyph. Nullable
   * because most call sites are still `.jsx` and therefore unchecked; see
   * tipoVisual for what a missing value degrades to.
   */
  tipo: TipoCategoria | null | undefined;
  /**
   * Category name, used ONLY to pick a nicer decorative glyph (a car for
   * "Transporte"). Never affects colour, and falls back silently when a user
   * renames the category -- see iconForCategory.
   */
  nombre?: string | null;
  size?: keyof typeof BOXES;
  className?: string;
}

/**
 * The tinted rounded square that fronts a transaction row.
 *
 * Consolidates nine hand-rolled copies whose emerald/rose shades had drifted
 * apart between the mobile and desktop views. Decorative by definition: the row
 * always states its category in text as well, so the glyph is `aria-hidden` and
 * carries no accessible name to duplicate.
 */
export function TypeIcon({ tipo, nombre, size = "base", className }: TypeIconProps) {
  const Icon = iconForCategory(nombre, tipo);
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        BOXES[size],
        tipoVisual(tipo).iconSurface,
        className,
      )}
    >
      <Icon strokeWidth={2} />
    </span>
  );
}
