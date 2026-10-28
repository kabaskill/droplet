import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"
import {
  Add01Icon,
  MinusSignIcon,
  FitToScreenIcon,
  CenterFocusIcon,
} from "@hugeicons/core-free-icons"
import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/stores/app-store"
import germanySvg from "@/assets/germany.svg?raw"
import { conditionLabel, type WaterRegion } from "@/services/water-api"

const document = new DOMParser().parseFromString(germanySvg, "image/svg+xml")
const paths = Array.from(document.querySelectorAll("path")).map((path) => ({
  code: path.id,
  d: path.getAttribute("d") ?? "",
  name: path.getAttribute("title") ?? "",
}))
const mercator = (latitude: number) =>
  Math.log(Math.tan(Math.PI / 4 + (latitude * Math.PI) / 360))
const project = (latitude: number, longitude: number) => [
  ((longitude - 5.86501) / (15.04338 - 5.86501)) * 585.5141,
  ((mercator(55.057722) - mercator(latitude)) /
    (mercator(55.057722) - mercator(47.269133))) *
    792.66785,
]
const markerColor = (water: WaterRegion["water"]) =>
  water.status !== "current"
    ? "#879496"
    : {
        low: "#b87819",
        normal: "#16806d",
        high: "#b74449",
        unknown: "#577e98",
      }[water.condition]

export function WaterMap({
  regions,
  selected,
  select,
}: {
  regions: WaterRegion[]
  selected: string | null
  select: (id: string) => void
}) {
  const svgRef = useRef<SVGSVGElement>(null)
  const layerRef = useRef<SVGGElement>(null)
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [scale, setScale] = useState(
    () => useAppStore.getState().mapViewport.scale
  )

  useEffect(() => {
    const svg = svgRef.current
    const layer = layerRef.current
    if (!svg || !layer) return
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 6])
      .extent([
        [-15, -15],
        [600, 808],
      ])
      .translateExtent([
        [-180, -220],
        [780, 1030],
      ])
      .clickDistance(5)
      .on("zoom", (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        const { k, x, y } = event.transform
        layer.setAttribute("transform", event.transform.toString())
        setScale(k)
        useAppStore.getState().setMapViewport({ scale: k, x, y })
      })
    zoomRef.current = zoom
    const element = d3.select(svg)
    element.call(zoom)
    const viewport = useAppStore.getState().mapViewport
    element.call(
      zoom.transform,
      d3.zoomIdentity.translate(viewport.x, viewport.y).scale(viewport.scale)
    )
    return () => {
      element.on(".zoom", null)
      zoomRef.current = null
    }
  }, [])

  const zoomBy = (factor: number) => {
    if (svgRef.current && zoomRef.current)
      d3.select(svgRef.current).call(zoomRef.current.scaleBy, factor)
  }
  const reset = () => {
    if (svgRef.current && zoomRef.current)
      d3.select(svgRef.current).call(zoomRef.current.transform, d3.zoomIdentity)
  }
  const focusSelected = () => {
    const path =
      layerRef.current?.querySelector<SVGPathElement>(".selected-state")
    if (!path || !svgRef.current || !zoomRef.current) return
    const box = path.getBBox()
    const k = Math.min(
      6,
      Math.max(1.5, Math.min(500 / box.width, 650 / box.height))
    )
    const transform = d3.zoomIdentity
      .translate(
        292.5 - k * (box.x + box.width / 2),
        396.5 - k * (box.y + box.height / 2)
      )
      .scale(k)
    d3.select(svgRef.current).call(zoomRef.current.transform, transform)
  }

  return (
    <section className="water-map" aria-label="Gauge locations in Germany">
      <svg
        ref={svgRef}
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return
          if (
            [
              "+",
              "=",
              "-",
              "0",
              "ArrowLeft",
              "ArrowRight",
              "ArrowUp",
              "ArrowDown",
            ].includes(event.key)
          )
            event.preventDefault()
          if (["+", "="].includes(event.key)) zoomBy(1.4)
          if (event.key === "-") zoomBy(1 / 1.4)
          if (event.key === "0") reset()
          const direction = {
            ArrowLeft: [50, 0],
            ArrowRight: [-50, 0],
            ArrowUp: [0, 50],
            ArrowDown: [0, -50],
          }[event.key]
          if (direction && svgRef.current && zoomRef.current)
            d3.select(svgRef.current).call(
              zoomRef.current.translateBy,
              direction[0] / scale,
              direction[1] / scale
            )
        }}
        viewBox="-15 -15 615 823"
        role="group"
        aria-label="Select a state or gauge"
      >
        <g ref={layerRef}>
          {paths.map((path) => {
            const region = regions.find(
              (r) => r.discoveryRegion.code === path.code
            )
            return (
              <path
                key={path.code}
                d={path.d}
                vectorEffect="non-scaling-stroke"
                className={
                  region?.discoveryRegion.id === selected
                    ? "selected-state"
                    : ""
                }
                onClick={() => region && select(region.discoveryRegion.id)}
              >
                <title>{path.name}</title>
              </path>
            )
          })}
          {regions.map((region) => {
            const { water, discoveryRegion } = region
            if (!water.station) return null
            const [x, y] = project(
              water.station.latitude,
              water.station.longitude
            )
            const active = selected === discoveryRegion.id
            return (
              <g
                key={discoveryRegion.id}
                role="button"
                tabIndex={0}
                aria-label={`${discoveryRegion.name}: ${water.station.name}, ${conditionLabel(water)}`}
                aria-pressed={active}
                onClick={() => select(discoveryRegion.id)}
                onKeyDown={(event) => {
                  if (["Enter", " "].includes(event.key)) {
                    event.preventDefault()
                    select(discoveryRegion.id)
                  }
                }}
                className="gauge-marker"
              >
                <circle
                  cx={x}
                  cy={y}
                  r={(active ? 18 : 14) / scale}
                  fill={markerColor(water)}
                  opacity={active ? 0.2 : 0.08}
                />
                <circle
                  cx={x}
                  cy={y}
                  r={(active ? 8 : 6) / scale}
                  fill={markerColor(water)}
                  stroke="white"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
                <title>
                  {water.station.name} · {conditionLabel(water)}
                </title>
              </g>
            )
          })}
        </g>
      </svg>
      <div className="map-controls" role="group" aria-label="Map controls">
        <Button
          variant="ghost"
          size="icon-sm"
          title="Zoom in"
          aria-label="Zoom in"
          disabled={scale >= 6}
          onClick={() => zoomBy(1.4)}
        >
          <ProductIcon icon={Add01Icon} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Zoom out"
          aria-label="Zoom out"
          disabled={scale <= 1}
          onClick={() => zoomBy(1 / 1.4)}
        >
          <ProductIcon icon={MinusSignIcon} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Fit Germany"
          aria-label="Fit Germany"
          onClick={reset}
        >
          <ProductIcon icon={FitToScreenIcon} />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          title="Focus selected state"
          aria-label="Focus selected state"
          disabled={!selected}
          onClick={focusSelected}
        >
          <ProductIcon icon={CenterFocusIcon} />
        </Button>
      </div>
      <div className="map-legend" aria-label="Gauge conditions">
        <span>
          <i style={{ background: "#b87819" }} />
          Low
        </span>
        <span>
          <i style={{ background: "#16806d" }} />
          Within range
        </span>
        <span>
          <i style={{ background: "#b74449" }} />
          High
        </span>
        <span>
          <i style={{ background: "#577e98" }} />
          Unclassified
        </span>
      </div>
    </section>
  )
}
