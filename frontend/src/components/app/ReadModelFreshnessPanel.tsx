import {
  DatabaseSyncIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"

import { ProductIcon } from "@/components/app/ProductIcon"
import { cn } from "@/lib/utils"

export type ReadModelFreshnessItem = {
  error?: boolean
  isFetching: boolean
  label: string
  updatedAt: number
}

type ReadModelFreshnessPanelProps = {
  items: ReadModelFreshnessItem[]
  now: number
  onRetry: () => void
}

const staleAfterMs = 1000 * 60 * 5

export function ReadModelFreshnessPanel({
  items,
  now,
  onRetry,
}: ReadModelFreshnessPanelProps) {
  const staleCount = items.filter((item) => freshnessState(item, now) === "stale").length
  const missingCount = items.filter((item) => freshnessState(item, now) === "missing").length
  const errorCount = items.filter((item) => freshnessState(item, now) === "error").length
  const statusTone = errorCount > 0 || missingCount > 0 || staleCount > 0 ? "warning" : "default"
  const statusLabel =
    errorCount > 0
      ? `${errorCount} error`
      : missingCount > 0
        ? `${missingCount} waiting`
        : staleCount > 0
          ? `${staleCount} stale`
          : "Fresh"

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium">Read-model freshness</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Last successful dashboard updates from the frontend cache.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            className="rounded-md border bg-background px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={onRetry}
            type="button"
          >
            Retry live data
          </button>
          <span
            className={cn(
              "rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground",
              statusTone === "warning" &&
                "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30"
            )}
          >
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {items.map((item) => (
          <FreshnessRow item={item} key={item.label} now={now} />
        ))}
      </div>
    </section>
  )
}

function FreshnessRow({
  item,
  now,
}: {
  item: ReadModelFreshnessItem
  now: number
}) {
  const state = freshnessState(item, now)

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm">
      <div className="flex min-w-0 items-center gap-2">
        <span
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md",
            state === "fresh" && "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
            state === "fetching" && "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200",
            state === "stale" && "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
            (state === "missing" || state === "error") &&
              "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
          )}
        >
          <ProductIcon icon={item.isFetching ? RefreshIcon : DatabaseSyncIcon} size={14} />
        </span>
        <span className="truncate font-medium">{item.label}</span>
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">
        {freshnessLabel(item, now)}
      </span>
    </div>
  )
}

function freshnessState(item: ReadModelFreshnessItem, now: number) {
  if (item.error) {
    return "error"
  }

  if (item.isFetching) {
    return "fetching"
  }

  if (item.updatedAt === 0) {
    return "missing"
  }

  if (now > 0 && now - item.updatedAt > staleAfterMs) {
    return "stale"
  }

  return "fresh"
}

function freshnessLabel(item: ReadModelFreshnessItem, now: number) {
  const state = freshnessState(item, now)

  if (state === "error") {
    return "Error"
  }

  if (state === "fetching") {
    return "Syncing"
  }

  if (state === "missing") {
    return "Waiting"
  }

  const ageMs = Math.max(0, now - item.updatedAt)
  const ageMinutes = Math.floor(ageMs / 60_000)

  if (ageMinutes < 1) {
    return "Just now"
  }

  if (ageMinutes < 60) {
    return `${ageMinutes}m ago`
  }

  const ageHours = Math.floor(ageMinutes / 60)

  return `${ageHours}h ago`
}
