from datetime import UTC, datetime, timedelta

from sqlalchemy import select

from backend.domain.snapshots import EnvironmentalReading, compute_snapshot
from backend.models.database import session_scope
from backend.models.entities import Region, ReservoirSnapshot

REGIONS = [
    {
        "basin": "Elbe",
        "code": "DE-ELB",
        "federal_state": "Saxony / Brandenburg",
        "id": "elbe-upper",
        "name": "Upper Elbe",
        "risk_profile": "volatile",
        "sort_index": 10,
    },
    {
        "basin": "Rhine",
        "code": "DE-RHN",
        "federal_state": "North Rhine-Westphalia",
        "id": "rhine-lower",
        "name": "Lower Rhine",
        "risk_profile": "flood",
        "sort_index": 20,
    },
    {
        "basin": "Danube",
        "code": "DE-DAN",
        "federal_state": "Bavaria",
        "id": "danube-south",
        "name": "South Danube",
        "risk_profile": "stable",
        "sort_index": 30,
    },
    {
        "basin": "Weser",
        "code": "DE-WES",
        "federal_state": "Lower Saxony",
        "id": "weser-central",
        "name": "Central Weser",
        "risk_profile": "drying",
        "sort_index": 40,
    },
    {
        "basin": "Oder",
        "code": "DE-ODE",
        "federal_state": "Brandenburg",
        "id": "oder-east",
        "name": "East Oder",
        "risk_profile": "volatile",
        "sort_index": 50,
    },
]

READINGS = {
    "danube-south": EnvironmentalReading(72, 22, "DWD, Pegelonline, Open-Meteo", 16, 410),
    "elbe-upper": EnvironmentalReading(68, 28, "DWD, Pegelonline, Open-Meteo", 18, 440),
    "oder-east": EnvironmentalReading(58, 17, "Pegelonline, Open-Meteo", 24, 300),
    "rhine-lower": EnvironmentalReading(76, 32, "DWD, Pegelonline", 15, 495),
    "weser-central": EnvironmentalReading(46, 13, "DWD, Open-Meteo", 26, 265),
}


def seed_demo_data() -> None:
    with session_scope() as session:
        if session.scalar(select(Region).limit(1)):
            return

        for region_data in REGIONS:
            session.add(Region(**region_data))

        session.flush()

        now = datetime.now(UTC)

        for region_id, reading in READINGS.items():
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
                        timestamp=now - timedelta(days=8 - index),
                        trend=snapshot.trend,
                        visibility_score=snapshot.visibility_score,
                        water_level=snapshot.water_level,
                    )
                )
