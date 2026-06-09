# Source Normalization

Droplet normalizes external climate sources in source-family modules. Climate readings remain non-persistent contextual data and are not stored in reservoir snapshots.

Phase 3 adds a stable selected-region climate read model for the frontend while keeping the debug source-normalization route available for backend inspection.

## Existing Water And Weather

Water/weather ingestion remains in `backend/services/environmental_sources.py`.

- Pegelonline supplies water-level observations.
- DWD CDC supplies temperature, humidity, and precipitation.
- Open-Meteo weather is used as fallback when DWD is unavailable.
- Static fallback readings keep snapshot generation available when live sources fail.

## Sunlight

`backend/services/climate_sources/solar.py` uses the Open-Meteo Satellite Radiation API archive endpoint for per-region hourly radiation data and selects the latest usable observation.

Normalized output:

- current shortwave radiation
- direct, diffuse, and direct-normal radiation components
- clear-sky ratio
- direct-light share
- observation timestamp
- observation age in minutes
- source metadata
- `ok`, `partial`, or `unavailable` status
- units metadata for normalized numeric fields
- `0-100` solar feasibility score
- readable solar feasibility label

Clear-sky radiation is treated as optional source context. If Open-Meteo returns core irradiance fields without clear-sky radiation, the stable endpoint leaves `clearSkyRatio` empty instead of marking sunlight as partial or surfacing a warning.

Missing shortwave or direct radiation fields are treated as selected-source gaps and appear as stable sunlight warnings because they affect source availability and direct-light share.

Zero-radiation rows, such as nighttime observations where direct and diffuse radiation are both `0`, are treated as valid low-sunlight observations rather than partial source failures.

The stable climate flow caches Open-Meteo solar archive payloads per region and date window with a 30-minute fresh window and a three-hour stale fallback window by default. These observation source-cache windows are controlled by `CLIMATE_OBSERVATION_CACHE_FRESH_TTL_SECONDS` and `CLIMATE_OBSERVATION_CACHE_STALE_TTL_SECONDS`. Invalid values fall back to defaults, and stale retention is never shorter than the fresh window. The debug source-normalization route keeps live fetch behavior unless a caller explicitly opts into cached source builders in code.

## Air Quality

`backend/services/climate_sources/air_quality.py` uses UBA v4 station metadata and measurement rows as the primary German air-quality source. It tries nearby station candidates, compares usable candidates by pollutant coverage and observation freshness, detects stale selected pollutant readings, and selects the best available station for the selected state.

Normalized output:

- PM2.5, PM10, NO2, O3, SO2, and CO values
- observation timestamp
- observation age in minutes
- selected station metadata
- `ok`, `partial`, or `unavailable` status
- units metadata for normalized numeric fields
- `0-100` air-risk score
- readable air-risk label

The stable climate flow caches UBA station metadata with a 12-hour fresh window and a seven-day stale fallback window by default. These station-index windows are controlled by `CLIMATE_STATION_INDEX_CACHE_FRESH_TTL_SECONDS` and `CLIMATE_STATION_INDEX_CACHE_STALE_TTL_SECONDS`. UBA station/pollutant measurement payloads and Open-Meteo air-quality fallback payloads use the same configurable observation source-cache windows as solar. The debug source-normalization route can still run live source fetches for backend inspection.

When selected UBA station coverage is partial, Open-Meteo air-quality data can fill missing pollutant readings. When UBA has no usable readings and Open-Meteo has at least one usable pollutant value, Open-Meteo becomes the air-quality fallback source. Empty Open-Meteo fallback payloads are not treated as successful readings. When fallback data contributes to the selected reading, its freshness and parseability warnings are retained in the stable warning pipeline.

Stable endpoint warnings focus on unresolved selected-source gaps. Raw upstream timeout strings, warnings from skipped station candidates, and redundant generic partial-coverage warnings remain debug details rather than UI-facing messages when a specific pollutant gap is already reported.
UBA carbon monoxide measurements are reported by the source in mg/m3 and converted to ug/m3 for the normalized contract.

## CO2

`backend/services/climate_sources/co2.py` records CAMS/Copernicus as the exploratory CO2 source path.

The module returns a structured candidate response with dataset candidates, region target coordinates, required configuration, known blockers, expected fields, and implementation notes instead of blocking on credentials or dataset workflow setup.

## Stable Climate Context Endpoint

`GET /api/climate/regions/<region_id>` exposes the UI-facing climate read model for one selected state.

The endpoint:

- Requires authentication with `@require_auth()` and is readable by all signed-in roles.
- Uses a versioned per-region Redis stale-while-revalidate cache with a 300 second fresh window and one-hour stale retention by default.
- Returns a stale cached read model immediately while a background refresh updates the cache when the fresh window expires.
- Can be refreshed by Celery tasks on a schedule controlled by `CLIMATE_CONTEXT_REFRESH_INTERVAL_MINUTES`, defaulting to 30 minutes.
- Uses `CLIMATE_CONTEXT_FRESH_TTL_SECONDS` and `CLIMATE_CONTEXT_STALE_TTL_SECONDS` for the read-model cache windows. Invalid values fall back to defaults, and stale retention is never shorter than the fresh window.
- Validates the region id before reading or writing a climate context cache key.
- Uses `CLIMATE_SOURCE_TIMEOUT_SECONDS`, defaulting to 8 seconds, for stable climate source requests.
- Includes a compact `cache` section with status, stored time, fresh-until time, stale-until time, and whether an async refresh was started.
- Returns sunlight, air-quality, and CO2 source-status context in compact camelCase fields.
- Includes compact source labels for normalized sunlight and air-quality readings without exposing debug request configuration or raw payload summaries.
- Folds partial source failures into section warnings so one unavailable source does not fail the entire climate response.
- Does not expose raw response summaries, request config, selected debug fields, or the debug-stage envelope.
- Returns `404` with a structured error for unknown region ids.

Response sections:

- `sunlight`: `score`, feasibility `label`, `source`, `status`, `observedAt`, `ageMinutes`, irradiance values in `W/m2`, `clearSkyRatio`, `directLightShare`, and warnings.
- `air`: `riskScore`, `riskLabel`, `source`, `status`, `observedAt`, `ageMinutes`, pollutant values in `ug/m3`, station summary, and warnings.
- `cache`: cache `status`, `storedAt`, `freshUntil`, `staleUntil`, and `refreshStarted`.
- `co2`: candidate source `status`, source name, required config, dataset candidates, blockers, and warnings.

CO2 remains candidate metadata. It should not be interpreted as a live measured operational score. The stable endpoint keeps CO2 warnings focused on candidate availability and required workflow setup; detailed CAMS/Copernicus research notes stay in the debug route.

## Debug Stages

`backend/services/climate_sources/contracts.py` defines the shared debug-stage envelope:

- request/source config
- raw response summary
- selected fields
- normalized output
- compact section summary
- warnings and errors
- source metadata

Raw source payloads are not durable app state. Debug stages expose summaries and selected fields only for temporary backend inspection.

The debug builder reuses one HTTP session per request and shares the UBA station index across all requested regions before fetching per-region measurement rows.
Debug responses include lightweight request metadata, aggregate summary counts, normalize duplicate or aliased section names, and reject unknown section names with a `400` response.
The debug route supports a `limit` query parameter for sampling all-region output during backend inspection and marks limited all-region responses as sample-only metadata.

## Temporary Debug Route

`GET /api/debug/source-normalization`

Query parameters:

- `regionId`: optional region id such as `berlin`.
- `limit`: optional all-region sample size, capped by the backend and ignored when `regionId` is present. The route defaults to a one-region sample when no `regionId` or `limit` is supplied.
- `sections`: optional comma-separated subset of `water,sunlight,air,co2`.

Section names are case-insensitive. Supported aliases include `solar` and `radiation` for `sunlight`, `aq` for `air`, and `carbon` for `co2`.

Both `/api/debug/source-normalization` and `/api/debug/source-normalization/` resolve to the debug response.

The route remains backend inspection tooling, not the frontend API. The frontend consumes `/api/climate/regions/<region_id>` instead.
