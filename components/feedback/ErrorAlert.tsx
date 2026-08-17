import { AlertCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export interface ErrorAlertProps {
  /** Renders nothing when falsy, so call sites need no `{error && ...}` guard. */
  error?: string | Error | null;
  title?: string;
  className?: string;
}

/**
 * A failed background load, stated in place.
 *
 * Replaces eight hand-rolled banners that had drifted into two different styles.
 * `role="alert"` is the part that was missing everywhere: without it a screen
 * reader user gets no announcement that the thing they asked for failed.
 *
 * The rule this belongs to: a background load that fails shows an ErrorAlert
 * where the data would have been; an explicit user action that fails shows a
 * toast; a validation failure shows a field error.
 */
export function ErrorAlert({ error, title = "Algo salió mal", className }: ErrorAlertProps) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : error;

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive",
        className,
      )}
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        <p className="font-semibold">{title}</p>
        {message ? <p className="mt-0.5 break-words opacity-90">{message}</p> : null}
      </div>
    </div>
  );
}
