# Droplet Phase 2: Climate Source Normalization

Phase 2 expands backend data acquisition and normalization beyond the existing water/weather snapshot model. The work stays backend-only and focuses on source-specific normalization layers for solar feasibility, air quality, and exploratory CO2 context.

## Scope

- Keep existing water/weather ingestion and reservoir snapshot persistence intact.
- Add dedicated source modules for sunlight, air quality, and CO2.
- Keep raw external payloads out of durable app state.
- Expose transformation stages only through temporary debug output.
- Defer frontend work, auth handling for the debug route, Docker changes, durable climate persistence, and automated tests.

## Source Strategy

| Family | Primary source | Role |
|---|---|---|
| Water/weather | Existing Pegelonline, DWD, and Open-Meteo fallback flow | Unchanged baseline. |
| Sunlight | Open-Meteo Satellite Radiation API | Solar feasibility from per-region latitude/longitude. |
| Air quality | Umweltbundesamt Luftdaten API v4 | Primary station and measurement source for German states. |
| Air quality fallback | Open-Meteo Air Quality API | Optional fallback/comparison when UBA coverage is missing. |
| CO2 | Copernicus/CAMS data path | Exploratory source candidate implemented last. |

## Normalization Contracts

Each climate family owns its fetch, parse, normalize, and debug-stage code. Shared contracts are limited to the debug envelope and normalized dataclasses.

### Sunlight

Open-Meteo satellite radiation fields:

- `shortwave_radiation`
- `direct_radiation`
- `diffuse_radiation`
- `direct_normal_irradiance`
- `shortwave_radiation_clear_sky` where available

Normalized fields:

- current irradiance in W/m2
- direct, diffuse, and direct-normal radiation components in W/m2
- clear-sky ratio
- direct-light share
- observation timestamp
- observation age in minutes
- source metadata
- `ok`, `partial`, or `unavailable` status
- units metadata for normalized numeric fields
- `0-100` solar feasibility score

### Air Quality

UBA station metadata is mapped to each German state by nearest usable station coordinates. If the nearest candidate has no usable measurements, nearby candidates are tried before falling back. UBA measurement rows are queried by component id and normalized into:

- PM2.5
- PM10
- NO2
- O3
- SO2
- CO
- observation timestamp
- observation age in minutes
- station metadata
- `ok`, `partial`, or `unavailable` status
- units metadata for normalized numeric fields
- `0-100` air-risk score

If UBA does not produce a usable reading, the debug response includes a structured warning and can include Open-Meteo air-quality comparison/fallback data normalized into the same air-quality contract. UBA carbon monoxide values are converted from mg/m3 to ug/m3 in normalized output.

### CO2

CO2 is deliberately last. CAMS/Copernicus is tracked as the research path, but the implementation remains exploratory unless a practical credential-free query path is available.

The debug object records:

- source candidate
- required configuration
- expected fields
- implementation notes
- normalized unavailable status

## Temporary Debug API

`GET /api/debug/source-normalization`

Query params:

- `regionId`: optional region id such as `berlin`.
- `limit`: optional all-region sample size, ignored when `regionId` is present.
- `sections`: optional comma-separated subset of `water,sunlight,air,co2`.

Unknown section values return a structured `400` error instead of silently being ignored.

Each section returns:

- request/source configuration
- raw response summary
- selected fields
- normalized output
- warnings and errors
- source metadata

The response also includes request metadata such as generation time, requested region, requested sections, allowed sections, and region count.

The debug route is intentionally unprotected for this phase and should not be treated as a durable public API.
Within one debug request, reusable HTTP state and source metadata should be shared across section builders so multi-region inspection does not repeat avoidable source-index fetches.

## Commit Sequence

- `add: phase 2 normalization plan`
- `add: climate source contracts`
- `add: solar normalization layer`
- `add: air quality normalization layer`
- `add: co2 source candidate`
- `add: source normalization debug route`
- `update: climate data documentation`

## Testing

Automated tests are deferred for this phase. Verification is limited to code review and lightweight syntax checks when dependencies are available locally.

## Deferred Work

- Durable persistence for solar, air, and CO2.
- Frontend views and protected frontend routes.
- Auth/role gating for debug output.
- Automated unit and route tests for source normalization.
- Production hardening of the temporary debug route.
- CO2 dataset credentials and extraction workflow.
