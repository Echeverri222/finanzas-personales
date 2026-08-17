import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { TableCell, TableRow } from "@/components/ui/table";

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Usually a <Link> styled as a button, or a <Button>. */
  action?: React.ReactNode;
  className?: string;
}

/**
 * "There is nothing here", said the same way everywhere.
 *
 * Replaces nine inconsistent versions that ranged from a bare centred sentence
 * to a full icon-plus-action block. An empty screen is where a new user spends
 * their first minute, so it always names the thing that is missing and offers
 * the action that fixes it.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-12 text-center", className)}>
      {Icon ? (
        <span
          aria-hidden="true"
          className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-secondary text-muted-foreground"
        >
          <Icon className="size-6" strokeWidth={1.75} />
        </span>
      ) : null}
      <p className="font-medium">{title}</p>
      {description ? (
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

/** The same block, wrapped so it can sit inside a <TableBody>. */
export function TableEmptyState({
  colSpan,
  ...props
}: EmptyStateProps & { colSpan: number }) {
  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={colSpan} className="p-0">
        <EmptyState {...props} />
      </TableCell>
    </TableRow>
  );
}
