# Droplet Docs

Droplet is Germany's Water State Platform: an operational dashboard for monitoring regional water conditions, source freshness, forecast pressure, and AI-assisted observations.

## Documents

- [How to Use Droplet](./docs/usage.md): user-facing guide for navigation, roles, refreshes, and AI analysis.
- [Data Flow](./docs/dataflow.md): how environmental data moves from sources into snapshots, read models, caches, and the frontend.
- [Architecture](./docs/architecture.md): service layout, runtime components, backend layers, frontend layers, and deployment notes.
- [Auth Modes](./docs/auth.md): demo auth and local Keycloak setup.
- [Prototype Architecture](./docs/prototype-architecture.md): original resilience notes.

## System At A Glance

```mermaid
flowchart LR
  Sources[Environmental sources] --> Worker[Celery ingestion worker]
  Worker --> DB[(PostgreSQL)]
  DB --> API[Flask API]
  API <--> Cache[(Redis)]
  API --> Frontend[React workspace]
  Keycloak[Keycloak or demo auth] --> API
  Frontend --> Keycloak
```

Droplet stores normalized reservoir snapshots in PostgreSQL. The backend builds stable read models from those snapshots, caches frequently used responses in Redis, and serves them to the React app through authenticated API endpoints.
