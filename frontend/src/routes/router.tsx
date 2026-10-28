import {
  createRootRoute,
  createRoute,
  createRouter,
  Navigate,
} from "@tanstack/react-router"
import { WaterApp } from "@/components/app/WaterApp"
import { LoginPage } from "@/features/auth/LoginPage"
import { RootLayout } from "@/routes/RootLayout"
const rootRoute = createRootRoute({ component: RootLayout })
const routeTree = rootRoute.addChildren([
  ...(["/", "/places", "/account"] as const).map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: WaterApp,
      validateSearch: (
        search: Record<string, unknown>
      ): { place?: string } => ({
        place: typeof search.place === "string" ? search.place : undefined,
      }),
    })
  ),
  ...(["/trends", "/health", "/ai"] as const).map((path) =>
    createRoute({
      getParentRoute: () => rootRoute,
      path,
      component: () => <Navigate to="/" />,
    })
  ),
  createRoute({
    getParentRoute: () => rootRoute,
    path: "/login",
    component: LoginPage,
  }),
])
export const router = createRouter({ routeTree })
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}
