import {
  Activity02Icon,
  AiBrain01Icon,
  DatabaseSyncIcon,
  DropletIcon,
  GlobalSearchIcon,
  MapsIcon,
  RefreshIcon,
  UserShieldIcon,
} from "@hugeicons/core-free-icons"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useId, useRef, useState } from "react"

import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
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
  { icon: AiBrain01Icon, label: "AI Analysis", to: "/ai" },
]

const emptySearchRegions: RegionWithSnapshot[] = []

export function AppShell({
  children,
  onRefresh,
  refreshMessage,
  searchRegions = emptySearchRegions,
  refreshing,
  stale,
  syncing,
}: AppShellProps) {
  const user = useAuthStore((state) => state.user)
  const sidebarOpen = useAppStore((state) => state.sidebarOpen)
  const setSidebarOpen = useAppStore((state) => state.setSidebarOpen)
  const searchQuery = useAppStore((state) => state.searchQuery)
  const setSearchQuery = useAppStore((state) => state.setSearchQuery)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  })
  const refreshStateLabel = refreshing
    ? "Refreshing"
    : syncing
      ? "Syncing"
      : stale
        ? "Stale"
        : "Current"

  return (
    <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen}>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="gap-4">
          <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground group-data-[collapsible=icon]:hidden">
              <ProductIcon icon={DropletIcon} />
            </span>
            <div className="min-w-0 group-data-[collapsible=icon]:hidden">
              <div className="truncate text-sm font-semibold">Droplet</div>
            </div>
            <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
          </div>

          <div className="group-data-[collapsible=icon]:hidden">
            <label htmlFor="search-states" className="relative block">
              <ProductIcon
                className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sidebar-foreground/60"
                icon={GlobalSearchIcon}
              />
              <SidebarInput
                aria-label="Search states"
                name="search-states"
                className="pl-8"
                onChange={(event) => setSearchQuery(event.target.value)}
                onFocus={() => setSearchOpen(true)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setSearchOpen(true)
                  }
                }}
                placeholder="Search states"
                type="search"
                value={searchQuery}
              />
            </label>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton
                      asChild
                      isActive={isNavActive(pathname, item.to)}
                      tooltip={item.label}
                    >
                      <Link to={item.to}>
                        <ProductIcon icon={item.icon} />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          <SidebarGroup>
            <SidebarGroupLabel>Data Freshness</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton
                    className={cn(
                      stale &&
                        "text-amber-800 hover:text-amber-900 dark:text-amber-200",
                      syncing &&
                        !refreshing &&
                        "text-sky-800 hover:text-sky-900 dark:text-sky-200"
                    )}
                    disabled={refreshing}
                    tooltip={`Refresh data: ${refreshStateLabel}`}
                    onClick={onRefresh}
                  >
                    <ProductIcon icon={RefreshIcon} />
                    <span>{refreshStateLabel}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
              {refreshMessage ? (
                <div className="mt-2 rounded-md border bg-sidebar-accent/60 px-2 py-1.5 text-xs text-sidebar-foreground/70 group-data-[collapsible=icon]:hidden">
                  <span className="line-clamp-2">{refreshMessage}</span>
                </div>
              ) : null}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <SidebarSeparator />

          <SidebarMenuButton
            asChild
            isActive={isNavActive(pathname, "/account")}
            tooltip={"User Profile"}
            size={"lg"}
          >
            <Link to={"/account"}>
              <ProductIcon icon={UserShieldIcon} />
              <div className="group-data-[collapsible=icon]:hidden">
                <p className="truncate text-xs font-medium">{user?.name}</p>
                <p className="truncate text-xs text-sidebar-foreground/60">
                  {user?.email}
                </p>
              </div>
            </Link>
          </SidebarMenuButton>
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset className="min-h-svh bg-muted/35">
        <div className="sticky top-0 z-30 flex h-12 items-center justify-between border-b bg-background/95 px-3 backdrop-blur md:hidden">
          <div className="flex min-w-0 items-center gap-2">
            <SidebarTrigger />
            <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ProductIcon icon={DropletIcon} size={16} />
            </span>
            <span className="truncate text-sm font-semibold">Droplet</span>
          </div>
          <Button
            aria-label={`Refresh data, current state ${refreshStateLabel}`}
            disabled={refreshing}
            size="icon-sm"
            variant="ghost"
            onClick={onRefresh}
          >
            <ProductIcon icon={RefreshIcon} />
          </Button>
        </div>
        {children}
      </SidebarInset>

      <StateSearchDialog
        open={searchOpen}
        regions={searchRegions}
        onClose={() => setSearchOpen(false)}
      />
    </SidebarProvider>
  )
}

function isNavActive(pathname: string, itemPath: string) {
  return itemPath === "/" ? pathname === "/" : pathname.startsWith(itemPath)
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
  const query = useAppStore((state) => state.searchQuery)
  const setQuery = useAppStore((state) => state.setSearchQuery)
  const titleId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const normalizedQuery = query.trim().toLowerCase()
  const matchSource = normalizedQuery
    ? regions.filter(({ region }) =>
        [region.name, region.basin, region.code, region.federalState]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery)
      )
    : regions
  const matches = matchSource

  const attachDialog = (dialog: HTMLDialogElement | null) => {
    if (!dialog) {
      return
    }

    if (!open) {
      if (dialog.open) {
        dialog.close()
      }

      return
    }

    if (!dialog.open) {
      dialog.showModal()
      window.setTimeout(() => inputRef.current?.focus(), 0)
    }
  }

  const selectRegion = (regionId: string) => {
    setSelectedRegionId(regionId)
    onClose()
    void navigate({ to: "/" })
  }

  return (
    <dialog
      aria-labelledby={titleId}
      className="fixed inset-x-3 top-14 z-50 mx-auto w-auto max-w-2xl rounded-md border bg-background p-0 text-foreground shadow-xl backdrop:bg-background/70 backdrop:backdrop-blur-sm"
      ref={attachDialog}
      onClose={() => {
        if (open) {
          onClose()
        }
      }}
    >
      <section className="max-h-[80svh]">
        <div className="border-b p-3">
          <h2 className="sr-only" id={titleId}>
            Search states
          </h2>
          <label className="relative block">
            <ProductIcon
              className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
              icon={GlobalSearchIcon}
              size={16}
            />
            <input
              aria-label="Search states"
              className="h-11 w-full rounded-md border bg-card pr-3 pl-9 text-sm transition-colors outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25"
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

        <div className="overflow-y-auto p-2">
          {matches.length ? (
            <div className="grid gap-1.5">
              {matches.map(({ region, snapshot }) => (
                <button
                  aria-label={`Select ${region.name}, ${region.basin} water system`}
                  aria-pressed={selectedRegionId === region.id}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-md border bg-card px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    selectedRegionId === region.id &&
                      "border-primary/50 bg-accent"
                  )}
                  key={region.id}
                  onClick={() => {
                    selectRegion(region.id)
                  }}
                  type="button"
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium">
                      {region.name}
                    </span>
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
    </dialog>
  )
}
