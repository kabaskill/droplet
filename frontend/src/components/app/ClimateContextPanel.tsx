import {
  Alert01Icon,
  CloudFastWindIcon,
  Factory01Icon,
  Sun03Icon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import type { ReactNode } from "react"

import { ProductIcon } from "@/components/app/ProductIcon"
import { cn } from "@/lib/utils"
import type { RegionClimate } from "@/services/types"

type ClimateContextPanelProps = {
  climate: RegionClimate | null
  errorMessage?: string | null
  loading?: boolean
}

export function ClimateContextPanel({
  climate,
  errorMessage,
  loading = false,
}: ClimateContextPanelProps) {
  if (loading) {
    return <ClimateContextSkeleton />
  }

  if (errorMessage) {
    return (
      <ClimateContextShell statusLabel="Unavailable" statusTone="error">
        <PanelMessage
          title="Climate context unavailable"
          message={errorMessage}
          tone="error"
        />
      </ClimateContextShell>
    )
  }

  if (!climate) {
    return (
      <ClimateContextShell statusLabel="Waiting">
        <PanelMessage
          title="Waiting for climate context"
          message="Selected-state climate sources will appear once the read model is available."
        />
      </ClimateContextShell>
    )
  }

  return (
    <ClimateContextShell
      cacheSummary={climateCacheSummary(climate.cache)}
      statusLabel={overallStatusLabel(climate)}
      statusTone={overallStatusTone(climate)}
    >
      <div className="grid gap-3">
        <ClimateSection
          icon={Sun03Icon}
          label={capitalize(climate.sunlight.label)}
          status={climate.sunlight.status}
          title="Sunlight"
          value={scoreLabel(climate.sunlight.score)}
        >
          <div className="grid grid-cols-2 gap-2">
            <ClimateMetric
              label="Shortwave"
              value={wattMetric(climate.sunlight.irradiance.shortwaveRadiation)}
            />
            <ClimateMetric
              label="Direct share"
              value={ratioMetric(climate.sunlight.directLightShare)}
            />
            <ClimateMetric
              label="Clear sky"
              value={ratioMetric(climate.sunlight.clearSkyRatio)}
            />
            <ClimateMetric
              label="DNI"
              value={wattMetric(
                climate.sunlight.irradiance.directNormalIrradiance
              )}
            />
          </div>
          <SourceMeta
            ageMinutes={climate.sunlight.ageMinutes}
            observedAt={climate.sunlight.observedAt}
          />
          <WarningList warnings={climate.sunlight.warnings} />
        </ClimateSection>

        <ClimateSection
          icon={CloudFastWindIcon}
          label={capitalize(climate.air.riskLabel)}
          status={climate.air.status}
          title="Air quality"
          value={scoreLabel(climate.air.riskScore)}
        >
          <div className="grid grid-cols-3 gap-2">
            <ClimateMetric
              label="PM2.5"
              value={pollutantMetric(climate.air.pollutants.pm25)}
            />
            <ClimateMetric
              label="PM10"
              value={pollutantMetric(climate.air.pollutants.pm10)}
            />
            <ClimateMetric
              label="NO2"
              value={pollutantMetric(climate.air.pollutants.no2)}
            />
            <ClimateMetric
              label="O3"
              value={pollutantMetric(climate.air.pollutants.o3)}
            />
            <ClimateMetric
              label="SO2"
              value={pollutantMetric(climate.air.pollutants.so2)}
            />
            <ClimateMetric
              label="CO"
              value={pollutantMetric(climate.air.pollutants.co)}
            />
          </div>
          <div className="mt-2 truncate text-xs text-muted-foreground">
            Station: {climate.air.station?.name ?? "unavailable"}
          </div>
          <SourceMeta
            ageMinutes={climate.air.ageMinutes}
            observedAt={climate.air.observedAt}
          />
          <WarningList warnings={climate.air.warnings} />
        </ClimateSection>

        <ClimateSection
          icon={Factory01Icon}
          label="Candidate source"
          status={climate.co2.status}
          title="CO2 source"
          value="Candidate"
        >
          <div className="grid gap-2 text-xs text-muted-foreground">
            <div className="truncate">Source: {climate.co2.source}</div>
            <div className="truncate">
              Dataset: {climate.co2.datasetCandidates[0] ?? "unavailable"}
            </div>
            <div className="truncate">
              Blockers: {climate.co2.blockers.join(", ") || "none"}
            </div>
          </div>
          <WarningList warnings={climate.co2.warnings} />
        </ClimateSection>
      </div>
    </ClimateContextShell>
  )
}

type ClimateContextShellProps = {
  cacheSummary?: {
    label: string
    storedAtLabel: string | null
    tone: "default" | "error" | "warning"
  } | null
  children: ReactNode
  statusLabel: string
  statusTone?: "default" | "error" | "warning"
}

function ClimateContextShell({
  cacheSummary,
  children,
  statusLabel,
  statusTone = "default",
}: ClimateContextShellProps) {
  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium">Climate context</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Selected-state sunlight, air, and CO2 source status
          </p>
          {cacheSummary?.storedAtLabel ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Cached {cacheSummary.storedAtLabel}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <StatusBadge label={statusLabel} tone={statusTone} />
          {cacheSummary ? (
            <StatusBadge label={cacheSummary.label} tone={cacheSummary.tone} />
          ) : null}
        </div>
      </div>
      {children}
    </section>
  )
}

type ClimateSectionProps = {
  children: ReactNode
  icon: IconSvgElement
  label: string
  status: string
  title: string
  value: string
}

function ClimateSection({
  children,
  icon,
  label,
  status,
  title,
  value,
}: ClimateSectionProps) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <ProductIcon icon={icon} size={16} />
          </span>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{title}</div>
            <div className="mt-0.5 truncate text-xs text-muted-foreground">
              {label}
            </div>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-semibold">{value}</div>
          <StatusBadge label={statusLabel(status)} tone={statusTone(status)} />
        </div>
      </div>
      {children}
    </div>
  )
}

function ClimateContextSkeleton() {
  return (
    <ClimateContextShell statusLabel="Loading">
      <div className="grid gap-3">
        {Array.from({ length: 3 }, (_, index) => (
          <div className="rounded-md border bg-background p-3" key={index}>
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <SkeletonBlock className="size-8" />
                <div className="grid gap-2">
                  <SkeletonBlock className="h-4 w-24" />
                  <SkeletonBlock className="h-3 w-32" />
                </div>
              </div>
              <SkeletonBlock className="h-7 w-16" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
              <SkeletonBlock className="h-14" />
            </div>
          </div>
        ))}
      </div>
    </ClimateContextShell>
  )
}

type ClimateMetricProps = {
  label: string
  value: string
}

function ClimateMetric({ label, value }: ClimateMetricProps) {
  return (
    <div className="min-w-0 rounded-md border bg-card px-2 py-2">
      <div className="truncate text-[11px] uppercase text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 truncate text-sm font-semibold">{value}</div>
    </div>
  )
}

type SourceMetaProps = {
  ageMinutes: number | null
  observedAt: string | null
}

function SourceMeta({ ageMinutes, observedAt }: SourceMetaProps) {
  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
      <span>Age: {ageMinutes === null ? "n/a" : `${ageMinutes} min`}</span>
      <span>{observedAt ? new Date(observedAt).toLocaleString("en-DE") : "No timestamp"}</span>
    </div>
  )
}

function WarningList({ warnings }: { warnings: string[] }) {
  if (!warnings.length) {
    return null
  }

  return (
    <div className="mt-2 grid gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
      {warnings.slice(0, 2).map((warning) => (
        <div className="flex min-w-0 items-start gap-1.5" key={warning}>
          <ProductIcon className="mt-0.5 shrink-0" icon={Alert01Icon} size={13} />
          <span className="min-w-0 break-words">{warning}</span>
        </div>
      ))}
    </div>
  )
}

type PanelMessageProps = {
  message: string
  title: string
  tone?: "default" | "error"
}

function PanelMessage({ message, title, tone = "default" }: PanelMessageProps) {
  return (
    <div
      className={cn(
        "rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground",
        tone === "error" &&
          "border-red-200 bg-red-50 text-red-900 dark:bg-red-950/30 dark:text-red-200"
      )}
    >
      <div className="font-medium text-foreground">{title}</div>
      <div className="mt-1">{message}</div>
    </div>
  )
}

function StatusBadge({
  label,
  tone = "default",
}: {
  label: string
  tone?: "default" | "error" | "warning"
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground",
        tone === "warning" &&
          "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30",
        tone === "error" &&
          "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/30"
      )}
    >
      {label}
    </span>
  )
}

function overallStatusLabel(climate: RegionClimate) {
  const statuses = [climate.sunlight.status, climate.air.status]

  if (statuses.some((status) => status === "unavailable")) {
    return "Partial"
  }

  if (statuses.some((status) => status !== "ok")) {
    return "Context"
  }

  return "Available"
}

function overallStatusTone(climate: RegionClimate) {
  return [climate.sunlight.status, climate.air.status].some(
    (status) => status !== "ok"
  )
    ? "warning"
    : "default"
}

function climateCacheSummary(cache: RegionClimate["cache"]) {
  if (!cache) {
    return null
  }

  const refreshing = cache.refreshStarted

  if (refreshing) {
    return {
      label: "Refreshing",
      storedAtLabel: shortDateTime(cache.storedAt),
      tone: "warning" as const,
    }
  }

  if (cache.status === "fresh") {
    return {
      label: "Cache fresh",
      storedAtLabel: shortDateTime(cache.storedAt),
      tone: "default" as const,
    }
  }

  if (cache.status === "miss" || cache.status === "stored") {
    return {
      label: "Cache new",
      storedAtLabel: shortDateTime(cache.storedAt),
      tone: "default" as const,
    }
  }

  if (cache.status === "stale") {
    return {
      label: "Cache stale",
      storedAtLabel: shortDateTime(cache.storedAt),
      tone: "warning" as const,
    }
  }

  return {
    label: "Cache bypass",
    storedAtLabel: shortDateTime(cache.storedAt),
    tone: "warning" as const,
  }
}

function statusLabel(status: string) {
  if (status.includes("candidate")) {
    return "candidate"
  }

  return status.replaceAll("_", " ")
}

function statusTone(status: string) {
  if (status === "unavailable") {
    return "error"
  }

  if (status !== "ok") {
    return "warning"
  }

  return "default"
}

function scoreLabel(score: number | null) {
  return score === null ? "n/a" : `${Math.round(score)}`
}

function pollutantMetric(value: number | null) {
  return value === null ? "n/a" : `${formatNumber(value)} ug/m3`
}

function wattMetric(value: number | null) {
  return value === null ? "n/a" : `${formatNumber(value)} W/m2`
}

function ratioMetric(value: number | null) {
  return value === null ? "n/a" : `${Math.round(value * 100)}%`
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1)
}

function capitalize(value: string) {
  return value ? value[0].toUpperCase() + value.slice(1) : "Unavailable"
}

function shortDateTime(value: string | null) {
  if (!value) {
    return null
  }

  return new Date(value).toLocaleString("en-DE", {
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    month: "2-digit",
  })
}

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}
