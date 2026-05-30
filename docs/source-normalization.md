# Source Normalization

Droplet normalizes external climate sources in source-family modules. Phase 2 keeps these climate readings backend-only and does not persist them into reservoir snapshots.

## Existing Water And Weather

Water/weather ingestion remains in `backend/services/environmental_sources.py`.

- Pegelonline supplies water-level observations.
- DWD CDC supplies temperature, humidity, and precipitation.
- Open-Meteo weather is used as fallback when DWD is unavailable.
- Static fallback readings keep snapshot generation available when live sources fail.

## Sunlight

`backend/services/climate_sources/solar.py` uses the Open-Meteo Satellite Radiation API for per-region radiation data.

Normalized output:

- current shortwave radiation
- clear-sky ratio
- direct-light share
- observation timestamp
- source metadata
- `0-100` solar feasibility score

## Air Quality

`backend/services/climate_sources/air_quality.py` uses UBA station observations as the primary German air-quality source.

Normalized output:

- PM2.5, PM10, NO2, O3, SO2, and CO values
- observation timestamp
- selected station metadata
- `0-100` air-risk score

When UBA station data cannot be normalized, the module can attach Open-Meteo air-quality fallback/comparison data to the debug output.

## CO2

`backend/services/climate_sources/co2.py` records CAMS/Copernicus as the exploratory CO2 source path.

The module returns a structured candidate response with required configuration, expected fields, and implementation notes instead of blocking on credentials or dataset workflow setup.

## Debug Stages

`backend/services/climate_sources/contracts.py` defines the shared debug-stage envelope:

- request/source config
- raw response summary
- selected fields
- normalized output
- warnings and errors
- source metadata

Raw source payloads are not durable app state. Debug stages expose summaries and selected fields only for temporary backend inspection.
