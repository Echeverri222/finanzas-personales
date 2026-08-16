import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Compatibility wrapper exposing the `{ open, onClose, title, description }` API
 * that the hand-rolled Dialog used, implemented on the Radix one.
 *
 * The point is to gain what the old modal never had -- a focus trap, focus
 * restored to the trigger on close, and `aria-labelledby` wired to the title --
 * without rewriting four call sites in the same commit. Radix also portals to
 * document.body, so the modal is no longer subject to a parent's overflow or
 * stacking context.
 *
 * New code should prefer the compound Dialog directly; this exists so the
 * migration could be mechanical.
 */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  className,
}: ModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className={className}>
        {/* Radix warns when a dialog has no accessible name, and every current
            caller passes a title -- but the prop is optional, so fall back to a
            visually hidden one rather than shipping an unnamed dialog. */}
        <DialogHeader>
          {title ? (
            <DialogTitle>{title}</DialogTitle>
          ) : (
            <DialogTitle className="sr-only">Diálogo</DialogTitle>
          )}
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
