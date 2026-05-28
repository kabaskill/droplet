import Keycloak, { type KeycloakTokenParsed } from "keycloak-js"

import type { AuthConfig } from "@/features/auth/auth-config"
import type { AuthUser, DropletRole } from "@/features/auth/types"

let keycloak: Keycloak | null = null
let initialization: Promise<KeycloakSession> | null = null
let clientKey: string | null = null

const dropletRoles: DropletRole[] = ["citizen", "analyst", "municipality"]

type KeycloakSession = {
  token: string | null
  user: AuthUser | null
}

function getClient(config: AuthConfig) {
  const nextClientKey = `${config.url}|${config.realm}|${config.clientId}`

  if (keycloak) {
    if (clientKey !== nextClientKey) {
      throw new Error("Keycloak client configuration changed after initialization")
    }

    return keycloak
  }

  keycloak = new Keycloak({
    clientId: config.clientId,
    realm: config.realm,
    url: config.url,
  })
  clientKey = nextClientKey

  return keycloak
}

function activeClient() {
  return keycloak
}

function roleList(token: KeycloakTokenParsed | undefined, clientId: string): DropletRole[] {
  const realmRoles = token?.realm_access?.roles ?? []
  const clientRoles = token?.resource_access?.[clientId]?.roles ?? []
  const roles = new Set([...realmRoles, ...clientRoles])

  return dropletRoles.filter((role) => roles.has(role))
}

export async function initializeKeycloakSession(config: AuthConfig) {
  initialization ??= initializeClientSession(config).catch((error: unknown) => {
    initialization = null
    throw error
  })

  return initialization
}

async function initializeClientSession(config: AuthConfig): Promise<KeycloakSession> {
  const client = getClient(config)
  const authenticated = await client.init({
    checkLoginIframe: false,
    onLoad: "check-sso",
    pkceMethod: "S256",
  })

  if (!authenticated) {
    return { token: null, user: null }
  }

  return sessionFromToken(client, config.clientId)
}

function sessionFromToken(client: Keycloak, clientId: string): KeycloakSession {
  const parsedToken = client.tokenParsed
  const token = client.token ?? null
  const givenName = parsedToken?.given_name
  const familyName = parsedToken?.family_name
  const tokenName = [givenName, familyName].filter(Boolean).join(" ").trim()
  const user: AuthUser = {
    email: parsedToken?.email,
    name:
      tokenName ||
      parsedToken?.name ||
      parsedToken?.preferred_username ||
      "Droplet user",
    roles: roleList(client.tokenParsed, clientId),
    subject: client.subject ?? parsedToken?.sub ?? "keycloak-user",
  }

  return { token, user }
}

export async function loginWithKeycloak(config: AuthConfig) {
  await getClient(config).login()
}

export async function logoutFromKeycloak() {
  await activeClient()?.logout()
}

export async function openKeycloakAccount(config: AuthConfig) {
  const client = getClient(config)

  if (!client.authenticated) {
    await client.login({
      redirectUri: window.location.href,
    })
    return
  }

  await client.updateToken(30)
  await client.accountManagement()
}

export async function refreshKeycloakToken() {
  const client = activeClient()

  if (!client?.authenticated || !client.token) {
    return null
  }

  await client.updateToken(30)

  return client.token ?? null
}
