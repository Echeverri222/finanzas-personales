import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * Which token family tints the icon square. Deliberately a small closed set
 * rather than a free-form className: eight call sites picking their own
 * emerald/rose/amber shades is exactly the drift this component exists to end.
 */
const TONES = {
  income: "bg-income/10 text-income",
  expense: "bg-expense/10 text-expense",
  // Matches TIPO_VISUALS.ahorro.iconSurface, so a savings figure is the same
  // colour whether it appears as a stat or as a transaction row.
  savings: "bg-chart-3/15 text-chart-3",
  neutral: "bg-secondary text-muted-foreground",
  primary: "bg-primary/10 text-primary",
} as const;

export interface StatCardProps {
  label: string;
  /** Pass an <Amount> for money, plain text otherwise. */
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: keyof typeof TONES;
  /** Optional line under the figure — a comparison, a count, a hint. */
  hint?: React.ReactNode;
  className?: string;
}

/** A labelled figure with a tinted icon. Replaces eight near-identical copies. */
export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "neutral",
  hint,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("flex flex-col justify-between p-5 shadow-card", className)}>
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span
            aria-hidden="true"
            className={cn(
              "inline-flex size-9 shrink-0 items-center justify-center rounded-lg",
              TONES[tone],
            )}
          >
            <Icon className="size-[18px]" strokeWidth={2} />
          </span>
        ) : null}
      </div>
      <div className="mt-4">{value}</div>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </Card>
  );
}
