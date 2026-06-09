# Changelog

## 2026-06-08

- Added the Phase 3 selected-region climate context read model:
  - Exposed authenticated `GET /api/climate/regions/<region_id>` for all signed-in users.
  - Added per-region Redis stale-while-revalidate caching with a 300 second fresh window and one-hour stale retention.
  - Added scheduled Celery refresh tasks for selected-region climate context caches.
  - Added local configuration examples for the scheduled climate context refresh interval.
  - Made selected-region climate context fresh and stale cache windows configurable.
  - Made the stable climate source timeout configurable through `CLIMATE_SOURCE_TIMEOUT_SECONDS`.
  - Hardened climate timeout config parsing so invalid values fall back to the default.
  - Validated climate region ids before reading or writing selected-region climate cache keys.
  - Versioned selected-region climate context cache keys so read-model shape changes do not reuse older cached payloads.
  - Added stable endpoint cache metadata so callers can distinguish fresh, stale, miss, and bypass responses.
  - Added backend unit coverage for climate cache metadata and air-quality fallback normalization.
  - Returned compact sunlight, air-quality, and CO2 source-status fields for frontend use.
  - Kept raw response summaries, request config, selected debug fields, and debug-stage envelopes out of the stable endpoint.
  - Added compact stable source labels for normalized sunlight and air-quality readings.
  - Preserved `/api/debug/source-normalization` as backend inspection tooling.
- Hardened climate-source normalization and cache behavior:
  - Cached UBA station metadata and per-station pollutant measurements separately to reduce repeated upstream calls.
  - Cached Open-Meteo solar and air-quality fallback payloads for the stable climate flow.
  - Made stable-flow observation and UBA station-index source cache windows configurable.
  - Added stale fallback windows to stable-flow climate source caches so recently expired payloads can remain usable during source refresh.
  - Treated missing clear-sky solar radiation as optional when core irradiance fields are present.
  - Added stable sunlight warnings for missing shortwave or direct radiation fields.
  - Treated zero-radiation solar rows as valid low-sunlight observations instead of partial source failures.
  - Sanitized stable climate warnings so raw upstream timeout strings stay in debug tooling only.
  - Selected UBA air-quality stations by pollutant coverage and observation freshness instead of first usable candidate.
  - Detected stale pollutant-level UBA readings when selected pollutants have mixed observation times.
  - Used Open-Meteo air-quality data to fill missing UBA pollutant readings or as a fallback when UBA has no usable readings.
  - Preserved Open-Meteo fallback freshness and parseability warnings when fallback air-quality data contributes to the selected reading.
  - Reduced redundant stable air-quality partial-coverage warnings when specific pollutant gaps are already reported.
  - Kept stable air-quality warnings focused on selected unresolved gaps instead of warnings from skipped station candidates.
  - Normalized stable air-quality station summary fields to predictable strings and preserved UBA station type metadata.
  - Kept skipped UBA station candidate details out of stable air-quality warnings.
- Added frontend climate context support:
  - Added typed climate API models, `fetchRegionClimate`, `useRegionClimate`, and demo fallback data.
  - Rendered selected-state climate context in the Home right rail between region detail and forecast.
  - Added the same climate context to the mobile state detail sheet.
  - Surfaced climate read-model cache freshness in the climate panel header.
  - Displayed fresh-until and stale-until climate cache windows when backend cache metadata provides them.
  - Hardened climate panel timestamp formatting so malformed source timestamps fall back to unavailable labels.
  - Displayed normalized sunlight and air-quality source labels in the climate panel.
  - Included air-quality station type and network in the selected-station summary when available.
  - Aligned the frontend climate query freshness and retention windows with configurable climate cache settings.
  - Showed all normalized air pollutant values in the climate panel.
  - Kept exploratory CO2 source status out of the panel-wide climate availability badge.
  - Kept stable CO2 warnings focused on candidate workflow setup instead of debug-phase notes.
  - Added compact overflow counts when climate source sections have more warnings than the panel displays inline.
  - Kept climate loading and error states local to the climate panel so map, snapshots, detail, and forecast remain usable.
  - Presented CO2 as candidate source metadata instead of a live operational score.
- Updated docs for the stable climate endpoint, selected-region frontend behavior, and non-persistent climate data flow.

## 2026-05-30

- Added the Phase 2 climate source normalization plan for backend-only solar, air-quality, and exploratory CO2 source work.
- Added backend climate source contracts and dedicated normalization modules for Open-Meteo solar radiation, UBA air-quality station observations, Open-Meteo air-quality fallback comparison, and CAMS/Copernicus CO2 source candidacy.
- Aligned solar and air-quality fetchers with Open-Meteo satellite archive responses and UBA v4 station/measurement payloads.
- Reused debug-route HTTP state and UBA station metadata across requested regions to avoid repeated source-index downloads.
- Normalized Open-Meteo air-quality fallback data into the same backend air-quality contract used by UBA.
- Tried nearby UBA station candidates when the nearest station has no usable measurements.
- Added debug response metadata and explicit validation for requested source-normalization sections.
- Added normalized climate-source status fields for complete, partial, and unavailable readings.
- Added normalized observation age fields for climate-source debug output.
- Exposed solar direct, diffuse, and direct-normal radiation components in normalized debug output.
- Added units metadata to normalized climate-source debug output.
- Added an optional debug-route region limit for sampling all-region normalization output.
- Marked limited all-region debug responses with selected region ids and sample-only metadata.
- Normalized debug section inputs with case-insensitive parsing, aliases, and duplicate removal.
- Added compact per-section debug summaries with state, status, warning counts, and error counts.
- Added aggregate debug response summaries across selected sections and regions.
- Expanded CO2 debug output with CAMS dataset candidates, region targets, required configuration, and known blockers.
- Added readable solar feasibility labels alongside normalized solar scores.
- Added readable air-risk labels alongside normalized air-quality scores.
- Documented the climate normalization data flow while keeping existing water/weather reservoir snapshot persistence unchanged.

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
