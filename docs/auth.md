# Authentication

Droplet has one optional account type and no user roles or access levels. The
dashboard, trends, health, forecasts, climate context, and up to 365 snapshot
records per state are public. An account unlocks Gemini analysis and private,
user-scoped analysis history.

## Demo Mode

Demo mode is intended only for local development. It uses one built-in account
so developers can exercise the authenticated AI flow without an identity
provider.

```bash
AUTH_MODE=demo
VITE_AUTH_MODE=demo
```

## Keycloak Mode

Run the local identity provider with Docker:

```bash
docker compose up --build postgres redis backend worker scheduler keycloak
```

Then enable token validation:

```bash
AUTH_MODE=keycloak
VITE_AUTH_MODE=keycloak
```

The frontend normally reads `/api/auth/config` from the backend during startup,
so the backend mode is authoritative. `VITE_AUTH_MODE` is only the frontend
fallback while the API is unavailable.

The imported `droplet` realm allows self-registration, email login, and password
reset. It contains no seeded users or Droplet-specific roles. The backend
validates access tokens only for `/api/auth/me`, `/api/ai/analyze`, and
`/api/ai/analyses`.

Production deployment must replace the local Keycloak URLs and redirect origins,
enable an email provider and email verification, rotate admin credentials, and
disable demo mode.
