# Changelog

## 2026-05-29

- Expanded the app documentation set and moved the docs index to the root `README.md` so GitHub shows it by default:
  - Added usage, data flow, architecture, and auth documentation links from the root README.
  - Added a transparent snapshot model and calculations document that explains source collection, internal data structures, database storage, frontend read models, formulas, limitations, and future calibration work.
  - Corrected documented role-based snapshot history limits to match backend behavior: citizen users can request up to 90 observations, municipality and analyst users up to 365.
- Added local Docker Compose override support for development-specific runtime settings.

## 2026-05-28

- Improved AI analysis from a single snapshot panel into a dedicated AI workspace:
  - Added state-level and water-region analysis scopes.
  - Packages latest water-source, rainfall, evaporation, confidence, visibility, and regional metadata into role-aware analysis requests.
  - Replaced local/mock analysis behavior with Gemini-backed structured JSON analysis.
  - Added loading, unavailable, and error states for Gemini analysis.
  - Saved AI analysis requests and responses in PostgreSQL per user.
  - Added analysis history browsing so users can review previous Gemini results.
  - Updated the AI panel to render stored analyses as well as newly generated analysis results.
- Refined the AI page layout and copy:
  - Added a left-side scope/history control area and main analysis result area.
  - Added clearer single-state vs water-region controls.
  - Removed redundant role display from the AI page header.
  - Improved empty, waiting, and history states for analysis workflows.
- Continued UI polish across the operational workspace:
  - Improved responsive layout behavior for analysis workflows.
  - Kept page-level controls more focused on selected scope and current result state.
  - Reduced stale or confusing labels around AI role context and result history.
- Added Redis read-through caching for region, snapshot, analytics, source health, and forecast read models with worker cache invalidation after snapshot refreshes.
- Added protected snapshot refresh, Celery task status polling, scheduled Celery beat refreshes, snapshot retention cleanup, and ingestion run status tracking.
- Expanded live environmental ingestion:
  - Fetches Pegelonline W water-level measurements for configured German basin stations.
  - Uses DWD CDC recent hourly data as the primary temperature, humidity, and precipitation source.
  - Falls back to Open-Meteo weather and static environmental readings when external sources are unavailable.
  - Normalizes live water levels against Pegelonline characteristic values when available.
  - Updates or skips existing region/timestamp observations instead of appending duplicate history rows.
- Added snapshot freshness metadata, parsed source badges, source health read models, provider coverage, fallback visibility, and stale region reporting.
- Updated trend calculation to compare each region against its previous observation instead of relying only on absolute threshold rules.
- Added cached Open-Meteo forecast outlooks with snapshot-derived fallback and 48-hour regional pressure estimates.
- Hardened auth handling with backend-provided auth config, structured auth errors, Keycloak role test users, frontend token/session handling fixes, and local auth documentation.
- Expanded the dashboard from five basin proxy regions to all 16 German federal states and bumped frontend and Redis cache namespaces to avoid stale five-region data.
- Improved the operational UI:
  - Integrated the Germany SVG state map with operational coloring and state selection.
  - Added map layer switching for water, rainfall, and confidence emphasis.
  - Added comparison mode, layer-aware regional rankings, and operational filters for elevated, stale, fallback, and low-confidence views.
  - Added water-system focus controls for related states such as Main, Rhine, Elbe, and Weser.
  - Added mobile region detail actions, skeleton states, quick region search, history metric switching, and better panel loading/unavailable states.
  - Simplified header refresh state, improved accessibility labels, and fixed mobile state selection behavior.
- Improved frontend resilience:
  - Added API-aware retry rules and a global workspace error boundary.
  - Added offline cached-data notices and read-model freshness reporting.
  - Added retry-live-data behavior that refetches read models without starting ingestion.
  - Scoped global read-model failures to core state and snapshot data while keeping optional analytics, forecast, source-health, and analysis failures local.
- Updated role-aware snapshot history depth so citizen and analyst users can review up to 90 observations while municipality users can review up to 365 observations.
- Documented the frontend and backend resilience model in the prototype architecture note.

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
