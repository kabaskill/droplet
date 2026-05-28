function SkeletonBlock({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} />
}

export function MetricTileSkeleton() {
  return (
    <div className="min-w-0 rounded-md border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-2">
        <SkeletonBlock className="size-7" />
        <SkeletonBlock className="h-3 w-20" />
      </div>
      <SkeletonBlock className="mt-4 h-7 w-16" />
    </div>
  )
}

export function RegionalFilterSkeleton() {
  return (
    <section className="rounded-md border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <SkeletonBlock className="size-5" />
          <SkeletonBlock className="h-4 w-32" />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: 5 }, (_, index) => (
            <SkeletonBlock className="h-8 w-24" key={index} />
          ))}
        </div>
      </div>
    </section>
  )
}

export function OperationsMapSkeleton() {
  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <SkeletonBlock className="h-5 w-32" />
          <SkeletonBlock className="h-4 w-72 max-w-full" />
        </div>
        <SkeletonBlock className="h-7 w-28" />
      </div>

      <div className="grid gap-3 lg:grid-cols-[minmax(280px,0.72fr)_minmax(260px,0.28fr)]">
        <SkeletonBlock className="min-h-[360px]" />
        <div className="rounded-md border bg-background p-3">
          <div className="mb-3 flex items-center justify-between">
            <SkeletonBlock className="h-4 w-28" />
            <SkeletonBlock className="h-5 w-7" />
          </div>
          <div className="grid gap-2">
            {Array.from({ length: 5 }, (_, index) => (
              <SkeletonBlock className="h-11" key={index} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <SkeletonBlock className="min-h-44" key={index} />
        ))}
      </div>
    </section>
  )
}

export function RegionDetailSkeleton() {
  return (
    <aside className="grid gap-4 xl:grid-cols-1">
      <section className="rounded-md border bg-card p-4 shadow-sm">
        <div className="mb-4 space-y-3">
          <SkeletonBlock className="h-3 w-36" />
          <div className="flex items-start justify-between gap-3">
            <SkeletonBlock className="h-6 w-40" />
            <SkeletonBlock className="h-7 w-24" />
          </div>
          <SkeletonBlock className="h-4 w-44" />
          <div className="flex flex-wrap gap-1.5">
            <SkeletonBlock className="h-7 w-36" />
            <SkeletonBlock className="h-7 w-44" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonBlock className="h-24" key={index} />
          ))}
        </div>
      </section>

      <SkeletonBlock className="h-72" />
      <SkeletonBlock className="h-56" />
    </aside>
  )
}
