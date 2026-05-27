# Changelog

## 2026-05-27

- Added the first Droplet prototype foundation in the existing Vite frontend:
  - TanStack Router route tree with a protected dashboard route and login route.
  - Zustand auth and app stores for selected region, map layer, auth status, and role checks.
  - TanStack Query with localStorage persistence for offline-first server state.
  - Keycloak client helpers plus demo auth mode for local prototype access.
  - Operational dashboard shell with region selection, snapshot metrics, reservoir visualization, history bars, stale data state, and AI analysis panel.
  - Demo data fallback so the frontend remains usable before the backend is running.
- Added the Flask backend scaffold:
  - App factory, API blueprint, CORS, health endpoint, and protected `/api` routes.
  - SQLAlchemy models for regions and reservoir snapshots.
  - Demo seed data and a lightweight reservoir snapshot engine.
  - Keycloak JWT validation helper and role-based route decorator.
  - Analytics summary service and backend-only AI analysis endpoint with local fallback.
  - Celery worker entry point and demo snapshot refresh task.
- Added prototype infrastructure:
  - Root `docker-compose.yml` with frontend, backend, worker, PostgreSQL, Redis, and Keycloak.
  - Dockerfiles/env examples for frontend and backend.
  - Keycloak realm import with `citizen`, `analyst`, and `municipality` roles.
  - Short architecture note in `docs/prototype-architecture.md`.
- Updated the backend PostgreSQL driver pin to a Python 3.14-compatible 3.2.x release for local smoke testing.
- Branded the Vite document shell with Droplet title/favicon and reduced container runtime warnings for the worker.
- Moved the backend fallback SQLite database path to `/tmp` so the non-root container user can run without a database URL.
- Added Redis read-through caching for region, snapshot, and analytics read models with worker cache invalidation after snapshot refreshes.
- Added a protected snapshot refresh command that queues the ingestion worker and lets the frontend refresh cached snapshot and analytics queries.
- Bounded Celery publish timeouts so snapshot refresh falls back quickly when the broker is unreachable.
- Added live environmental ingestion for snapshot refreshes:
  - Fetches Pegelonline W water-level measurements for the configured German basin stations.
  - Fetches Open-Meteo current weather and recent precipitation context for the same regions.
  - Normalizes live water levels against Pegelonline characteristic values when available, then persists computed snapshots through the existing worker pipeline.
  - Keeps fallback environmental readings so refreshes still produce snapshots when an external API is temporarily unavailable.
  - Backdates seeded history slightly so a successful ingestion refresh becomes the latest snapshot in fresh databases.
- Exposed snapshot IDs in API read models and used stable frontend list keys for repeated live measurement timestamps.
