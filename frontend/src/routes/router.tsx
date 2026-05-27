import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router"

import { DashboardPage } from "@/components/app/DashboardPage"
import { LoginPage } from "@/features/auth/LoginPage"
import { ProtectedRoute } from "@/features/auth/ProtectedRoute"
import { RootLayout } from "@/routes/RootLayout"

const rootRoute = createRootRoute({
  component: RootLayout,
})

const dashboardRoute = createRoute({
  component: () => (
    <ProtectedRoute>
      <DashboardPage />
    </ProtectedRoute>
  ),
  getParentRoute: () => rootRoute,
  path: "/",
})

const loginRoute = createRoute({
  component: LoginPage,
  getParentRoute: () => rootRoute,
  path: "/login",
})

const routeTree = rootRoute.addChildren([dashboardRoute, loginRoute])

export const router = createRouter({ routeTree })

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
