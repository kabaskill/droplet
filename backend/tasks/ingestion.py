import os
from dataclasses import replace
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, desc, select

from backend.cache.redis_client import delete_cache_keys, delete_cache_pattern
from backend.domain.snapshots import ComputedSnapshot, EnvironmentalReading, compute_snapshot
from backend.models.database import session_scope
from backend.models.entities import ReservoirSnapshot
from backend.services.environmental_sources import fetch_environmental_readings
from backend.services.ingestion_status import (
    record_ingestion_completed,
    record_ingestion_failed,
    record_ingestion_started,
)
from backend.workers.celery_app import celery_app

FALLBACK_READINGS = {
    "elbe-upper": EnvironmentalReading(66, 30, "fallback environmental model", 17, 452),
    "rhine-lower": EnvironmentalReading(73, 34, "fallback environmental model", 15, 503),
    "danube-south": EnvironmentalReading(70, 24, "fallback environmental model", 16, 418),
    "weser-central": EnvironmentalReading(44, 12, "fallback environmental model", 27, 258),
    "oder-east": EnvironmentalReading(55, 16, "fallback environmental model", 24, 294),
}


@celery_app.task(name="droplet.refresh_reservoir_snapshots")
def refresh_reservoir_snapshots(trigger: str = "manual") -> dict[str, int]:
    return _refresh_reservoir_snapshots(trigger)


@celery_app.task(name="droplet.refresh_demo_snapshots")
def refresh_demo_snapshots() -> dict[str, int]:
    return _refresh_reservoir_snapshots("manual")


def _refresh_reservoir_snapshots(trigger: str) -> dict[str, int]:
    started_at = datetime.now(UTC)
    record_ingestion_started(trigger, started_at)

    try:
        readings = fetch_environmental_readings(FALLBACK_READINGS)
        result = _persist_readings(readings)
    except Exception as exc:
        record_ingestion_failed(trigger, started_at, exc)
        raise

    record_ingestion_completed(trigger, started_at, result)

    return result


def _persist_readings(readings: dict[str, EnvironmentalReading]) -> dict[str, int]:
    result = {
        "created": 0,
        "deleted": 0,
        "processed": len(readings),
        "skipped": 0,
        "updated": 0,
    }

    with session_scope() as session:
        for region_id, reading in readings.items():
            snapshot = compute_snapshot(_normalize_observation_time(reading))
            snapshot = _with_historical_trend(session, region_id, snapshot)
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

        result["deleted"] = _prune_expired_snapshots(session)

    if result["created"] or result["updated"] or result["deleted"]:
        delete_cache_keys([
            "droplet:analytics:summary:v1",
            "droplet:forecasts:outlook:v1",
            "droplet:snapshots:latest:v1",
            "droplet:sources:health:v1",
        ])
        delete_cache_pattern("droplet:snapshots:history:*:v1")

    return result


def _prune_expired_snapshots(session) -> int:
    retention_days = int(os.getenv("SNAPSHOT_RETENTION_DAYS", "30"))

    if retention_days <= 0:
        return 0

    cutoff = datetime.now(UTC) - timedelta(days=retention_days)
    result = session.execute(
        delete(ReservoirSnapshot).where(ReservoirSnapshot.timestamp < cutoff)
    )

    return result.rowcount or 0


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


def _with_historical_trend(
    session,
    region_id: str,
    snapshot: ComputedSnapshot,
) -> ComputedSnapshot:
    previous_snapshot = session.scalars(
        select(ReservoirSnapshot)
        .where(
            ReservoirSnapshot.region_id == region_id,
            ReservoirSnapshot.timestamp < snapshot.timestamp,
        )
        .order_by(desc(ReservoirSnapshot.timestamp))
        .limit(1)
    ).first()

    if previous_snapshot is None:
        return snapshot

    water_level_delta = snapshot.water_level - round(previous_snapshot.water_level)

    if water_level_delta >= 3:
        trend = "rising"
    elif water_level_delta <= -3:
        trend = "falling"
    else:
        trend = "stable"

    return replace(snapshot, trend=trend)


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
