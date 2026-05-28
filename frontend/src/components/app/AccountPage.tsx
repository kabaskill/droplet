import { Logout01Icon, UserShieldIcon } from "@hugeicons/core-free-icons"

import { ProductIcon } from "@/components/app/ProductIcon"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/features/auth/auth-store"
import { openKeycloakAccount } from "@/features/auth/keycloak"

export function AccountPage() {
  const config = useAuthStore((state) => state.config)
  const logout = useAuthStore((state) => state.logout)
  const mode = useAuthStore((state) => state.mode)
  const user = useAuthStore((state) => state.user)
  const accountAvailable = mode === "keycloak"

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
          <AccountField label="Auth mode" value={mode} />
          <AccountField
            label="Roles"
            value={user?.roles.length ? user.roles.join(", ") : "No roles"}
          />
          <AccountField label="Subject" value={user?.subject ?? "Unknown"} />
        </dl>
      </section>

      {accountAvailable ? (
        <section className="rounded-md border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h2 className="text-sm font-medium">Keycloak account management</h2>
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
