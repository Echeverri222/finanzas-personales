import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Styled native <select>.
 *
 * Kept deliberately, and not replaced by the Radix Select in `./select.tsx`.
 * A native select is already accessible, already gets a focus ring, and is a
 * better control on mobile (it opens the platform picker). It is also the right
 * choice inside a dense table-edit row, where a 32px-tall Radix popover trigger
 * is worse UX, not better.
 *
 * The other reason to keep it: call sites here pass `<option>` children, rely on
 * `e.target.value`/`e.target.name`, and coerce values (`parseInt` on an
 * `'all' | number` union). Radix's compound API shares none of that, so a
 * migration is a per-screen rewrite rather than a swap -- see the plan.
 */
const NativeSelect = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(({ className, children, ...props }, ref) => (
  <select
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
  </select>
));
NativeSelect.displayName = "NativeSelect";

export { NativeSelect };
