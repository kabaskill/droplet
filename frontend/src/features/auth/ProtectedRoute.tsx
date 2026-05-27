import { Navigate } from "@tanstack/react-router"
import { DropletIcon } from "@hugeicons/core-free-icons"

import { ProductIcon } from "@/components/app/ProductIcon"
import { useAuthStore } from "@/features/auth/auth-store"

type ProtectedRouteProps = {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const status = useAuthStore((state) => state.status)

  if (status === "loading") {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <div className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
          <ProductIcon icon={DropletIcon} className="text-primary" />
          <span>Preparing secure workspace</span>
        </div>
      </div>
    )
  }

  if (status === "unauthenticated") {
    return <Navigate to="/login" />
  }

  return children
}
