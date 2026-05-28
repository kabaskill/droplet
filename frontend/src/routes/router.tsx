import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"

import { AccountPage } from "@/components/app/AccountPage"
import { AiPage } from "@/components/app/AiPage"
import { DashboardPage } from "@/components/app/DashboardPage"
import { HealthPage } from "@/components/app/HealthPage"
import { TrendsPage } from "@/components/app/TrendsPage"
import { LoginPage } from "@/features/auth/LoginPage"
import { RootLayout } from "@/routes/RootLayout"
import { WorkspaceLayout } from "@/routes/WorkspaceLayout"

const rootRoute = createRootRoute({
  component: RootLayout,
})

const workspaceRoute = createRoute({
  component: WorkspaceLayout,
  getParentRoute: () => rootRoute,
  id: "workspace",
})

const dashboardRoute = createRoute({
  component: DashboardPage,
  getParentRoute: () => workspaceRoute,
  path: "/",
})

const trendsRoute = createRoute({
  component: TrendsPage,
  getParentRoute: () => workspaceRoute,
  path: "/trends",
})

const healthRoute = createRoute({
  component: HealthPage,
  getParentRoute: () => workspaceRoute,
  path: "/health",
})

const aiRoute = createRoute({
  component: AiPage,
  getParentRoute: () => workspaceRoute,
  path: "/ai",
})

const accountRoute = createRoute({
  component: AccountPage,
  getParentRoute: () => workspaceRoute,
  path: "/account",
})

const loginRoute = createRoute({
  component: LoginPage,
  getParentRoute: () => rootRoute,
  path: "/login",
})

const routeTree = rootRoute.addChildren([
  workspaceRoute.addChildren([
    dashboardRoute,
    trendsRoute,
    healthRoute,
    aiRoute,
    accountRoute,
  ]),
  loginRoute,
])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
