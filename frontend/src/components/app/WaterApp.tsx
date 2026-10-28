import { useEffect, useState } from "react"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useAuthStore } from "@/features/auth/auth-store"
import { openKeycloakAccount } from "@/features/auth/keycloak"
import { WaterMap } from "@/components/app/WaterMap"
import { WaterHistory } from "@/components/app/WaterHistory"
import {
  conditionLabel,
  number,
  time,
  waterRequest,
  type SavedPlace,
  type WaterRegion,
} from "@/services/water-api"
import { WaterSidebar } from "@/components/app/WaterSidebar"
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAppStore } from "@/stores/app-store"
import "./water.css"

export function WaterApp() {
  const open = useAppStore((state) => state.sidebarOpen)
  const setOpen = useAppStore((state) => state.setSidebarOpen)
  return (
    <SidebarProvider className="water-app" open={open} onOpenChange={setOpen}>
      <WaterWorkspace />
    </SidebarProvider>
  )
}

function WaterWorkspace() {
  const { setOpenMobile } = useSidebar()
  const navigate = useNavigate()
  const path = useRouterState({ select: (state) => state.location.pathname })
  const auth = useAuthStore()
  const client = useQueryClient()
  const [search, setSearch] = useState("")
  const selection = useRouterState({
    select: (state) => (state.location.search as { place?: string }).place,
  })
  const regions = useQuery({
    queryKey: ["water-regions"],
    queryFn: ({ signal }) =>
      waterRequest<WaterRegion[]>("/regions", false, undefined, signal),
    refetchInterval: 60000,
  })
  const places = useQuery({
    queryKey: ["water-places", auth.user?.subject],
    queryFn: ({ signal }) =>
      waterRequest<SavedPlace[]>("/places", true, undefined, signal),
    enabled: auth.status === "authenticated",
  })
  useEffect(() => {
    return () => {
      void client.cancelQueries({
        predicate: (query) =>
          query.queryKey[0] === "water-places" ||
          query.queryKey[0] === "water-history",
      })
      client.removeQueries({
        predicate: (query) =>
          query.queryKey[0] === "water-places" ||
          query.queryKey[0] === "water-history",
      })
    }
  }, [auth.user?.subject, client])
  const save = useMutation({
    mutationFn: ({
      id,
      remove,
      isDefault,
    }: {
      id: string
      remove?: boolean
      isDefault?: boolean
    }) =>
      waterRequest(`/places/${id}`, true, {
        method: remove ? "DELETE" : "PUT",
        body: remove
          ? undefined
          : JSON.stringify({ isDefault: isDefault ?? false }),
      }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ["water-places"] })
    },
  })
  const all = regions.data ?? []
  const saved = auth.status === "authenticated" ? (places.data ?? []) : []
  const selectedId =
    selection ?? saved.find((place) => place.isDefault)?.regionId ?? null
  const selected = all.find(
    (region) => region.discoveryRegion.id === selectedId
  )
  const filtered = all.filter(
    (region) =>
      (path !== "/places" ||
        saved.some((place) => place.regionId === region.discoveryRegion.id)) &&
      [
        region.discoveryRegion.name,
        region.water.station?.name,
        region.water.station?.waterBody,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase())
  )
  const select = (id: string) => {
    setOpenMobile(false)
    void navigate({
      to: path === "/places" ? "/places" : "/",
      search: { place: id },
    })
  }
  const toggleSave = (id: string) => {
    if (auth.status !== "authenticated") void auth.login()
    else
      save.mutate({ id, remove: saved.some((place) => place.regionId === id) })
  }
  return (
    <>
      <WaterSidebar
        path={path}
        search={search}
        onSearch={setSearch}
        refreshing={regions.isFetching}
        onRefresh={() => void regions.refetch()}
      >
        {regions.isPending ? (
          <p className="empty-history" role="status">
            Loading places…
          </p>
        ) : path === "/places" && auth.status !== "authenticated" ? (
          <div className="empty-history">
            <button
              className="primary-button"
              onClick={() => void auth.login()}
            >
              Sign in to save places
            </button>
          </div>
        ) : places.isError && path === "/places" ? (
          <p className="empty-history" role="alert">
            Saved places couldn’t be loaded.{" "}
            <button onClick={() => void places.refetch()}>Retry</button>
          </p>
        ) : filtered.length === 0 ? (
          <p className="empty-history">
            {search
              ? "No matching places."
              : "Save a place from Explore to find it here."}
          </p>
        ) : (
          filtered.map((region) => (
            <button
              key={region.discoveryRegion.id}
              className={`place-row ${region.discoveryRegion.id === selectedId ? "active" : ""}`}
              aria-pressed={region.discoveryRegion.id === selectedId}
              onClick={() => select(region.discoveryRegion.id)}
            >
              <span className="place-row-title">
                {region.discoveryRegion.name}
                <span>
                  {region.water.levelCm === null ? (
                    "—"
                  ) : (
                    <>
                      {number(region.water.levelCm)} <small>cm</small>
                    </>
                  )}
                </span>
              </span>
              <span className="place-station">
                {region.water.station?.name ?? "No verified water gauge"}
              </span>
              <span
                className={`condition condition-${region.water.status === "current" ? region.water.condition : "unknown"}`}
              >
                {conditionLabel(region.water)}
              </span>
            </button>
          ))
        )}
      </WaterSidebar>
      <SidebarInset className="water-main">
        <div className="water-mobile-toolbar">
          <SidebarTrigger />
          <span>Droplet</span>
        </div>
        {path === "/account" ? (
          <Account />
        ) : (
          <>
            {regions.isError && (
              <div className="water-alert" role="alert">
                {regions.data
                  ? "Updates unavailable. Showing previous observations."
                  : "Observations couldn’t be loaded."}
                <button onClick={() => void regions.refetch()}>
                  Try again
                </button>
              </div>
            )}
            {save.isError && (
              <div className="water-alert" role="alert">
                Your places couldn’t be updated. Please try again.
              </div>
            )}
            <div
              className={`water-workspace ${selected ? "has-selection" : ""}`}
            >
              <div className="map-container">
                <WaterMap regions={all} selected={selectedId} select={select} />
              </div>
              {selected && (
                <aside
                  className="water-detail"
                  aria-label={`${selected.discoveryRegion.name} observations`}
                >
                  <button
                    className="detail-close"
                    aria-label="Close place details"
                    onClick={() => {
                      void navigate({
                        to: path === "/places" ? "/places" : "/",
                        search: { place: "" },
                      })
                    }}
                  >
                    ×
                  </button>
                  <div className="eyebrow">{selected.discoveryRegion.name}</div>
                  <h2>
                    {selected.water.station?.name ??
                      selected.discoveryRegion.name}
                  </h2>
                  <p className="river-name">
                    {selected.water.station?.waterBody ??
                      "Water observations unavailable"}
                  </p>
                  <button
                    className="save-button"
                    disabled={save.isPending}
                    onClick={() => toggleSave(selected.discoveryRegion.id)}
                  >
                    {saved.some(
                      (place) => place.regionId === selected.discoveryRegion.id
                    )
                      ? "★ Saved place"
                      : "☆ Save place"}
                  </button>
                  {saved.some(
                    (place) => place.regionId === selected.discoveryRegion.id
                  ) && (
                    <button
                      className="text-button default-button"
                      disabled={
                        save.isPending ||
                        saved.some(
                          (place) =>
                            place.regionId === selected.discoveryRegion.id &&
                            place.isDefault
                        )
                      }
                      onClick={() =>
                        save.mutate({
                          id: selected.discoveryRegion.id,
                          isDefault: true,
                        })
                      }
                    >
                      {saved.some(
                        (place) =>
                          place.regionId === selected.discoveryRegion.id &&
                          place.isDefault
                      )
                        ? "Default place"
                        : "Make default"}
                    </button>
                  )}
                  <WaterReading region={selected} />
                  <WaterHistory
                    key={selected.discoveryRegion.id}
                    region={selected}
                  />
                  <details className="reading-details">
                    <summary>About these measurements</summary>
                    <p>
                      Gauge level is height above this station’s reference
                      point, not river depth. Raw levels at different gauges
                      cannot be ranked against each other.
                    </p>
                    <p>
                      Low and high conditions come from PEGELONLINE’s
                      station-specific references. These describe this gauge,
                      not the whole state.
                    </p>
                    {selected.water.tidal && (
                      <p>
                        This gauge is affected by tides. Its regular tidal rise
                        and fall is not classified as low or high river water.
                      </p>
                    )}
                    <p>
                      Rainfall comes from a nearby DWD station and covers the
                      stated 24-hour period. DWD’s archive updates less
                      frequently than live gauges.
                    </p>
                    {selected.water.source && (
                      <a
                        href={selected.water.source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View gauge source ↗
                      </a>
                    )}
                    {selected.rainfall.source && (
                      <a
                        href={selected.rainfall.source.url}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View rainfall source ↗
                      </a>
                    )}
                  </details>
                </aside>
              )}
            </div>
          </>
        )}
      </SidebarInset>
    </>
  )
}

function WaterReading({ region }: { region: WaterRegion }) {
  const { water, rainfall, change24h } = region
  const mean = water.meanComparison
  return (
    <>
      <section className="water-reading">
        <div className="section-heading">
          <h3>Gauge level</h3>
          <span
            className={`condition condition-${water.status === "current" ? water.condition : "unknown"}`}
          >
            {conditionLabel(water)}
          </span>
        </div>
        <div className="reading-number">
          {water.levelCm === null ? "—" : number(water.levelCm)} <span>cm</span>
        </div>
        <p className="observation-time">
          {water.observedAt
            ? `${water.status === "stale" ? "Last observed" : "Observed"} ${time(water.observedAt)}`
            : "No verified measurement available for this place."}
        </p>
        {mean ? (
          <div className="mean-comparison">
            <strong>
              {mean.differenceCm === 0
                ? "At this gauge’s historical mean"
                : `${number(Math.abs(mean.differenceCm))} cm ${mean.differenceCm < 0 ? "below" : "above"} this gauge’s historical mean`}
            </strong>
            <span>
              Published mean: {number(mean.meanCm)} cm
              {mean.periodStart && mean.periodEnd
                ? ` · ${mean.periodStart.slice(0, 4)}–${mean.periodEnd.slice(0, 4)}`
                : ""}
            </span>
          </div>
        ) : (
          water.levelCm !== null && (
            <p className="quiet">No published mean available for this gauge.</p>
          )
        )}
        <p className="daily-change">
          {change24h
            ? `${change24h.deltaCm > 0 ? "↑ Up" : change24h.deltaCm < 0 ? "↓ Down" : "Unchanged"}${change24h.deltaCm !== 0 ? ` ${number(Math.abs(change24h.deltaCm))} cm` : ""} over ${number(change24h.elapsedHours)} hours`
            : "24-hour change not yet available"}
        </p>
      </section>
      <section className="rain-reading">
        <div>
          <h3>Rainfall · 24 hours</h3>
          <div className="rain-number">
            {rainfall.totalMm === null ? "—" : number(rainfall.totalMm)}{" "}
            <span>mm</span>
          </div>
        </div>
        <div>
          <p>{rainfall.station?.name ?? "No complete observation"}</p>
          <p className="quiet">
            {rainfall.status === "stale" && "Last available · "}
            {rainfall.windowEnd
              ? `${time(rainfall.windowStart)} – ${time(rainfall.windowEnd)}`
              : "Unavailable"}
          </p>
        </div>
      </section>
    </>
  )
}

function Account() {
  const auth = useAuthStore()
  return (
    <section className="water-account">
      <h1>Account</h1>
      {auth.error && <p role="alert">{auth.error}</p>}
      {auth.status === "authenticated" ? (
        <>
          <div className="account-card">
            <h2>Your account</h2>
            <p>{auth.user?.email ?? auth.user?.name}</p>
            <div className="account-actions">
              {auth.mode === "keycloak" && (
                <button
                  className="primary-button"
                  onClick={() => void openKeycloakAccount(auth.config)}
                >
                  Manage profile & password
                </button>
              )}
              <button
                className="save-button"
                onClick={() => void auth.logout()}
              >
                Sign out
              </button>
            </div>
          </div>
          <Link to="/places" className="text-button">
            Open my places →
          </Link>
        </>
      ) : (
        <button
          className="primary-button"
          disabled={auth.status === "loading"}
          onClick={() => void auth.login()}
        >
          Sign in or create account
        </button>
      )}
    </section>
  )
}
