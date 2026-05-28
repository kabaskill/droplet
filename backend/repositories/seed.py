from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from backend.domain.regions import STATE_READING_VALUES, STATE_REGIONS
from backend.domain.snapshots import EnvironmentalReading, compute_snapshot
from backend.models.database import session_scope
from backend.models.entities import Region, ReservoirSnapshot

REGIONS = STATE_REGIONS
READINGS = {
    region_id: EnvironmentalReading(
        humidity_percent,
        rainfall_mm,
        "DWD, Pegelonline, Open-Meteo",
        temperature_c,
        water_level_cm,
    )
    for region_id, (
        humidity_percent,
        rainfall_mm,
        temperature_c,
        water_level_cm,
    ) in STATE_READING_VALUES.items()
}


def seed_demo_data() -> None:
    with session_scope() as session:
        configured_region_ids = {region["id"] for region in REGIONS}
        existing_regions = {
            region.id: region for region in session.scalars(select(Region)).all()
        }

        for region_id, region in existing_regions.items():
            if region_id not in configured_region_ids:
                session.delete(region)

        for region_data in REGIONS:
            region = existing_regions.get(region_data["id"])

            if region is None:
                session.add(Region(**region_data))
                continue

            for key, value in region_data.items():
                setattr(region, key, value)

        session.flush()

        history_end = datetime.now(UTC) - timedelta(hours=6)

        for region_id, reading in READINGS.items():
            if session.scalar(
                select(ReservoirSnapshot.id)
                .where(ReservoirSnapshot.region_id == region_id)
                .limit(1)
            ):
                continue

            for index in range(9):
                snapshot = compute_snapshot(
                    EnvironmentalReading(
                        humidity_percent=max(30, reading.humidity_percent - index),
                        rainfall_mm=max(4, reading.rainfall_mm - index * 1.7),
                        source=reading.source,
                        temperature_c=reading.temperature_c + index * 0.2,
                        water_level_cm=max(120, reading.water_level_cm - index * 9),
                    )
                )
                session.add(
                    ReservoirSnapshot(
                        confidence_score=snapshot.confidence_score,
                        evaporation_pressure=snapshot.evaporation_pressure,
                        rainfall_index=snapshot.rainfall_index,
                        region_id=region_id,
                        source=snapshot.source,
                        timestamp=history_end - timedelta(days=8 - index),
                        trend=snapshot.trend,
                        visibility_score=snapshot.visibility_score,
                        water_level=snapshot.water_level,
                    )
                )
