import { useEffect, useMemo, useState, useTransition, type MouseEvent } from "react"

import germanySvgUrl from "@/assets/germany.svg?url"
import { cn } from "@/lib/utils"
import {
  buildGermanyStateMetrics,
  type GermanyStateMetric,
  type GermanyStateStatus,
} from "@/services/germany-state-map"
import type { RegionWithSnapshot } from "@/services/regional-filters"
import type { MapLayer } from "@/stores/app-store"

type GermanyStateMapProps = {
  activeLayer: MapLayer
  filteredRegions: RegionWithSnapshot[]
  onSelectRegion: (regionId: string) => void
  selectedRegionId: string | null
}

const stateFills: Record<GermanyStateStatus, string> = {
  critical: "#ef4444",
  healthy: "#10b981",
  stale: "#f59e0b",
  watch: "#f59e0b",
}

export function GermanyStateMap({
  activeLayer,
  filteredRegions,
  onSelectRegion,
  selectedRegionId,
}: GermanyStateMapProps) {
  const [isPending, startTransition] = useTransition()
  const [svgMarkup, setSvgMarkup] = useState("")
  const stateMetrics = useMemo(
    () => buildGermanyStateMetrics(filteredRegions, activeLayer),
    [activeLayer, filteredRegions]
  )
  const selectedStateCode = selectedRegionId
    ? Object.values(stateMetrics).find((state) =>
        state.regions.some(({ region }) => region.id === selectedRegionId)
      )?.code
    : null
  const observedStates = Object.values(stateMetrics).sort(
    (first, second) => second.metric - first.metric
  )

  useEffect(() => {
    let active = true

    fetch(germanySvgUrl)
      .then((response) => response.text())
      .then((markup) => {
        if (active) {
          setSvgMarkup(normalizeSvgMarkup(markup))
        }
      })
      .catch(() => {
        if (active) {
          setSvgMarkup("")
        }
      })

    return () => {
      active = false
    }
  }, [])

  const handleMapClick = (event: MouseEvent<HTMLDivElement>) => {
    const path = (event.target as Element).closest<SVGPathElement>("path[id]")
    const state = path ? stateMetrics[path.id] : null

    if (!state) {
      return
    }

    startTransition(() => onSelectRegion(state.primaryRegionId))
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(280px,0.72fr)_minmax(260px,0.28fr)]">
      <div
        className={cn(
          "flex min-h-[360px] items-center justify-center overflow-hidden rounded-md border bg-background p-3",
          isPending && "opacity-80"
        )}
      >
        <style>{stateStyleSheet(stateMetrics, selectedStateCode ?? null)}</style>
        <div
          aria-label="Germany state map"
          className="germany-state-map mx-auto flex w-full max-w-[360px] items-center justify-center"
          id="droplet-germany-map"
          onClick={handleMapClick}
          role="img"
        >
          {svgMarkup ? (
            <div
              className="contents"
              // The SVG is a checked-in local asset. Styling and click behavior are applied by state IDs.
              dangerouslySetInnerHTML={{ __html: svgMarkup }}
            />
          ) : (
            <div className="text-sm text-muted-foreground">Loading map</div>
          )}
        </div>
      </div>

      <div className="rounded-md border bg-background p-3">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium">Observed states</h3>
          <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
            {observedStates.length}
          </span>
        </div>

        {observedStates.length ? (
          <div className="grid gap-1.5">
            {observedStates.map((state) => (
              <button
                className={cn(
                  "grid grid-cols-[10px_minmax(0,1fr)_42px] items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent",
                  selectedStateCode === state.code && "bg-accent"
                )}
                key={state.code}
                onClick={() => onSelectRegion(state.primaryRegionId)}
                type="button"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: stateFills[state.status] }}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{state.title}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {state.regions.map(({ region }) => region.name).join(", ")}
                  </span>
                </span>
                <span className="text-right text-xs font-medium text-muted-foreground">
                  {state.metric}%
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
            No observed states match the active filter
          </div>
        )}
      </div>
    </div>
  )
}

function stateStyleSheet(
  stateMetrics: Record<string, GermanyStateMetric>,
  selectedStateCode: string | null
) {
  const stateRules = Object.values(stateMetrics)
    .map((state) => {
      const fill = stateFills[state.status]
      const opacity = state.status === "stale" ? 0.72 : 0.86

      return `
        #droplet-germany-map [id="${state.code}"] {
          cursor: pointer;
          fill: ${fill};
          opacity: ${opacity};
        }
        #droplet-germany-map [id="${state.code}"]:hover {
          opacity: 1;
          stroke-width: 2.2;
        }
      `
    })
    .join("\n")

  const selectedRule = selectedStateCode
    ? `
        #droplet-germany-map [id="${selectedStateCode}"] {
          opacity: 1;
          stroke: hsl(var(--foreground));
          stroke-width: 2.8;
        }
      `
    : ""

  return `
    #droplet-germany-map svg {
      display: block;
      height: auto;
      width: 100%;
    }
    #droplet-germany-map path {
      fill: transparent;
      stroke: hsl(var(--border));
      stroke-linejoin: round;
      stroke-width: 1;
      transition: fill 160ms ease, opacity 160ms ease, stroke-width 160ms ease;
    }
    ${stateRules}
    ${selectedRule}
  `
}

function normalizeSvgMarkup(markup: string) {
  const width = markup.match(/\bwidth="([0-9.]+)"/)?.[1]
  const height = markup.match(/\bheight="([0-9.]+)"/)?.[1]

  const normalizedMarkup =
    markup.includes("viewBox=") || !width || !height
      ? markup
      : markup.replace(
          "<svg",
          `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet"`
        )

  return normalizedMarkup
    .replace(/\swidth="[^"]+"/, "")
    .replace(/\sheight="[^"]+"/, "")
}
