export default function Skeleton({ className = "h-4 w-full" }) {
  return <div aria-hidden="true" className={`skeleton ${className}`} />;
}

/** Matches the real table: 44px header, 56px rows */
export function TableSkeleton({ rows = 6 }) {
  return (
    <div className="border border-white/10 bg-card" aria-busy="true" aria-label="Loading">
      <div className="h-11" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex h-14 items-center gap-4 border-t border-white/5 px-4">
          <Skeleton className="size-8 shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-2/5" />
            <Skeleton className="h-2.5 w-1/4" />
          </div>
          <Skeleton className="hidden h-3 w-20 sm:block" />
          <Skeleton className="hidden h-3 w-24 md:block" />
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="space-y-3">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-72 max-w-full" />
      </div>
      <TableSkeleton />
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-8" aria-busy="true">
      <Skeleton className="h-4 w-14" />
      <div className="flex items-start gap-4">
        <Skeleton className="size-12 shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-2/5" />
          <Skeleton className="h-4 w-1/4" />
        </div>
      </div>
      <div className="grid gap-px border border-white/10 bg-white/10 lg:grid-cols-2">
        {[0, 1].map((k) => (
          <div key={k} className="space-y-4 bg-card p-6">
            <Skeleton className="h-4 w-24" />
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-3.5 w-full" />)}
          </div>
        ))}
      </div>
      <TableSkeleton rows={3} />
    </div>
  );
}