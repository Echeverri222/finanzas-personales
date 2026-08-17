import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading placeholders shaped like the content that replaces them.
 *
 * Replaces eight screens that blanked to a centred "Cargando..." — which reads
 * as an empty app rather than a loading one, and reflows the whole page when the
 * data lands.
 *
 * Deliberately no randomised widths: the version of this that shipped in the
 * old (unused) LoadingSkeleton.js used Math.random() for bar heights, which is a
 * guaranteed server/client hydration mismatch. Every width here is fixed.
 */

function Row() {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <Skeleton className="h-4 w-20 shrink-0" />
    </div>
  );
}

/** A list of transaction-shaped rows, inside a card. */
export function ListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      {Array.from({ length: rows }, (_, i) => (
        <Row key={i} />
      ))}
    </Card>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando dashboard…</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>
      <Skeleton className="h-14 w-full rounded-lg" />
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-56 rounded-lg lg:col-span-5" />
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
          <Skeleton className="h-36 rounded-lg" />
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-12">
        <Skeleton className="h-80 rounded-lg lg:col-span-8" />
        <Skeleton className="h-80 rounded-lg lg:col-span-4" />
      </div>
      <ListSkeleton />
    </div>
  );
}

export function MovimientosSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <span className="sr-only">Cargando movimientos…</span>
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-28 w-full rounded-lg" />
      <ListSkeleton rows={8} />
    </div>
  );
}
