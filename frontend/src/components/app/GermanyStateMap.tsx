import {
  Add01Icon,
  CenterFocusIcon,
  FitToScreenIcon,
  MinusSignIcon,
} from "@hugeicons/core-free-icons"
import * as d3 from "d3"
import { useQuery } from "@tanstack/react-query"
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react"
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
  className?: string
  forecastOutlook: ForecastOutlook | null
  mapRegions: RegionWithSnapshot[]
  onLayerChange: (layer: HomeLayer) => void
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
  height: 800,
  width: 600,
  x: 0,
  y: 0,
}

const stateFills: Record<GermanyStateStatus, string> = {
  critical: "#dc2626",
  healthy: "#059669",
  stale: "#d97706",
  watch: "#ca8a04",
}

function applySvgTransform(
  svg: SVGSVGElement | null,
  zoom: ZoomBehavior<SVGSVGElement, unknown> | null,
  transform: ZoomTransform
) {
  if (!svg || !zoom) {
    return
  }

  d3.select(svg).call(zoom.transform, transform)
}

function focusTransformForPath(path: SVGPathElement, viewBox: SvgViewBox) {
  const box = path.getBBox()
  const scale = Math.min(
    4.2,
    Math.max(
      1.35,
      Math.min(
        viewBox.width / Math.max(box.width, 1),
        viewBox.height / Math.max(box.height, 1)
      ) * 0.48
    )
  )
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2

  return d3.zoomIdentity
    .translate(
      viewBox.width / 2 - centerX * scale,
      viewBox.height / 2 - centerY * scale
    )
    .scale(scale)
}

export function GermanyStateMap({
  activeLayer,
  className,
  forecastOutlook,
  mapRegions,
  onLayerChange,
  onSelectRegion,
  selectedRegionId,
}: GermanyStateMapProps) {
  const mapViewport = useAppStore((state) => state.mapViewport)
  const setMapViewport = useAppStore((state) => state.setMapViewport)
  const germanySvgQuery = useQuery({
    queryKey: ["germany-svg"],
    queryFn: async () => {
      const response = await fetch(germanySvgUrl)
      const markup = await response.text()
      return parseGermanySvg(markup)
    },
    staleTime: Infinity,
  })

  const shapes = germanySvgQuery.data?.shapes ?? []
  const viewBox = germanySvgQuery.data?.viewBox ?? fallbackViewBox
  const [hoverTooltip, setHoverTooltip] = useState<{
    stateCode: string
    x: number
    y: number
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const pathRefs = useRef<Record<string, SVGPathElement | null>>({})
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const lastFocusedStateRef = useRef<string | null>(null)
  const stateMetrics = buildGermanyStateMetrics(
    mapRegions,
    activeLayer,
    forecastOutlook
  )
  const selectedStateCode = selectedRegionId
    ? Object.values(stateMetrics).find((state) =>
        state.regions.some(({ region }) => region.id === selectedRegionId)
      )?.code
    : null
  const hoveredState = hoverTooltip
    ? stateMetrics[hoverTooltip.stateCode]
    : null
  const viewBoxValue = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`

  useEffect(() => {
    const svg = svgRef.current

    if (!svg) {
      return
    }

    const handleZoom = (event: { transform: ZoomTransform }) => {
      const transform = event.transform

      setMapViewport({
        scale: transform.k,
        x: transform.x,
        y: transform.y,
      })
    }

    const zoom = d3.zoom<SVGSVGElement, unknown>()
    zoom.scaleExtent([0.85, 5])
    zoom.translateExtent([
      [-viewBox.width * 0.65, -viewBox.height * 0.65],
      [viewBox.width * 1.65, viewBox.height * 1.65],
    ])
    zoom.on("zoom", handleZoom)

    zoomRef.current = zoom
    d3.select(svg).call(zoom)

    return () => {
      zoom.on("zoom", null)
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

  const applyTransform = (transform: ZoomTransform) => {
    applySvgTransform(svgRef.current, zoomRef.current, transform)
  }

  const focusState = (stateCode: string) => {
    const path = pathRefs.current[stateCode]

    if (!path) {
      return
    }

    applyTransform(focusTransformForPath(path, viewBox))
  }

  useEffect(() => {
    if (
      !selectedStateCode ||
      !shapes.length ||
      lastFocusedStateRef.current === selectedStateCode
    ) {
      return
    }

    lastFocusedStateRef.current = selectedStateCode
    const frameId = window.requestAnimationFrame(() => {
      const path = pathRefs.current[selectedStateCode]

      if (!path) {
        return
      }

      applySvgTransform(
        svgRef.current,
        zoomRef.current,
        focusTransformForPath(path, viewBox)
      )
    })

    return () => window.cancelAnimationFrame(frameId)
  }, [selectedStateCode, shapes.length, viewBox])

  const selectState = (state: GermanyStateMetric | undefined) => {
    if (!state) {
      return
    }

    lastFocusedStateRef.current = state.code
    onSelectRegion(state.primaryRegionId)
    focusState(state.code)
  }

  const resetMap = () => {
    lastFocusedStateRef.current = selectedStateCode ?? null
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

    lastFocusedStateRef.current = selectedStateCode
    focusState(selectedStateCode)
  }

  const updateHoverTooltip = (
    event: ReactMouseEvent<SVGPathElement>,
    stateCode: string
  ) => {
    if (!stateMetrics[stateCode]) {
      setHoverTooltip(null)
      return
    }

    const rect = containerRef.current?.getBoundingClientRect()

    if (!rect) {
      return
    }

    setHoverTooltip({
      stateCode,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    })
  }

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden bg-background",
        className
      )}
      ref={containerRef}
    >
      <MapZoomControls
        focusSelectedState={focusSelectedState}
        resetMap={resetMap}
        zoomBy={zoomBy}
      />
      <MapLayerSelector
        activeLayer={activeLayer}
        onLayerChange={onLayerChange}
      />

      <svg
        aria-label="Germany state map"
        className="h-full w-full touch-none"
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
                  "transition-[fill,opacity,stroke-width] duration-150 outline-none focus-visible:stroke-primary focus-visible:stroke-[3px]",
                  disabled
                    ? "cursor-default opacity-35"
                    : "cursor-pointer opacity-85 hover:opacity-100",
                  selected && "opacity-100"
                )}
                d={shape.d}
                fill={fill}
                key={shape.code}
                onClick={() => selectState(state)}
                onKeyDown={(event) =>
                  handleStateKeyDown(event, state, selectState)
                }
                onMouseEnter={(event) => updateHoverTooltip(event, shape.code)}
                onMouseLeave={() => setHoverTooltip(null)}
                onMouseMove={(event) => updateHoverTooltip(event, shape.code)}
                ref={(node) => {
                  pathRefs.current[shape.code] = node
                }}
                role={disabled ? "img" : "button"}
                stroke={
                  selected ? "hsl(var(--primary))" : "hsl(var(--background))"
                }
                strokeLinejoin="round"
                strokeWidth={selected ? 3.4 : 1.35}
                tabIndex={disabled ? -1 : 0}
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </g>
      </svg>

      <MapLoadingOverlay visible={!shapes.length} />

      {hoveredState && hoverTooltip ? (
        <StateHoverTooltip
          activeLayer={activeLayer}
          state={hoveredState}
          x={hoverTooltip.x}
          y={hoverTooltip.y}
        />
      ) : null}
    </div>
  )
}

function MapZoomControls({
  focusSelectedState,
  resetMap,
  zoomBy,
}: {
  focusSelectedState: () => void
  resetMap: () => void
  zoomBy: (factor: number) => void
}) {
  return (
    <div className="absolute bottom-20 left-3 z-20 flex max-w-[calc(100%-1.5rem)] flex-wrap items-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur xl:bottom-4 xl:left-4">
      <MapToolButton label="Zoom in" onClick={() => zoomBy(1.2)}>
        <ProductIcon icon={Add01Icon} />
      </MapToolButton>
      <MapToolButton label="Zoom out" onClick={() => zoomBy(0.84)}>
        <ProductIcon icon={MinusSignIcon} />
      </MapToolButton>
      <MapToolButton label="Fit map" onClick={resetMap}>
        <ProductIcon icon={FitToScreenIcon} />
      </MapToolButton>
      <MapToolButton
        label="Focus selected state"
        onClick={focusSelectedState}
      >
        <ProductIcon icon={CenterFocusIcon} />
      </MapToolButton>
    </div>
  )
}

function MapLayerSelector({
  activeLayer,
  onLayerChange,
}: {
  activeLayer: HomeLayer
  onLayerChange: (layer: HomeLayer) => void
}) {
  return (
    <div className="absolute bottom-20 left-1/2 z-20 flex max-w-[calc(100%-8rem)] -translate-x-1/2 flex-wrap justify-center gap-1 rounded-md border bg-background/95 p-1 shadow-sm backdrop-blur xl:bottom-4">
      {homeLayerConfigs.map((layer) => (
        <Button
          aria-pressed={activeLayer === layer.id}
          key={layer.id}
          size="sm"
          variant={activeLayer === layer.id ? "default" : "ghost"}
          onClick={() => onLayerChange(layer.id)}
        >
          {layer.shortLabel}
        </Button>
      ))}
    </div>
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
    <Button
      aria-label={label}
      size="icon-sm"
      title={label}
      variant="ghost"
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function MapLoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) return null

  return (
    <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
      Loading map
    </div>
  )
}

function StateHoverTooltip({
  activeLayer,
  state,
  x,
  y,
}: {
  activeLayer: HomeLayer
  state: GermanyStateMetric
  x: number
  y: number
}) {
  return (
    <div
      className="pointer-events-none absolute z-30 w-64 max-w-[calc(100%-2rem)] translate-x-3 -translate-y-[calc(100%+0.75rem)] rounded-md border bg-background/95 p-3 text-sm shadow-lg backdrop-blur"
      style={{ left: x, top: y }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-semibold">{state.title}</div>
          <div className="mt-0.5 truncate text-xs text-muted-foreground">
            {state.regions.length} observed region
            {state.regions.length === 1 ? "" : "s"} ·{" "}
            {homeLayerLabel(activeLayer)}
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

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <div className="rounded-md border bg-card px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground uppercase">
            Signal
          </div>
          <div className="mt-0.5 text-sm font-semibold">{state.metric}%</div>
        </div>
        <div className="rounded-md border bg-card px-2 py-1.5">
          <div className="text-[10px] text-muted-foreground uppercase">
            Layer
          </div>
          <div className="mt-0.5 truncate text-sm font-semibold">
            {
              homeLayerConfigs.find((layer) => layer.id === activeLayer)
                ?.shortLabel
            }
          </div>
        </div>
      </div>

      {state.warnings.length ? (
        <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          {state.warnings[0]}
          {state.warnings.length > 1
            ? ` +${state.warnings.length - 1} more`
            : ""}
        </div>
      ) : null}
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
  const shapes: StateShape[] = []

  for (const path of document.querySelectorAll("path[id]")) {
    const d = path.getAttribute("d") ?? ""

    if (!d) {
      continue
    }

    shapes.push({
      code: path.id,
      d,
      title: path.getAttribute("title") ?? path.id,
    })
  }

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

  const width = Number.parseFloat(
    svg.getAttribute("width") ?? `${fallbackViewBox.width}`
  )
  const height = Number.parseFloat(
    svg.getAttribute("height") ?? `${fallbackViewBox.height}`
  )

  return {
    height: Number.isFinite(height) ? height : fallbackViewBox.height,
    width: Number.isFinite(width) ? width : fallbackViewBox.width,
    x: 0,
    y: 0,
  }
}
