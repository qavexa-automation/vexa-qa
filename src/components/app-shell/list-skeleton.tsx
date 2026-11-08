import { Skeleton } from "@/components/ui/skeleton";

/**
 * Route skeletons match the destination's structure and dimensions so the
 * shell stays visible and nothing shifts when the data arrives.
 */
export function ListSkeleton({ stats = 0, rows = 6 }: { stats?: number; rows?: number }) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full max-w-3xl">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>

      {stats > 0 ? (
        <div className="grid gap-px overflow-hidden rounded-xl bg-border ring-1 ring-border sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: stats }, (_, index) => (
            <div className="bg-card p-4" key={index}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-2 h-7 w-16" />
              <Skeleton className="mt-2 h-3 w-24" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-full sm:max-w-xs" />
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-9 w-44" />
      </div>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-card md:block">
        <div className="border-b border-border bg-muted/40 px-3 py-3">
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        {Array.from({ length: rows }, (_, index) => (
          <div className="border-b border-border px-3 py-3.5 last:border-b-0" key={index}>
            <Skeleton className="h-4 w-full" />
          </div>
        ))}
      </div>

      <div className="space-y-2 md:hidden">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="rounded-lg border border-border bg-card p-4" key={index}>
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="mt-2 h-3 w-1/4" />
            <Skeleton className="mt-4 h-3 w-3/4" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full max-w-3xl">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="mt-3 h-4 w-96 max-w-full" />
          <Skeleton className="mt-3 h-5 w-40" />
        </div>
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-9 w-80" />
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  );
}
