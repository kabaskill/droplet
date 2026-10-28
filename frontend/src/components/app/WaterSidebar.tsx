import { useState, type ReactNode } from "react"
import { Link } from "@tanstack/react-router"
import {
  ArrowDown01Icon,
  DropletIcon,
  MapsIcon,
  Location01Icon,
  RefreshIcon,
  UserShieldIcon,
} from "@hugeicons/core-free-icons"
import { ProductIcon } from "@/components/app/ProductIcon"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"

const navigation = [
  { to: "/", label: "Explore", icon: MapsIcon },
  { to: "/places", label: "My places", icon: Location01Icon },
  { to: "/account", label: "Account", icon: UserShieldIcon },
] as const

export function WaterSidebar({
  path,
  search,
  onSearch,
  refreshing,
  onRefresh,
  children,
}: {
  path: string
  search: string
  onSearch: (value: string) => void
  refreshing: boolean
  onRefresh: () => void
  children: ReactNode
}) {
  const [placesOpen, setPlacesOpen] = useState(true)
  const { setOpen, setOpenMobile, state } = useSidebar()
  return (
    <Sidebar collapsible="icon" className="water-sidebar">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1 group-data-[collapsible=icon]:justify-center">
          <Link
            to="/"
            className="flex items-center gap-2 group-data-[collapsible=icon]:hidden"
            onClick={() => setOpenMobile(false)}
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ProductIcon icon={DropletIcon} />
            </span>
            <span className="text-sm font-semibold">Droplet</span>
          </Link>
          <SidebarTrigger className="ml-auto group-data-[collapsible=icon]:ml-0" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <nav aria-label="Main navigation">
            <SidebarMenu>
              {navigation.map(({ to, label, icon }) => (
                <SidebarMenuItem key={to}>
                  <SidebarMenuButton
                    asChild
                    isActive={path === to}
                    tooltip={label}
                  >
                    <Link
                      to={to}
                      aria-current={path === to ? "page" : undefined}
                      onClick={() => setOpenMobile(false)}
                    >
                      <ProductIcon icon={icon} />
                      <span>{label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
        <SidebarSeparator />
        <SidebarGroup className="min-h-0 flex-1">
          <Collapsible
            open={placesOpen}
            onOpenChange={setPlacesOpen}
            className="flex min-h-0 flex-col"
          >
            <SidebarMenu>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    tooltip="Places"
                    onClick={(event) => {
                      if (state === "collapsed") {
                        event.preventDefault()
                        setOpen(true)
                        setPlacesOpen(true)
                      }
                    }}
                  >
                    <ProductIcon icon={Location01Icon} />
                    <span>
                      {path === "/places" ? "Saved places" : "Places"}
                    </span>
                    <ProductIcon
                      icon={ArrowDown01Icon}
                      className={`ml-auto transition-transform group-data-[collapsible=icon]:hidden ${placesOpen ? "" : "-rotate-90"}`}
                      size={14}
                    />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
              </SidebarMenuItem>
            </SidebarMenu>
            <CollapsibleContent className="flex min-h-0 flex-col group-data-[collapsible=icon]:hidden">
              <div className="px-1 pt-2 pb-3">
                <SidebarInput
                  type="search"
                  aria-label="Search states, gauges or rivers"
                  placeholder="Search state, gauge or river…"
                  value={search}
                  onChange={(event) => onSearch(event.target.value)}
                />
              </div>
              <div className="place-list">{children}</div>
            </CollapsibleContent>
          </Collapsible>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarSeparator />
        <SidebarMenuButton
          disabled={refreshing}
          onClick={onRefresh}
          tooltip="Refresh observations"
        >
          <ProductIcon
            icon={RefreshIcon}
            className={refreshing ? "animate-spin" : ""}
          />
          <span>{refreshing ? "Updating…" : "Refresh"}</span>
        </SidebarMenuButton>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
