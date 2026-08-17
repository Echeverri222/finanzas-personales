import * as React from "react";

import { cn } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export interface FilterChipsOption {
  /** Always a string — Radix ToggleGroup values are strings only. */
  value: string;
  label: string;
}

export interface FilterChipsProps {
  /** Names the group for screen readers, e.g. "Filtrar por categoría". */
  label: string;
  options: FilterChipsOption[];
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

/**
 * A single-select row of chips.
 *
 * Built on Radix ToggleGroup rather than a row of <button>s, which is what the
 * two hand-rolled copies were. That swap is not cosmetic: it brings
 * `role="radiogroup"`, `aria-checked`, roving tabindex and arrow-key
 * navigation, so the chip row stops being a tab-stop-per-chip obstacle course
 * for keyboard users.
 *
 * Scrolls horizontally rather than wrapping on narrow screens — with a dozen
 * categories, wrapping pushed the actual content below the fold on mobile.
 */
export function FilterChips({
  label,
  options,
  value,
  onValueChange,
  className,
}: FilterChipsProps) {
  return (
    <ToggleGroup
      type="single"
      value={value}
      // Radix emits "" when the active item is re-pressed. A filter row has no
      // meaningful empty state, so treat that as a no-op and keep the current
      // selection instead of silently clearing to "no category matches".
      onValueChange={(next) => {
        if (next) onValueChange(next);
      }}
      aria-label={label}
      className={cn(
        "no-scrollbar -mx-1 flex w-full justify-start gap-2 overflow-x-auto px-1 py-0.5 sm:flex-wrap sm:overflow-visible",
        className,
      )}
    >
      {options.map((option) => (
        <ToggleGroupItem
          key={option.value}
          value={option.value}
          className={cn(
            "h-8 shrink-0 whitespace-nowrap rounded-full border border-border bg-card px-3.5 text-sm font-medium text-muted-foreground",
            "hover:bg-secondary hover:text-foreground",
            "data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
          )}
        >
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
