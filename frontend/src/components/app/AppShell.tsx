import {
  Activity02Icon,
  AiBrain01Icon,
  DatabaseSyncIcon,
  DropletIcon,
  GlobalSearchIcon,
  Logout01Icon,
  MapsIcon,
  RefreshIcon,
  UserShieldIcon,
} from "@hugeicons/core-free-icons"
import { Link, useNavigate } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useEffect, useId, useMemo, useRef, useState } from "react"

import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/features/auth/auth-store"
import { cn } from "@/lib/utils"
import type { RegionWithSnapshot } from "@/services/regional-filters"
import { useAppStore } from "@/stores/app-store"

type AppShellProps = {
  children: ReactNode
  onRefresh: () => void
  refreshMessage?: string | null
  searchRegions?: RegionWithSnapshot[]
  refreshing: boolean
  stale: boolean
  syncing: boolean
}

const navigationItems = [
  { icon: MapsIcon, label: "Home", to: "/" },
  { icon: Activity02Icon, label: "Trends", to: "/trends" },
  { icon: DatabaseSyncIcon, label: "Health", to: "/health" },
  { icon: AiBrain01Icon, label: "AI", to: "/ai" },
  { icon: UserShieldIcon, label: "User", to: "/account" },
]

export function AppShell({
  children,
  onRefresh,
  refreshMessage,
  searchRegions = [],
  refreshing,
  stale,
  syncing,
}: AppShellProps) {
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
  const [searchOpen, setSearchOpen] = useState(false)
  const refreshStateLabel = refreshing
    ? "Refreshing"
    : syncing
      ? "Syncing"
      : stale
        ? "Stale"
        : "Current"

  return (
    <div className="min-h-svh bg-muted/40 text-foreground">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-16 border-r bg-background lg:flex lg:flex-col lg:items-center lg:py-4">
        <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <ProductIcon icon={DropletIcon} size={21} />
        </div>
        <nav className="mt-8 flex flex-1 flex-col gap-2">
          {navigationItems.map((item) => (
            <Link
              activeOptions={item.to === "/" ? { exact: true } : undefined}
              activeProps={{
                className: "bg-accent text-foreground",
              }}
              aria-label={item.label}
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              key={item.to}
              to={item.to}
            >
              <ProductIcon icon={item.icon} />
            </Link>
          ))}
        </nav>
        <Button
          aria-label="Sign out"
          size="icon"
          variant="ghost"
          onClick={() => void logout()}
        >
          <ProductIcon icon={Logout01Icon} />
        </Button>
      </aside>

      <div className="lg:pl-16">
        <header className="sticky top-0 z-40 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-md bg-primary text-primary-foreground lg:hidden">
                <ProductIcon icon={DropletIcon} size={20} />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-base font-semibold">Droplet</h1>
                <p className="truncate text-sm text-muted-foreground">
                  Germany&apos;s Water State Platform
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 xl:justify-end">
              <Button
                aria-label="Search states"
                className="shrink-0"
                size="lg"
                variant="outline"
                onClick={() => setSearchOpen(true)}
              >
                <ProductIcon icon={GlobalSearchIcon} />
                <span className="hidden sm:inline">Search</span>
              </Button>

              <Button
                aria-label={`Refresh data, current state ${refreshStateLabel}`}
                className={cn(
                  "shrink-0",
                  stale &&
                    "border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-200",
                  syncing &&
                    !refreshing &&
                    "border-sky-300 bg-sky-50 text-sky-800 hover:bg-sky-100 dark:bg-sky-950/30 dark:text-sky-200"
                )}
                disabled={refreshing}
                size="lg"
                variant="outline"
                onClick={onRefresh}
              >
                <ProductIcon icon={RefreshIcon} />
                <span>{refreshStateLabel}</span>
              </Button>

              {refreshMessage ? (
                <div className="hidden h-8 max-w-72 shrink-0 items-center rounded-md border bg-card px-2 text-xs text-muted-foreground md:flex">
                  <span className="truncate">{refreshMessage}</span>
                </div>
              ) : null}

              <div className="hidden h-8 shrink-0 items-center gap-2 rounded-md border bg-card px-2 text-xs text-muted-foreground sm:flex">
                <ProductIcon icon={UserShieldIcon} size={14} />
                <span className="max-w-36 truncate">{user?.name ?? "Operator"}</span>
              </div>
            </div>
          </div>
        </header>

        {children}
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t bg-background/95 p-1 backdrop-blur lg:hidden">
        {navigationItems.map((item) => (
          <Link
            activeOptions={item.to === "/" ? { exact: true } : undefined}
            activeProps={{ className: "bg-accent text-foreground" }}
            aria-label={item.label}
            className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-md text-[0.65rem] font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            key={item.to}
            to={item.to}
          >
            <ProductIcon icon={item.icon} size={17} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <StateSearchDialog
        open={searchOpen}
        regions={searchRegions}
        onClose={() => setSearchOpen(false)}
      />
    </div>
  )
}

type StateSearchDialogProps = {
  onClose: () => void
  open: boolean
  regions: RegionWithSnapshot[]
}

function StateSearchDialog({ onClose, open, regions }: StateSearchDialogProps) {
  const navigate = useNavigate()
  const setSelectedRegionId = useAppStore((state) => state.setSelectedRegionId)
  const selectedRegionId = useAppStore((state) => state.selectedRegionId)
  const [query, setQuery] = useState("")
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const normalizedQuery = query.trim().toLowerCase()
  const matches = useMemo(() => {
    const source = normalizedQuery
      ? regions.filter(({ region }) =>
          [region.name, region.basin, region.code, region.federalState]
            .join(" ")
            .toLowerCase()
            .includes(normalizedQuery)
        )
      : regions

    return source.slice(0, 8)
  }, [normalizedQuery, regions])

  useEffect(() => {
    if (!open) {
      return
    }

    window.setTimeout(() => inputRef.current?.focus(), 0)

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)

    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [onClose, open])

  if (!open) {
    return null
  }

  const selectRegion = (regionId: string) => {
    setSelectedRegionId(regionId)
    onClose()
    void navigate({ to: "/" })
  }

  return (
    <div className="fixed inset-0 z-40 bg-background/70 p-3 backdrop-blur-sm">
      <button
        aria-label="Close state search"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-labelledby={titleId}
        aria-modal="true"
        className="relative mx-auto mt-16 max-h-[78svh] max-w-2xl overflow-hidden rounded-md border bg-background shadow-xl"
        role="dialog"
      >
        <div className="border-b p-3">
          <h2 className="sr-only" id={titleId}>
            Search states
          </h2>
          <label className="relative block">
            <ProductIcon
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              icon={GlobalSearchIcon}
              size={16}
            />
            <input
              aria-label="Search states"
              className="h-11 w-full rounded-md border bg-card pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25"
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && matches[0]) {
                  selectRegion(matches[0].region.id)
                }
              }}
              placeholder="Search state, water system, code"
              ref={inputRef}
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className="max-h-[58svh] overflow-y-auto p-2">
          {matches.length ? (
            <div className="grid gap-1.5">
              {matches.map(({ region, snapshot }) => (
                <button
                  aria-label={`Select ${region.name}, ${region.basin} water system`}
                  aria-pressed={selectedRegionId === region.id}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    selectedRegionId === region.id && "border-primary/50 bg-accent"
                  )}
                  key={region.id}
                  onClick={() => selectRegion(region.id)}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">{region.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {region.basin} system · {region.code}
                    </span>
                  </span>
                  <span className="text-right text-xs text-muted-foreground">
                    <span className="block font-medium text-foreground">
                      {snapshot?.waterLevel ?? 0}%
                    </span>
                    <span>{snapshot?.trend ?? "pending"}</span>
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-md border bg-card px-3 py-2 text-sm text-muted-foreground">
              No visible states match
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
