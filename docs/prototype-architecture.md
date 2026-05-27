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

The first prototype slice runs in demo auth mode by default. Keycloak realm, client, roles, and a demo user are included so the app can be switched to OIDC validation by setting `VITE_AUTH_MODE=keycloak` and `AUTH_MODE=keycloak`.
