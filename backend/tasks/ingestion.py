from dataclasses import replace
from datetime import UTC, datetime

from sqlalchemy import select

from backend.cache.redis_client import delete_cache_keys, delete_cache_pattern
from backend.domain.snapshots import ComputedSnapshot, EnvironmentalReading, compute_snapshot
from backend.models.database import session_scope
from backend.models.entities import ReservoirSnapshot
from backend.services.environmental_sources import fetch_environmental_readings
from backend.workers.celery_app import celery_app

FALLBACK_READINGS = {
    "elbe-upper": EnvironmentalReading(66, 30, "fallback environmental model", 17, 452),
    "rhine-lower": EnvironmentalReading(73, 34, "fallback environmental model", 15, 503),
    "danube-south": EnvironmentalReading(70, 24, "fallback environmental model", 16, 418),
    "weser-central": EnvironmentalReading(44, 12, "fallback environmental model", 27, 258),
    "oder-east": EnvironmentalReading(55, 16, "fallback environmental model", 24, 294),
}


@celery_app.task(name="droplet.refresh_reservoir_snapshots")
def refresh_reservoir_snapshots() -> dict[str, int]:
    return _refresh_reservoir_snapshots()


@celery_app.task(name="droplet.refresh_demo_snapshots")
def refresh_demo_snapshots() -> dict[str, int]:
    return _refresh_reservoir_snapshots()


def _refresh_reservoir_snapshots() -> dict[str, int]:
    readings = fetch_environmental_readings(FALLBACK_READINGS)

    return _persist_readings(readings)


def _persist_readings(readings: dict[str, EnvironmentalReading]) -> dict[str, int]:
    result = {
        "created": 0,
        "processed": len(readings),
        "skipped": 0,
        "updated": 0,
    }

    with session_scope() as session:
        for region_id, reading in readings.items():
            snapshot = compute_snapshot(_normalize_observation_time(reading))
            existing_snapshot = session.scalars(
                select(ReservoirSnapshot)
                .where(
                    ReservoirSnapshot.region_id == region_id,
                    ReservoirSnapshot.timestamp == snapshot.timestamp,
                )
                .limit(1)
            ).first()

            if existing_snapshot:
                if _snapshot_matches(existing_snapshot, snapshot):
                    result["skipped"] += 1
                else:
                    _apply_snapshot(existing_snapshot, snapshot)
                    result["updated"] += 1

                continue

            session.add(
                _snapshot_entity(
                    region_id,
                    snapshot,
                )
            )
            result["created"] += 1

    if result["created"] or result["updated"]:
        delete_cache_keys([
            "droplet:analytics:summary:v1",
            "droplet:snapshots:latest:v1",
            "droplet:sources:health:v1",
        ])
        delete_cache_pattern("droplet:snapshots:history:*:v1")

    return result


def _normalize_observation_time(reading: EnvironmentalReading) -> EnvironmentalReading:
    if reading.observed_at is not None:
        return reading

    current_hour = datetime.now(UTC).replace(minute=0, second=0, microsecond=0)

    return replace(reading, observed_at=current_hour)


def _snapshot_entity(
    region_id: str,
    snapshot: ComputedSnapshot,
) -> ReservoirSnapshot:
    return ReservoirSnapshot(
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


def _apply_snapshot(
    existing_snapshot: ReservoirSnapshot,
    snapshot: ComputedSnapshot,
) -> None:
    existing_snapshot.confidence_score = snapshot.confidence_score
    existing_snapshot.evaporation_pressure = snapshot.evaporation_pressure
    existing_snapshot.rainfall_index = snapshot.rainfall_index
    existing_snapshot.source = snapshot.source
    existing_snapshot.trend = snapshot.trend
    existing_snapshot.visibility_score = snapshot.visibility_score
    existing_snapshot.water_level = snapshot.water_level


def _snapshot_matches(
    existing_snapshot: ReservoirSnapshot,
    snapshot: ComputedSnapshot,
) -> bool:
    return (
        round(existing_snapshot.confidence_score) == snapshot.confidence_score
        and round(existing_snapshot.evaporation_pressure) == snapshot.evaporation_pressure
        and round(existing_snapshot.rainfall_index) == snapshot.rainfall_index
        and existing_snapshot.source == snapshot.source
        and existing_snapshot.trend == snapshot.trend
        and round(existing_snapshot.visibility_score) == snapshot.visibility_score
        and round(existing_snapshot.water_level) == snapshot.water_level
    )
