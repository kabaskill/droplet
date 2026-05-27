import Keycloak, {
  type KeycloakProfile,
  type KeycloakTokenParsed,
} from "keycloak-js"

import type { AuthUser, DropletRole } from "@/features/auth/types"

let keycloak: Keycloak | null = null

const dropletRoles: DropletRole[] = ["citizen", "analyst", "municipality"]

function getClient() {
  if (keycloak) {
    return keycloak
  }

  keycloak = new Keycloak({
    clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "droplet-frontend",
    realm: import.meta.env.VITE_KEYCLOAK_REALM ?? "droplet",
    url: import.meta.env.VITE_KEYCLOAK_URL ?? "http://localhost:8080",
  })

  return keycloak
}

function roleList(token?: KeycloakTokenParsed): DropletRole[] {
  const realmRoles = token?.realm_access?.roles ?? []
  const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID ?? "droplet-frontend"
  const clientRoles = token?.resource_access?.[clientId]?.roles ?? []
  const roles = new Set([...realmRoles, ...clientRoles])

  return dropletRoles.filter((role) => roles.has(role))
}

export async function initializeKeycloakSession() {
  const client = getClient()
  const authenticated = await client.init({
    checkLoginIframe: false,
    onLoad: "check-sso",
    pkceMethod: "S256",
  })

  if (!authenticated) {
    return { token: null, user: null }
  }

  const profile: KeycloakProfile = await client.loadUserProfile()
  const token = client.token ?? null
  const user: AuthUser = {
    email: profile.email,
    name: profile.firstName
      ? `${profile.firstName} ${profile.lastName ?? ""}`.trim()
      : profile.username ?? "Droplet user",
    roles: roleList(client.tokenParsed),
    subject: client.subject ?? profile.id ?? "keycloak-user",
  }

  return { token, user }
}

export async function loginWithKeycloak() {
  await getClient().login()
}

export async function logoutFromKeycloak() {
  await getClient().logout()
}
