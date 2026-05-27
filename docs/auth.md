# Auth Modes

Droplet supports two local auth modes.

## Demo Mode

Default for prototype development.

Backend:

```bash
AUTH_MODE=demo
```

Frontend:

```bash
VITE_AUTH_MODE=demo
```

Demo mode signs in as `Droplet Analyst` with `citizen`, `analyst`, and
`municipality` roles.

## Keycloak Mode

Run Keycloak with Docker:

```bash
docker compose up --build postgres redis backend worker scheduler keycloak
```

Then switch auth mode:

```bash
AUTH_MODE=keycloak
VITE_AUTH_MODE=keycloak
```

Local realm users:

| Username | Password | Roles |
|---|---|---|
| `citizen` | `droplet` | `citizen` |
| `analyst` | `droplet` | `citizen`, `analyst`, `municipality` |
| `municipality` | `droplet` | `citizen`, `municipality` |

The backend validates Keycloak access tokens. Role-gated endpoints require
`analyst` or `municipality`; `citizen` can read basic region and snapshot data.
