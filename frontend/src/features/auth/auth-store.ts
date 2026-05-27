import { create } from "zustand"

import {
  initializeKeycloakSession,
  loginWithKeycloak,
  logoutFromKeycloak,
} from "@/features/auth/keycloak"
import type { AuthStatus, AuthUser, DropletRole } from "@/features/auth/types"

type AuthState = {
  error: string | null
  hasAnyRole: (roles: DropletRole[]) => boolean
  initialize: () => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<void>
  mode: "demo" | "keycloak"
  rejectSession: (message: string) => void
  status: AuthStatus
  token: string | null
  user: AuthUser | null
}

const mode = import.meta.env.VITE_AUTH_MODE ?? "demo"

const demoUser: AuthUser = {
  email: "analyst@droplet.local",
  name: "Droplet Analyst",
  roles: ["citizen", "analyst", "municipality"],
  subject: "demo-user",
}

export const useAuthStore = create<AuthState>((set, get) => ({
  error: null,
  hasAnyRole: (roles) => {
    const activeRoles = get().user?.roles ?? []

    return roles.some((role) => activeRoles.includes(role))
  },
  initialize: async () => {
    set({ error: null, status: "loading" })

    if (mode === "demo") {
      set({ status: "authenticated", token: "demo-token", user: demoUser })
      return
    }

    try {
      const session = await initializeKeycloakSession()
      set({
        status: session.user ? "authenticated" : "unauthenticated",
        token: session.token,
        user: session.user,
      })
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Authentication failed",
        status: "unauthenticated",
        token: null,
        user: null,
      })
    }
  },
  login: async () => {
    if (mode === "demo") {
      set({ error: null, status: "authenticated", token: "demo-token", user: demoUser })
      return
    }

    await loginWithKeycloak()
  },
  logout: async () => {
    if (mode === "keycloak") {
      await logoutFromKeycloak()
    }

    set({ error: null, status: "unauthenticated", token: null, user: null })
  },
  mode,
  rejectSession: (message) => {
    set({ error: message, status: "unauthenticated", token: null, user: null })
  },
  status: "loading",
  token: null,
  user: null,
}))
