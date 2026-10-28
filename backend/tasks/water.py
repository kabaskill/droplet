import os
from datetime import UTC, datetime

from backend.models.database import engine, session_scope
from backend.models.water_migrations import migrate_water_schema
from backend.repositories.water import persist_observations
from backend.services.water_sources import fetch_measured_observations
from backend.workers.celery_app import celery_app


@celery_app.task(name="droplet.refresh_water_observations")
def refresh_water_observations():
    migrate_water_schema(engine)
    now = datetime.now(UTC)
    batch = fetch_measured_observations(now=now)
    with session_scope() as session:
        counts = persist_observations(
            session,
            batch,
            now,
            retention_days=int(os.getenv("WATER_OBSERVATION_RETENTION_DAYS", "395")),
        )
    return {**counts, "sourceFailures": batch["failures"]}


if __name__ == "__main__":
    print(refresh_water_observations())


@celery_app.task(name="droplet.backfill_water_observations")
def backfill_water_observations():
    """Explicit bootstrap/recovery job; normal restarts never reseed data."""
    import requests
    from sqlalchemy import select
    from backend.models.water import RainfallObservation
    from backend.services import environmental_sources as sources
    from backend.services.water_catalog import TARGETS, configured_station
    from backend.services.water_sources import SOURCE_ERRORS
    from backend.services.water_backfill import backfill_region
    migrate_water_schema(engine)
    now = datetime.now(UTC)
    results = {}
    with requests.Session() as http:
        stations = sources._get_json(http, sources.PEGELONLINE_URL, {
            "includeTimeseries": "true", "includeCurrentMeasurement": "true",
            "includeCharacteristicValues": "true",
        }, 30)
        for region_id, target in TARGETS.items():
            try:
                station = configured_station(stations, region_id, target)
            except SOURCE_ERRORS:
                station = None
            with session_scope() as session:
                rain = session.scalars(select(RainfallObservation).where(RainfallObservation.region_id == region_id).order_by(RainfallObservation.window_end.desc()).limit(1)).first()
                rain_data = {key: getattr(rain, key) for key in (
                    "region_id", "station_id", "station_name", "latitude", "longitude", "source_url",
                )} if rain else None
            batch = backfill_region(region_id, station, rain_data, now, http)
            with session_scope() as session:
                results[region_id] = {**persist_observations(session, batch, now, overwrite=False), "failures": batch["failures"]}
            print(region_id, results[region_id], flush=True)
    # Restore latest source condition when an hourly backfill point shares its timestamp.
    refresh_water_observations()
    return results
