import math
import os
from dataclasses import replace
from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from backend.domain.regions import STATE_READING_VALUES, STATE_REGIONS
from backend.domain.snapshots import EnvironmentalReading, clamp, compute_snapshot
from backend.models.database import session_scope
from backend.models.entities import Region, ReservoirSnapshot

REGIONS = STATE_REGIONS
DEFAULT_DEMO_HISTORY_DAYS = 365
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

        history_days = max(
            1,
            int(os.getenv("DEMO_HISTORY_DAYS", DEFAULT_DEMO_HISTORY_DAYS)),
        )
        history_end = datetime.now(UTC).replace(
            minute=0,
            second=0,
            microsecond=0,
        ) - timedelta(hours=1)

        for region_id, reading in READINGS.items():
            if session.scalar(
                select(ReservoirSnapshot.id)
                .where(ReservoirSnapshot.region_id == region_id)
                .limit(1)
            ):
                continue

            previous_water_level: int | None = None

            for index in range(history_days):
                day_offset = history_days - 1 - index
                region_phase = _region_phase(region_id)
                seasonal_wave = math.sin(((index + region_phase) / 365) * math.tau)
                shorter_wave = math.sin(((index * 3 + region_phase) / 31) * math.tau)
                rainfall_pulse = max(
                    0,
                    math.sin(((index * 5 + region_phase) / 17) * math.tau),
                )
                observed_at = history_end - timedelta(days=day_offset)
                snapshot = compute_snapshot(
                    EnvironmentalReading(
                        humidity_percent=clamp(
                            reading.humidity_percent
                            + seasonal_wave * 11
                            + shorter_wave * 4,
                            32,
                            96,
                        ),
                        rainfall_mm=max(
                            0.5,
                            reading.rainfall_mm
                            + seasonal_wave * 5.5
                            + rainfall_pulse * 14
                            - shorter_wave * 2,
                        ),
                        observed_at=observed_at,
                        source=reading.source,
                        temperature_c=(
                            reading.temperature_c
                            - seasonal_wave * 8
                            + shorter_wave * 1.8
                        ),
                        water_level_cm=max(
                            90,
                            reading.water_level_cm
                            + seasonal_wave * 80
                            + rainfall_pulse * 55
                            + shorter_wave * 24,
                        ),
                    )
                )

                if previous_water_level is not None:
                    water_delta = snapshot.water_level - previous_water_level

                    if water_delta >= 3:
                        snapshot = replace(snapshot, trend="rising")
                    elif water_delta <= -3:
                        snapshot = replace(snapshot, trend="falling")
                    else:
                        snapshot = replace(snapshot, trend="stable")

                previous_water_level = snapshot.water_level
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


def _region_phase(region_id: str) -> int:
    return sum(ord(character) for character in region_id) % 365
