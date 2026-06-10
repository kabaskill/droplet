import {
  Add01Icon,
  CenterFocusIcon,
  FitToScreenIcon,
  MinusSignIcon,
  RefreshIcon,
} from "@hugeicons/core-free-icons"
import * as d3 from "d3"
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react"
import type { ZoomBehavior, ZoomTransform } from "d3"

import germanySvgUrl from "@/assets/germany.svg?url"
import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import {
  buildGermanyStateMetrics,
  homeLayerConfigs,
  homeLayerLabel,
  type GermanyStateMetric,
  type GermanyStateStatus,
} from "@/services/germany-state-map"
import type { RegionWithSnapshot } from "@/services/regional-filters"
import type { ForecastOutlook } from "@/services/types"
import { useAppStore, type HomeLayer } from "@/stores/app-store"

type GermanyStateMapProps = {
  activeLayer: HomeLayer
  forecastOutlook: ForecastOutlook | null
  mapRegions: RegionWithSnapshot[]
  onLayerChange: (layer: HomeLayer) => void
  onOpenDetails: () => void
  onSelectRegion: (regionId: string) => void
  selectedRegionId: string | null
}

type StateShape = {
  code: string
  d: string
  title: string
}

type SvgViewBox = {
  height: number
  width: number
  x: number
  y: number
}

const fallbackViewBox: SvgViewBox = {
  height: 792.66785,
  width: 585.5141,
  x: 0,
  y: 0,
}

const stateFills: Record<GermanyStateStatus, string> = {
  critical: "#dc2626",
  healthy: "#059669",
  stale: "#d97706",
  watch: "#ca8a04",
}

const labelPositions: Record<string, { x: number; y: number }> = {
  "DE-BB": { x: 66, y: 43 },
  "DE-BE": { x: 70, y: 45 },
  "DE-BW": { x: 38, y: 75 },
  "DE-BY": { x: 58, y: 77 },
  "DE-HB": { x: 37, y: 30 },
  "DE-HE": { x: 42, y: 55 },
  "DE-HH": { x: 45, y: 23 },
  "DE-MV": { x: 60, y: 22 },
  "DE-NI": { x: 39, y: 35 },
  "DE-NW": { x: 25, y: 52 },
  "DE-RP": { x: 32, y: 64 },
  "DE-SH": { x: 44, y: 14 },
  "DE-SL": { x: 25, y: 70 },
  "DE-SN": { x: 69, y: 61 },
  "DE-ST": { x: 58, y: 47 },
  "DE-TH": { x: 52, y: 60 },
}

export function GermanyStateMap({
  activeLayer,
  forecastOutlook,
  mapRegions,
  onLayerChange,
  onOpenDetails,
  onSelectRegion,
  selectedRegionId,
}: GermanyStateMapProps) {
  const mapViewport = useAppStore((state) => state.mapViewport)
  const setMapViewport = useAppStore((state) => state.setMapViewport)
  const [shapes, setShapes] = useState<StateShape[]>([])
  const [viewBox, setViewBox] = useState<SvgViewBox>(fallbackViewBox)
  const [inspectedStateCode, setInspectedStateCode] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({})
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const stateMetrics = useMemo(
    () => buildGermanyStateMetrics(mapRegions, activeLayer, forecastOutlook),
    [activeLayer, forecastOutlook, mapRegions]
  )
  const selectedStateCode = selectedRegionId
    ? Object.values(stateMetrics).find((state) =>
        state.regions.some(({ region }) => region.id === selectedRegionId)
      )?.code
    : null
  const selectedState = selectedStateCode ? stateMetrics[selectedStateCode] : null
  const inspectedState = inspectedStateCode ? stateMetrics[inspectedStateCode] : null
  const activeInfoState = inspectedState ?? selectedState
  const observedStateCount = Object.keys(stateMetrics).length
  const viewBoxValue = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`

  useEffect(() => {
    let active = true

    fetch(germanySvgUrl)
      .then((response) => response.text())
      .then((markup) => {
        if (!active) {
          return
        }

        const parsed = parseGermanySvg(markup)
        setShapes(parsed.shapes)
        setViewBox(parsed.viewBox)
      })
      .catch(() => {
        if (active) {
          setShapes([])
        }
      })

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const svg = svgRef.current

    if (!svg) {
      return
    }

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.85, 5])
      .translateExtent([
        [-viewBox.width * 0.65, -viewBox.height * 0.65],
        [viewBox.width * 1.65, viewBox.height * 1.65],
      ])
      .on("zoom", (event) => {
        const transform = event.transform

        setMapViewport({
          scale: transform.k,
          x: transform.x,
          y: transform.y,
        })
      })

    zoomRef.current = zoom
    d3.select(svg).call(zoom)

    return () => {
      d3.select(svg).on(".zoom", null)
      zoomRef.current = null
    }
  }, [setMapViewport, viewBox.height, viewBox.width])

  useEffect(() => {
    const svg = svgRef.current
    const zoom = zoomRef.current

    if (!svg || !zoom) {
      return
    }

    const currentTransform = d3.zoomTransform(svg)

    if (
      currentTransform.k === mapViewport.scale &&
      currentTransform.x === mapViewport.x &&
      currentTransform.y === mapViewport.y
    ) {
      return
    }

    d3.select(svg).call(
      zoom.transform,
      d3.zoomIdentity
        .translate(mapViewport.x, mapViewport.y)
        .scale(mapViewport.scale)
    )
  }, [mapViewport.scale, mapViewport.x, mapViewport.y])

  const selectState = (state: GermanyStateMetric | undefined) => {
    if (!state) {
      return
    }

    onSelectRegion(state.primaryRegionId)
  }

  const resetMap = () => {
    applyTransform(d3.zoomIdentity)
  }

  const zoomBy = (factor: number) => {
    const svg = svgRef.current
    const zoom = zoomRef.current

    if (!svg || !zoom) {
      return
    }

    d3.select(svg).call(zoom.scaleBy, factor)
  }

  const focusSelectedState = () => {
    if (!selectedStateCode) {
      resetMap()
      return
    }

    focusState(selectedStateCode)
  }

  const focusState = (stateCode: string) => {
    const path = pathRefs.current[stateCode]

    if (!path) {
      return
    }

    const box = path.getBBox()
    const scale = Math.min(
      4.2,
      Math.max(
        1.35,
        Math.min(viewBox.width / Math.max(box.width, 1), viewBox.height / Math.max(box.height, 1)) *
          0.48
      )
    )
    const centerX = box.x + box.width / 2
    const centerY = box.y + box.height / 2
    const nextTransform = d3.zoomIdentity
      .translate(viewBox.width / 2 - centerX * scale, viewBox.height / 2 - centerY * scale)
      .scale(scale)

    applyTransform(nextTransform)
  }

  const applyTransform = (transform: ZoomTransform) => {
    const svg = svgRef.current
    const zoom = zoomRef.current

    if (!svg || !zoom) {
      return
    }

    d3.select(svg).call(zoom.transform, transform)
  }

  return (
    <section className="grid min-h-0 gap-3">
      <div className="flex flex-col gap-3 rounded-md border bg-card p-3 shadow-sm xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h2 className="text-sm font-medium">Germany state canvas</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {homeLayerConfigs.find((layer) => layer.id === activeLayer)?.description}
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-1.5">
          {homeLayerConfigs.map((layer) => (
            <Button
              aria-pressed={activeLayer === layer.id}
              key={layer.id}
              size="sm"
              variant={activeLayer === layer.id ? "default" : "outline"}
              onClick={() => onLayerChange(layer.id)}
            >
              {layer.shortLabel}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[520px] overflow-hidden rounded-md border bg-background shadow-sm xl:min-h-[calc(100svh-7.5rem)]">
        <div className="absolute left-3 top-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur">
          <MapToolButton label="Zoom in" onClick={() => zoomBy(1.2)}>
            <ProductIcon icon={Add01Icon} />
          </MapToolButton>
          <MapToolButton label="Zoom out" onClick={() => zoomBy(0.84)}>
            <ProductIcon icon={MinusSignIcon} />
          </MapToolButton>
          <MapToolButton label="Fit map" onClick={resetMap}>
            <ProductIcon icon={FitToScreenIcon} />
          </MapToolButton>
          <MapToolButton label="Focus selected state" onClick={focusSelectedState}>
            <ProductIcon icon={CenterFocusIcon} />
          </MapToolButton>
        </div>

        <div className="absolute right-3 top-3 z-20 rounded-md border bg-background/95 px-2 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
          {observedStateCount} observed · {homeLayerLabel(activeLayer)}
        </div>

        <svg
          aria-label="Germany state map"
          className="h-full min-h-[520px] w-full touch-none xl:min-h-[calc(100svh-7.5rem)]"
          ref={svgRef}
          role="img"
          viewBox={viewBoxValue}
        >
          <rect
            className="fill-muted/20"
            height={viewBox.height}
            width={viewBox.width}
            x={viewBox.x}
            y={viewBox.y}
          />
          <g
            transform={`translate(${mapViewport.x} ${mapViewport.y}) scale(${mapViewport.scale})`}
          >
            {shapes.map((shape) => {
              const state = stateMetrics[shape.code]
              const selected = selectedStateCode === shape.code
              const fill = state ? stateFills[state.status] : "hsl(var(--muted))"
              const disabled = !state

              return (
                <path
                  aria-label={stateAriaLabel(shape, state, activeLayer)}
                  aria-pressed={selected || undefined}
                  className={cn(
                    "outline-none transition-[fill,opacity,stroke-width] duration-150 focus-visible:stroke-primary focus-visible:stroke-[3px]",
                    disabled ? "cursor-default opacity-35" : "cursor-pointer opacity-85 hover:opacity-100",
                    selected && "opacity-100"
                  )}
                  d={shape.d}
                  fill={fill}
                  key={shape.code}
                  onClick={() => selectState(state)}
                  onFocus={() => setInspectedStateCode(shape.code)}
                  onKeyDown={(event) => handleStateKeyDown(event, state, selectState)}
                  onMouseEnter={() => setInspectedStateCode(shape.code)}
                  onMouseLeave={() => setInspectedStateCode(null)}
                  ref={(node) => {
                    pathRefs.current[shape.code] = node
                  }}
                  role={disabled ? "img" : "button"}
                  stroke={selected ? "hsl(var(--primary))" : "hsl(var(--background))"}
                  strokeLinejoin="round"
                  strokeWidth={selected ? 3.4 : 1.35}
                  tabIndex={disabled ? -1 : 0}
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
            {Object.values(stateMetrics).map((state) => {
              const position = labelPositions[state.code]

              if (!position) {
                return null
              }

              const x = viewBox.x + (position.x / 100) * viewBox.width
              const y = viewBox.y + (position.y / 100) * viewBox.height

              return (
                <text
                  className={cn(
                    "pointer-events-none text-[10px] font-medium",
                    selectedStateCode === state.code
                      ? "fill-primary"
                      : "fill-foreground"
                  )}
                  dominantBaseline="middle"
                  key={state.code}
                  paintOrder="stroke"
                  stroke="hsl(var(--background))"
                  strokeLinejoin="round"
                  strokeWidth={4}
                  textAnchor="middle"
                  transform={`translate(${x} ${y}) scale(${Math.max(0.72, 1 / mapViewport.scale)})`}
                >
                  {state.title}
                </text>
              )
            })}
          </g>
        </svg>

        {!shapes.length ? (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            Loading map
          </div>
        ) : null}

        {activeInfoState ? (
          <StateInfoCard
            activeLayer={activeLayer}
            state={activeInfoState}
            onFocus={() => focusState(activeInfoState.code)}
            onOpenDetails={onOpenDetails}
          />
        ) : null}
      </div>
    </section>
  )
}

function MapToolButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <Button aria-label={label} size="icon-sm" title={label} variant="ghost" onClick={onClick}>
      {children}
    </Button>
  )
}

function StateInfoCard({
  activeLayer,
  onFocus,
  onOpenDetails,
  state,
}: {
  activeLayer: HomeLayer
  onFocus: () => void
  onOpenDetails: () => void
  state: GermanyStateMetric
}) {
  return (
    <div className="absolute bottom-3 left-3 z-20 w-[min(360px,calc(100%-1.5rem))] rounded-md border bg-background/95 p-3 text-sm shadow-lg backdrop-blur">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-semibold">{state.title}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {state.regions.length} observed region
            {state.regions.length === 1 ? "" : "s"} · {homeLayerLabel(activeLayer)}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-md px-2 py-1 text-xs font-medium capitalize",
            state.status === "healthy" &&
              "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
            state.status === "watch" &&
              "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
            state.status === "stale" &&
              "bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200",
            state.status === "critical" &&
              "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
          )}
        >
          {state.status}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-5 gap-1.5">
        {homeLayerConfigs.map((layer) => (
          <div className="min-w-0 rounded-md border bg-card px-2 py-1.5" key={layer.id}>
            <div className="truncate text-[10px] uppercase text-muted-foreground">
              {layer.shortLabel}
            </div>
            <div className="mt-0.5 text-sm font-semibold">
              {state.layerValues[layer.id]}%
            </div>
          </div>
        ))}
      </div>

      {state.warnings.length ? (
        <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {state.warnings[0]}
          {state.warnings.length > 1 ? ` +${state.warnings.length - 1} more` : ""}
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={onFocus}>
          <ProductIcon icon={CenterFocusIcon} />
          Focus
        </Button>
        <Button size="sm" onClick={onOpenDetails}>
          <ProductIcon icon={RefreshIcon} />
          Details
        </Button>
      </div>
    </div>
  )
}

function handleStateKeyDown(
  event: KeyboardEvent<SVGPathElement>,
  state: GermanyStateMetric | undefined,
  selectState: (state: GermanyStateMetric | undefined) => void
) {
  if (event.key !== "Enter" && event.key !== " ") {
    return
  }

  event.preventDefault()
  selectState(state)
}

function stateAriaLabel(
  shape: StateShape,
  state: GermanyStateMetric | undefined,
  activeLayer: HomeLayer
) {
  if (!state) {
    return `${shape.title}, no current observations`
  }

  return `${state.title}, ${homeLayerLabel(activeLayer)} ${state.metric} percent, ${state.status}`
}

function parseGermanySvg(markup: string) {
  const document = new DOMParser().parseFromString(markup, "image/svg+xml")
  const svg = document.querySelector("svg")
  const viewBox = parseViewBox(svg)
  const shapes = Array.from(document.querySelectorAll("path[id]"))
    .map((path) => ({
      code: path.id,
      d: path.getAttribute("d") ?? "",
      title: path.getAttribute("title") ?? path.id,
    }))
    .filter((shape) => shape.d)

  return {
    shapes,
    viewBox,
  }
}

function parseViewBox(svg: SVGSVGElement | null): SvgViewBox {
  if (!svg) {
    return fallbackViewBox
  }

  const viewBox = svg.getAttribute("viewBox")

  if (viewBox) {
    const [x, y, width, height] = viewBox
      .split(/\s+/)
      .map((value) => Number.parseFloat(value))

    if ([x, y, width, height].every((value) => Number.isFinite(value))) {
      return { height, width, x, y }
    }
  }

  const width = Number.parseFloat(svg.getAttribute("width") ?? `${fallbackViewBox.width}`)
  const height = Number.parseFloat(svg.getAttribute("height") ?? `${fallbackViewBox.height}`)

  return {
    height: Number.isFinite(height) ? height : fallbackViewBox.height,
    width: Number.isFinite(width) ? width : fallbackViewBox.width,
    x: 0,
    y: 0,
  }
}
