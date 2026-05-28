import {
  ChartLineData01Icon,
  CloudMidRainIcon,
  ThermometerIcon,
  TimeScheduleIcon,
} from "@hugeicons/core-free-icons"
import type { IconSvgElement } from "@hugeicons/react"
import type { ReactNode } from "react"

import { ProductIcon } from "@/components/app/ProductIcon"
import { cn } from "@/lib/utils"
import type {
  ForecastOutlook,
  ForecastRegionOutlook,
  Region,
} from "@/services/types"

type ForecastOutlookPanelProps = {
  errorMessage?: string | null
  loading?: boolean
  outlook: ForecastOutlook | null
  regions: Region[]
  selectedRegionId: string | null
}

export function ForecastOutlookPanel({
  errorMessage,
  loading = false,
  outlook,
  regions,
  selectedRegionId,
}: ForecastOutlookPanelProps) {
  if (loading) {
    return <ForecastOutlookSkeleton />
  }

  if (errorMessage) {
    return (
      <ForecastOutlookShell statusLabel="Unavailable" statusTone="error">
        <PanelMessage
          title="Forecast outlook unavailable"
          message={errorMessage}
          tone="error"
        />
      </ForecastOutlookShell>
    )
  }

  const activeOutlook =
    outlook?.regions.find((region) => region.regionId === selectedRegionId) ??
    outlook?.regions[0] ??
    null
  const elevatedRegions =
    outlook?.regions
      .filter((region) => region.riskLevel !== "low")
      .sort((first, second) => second.pressureScore - first.pressureScore)
      .slice(0, 3) ?? []

  return (
    <ForecastOutlookShell
      statusLabel={outlook ? `${outlook.coverage}% forecast` : "Waiting"}
      statusTone={outlook && outlook.coverage < 100 ? "warning" : "default"}
    >
      {activeOutlook && outlook ? (
        <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="rounded-md border bg-background p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">
                  {regionName(regions, activeOutlook.regionId)}
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <ProductIcon icon={TimeScheduleIcon} size={14} />
                  <span>{outlook.horizonHours}h horizon</span>
                </div>
              </div>
              <RiskBadge riskLevel={activeOutlook.riskLevel} />
            </div>

            <div className="mt-4">
              <div className="flex items-end justify-between gap-2">
                <span className="text-3xl font-semibold">
                  {activeOutlook.pressureScore}
                </span>
                <span className="pb-1 text-xs uppercase text-muted-foreground">
                  pressure
                </span>
              </div>
              <PressureBar value={activeOutlook.pressureScore} />
            </div>

            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {activeOutlook.summary}
            </p>
          </div>

          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-3">
              <ForecastMetric
                icon={CloudMidRainIcon}
                label="Rainfall"
                value={`${activeOutlook.forecastRainfallMm.toFixed(1)} mm`}
              />
              <ForecastMetric
                icon={ThermometerIcon}
                label="Max temp"
                value={nullableMetric(activeOutlook.maxTemperatureC, " C")}
              />
              <ForecastMetric
                icon={ChartLineData01Icon}
                label="Humidity floor"
                value={nullableMetric(activeOutlook.minHumidityPercent, "%")}
              />
            </div>

            <div className="grid gap-2">
              {elevatedRegions.length ? (
                elevatedRegions.map((region) => (
                  <ForecastRow
                    key={region.regionId}
                    outlook={region}
                    regionName={regionName(regions, region.regionId)}
                  />
                ))
              ) : (
                <div className="rounded-md border bg-background px-3 py-2 text-sm text-muted-foreground">
                  No elevated forecast pressure across observed states
                </div>
              )}
            </div>

            <div className="truncate text-xs text-muted-foreground">
              Source: {activeOutlook.source}
            </div>
          </div>
        </div>
      ) : (
        <PanelMessage
          title="Waiting for forecast outlook"
          message="Forecast pressure estimates will appear once the outlook read model is available."
        />
      )}
    </ForecastOutlookShell>
  )
}

type ForecastOutlookShellProps = {
  children: ReactNode
  statusLabel: string
  statusTone?: "default" | "error" | "warning"
}

function ForecastOutlookShell({
  children,
  statusLabel,
  statusTone = "default",
}: ForecastOutlookShellProps) {
  return (
    <section className="rounded-md border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-medium">Forecast outlook</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Open-Meteo pressure estimate for the next operating window
          </p>
        </div>
        <span
          className={cn(
            "rounded-md border bg-background px-2 py-1 text-xs text-muted-foreground",
            statusTone === "warning" &&
              "border-amber-300 bg-amber-50 text-amber-800 dark:bg-amber-950/30",
            statusTone === "error" &&
              "border-red-300 bg-red-50 text-red-800 dark:bg-red-950/30"
          )}
        >
          {statusLabel}
        </span>
      </div>
      {children}
    </section>
  )
}

function ForecastOutlookSkeleton() {
  return (
    <ForecastOutlookShell statusLabel="Loading">
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SkeletonBlock className="h-56" />
        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <SkeletonBlock className="h-24" key={index} />
            ))}
          </div>
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonBlock className="h-14" key={index} />
          ))}
        </div>
      </div>
    </ForecastOutlookShell>
  )
}

type ForecastMetricProps = {
  icon: IconSvgElement
  label: string
  value: string
}

function ForecastMetric({ icon, label, value }: ForecastMetricProps) {
  return (
    <div className="rounded-md border bg-background p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <ProductIcon icon={icon} size={14} />
        <span>{label}</span>
      </div>
      <div className="mt-2 text-lg font-semibold">{value}</div>
    </div>
  )
}

type ForecastRowProps = {
  outlook: ForecastRegionOutlook
  regionName: string
}

function ForecastRow({ outlook, regionName }: ForecastRowProps) {
  return (
    <div className="grid gap-2 rounded-md border bg-background px-3 py-2 text-sm sm:grid-cols-[minmax(0,1fr)_72px_80px] sm:items-center">
      <div className="min-w-0">
        <div className="truncate font-medium">{regionName}</div>
        <div className="truncate text-xs text-muted-foreground">
          {outlook.trend} · {outlook.forecastRainfallMm.toFixed(1)} mm forecast
        </div>
      </div>
      <div className="text-xs text-muted-foreground">
        {outlook.pressureScore} pressure
      </div>
      <RiskBadge riskLevel={outlook.riskLevel} />
    </div>
  )
}

function PressureBar({ value }: { value: number }) {
  return (
    <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
      <div
        className={cn(
          "h-full rounded-full",
          value >= 70 && "bg-red-500",
          value >= 45 && value < 70 && "bg-amber-500",
          value < 45 && "bg-emerald-500"
        )}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

function RiskBadge({ riskLevel }: { riskLevel: ForecastRegionOutlook["riskLevel"] }) {
  return (
    <span
      className={cn(
        "w-fit rounded-md px-2 py-1 text-xs font-medium capitalize",
        riskLevel === "high" && "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
        riskLevel === "medium" &&
          "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
        riskLevel === "low" &&
          "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
      )}
    >
      {riskLevel}
    </span>
  )
}

function nullableMetric(value: number | null, suffix: string) {
  return value === null ? "n/a" : `${value}${suffix}`
}

function regionName(regions: Region[], regionId: string) {
  return regions.find((region) => region.id === regionId)?.name ?? regionId
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

function SkeletonBlock({ className }: { className: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />
}
