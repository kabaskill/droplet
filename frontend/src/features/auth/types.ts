export type AuthStatus = "loading" | "authenticated" | "unauthenticated"

export type AuthUser = {
  email?: string
  name: string
  subject: string
}
