import {
  DropletIcon,
  ThermometerIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"

import { ProductIcon } from "@/components/app/ProductIcon"
import { cn } from "@/lib/utils"
import type { IngestionStatus, SourceHealth } from "@/services/types"

type SourceHealthPanelProps = {
  ingestionStatus: IngestionStatus | null
  sourceHealth: SourceHealth | null
}

export function SourceHealthPanel({
  ingestionStatus,
  sourceHealth,
}: SourceHealthPanelProps) {
  const fallbackCount = sourceHealth?.fallbackRegions.length ?? 0
  const staleCount = sourceHealth
    ? sourceHealth.freshnessMix.old + sourceHealth.freshnessMix.stale
    : 0
  const healthStatusLabel = sourceHealthStatusLabel(fallbackCount, staleCount)

  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium">Source health</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Provider coverage across latest regional observations
          </p>
        </div>
        <span
          className={cn(
            "rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground",
            fallbackCount > 0 && "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30",
            staleCount > 0 && "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30"
          )}
        >
          {healthStatusLabel}
        </span>
      </div>

      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-1">
          <CoverageMetric
            icon={DropletIcon}
            label="Water coverage"
            value={sourceHealth?.waterCoverage ?? 0}
          />
          <CoverageMetric
            icon={ThermometerIcon}
            label="Weather coverage"
            value={sourceHealth?.weatherCoverage ?? 0}
          />
        </div>

        <div className="grid gap-2">
          {(sourceHealth?.providerCoverage ?? []).slice(0, 5).map((provider) => (
            <div
              className="flex min-w-0 items-center justify-between gap-3 rounded-md border bg-background px-3 py-2 text-sm"
              key={`${provider.kind}-${provider.label}`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span
                  className={cn(
                    "size-2 rounded-full",
                    provider.kind === "water" && "bg-sky-500",
                    provider.kind === "weather" && "bg-emerald-500",
                    provider.kind === "fallback" && "bg-amber-500",
                    provider.kind === "model" && "bg-muted-foreground"
                  )}
                />
                <span className="truncate">{provider.label}</span>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">
                {provider.regions} regions
              </span>
            </div>
          ))}

          {!sourceHealth?.providerCoverage.length ? (
            <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
              Waiting for source coverage data
            </div>
          ) : null}
        </div>
      </div>

      {sourceHealth?.staleRegions.length ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          Stale regions:{" "}
          {sourceHealth.staleRegions
            .slice(0, 4)
            .map((region) => region.regionId)
            .join(", ")}
        </div>
      ) : null}

      <IngestionRunStatus ingestionStatus={ingestionStatus} />
    </section>
  )
}

function sourceHealthStatusLabel(fallbackCount: number, staleCount: number) {
  if (fallbackCount > 0) {
    return `${fallbackCount} fallback`
  }

  if (staleCount > 0) {
    return `${staleCount} stale`
  }

  return "Healthy"
}

type CoverageMetricProps = {
  icon: IconSvgElement
  label: string
  value: number
}

function CoverageMetric({ icon, label, value }: CoverageMetricProps) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ProductIcon icon={icon} size={14} />
        <span>{label}</span>
      </div>
      <div className="mt-2 flex items-end justify-between gap-2">
        <span className="text-xl font-semibold">{value}%</span>
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  )
}

type IngestionRunStatusProps = {
  ingestionStatus: IngestionStatus | null
}

function IngestionRunStatus({ ingestionStatus }: IngestionRunStatusProps) {
  if (!ingestionStatus || ingestionStatus.status === "unknown") {
    return (
      <div className="mt-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground">
        Waiting for ingestion run status
      </div>
    )
  }

  const refresh = ingestionStatus.snapshotRefresh
  const completedAt = ingestionStatus.completedAt
    ? new Date(ingestionStatus.completedAt).toLocaleString("en-DE")
    : "In progress"

  return (
    <div
      className={cn(
        "mt-3 rounded-md border bg-background px-3 py-2 text-xs text-muted-foreground",
        ingestionStatus.status === "failed" &&
          "border-red-200 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200",
        ingestionStatus.status === "running" &&
          "border-sky-200 bg-sky-50 text-sky-900 dark:bg-sky-950/30 dark:text-sky-200"
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium capitalize">
          Last ingestion: {ingestionStatus.status} · {ingestionStatus.trigger}
        </span>
        <span>{completedAt}</span>
      </div>
      {ingestionStatus.status === "failed" ? (
        <div className="mt-1 truncate">{ingestionStatus.error}</div>
      ) : (
        <div className="mt-1">
          Created {refresh.created} · Updated {refresh.updated} · Skipped{" "}
          {refresh.skipped} · Deleted {refresh.deleted}
        </div>
      )}
    </div>
  )
}
