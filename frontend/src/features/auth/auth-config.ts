export type AuthMode = "demo" | "keycloak"

export type AuthConfig = {
  authMode: AuthMode
  clientId: string
  realm: string
  url: string
}

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api"

export const fallbackAuthConfig: AuthConfig = {
  authMode: normalizeAuthMode(import.meta.env.VITE_AUTH_MODE),
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "droplet-frontend",
  realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "droplet",
  url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
}

export async function fetchAuthConfig() {
  const response = await fetch(`${apiBaseUrl}/auth/config`, {
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Auth config returned ${response.status}`)
  }

  return normalizeAuthConfig(await response.json())
}

function normalizeAuthConfig(payload: unknown): AuthConfig {
  if (!payload || typeof payload !== "object") {
    return fallbackAuthConfig
  }

  const config = payload as Partial<Record<keyof AuthConfig, unknown>>

  return {
    authMode: normalizeAuthMode(config.authMode),
    clientId: stringValue(config.clientId, fallbackAuthConfig.clientId),
    realm: stringValue(config.realm, fallbackAuthConfig.realm),
    url: stringValue(config.url, fallbackAuthConfig.url),
  }
}

function normalizeAuthMode(mode: unknown): AuthMode {
  return mode === "keycloak" ? "keycloak" : "demo"
}

function stringValue(value: unknown, fallback: string) {
  return typeof value === "string" && value.length > 0 ? value : fallback
}
