# Source Normalization

Droplet normalizes external climate sources in source-family modules. Phase 2 keeps these climate readings backend-only and does not persist them into reservoir snapshots.

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

## Air Quality

`backend/services/climate_sources/air_quality.py` uses UBA v4 station metadata and measurement rows as the primary German air-quality source. It tries nearby station candidates until one yields usable measurements for the selected state.

Normalized output:

- PM2.5, PM10, NO2, O3, SO2, and CO values
- observation timestamp
- observation age in minutes
- selected station metadata
- `ok`, `partial`, or `unavailable` status
- units metadata for normalized numeric fields
- `0-100` air-risk score

When UBA station data cannot be normalized, the module can attach Open-Meteo air-quality fallback/comparison data to the debug output. The fallback is normalized into the same air-quality contract while remaining separate from the primary UBA output.
UBA carbon monoxide measurements are reported by the source in mg/m3 and converted to ug/m3 for the normalized contract.

## CO2

`backend/services/climate_sources/co2.py` records CAMS/Copernicus as the exploratory CO2 source path.

The module returns a structured candidate response with dataset candidates, region target coordinates, required configuration, known blockers, expected fields, and implementation notes instead of blocking on credentials or dataset workflow setup.

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
