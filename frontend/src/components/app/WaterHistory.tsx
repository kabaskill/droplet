import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth-store"
import {
  number,
  time,
  waterRequest,
  type WaterHistory as History,
  type WaterRegion,
} from "@/services/water-api"

export function WaterHistory({ region }: { region: WaterRegion }) {
  const [days, setDays] = useState(1)
  const [metric, setMetric] = useState<"water" | "rainfall">("water")
  const auth = useAuthStore()
  const range = auth.status === "authenticated" ? days : 1
  const history = useQuery({
    queryKey: [
      "water-history",
      region.discoveryRegion.id,
      range,
      range > 1 ? auth.user?.subject : "public",
    ],
    queryFn: ({ signal }) => {
      if (range === 1)
        return waterRequest<History>(
          `/regions/${region.discoveryRegion.id}/recent`,
          false,
          undefined,
          signal
        )
      const end = new Date()
      const params = new URLSearchParams({
        start: new Date(end.getTime() - range * 86400000).toISOString(),
        end: end.toISOString(),
        interval: range > 30 ? "day" : "hour",
      })
      return waterRequest<History>(
        `/regions/${region.discoveryRegion.id}/history?${params}`,
        true,
        undefined,
        signal
      )
    },
    refetchInterval: 60000,
  })
  const points =
    metric === "water"
      ? (history.data?.water ?? []).map((row) => ({
          x: Date.parse(row.lastObservedAt),
          y: row.lastCm,
          series: row.seriesId,
          name: row.station.name,
        }))
      : (history.data?.rainfall ?? []).map((row) => ({
          x: Date.parse(row.windowEnd),
          y: row.rainfall24hMm,
          series: row.station.id,
          name: row.station.name,
        }))
  const yMin = Math.min(...points.map((p) => p.y))
  const yMax = Math.max(...points.map((p) => p.y))
  const margin = Math.max((yMax - yMin) * 0.15, 2)
  const low = metric === "rainfall" ? 0 : yMin - margin
  const high = yMax + margin
  const start = Date.parse(history.data?.start ?? "")
  const end = Date.parse(history.data?.end ?? "")
  const x = (value: number) => 45 + ((value - start) / (end - start)) * 300
  const y = (value: number) => 130 - ((value - low) / (high - low)) * 100
  const unit = metric === "water" ? "cm" : "mm"
  return (
    <section className="history-section">
      <div className="section-heading">
        <h3>Observed history</h3>
        <select
          aria-label="History measurement"
          value={metric}
          onChange={(e) => setMetric(e.target.value as "water" | "rainfall")}
        >
          <option value="water">Water level</option>
          <option value="rainfall">24-hour rainfall</option>
        </select>
      </div>
      <div className="range-controls" aria-label="History period">
        {[1, 7, 30, 365].map((value) => (
          <button
            key={value}
            aria-pressed={range === value}
            onClick={() => {
              if (value > 1 && auth.status !== "authenticated")
                void auth.login()
              else setDays(value)
            }}
          >
            {value === 1
              ? "24 hours"
              : value === 365
                ? "1 year"
                : `${value} days`}
          </button>
        ))}
      </div>
      {history.isPending ? (
        <p className="quiet">Loading observations…</p>
      ) : history.isError ? (
        <p role="alert">
          History couldn’t be loaded.{" "}
          <button
            className="text-button"
            onClick={() => void history.refetch()}
          >
            Retry
          </button>
        </p>
      ) : points.length === 0 ? (
        <p className="empty-history">No measurements in this period.</p>
      ) : (
        <>
          <svg
            viewBox="0 0 360 160"
            className="history-chart"
            role="img"
            aria-label={`${metric === "water" ? "Gauge level" : "24-hour rainfall"} in ${unit}; ${points.length} observed points`}
          >
            {[0, 0.5, 1].map((step) => {
              const value = low + (high - low) * step
              return (
                <g key={step}>
                  <line
                    x1="45"
                    x2="345"
                    y1={y(value)}
                    y2={y(value)}
                    stroke="#e2e9e7"
                  />
                  <text x="38" y={y(value) + 3} textAnchor="end">
                    {number(value)}
                  </text>
                </g>
              )
            })}
            <text x="45" y="17">
              {unit}
            </text>
            {points.map((point, i) => {
              const prev = points[i - 1]
              const connect =
                metric === "water" &&
                prev &&
                prev.series === point.series &&
                point.x - prev.x <=
                  (history.data?.interval === "day" ? 48 : 3) * 3600000
              return (
                <g key={`${point.x}-${point.series}`}>
                  {connect && (
                    <line
                      x1={x(prev.x)}
                      y1={y(prev.y)}
                      x2={x(point.x)}
                      y2={y(point.y)}
                      stroke="#16806d"
                      strokeWidth="2"
                    />
                  )}
                  {metric === "rainfall" && (
                    <line
                      x1={x(point.x)}
                      x2={x(point.x)}
                      y1={130}
                      y2={y(point.y)}
                      stroke="#639bb6"
                      strokeWidth="3"
                    />
                  )}
                  <circle
                    cx={x(point.x)}
                    cy={y(point.y)}
                    r={points.length > 100 ? 1 : 2.5}
                    fill={metric === "water" ? "#16806d" : "#639bb6"}
                  >
                    <title>
                      {point.name}: {number(point.y)} {unit} ·{" "}
                      {time(new Date(point.x).toISOString())}
                    </title>
                  </circle>
                </g>
              )
            })}
            <text x="45" y="152">
              {new Date(start).toLocaleDateString([], {
                month: "short",
                day: "numeric",
              })}
            </text>
            <text x="345" y="152" textAnchor="end">
              Now
            </text>
          </svg>
          <details className="observation-table">
            <summary>View measurements</summary>
            <div>
              <table>
                <thead>
                  <tr>
                    <th>Observed</th>
                    <th>Gauge / station</th>
                    <th>{unit}</th>
                  </tr>
                </thead>
                <tbody>
                  {points
                    .slice(-100)
                    .reverse()
                    .map((point) => (
                      <tr key={`${point.x}-${point.series}`}>
                        <td>{time(new Date(point.x).toISOString())}</td>
                        <td>{point.name}</td>
                        <td>{number(point.y)}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            <p className="quiet">
              Most recent {Math.min(points.length, 100)} points in this period.
            </p>
          </details>
        </>
      )}
      {auth.status !== "authenticated" && (
        <p className="quiet">
          <button className="text-button" onClick={() => void auth.login()}>
            Sign in
          </button>{" "}
          for longer history.
        </p>
      )}
    </section>
  )
}
