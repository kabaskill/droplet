from backend.cache.redis_client import delete_cache_keys, delete_cache_pattern
from backend.domain.snapshots import EnvironmentalReading, compute_snapshot
from backend.models.database import session_scope
from backend.models.entities import ReservoirSnapshot
from backend.workers.celery_app import celery_app


@celery_app.task(name="droplet.refresh_demo_snapshots")
def refresh_demo_snapshots() -> int:
    readings = {
        "elbe-upper": EnvironmentalReading(66, 30, "DWD, Pegelonline, Open-Meteo", 17, 452),
        "rhine-lower": EnvironmentalReading(73, 34, "DWD, Pegelonline", 15, 503),
        "danube-south": EnvironmentalReading(70, 24, "DWD, Pegelonline, Open-Meteo", 16, 418),
        "weser-central": EnvironmentalReading(44, 12, "DWD, Open-Meteo", 27, 258),
        "oder-east": EnvironmentalReading(55, 16, "Pegelonline, Open-Meteo", 24, 294),
    }

    with session_scope() as session:
        for region_id, reading in readings.items():
            snapshot = compute_snapshot(reading)
            session.add(
                ReservoirSnapshot(
                    confidence_score=snapshot.confidence_score,
                    evaporation_pressure=snapshot.evaporation_pressure,
                    rainfall_index=snapshot.rainfall_index,
                    region_id=region_id,
                    source=snapshot.source,
                    timestamp=snapshot.timestamp,
                    trend=snapshot.trend,
                    visibility_score=snapshot.visibility_score,
                    water_level=snapshot.water_level,
                )
            )

    delete_cache_keys([
        "droplet:analytics:summary:v1",
        "droplet:snapshots:latest:v1",
    ])
    delete_cache_pattern("droplet:snapshots:history:*:v1")

    return len(readings)
