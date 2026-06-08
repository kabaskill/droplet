/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string
  readonly VITE_AUTH_MODE?: "demo" | "keycloak"
  readonly VITE_CLIMATE_CONTEXT_FRESH_TTL_SECONDS?: string
  readonly VITE_CLIMATE_CONTEXT_STALE_TTL_SECONDS?: string
  readonly VITE_DEMO_FALLBACK?: "true" | "false"
  readonly VITE_KEYCLOAK_CLIENT_ID?: string
  readonly VITE_KEYCLOAK_REALM?: string
  readonly VITE_KEYCLOAK_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
