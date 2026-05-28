import {
  Activity02Icon,
  DatabaseSyncIcon,
  DropletIcon,
  GitCompareIcon,
  Logout01Icon,
  MapsIcon,
  RefreshIcon,
  UserShieldIcon,
} from "@hugeicons/core-free-icons"
import type { ReactNode } from "react"

import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/features/auth/auth-store"
import { useAppStore, type MapLayer } from "@/stores/app-store"
import { cn } from "@/lib/utils"

type AppShellProps = {
  children: ReactNode
  onRefresh: () => void
  refreshMessage?: string | null
  refreshing: boolean
  stale: boolean
  syncing: boolean
}

const layers: { id: MapLayer; label: string }[] = [
  { id: "water-level", label: "Water" },
  { id: "rainfall", label: "Rain" },
  { id: "confidence", label: "Confidence" },
]

export function AppShell({
  children,
  onRefresh,
  refreshMessage,
  refreshing,
  stale,
  syncing,
}: AppShellProps) {
  const activeLayer = useAppStore((state) => state.activeLayer)
  const comparisonMode = useAppStore((state) => state.comparisonMode)
  const setActiveLayer = useAppStore((state) => state.setActiveLayer)
  const setComparisonMode = useAppStore((state) => state.setComparisonMode)
  const logout = useAuthStore((state) => state.logout)
  const user = useAuthStore((state) => state.user)
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
          {[MapsIcon, Activity02Icon, DatabaseSyncIcon, UserShieldIcon].map((icon, index) => (
            <button
              aria-label={`Workspace section ${index + 1}`}
              className={cn(
                "flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                index === 0 && "bg-accent text-foreground"
              )}
              key={index}
              type="button"
            >
              <ProductIcon icon={icon} />
            </button>
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
        <header className="sticky top-0 z-10 border-b bg-background/95 px-4 py-3 backdrop-blur md:px-6">
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
              <div
                aria-label="Map layer"
                className="flex shrink-0 rounded-md border bg-card p-0.5"
                role="group"
              >
                {layers.map((layer) => (
                  <button
                    aria-pressed={activeLayer === layer.id}
                    className={cn(
                      "h-7 rounded-sm px-2 text-xs font-medium text-muted-foreground transition-colors",
                      activeLayer === layer.id && "bg-primary text-primary-foreground"
                    )}
                    key={layer.id}
                    onClick={() => setActiveLayer(layer.id)}
                    type="button"
                  >
                    {layer.label}
                  </button>
                ))}
              </div>

              <Button
                aria-pressed={comparisonMode}
                className={cn(
                  "shrink-0",
                  comparisonMode && "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                )}
                size="lg"
                variant="outline"
                onClick={() => setComparisonMode(!comparisonMode)}
              >
                <ProductIcon icon={GitCompareIcon} />
                Compare
              </Button>

              <Button
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
    </div>
  )
}
