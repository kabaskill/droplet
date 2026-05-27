export type DropletRole = "citizen" | "analyst" | "municipality"

export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

export type AuthUser = {
  email?: string
  name: string
  roles: DropletRole[]
  subject: string
}
