# Droplet Prototype Architecture

Droplet stores environmental state as normalized reservoir snapshots. The React app reads stable read models from Flask instead of calling external environmental APIs directly.

```txt
External APIs
  -> ingestion task
  -> normalization and snapshot engine
  -> PostgreSQL snapshots
  -> cached API read models
  -> React operational workspace
```

Forecast outlooks are read models too: the backend fetches Open-Meteo hourly
forecast data, converts it into a 48-hour regional pressure estimate, caches the
result in Redis, and falls back to persisted snapshots if forecast coverage is
temporarily unavailable.

Frontend resilience is split between TanStack Query for transient API retries,
localStorage persistence for cached server state, and a global workspace error
boundary for rendering failures.

## Resilience Model

Droplet treats the dashboard as a set of independent read models. Core state and
snapshot failures are surfaced globally because the map cannot operate without
them. Optional read models, such as source health, forecasts, analytics, and AI
analysis, fail inside their own panels so the rest of the workspace stays usable.

The frontend uses TanStack Query with offline-first network mode and persisted
localStorage cache. When the browser goes offline, the dashboard explicitly
labels that cached reservoir snapshots and read models are being shown. A
read-model freshness panel exposes the last successful update age for the main
queries and provides a retry action that refetches live API data without
starting a new ingestion run.

The backend uses Redis for API read-model caching and Celery coordination.
Snapshot refreshes run through the worker, persist normalized observations in
PostgreSQL, then invalidate Redis read-model keys so the next frontend retry or
refresh receives updated state. Manual snapshot ingestion and read-model retry
remain separate operations: ingestion changes environmental state, while retry
only reloads already-computed read models.

The prototype runs in demo auth mode by default. Keycloak realm, client, roles,
and local test users are included so the app can be switched to OIDC validation
by setting `VITE_AUTH_MODE=keycloak` and `AUTH_MODE=keycloak`. See
`docs/auth.md` for local users and role behavior.
