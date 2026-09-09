import {
  Login01Icon,
  Logout01Icon,
  UserShieldIcon,
} from "@hugeicons/core-free-icons"

import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/features/auth/auth-store"
import { openKeycloakAccount } from "@/features/auth/keycloak"

export function AccountPage() {
  const config = useAuthStore((state) => state.config)
  const logout = useAuthStore((state) => state.logout)
  const login = useAuthStore((state) => state.login)
  const mode = useAuthStore((state) => state.mode)
  const isAuthenticated = useAuthStore(
    (state) => state.status === "authenticated"
  )
  const user = useAuthStore((state) => state.user)
  const accountAvailable = mode === "keycloak"

  if (!isAuthenticated) {
    return (
      <main className="mx-auto grid max-w-4xl gap-4 p-4 pb-24 md:p-6 lg:pb-6">
        <section className="rounded-md border bg-card p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ProductIcon icon={UserShieldIcon} size={18} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">Your free account</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                The water dashboard is public. Create an account to use Droplet
                AI and keep your analysis history.
              </p>
              <Button className="mt-4" onClick={() => void login()}>
                <ProductIcon icon={Login01Icon} />
                Sign in or create account
              </Button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <main className="mx-auto grid max-w-4xl gap-4 p-4 pb-24 md:p-6 lg:pb-6">
      <section className="rounded-md border bg-card p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
              <ProductIcon icon={UserShieldIcon} size={18} />
            </span>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold">User</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Current session and identity provider access.
              </p>
            </div>
          </div>
          <Button variant="outline" onClick={() => void logout()}>
            <ProductIcon icon={Logout01Icon} />
            Sign out
          </Button>
        </div>
      </section>

      <section className="rounded-md border bg-card p-4 shadow-sm">
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <AccountField label="Name" value={user?.name ?? "Operator"} />
          <AccountField label="Email" value={user?.email ?? "Not provided"} />
          <AccountField label="Account provider" value={mode} />
          <AccountField label="Subject" value={user?.subject ?? "Unknown"} />
        </dl>
      </section>

      {accountAvailable ? (
        <section className="rounded-md border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-medium">
                Keycloak account management
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Profile and password changes are handled by Keycloak.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => void openKeycloakAccount(config)}
            >
              Open account
            </Button>
          </div>
        </section>
      ) : null}
    </main>
  )
}

type AccountFieldProps = {
  label: string
  value: string
}

function AccountField({ label, value }: AccountFieldProps) {
  return (
    <div className="min-w-0 rounded-md border bg-background p-3">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 truncate font-medium">{value}</dd>
    </div>
  )
}
