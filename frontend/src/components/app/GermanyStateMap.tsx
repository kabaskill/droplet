import Panzoom, {
  type PanzoomEventDetail,
  type PanzoomObject,
} from "@panzoom/panzoom"
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type MouseEvent,
  type ReactNode,
} from "react"

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
  controls?: ReactNode
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
  controls,
  filteredRegions,
  onSelectRegion,
  selectedRegionId,
}: GermanyStateMapProps) {
  const [isPending, startTransition] = useTransition()
  const [svgMarkup, setSvgMarkup] = useState("")
  const [computedLabelPositions, setComputedLabelPositions] = useState<
    Record<string, { x: number; y: number }>
  >({})
  const [activeInfoStateCode, setActiveInfoStateCode] = useState<string | null>(null)
  const [viewState, setViewState] = useState({ scale: 1, x: 0, y: 0 })
  const mapLayerRef = useRef<HTMLDivElement>(null)
  const mapViewportRef = useRef<HTMLDivElement>(null)
  const panzoomRef = useRef<PanzoomObject | null>(null)
  const suppressClickRef = useRef(false)
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
  const activeInfoState = activeInfoStateCode
    ? stateMetrics[activeInfoStateCode]
    : null
  const showLabels = observedStates.length > 0

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

  useEffect(() => {
    const mapLayer = mapLayerRef.current
    const mapViewport = mapViewportRef.current

    if (!mapLayer || !mapViewport || !svgMarkup) {
      return
    }

    const panzoom = Panzoom(mapLayer, {
      canvas: true,
      cursor: "grab",
      duration: 160,
      easing: "ease-out",
      excludeClass: "panzoom-exclude",
      maxScale: 3.4,
      minScale: 1,
      overflow: "hidden",
      panOnlyWhenZoomed: true,
      pinchAndPan: true,
      step: 0.25,
    })
    panzoomRef.current = panzoom

    const updateViewState = (event: Event) => {
      const detail = (event as CustomEvent<PanzoomEventDetail>).detail

      setViewState({
        scale: detail.scale,
        x: detail.x,
        y: detail.y,
      })
    }
    const markPanGesture = () => {
      suppressClickRef.current = true
      window.setTimeout(() => {
        suppressClickRef.current = false
      }, 120)
    }
    const zoomWithWheel = (event: WheelEvent) => {
      panzoom.zoomWithWheel(event)
    }
    const constrainPanIntoView = () => {
      if (panzoom.getScale() <= 1) {
        return
      }

      const viewportRect = mapViewport.getBoundingClientRect()
      const layerRect = mapLayer.getBoundingClientRect()
      const scale = panzoom.getScale()
      const minVisibleX = Math.min(160, viewportRect.width * 0.35)
      const minVisibleY = Math.min(180, viewportRect.height * 0.35)
      let deltaX = 0
      let deltaY = 0

      if (layerRect.right < viewportRect.left + minVisibleX) {
        deltaX = viewportRect.left + minVisibleX - layerRect.right
      } else if (layerRect.left > viewportRect.right - minVisibleX) {
        deltaX = viewportRect.right - minVisibleX - layerRect.left
      }

      if (layerRect.bottom < viewportRect.top + minVisibleY) {
        deltaY = viewportRect.top + minVisibleY - layerRect.bottom
      } else if (layerRect.top > viewportRect.bottom - minVisibleY) {
        deltaY = viewportRect.bottom - minVisibleY - layerRect.top
      }

      if (deltaX !== 0 || deltaY !== 0) {
        updateFromPanzoom(
          panzoom.pan(deltaX / scale, deltaY / scale, {
            animate: true,
            force: true,
            relative: true,
          })
        )
      }
    }

    mapLayer.addEventListener("panzoomchange", updateViewState)
    mapLayer.addEventListener("panzoompan", markPanGesture)
    mapLayer.addEventListener("panzoomend", constrainPanIntoView)
    mapViewport.addEventListener("wheel", zoomWithWheel, { passive: false })

    return () => {
      mapLayer.removeEventListener("panzoomchange", updateViewState)
      mapLayer.removeEventListener("panzoompan", markPanGesture)
      mapLayer.removeEventListener("panzoomend", constrainPanIntoView)
      mapViewport.removeEventListener("wheel", zoomWithWheel)
      panzoom.destroy()
      panzoomRef.current = null
    }
  }, [svgMarkup])

  useEffect(() => {
    if (!svgMarkup) {
      return
    }

    const animationFrame = window.requestAnimationFrame(() => {
      const mapLayer = mapLayerRef.current
      const svg = mapLayer?.querySelector<SVGSVGElement>("svg")

      if (!svg) {
        return
      }

      const viewBox = svg.viewBox.baseVal
      const nextPositions = Object.keys(stateMetrics).reduce(
        (positions, stateCode) => {
          const path = svg.querySelector<SVGGraphicsElement>(`[id="${stateCode}"]`)

          if (!path || viewBox.width === 0 || viewBox.height === 0) {
            return positions
          }

          const box = path.getBBox()

          return {
            ...positions,
            [stateCode]: {
              x: ((box.x + box.width / 2 - viewBox.x) / viewBox.width) * 100,
              y: ((box.y + box.height / 2 - viewBox.y) / viewBox.height) * 100,
            },
          }
        },
        {} as Record<string, { x: number; y: number }>
      )

      setComputedLabelPositions(nextPositions)
    })

    return () => window.cancelAnimationFrame(animationFrame)
  }, [stateMetrics, svgMarkup])

  const handleMapClick = (event: MouseEvent<HTMLDivElement>) => {
    if (suppressClickRef.current) {
      return
    }

    const path = (event.target as Element).closest<SVGPathElement>("path[id]")
    const state = path ? stateMetrics[path.id] : null

    if (!state) {
      return
    }

    setActiveInfoStateCode(state.code)
    startTransition(() => onSelectRegion(state.primaryRegionId))
  }

  function updateFromPanzoom(values: { scale: number; x: number; y: number }) {
    setViewState({
      scale: values.scale,
      x: values.x,
      y: values.y,
    })
  }
  const zoomAtCenter = (nextScale: number) => {
    const panzoom = panzoomRef.current
    const viewport = mapViewportRef.current

    if (!panzoom || !viewport) {
      return
    }

    const rect = viewport.getBoundingClientRect()
    updateFromPanzoom(
      panzoom.zoomToPoint(nextScale, {
        clientX: rect.left + rect.width / 2,
        clientY: rect.top + rect.height / 2,
      }, {
        animate: true,
        force: true,
      })
    )
  }

  return (
    <div className="grid min-h-0 gap-3 xl:h-full">
      <div
        className={cn(
          "relative flex aspect-[585/793] min-h-0 w-full items-center justify-center overflow-hidden rounded-md border bg-background p-3 xl:h-full xl:min-h-[760px] xl:aspect-auto",
          isPending && "opacity-80"
        )}
        ref={mapViewportRef}
      >
        {controls ? (
          <div className="absolute left-3 top-3 z-20 w-[min(320px,calc(100%-1.5rem))]">
            {controls}
          </div>
        ) : null}
        <div className="absolute right-3 top-3 z-10 flex rounded-md border bg-background/95 p-0.5 shadow-sm backdrop-blur">
          <button
            aria-label="Zoom map in"
            className="size-8 rounded-sm text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => zoomAtCenter(Math.min(3.4, viewState.scale + 0.35))}
            type="button"
          >
            +
          </button>
          <button
            aria-label="Zoom map out"
            className="size-8 rounded-sm text-sm font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => zoomAtCenter(Math.max(1, viewState.scale - 0.35))}
            type="button"
          >
            -
          </button>
          <button
            aria-label="Reset map view"
            className="h-8 rounded-sm px-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            onClick={() => {
              const values = panzoomRef.current?.reset({ animate: true, force: true })

              if (values) {
                updateFromPanzoom(values)
              }
            }}
            type="button"
          >
            Reset
          </button>
        </div>
        <style>{stateStyleSheet(stateMetrics, selectedStateCode ?? null)}</style>
        <p className="sr-only" id="germany-map-accessible-note">
          Geographic overview of observed German states. Use the state controls
          below the map to select states with a keyboard.
        </p>
        <div
          aria-describedby="germany-map-accessible-note"
          aria-label="Germany state map"
          className={cn(
            "germany-state-map relative flex h-full w-full touch-none items-center justify-center",
            viewState.scale > 1 && "cursor-grab active:cursor-grabbing"
          )}
          id="droplet-germany-map"
          onClick={handleMapClick}
          role="img"
        >
          {svgMarkup ? (
            <div
              className="relative h-auto w-full max-h-full xl:h-full xl:w-auto"
              ref={mapLayerRef}
              style={{ aspectRatio: "585.5141 / 792.66785" }}
            >
              <div
                className="h-full w-full"
                // The SVG is a checked-in local asset. Styling and click behavior are applied by state IDs.
                dangerouslySetInnerHTML={{ __html: svgMarkup }}
              />
              {showLabels ? (
                <div className="pointer-events-none absolute inset-0 z-10">
                  {observedStates
                    .filter((state) => state.code !== activeInfoStateCode)
                    .map((state) => {
                      const position =
                        computedLabelPositions[state.code] ?? labelPositions[state.code]

                      if (!position) {
                        return null
                      }

                      return (
                        <span
                          className={cn(
                            "absolute z-10 max-w-32 truncate rounded-sm bg-background/70 px-1.5 py-0.5 text-[0.65rem] font-medium text-foreground shadow-sm ring-1 ring-border/70 backdrop-blur",
                            state.code === selectedStateCode &&
                              "bg-primary text-primary-foreground ring-primary"
                          )}
                          key={state.code}
                          style={{
                            left: `${position.x}%`,
                            top: `${position.y}%`,
                            transform: `translate(-50%, -50%) scale(${Math.max(0.62, 1 / viewState.scale)})`,
                          }}
                        >
                          {state.title}
                        </span>
                      )
                    })}
                </div>
              ) : null}
              {activeInfoState ? (
                <SelectedStateCard
                  activeLayer={activeLayer}
                  position={
                    computedLabelPositions[activeInfoState.code] ??
                    labelPositions[activeInfoState.code]
                  }
                  scale={viewState.scale}
                  state={activeInfoState}
                />
              ) : null}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">Loading map</div>
          )}
        </div>
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
          stroke: hsl(var(--background));
        }
        #droplet-germany-map [id="${state.code}"]:hover {
          opacity: 1;
          stroke-width: 2.8;
        }
      `
    })
    .join("\n")

  const selectedRule = selectedStateCode
    ? `
        #droplet-germany-map [id="${selectedStateCode}"] {
          opacity: 1;
          stroke: hsl(var(--primary));
          stroke-width: 3.2;
        }
      `
    : ""

  return `
    #droplet-germany-map svg {
      display: block;
      height: 100%;
      width: 100%;
    }
    #droplet-germany-map path {
      fill: hsl(var(--muted));
      opacity: 0.58;
      stroke: hsl(var(--background));
      stroke-linejoin: round;
      stroke-width: 1.45;
      transition: fill 160ms ease, opacity 160ms ease, stroke-width 160ms ease;
      vector-effect: non-scaling-stroke;
    }
    ${stateRules}
    ${selectedRule}
  `
}

type SelectedStateCardProps = {
  activeLayer: MapLayer
  position: { x: number; y: number } | undefined
  scale: number
  state: GermanyStateMetric
}

function SelectedStateCard({
  activeLayer,
  position,
  scale,
  state,
}: SelectedStateCardProps) {
  const primaryRegion = state.regions[0]?.region

  if (!position || !primaryRegion) {
    return null
  }

  return (
    <div
      className="panzoom-exclude pointer-events-none absolute z-20 w-44 rounded-md border border-primary/50 bg-background/95 p-2 text-xs shadow-lg backdrop-blur"
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: `translate(-50%, calc(-100% - 10px)) scale(${Math.max(0.68, 1 / scale)})`,
        transformOrigin: "bottom center",
      }}
    >
      <div className="truncate font-semibold">{state.title}</div>
      <div className="mt-1 truncate text-muted-foreground">
        {primaryRegion.basin} water system
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <span className="text-muted-foreground">{layerLabel(activeLayer)}</span>
        <span className="font-semibold">{state.metric}%</span>
      </div>
    </div>
  )
}

function layerLabel(activeLayer: MapLayer) {
  if (activeLayer === "rainfall") {
    return "Rainfall"
  }

  if (activeLayer === "confidence") {
    return "Confidence"
  }

  return "Water level"
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
