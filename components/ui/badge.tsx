import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Hand-maintained rather than taken from `shadcn add badge`, on purpose.
 *
 * Upstream's badge has no `success` or `warning` variant, and cva emits NO
 * classes for a variant it doesn't know -- silently, with no error. The one
 * consumer that needs it passes the variant as an expression
 * (MovimientosDesktop: `variant={isIngreso ? 'success' : 'secondary'}`), so
 * neither the compiler nor a grep for `variant="success"` would have caught
 * the regression; the badge would just have rendered unstyled.
 *
 * success/warning use the *muted* token pair (tinted surface + matching ink),
 * which is what a text badge needs. They were the literal emerald-100/800 and
 * amber-100/800 values before, so this is a rename rather than a restyle --
 * except that they now have dark-mode equivalents, which raw palette classes
 * never did.
 */
const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "text-foreground",
        success:
          "border-transparent bg-success-muted text-success-muted-foreground",
        warning:
          "border-transparent bg-warning-muted text-warning-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
