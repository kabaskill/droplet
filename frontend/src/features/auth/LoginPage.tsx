import { Navigate } from "@tanstack/react-router"
import { DropletIcon, Login01Icon, Shield01Icon } from "@hugeicons/core-free-icons"

import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/features/auth/auth-store"

export function LoginPage() {
  const error = useAuthStore((state) => state.error)
  const login = useAuthStore((state) => state.login)
  const mode = useAuthStore((state) => state.mode)
  const status = useAuthStore((state) => state.status)

  if (status === "authenticated") {
    return <Navigate to="/" />
  }

  return (
    <main className="flex min-h-svh bg-[linear-gradient(180deg,oklch(0.985_0.002_197.1),oklch(0.953_0.01_165.6))] p-4 text-foreground dark:bg-background">
      <section className="mx-auto flex w-full max-w-md flex-col justify-center gap-6">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-sm">
            <ProductIcon icon={DropletIcon} size={22} />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-normal">Droplet</h1>
          </div>
        </div>

        <div className="rounded-md border bg-card p-5 shadow-sm">
          <div className="mb-5 flex items-start gap-3">
            <span className="mt-0.5 flex size-8 items-center justify-center rounded-md bg-accent text-primary">
              <ProductIcon icon={Shield01Icon} />
            </span>
            <div className="min-w-0">
              <h2 className="font-medium">Operational access</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {mode === "demo"
                  ? "Demo mode signs in with analyst and municipality roles."
                  : "Continue with Keycloak to enter the protected workspace."}
              </p>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          ) : null}

          <Button size="lg" className="w-full" onClick={() => void login()}>
            <ProductIcon icon={Login01Icon} />
            Sign in
          </Button>
        </div>
      </section>
    </main>
  )
}
