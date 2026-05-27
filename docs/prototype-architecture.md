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

The prototype runs in demo auth mode by default. Keycloak realm, client, roles,
and local test users are included so the app can be switched to OIDC validation
by setting `VITE_AUTH_MODE=keycloak` and `AUTH_MODE=keycloak`. See
`docs/auth.md` for local users and role behavior.
