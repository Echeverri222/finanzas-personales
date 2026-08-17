import * as React from "react";

import { cn } from "@/lib/utils";

export interface HeroCardProps {
  /** Small caps label, e.g. "Balance total". */
  label: string;
  /** The headline figure. Pass an <Amount> so it inherits the mono treatment. */
  value: React.ReactNode;
  /** Optional pill under the figure — the period, a trend. */
  badge?: React.ReactNode;
  /** Actions row. */
  children?: React.ReactNode;
  className?: string;
}

/**
 * The primary "one number that matters" surface.
 *
 * Replaces three divergent copies (ahorros, and one in each dashboard view).
 * The gradient and the corner glow are lifted from the Figma Make design: a
 * flat `bg-primary` rectangle was the single largest element on the dashboard
 * and read as an unfinished placeholder. Both are painted with `--primary` so
 * they still follow the theme rather than pinning a hex.
 *
 * `overflow-hidden` is load-bearing — it is what clips the oversized glow to
 * the card's rounded corner.
 */
export function HeroCard({ label, value, badge, children, className }: HeroCardProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-lg p-6 text-primary-foreground shadow-card sm:p-8",
        "bg-primary bg-gradient-to-br from-primary via-primary to-primary/80",
        className,
      )}
    >
      {/* Decorative corner light. aria-hidden and pointer-events-none so it can
          never intercept a click meant for the actions below. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.22)_0%,transparent_70%)]"
      />
      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-primary-foreground/70">
          {label}
        </p>
        <div className="mt-2">{value}</div>
        {badge ? <div className="mt-4">{badge}</div> : null}
        {children ? <div className="mt-6 flex flex-wrap gap-3">{children}</div> : null}
      </div>
    </div>
  );
}

/** The pill used in HeroCard's `badge` slot. */
export function HeroBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-3 py-1 text-sm font-medium">
      {children}
    </span>
  );
}
