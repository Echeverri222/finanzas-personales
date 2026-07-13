import * as React from "react";
import { X } from "lucide-react";

/**
 * Lightweight modal — no external dependency. Controlled via `open`/`onClose`.
 * Closes on Escape and backdrop click; locks body scroll while open.
 */
export function Dialog({ open, onClose, title, description, children }) {
  React.useEffect(() => {
    function onKey(e) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", onKey);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/50 animate-in fade-in"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg border bg-background p-6 shadow-lg"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-4 top-4 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" />
        </button>
        {title ? <h2 className="pr-8 text-lg font-semibold">{title}</h2> : null}
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
