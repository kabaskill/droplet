import { create } from "zustand"

import {
  initializeKeycloakSession,
  loginWithKeycloak,
  logoutFromKeycloak,
} from "@/features/auth/keycloak"
import {
  fallbackAuthConfig,
  fetchAuthConfig,
  type AuthConfig,
  type AuthMode,
} from "@/features/auth/auth-config"
import type { AuthStatus, AuthUser, DropletRole } from "@/features/auth/types"

type AuthState = {
  config: AuthConfig
  error: string | null
  hasAnyRole: (roles: DropletRole[]) => boolean
  initialize: () => Promise<void>
  login: () => Promise<void>
  logout: () => Promise<void>
  mode: AuthMode
  rejectSession: (message: string) => void
  status: AuthStatus
  token: string | null
  user: AuthUser | null
}

const demoUser: AuthUser = {
  email: "analyst@droplet.local",
  name: "Droplet Analyst",
  roles: ["citizen", "analyst", "municipality"],
  subject: "demo-user",
}

export const useAuthStore = create<AuthState>((set, get) => ({
  config: fallbackAuthConfig,
  error: null,
  hasAnyRole: (roles) => {
    const activeRoles = get().user?.roles ?? []
    const activeRolesSet = new Set(activeRoles)

    return roles.some((role) => activeRolesSet.has(role))
  },
  initialize: async () => {
    set({ error: null, status: "loading" })
    const config = await resolveAuthConfig()
    set({ config, mode: config.authMode })

    if (config.authMode === "demo") {
      set({ status: "authenticated", token: "demo-token", user: demoUser })
      return
    }

    try {
      const session = await initializeKeycloakSession(config)
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
    const config = get().config

    if (config.authMode === "demo") {
      set({ error: null, status: "authenticated", token: "demo-token", user: demoUser })
      return
    }

    await loginWithKeycloak(config)
  },
  logout: async () => {
    if (get().mode === "keycloak") {
      await logoutFromKeycloak()
    }

    set({ error: null, status: "unauthenticated", token: null, user: null })
  },
  mode: fallbackAuthConfig.authMode,
  rejectSession: (message) => {
    set({ error: message, status: "unauthenticated", token: null, user: null })
  },
  status: "loading",
  token: null,
  user: null,
}))

async function resolveAuthConfig() {
  try {
    return await fetchAuthConfig()
  } catch {
    return fallbackAuthConfig
  }
}
