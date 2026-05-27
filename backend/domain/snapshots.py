from dataclasses import dataclass
from datetime import UTC, datetime


def clamp(value: float, minimum: float = 0, maximum: float = 100) -> float:
    return max(minimum, min(maximum, value))


@dataclass(frozen=True)
class EnvironmentalReading:
    humidity_percent: float
    rainfall_mm: float
    source: str
    temperature_c: float
    water_level_cm: float


@dataclass(frozen=True)
class ComputedSnapshot:
    confidence_score: int
    evaporation_pressure: int
    rainfall_index: int
    source: str
    timestamp: datetime
    trend: str
    visibility_score: int
    water_level: int


def compute_snapshot(reading: EnvironmentalReading) -> ComputedSnapshot:
    rainfall_index = clamp((reading.rainfall_mm / 45) * 100)
    water_level = clamp((reading.water_level_cm / 650) * 100)
    evaporation_pressure = clamp(
        ((reading.temperature_c - 5) * 2.3) + ((100 - reading.humidity_percent) * 0.55)
    )

    source_count = len([part for part in reading.source.split(",") if part.strip()])
    confidence_score = clamp(55 + source_count * 11 + min(reading.humidity_percent, 80) * 0.1)
    visibility_score = clamp((confidence_score * 0.62) + (100 - evaporation_pressure) * 0.18 + water_level * 0.2)

    if water_level > 70 or rainfall_index > 68:
        trend = "rising"
    elif water_level < 48 or evaporation_pressure > 60:
        trend = "falling"
    else:
        trend = "stable"

    return ComputedSnapshot(
        confidence_score=round(confidence_score),
        evaporation_pressure=round(evaporation_pressure),
        rainfall_index=round(rainfall_index),
        source=reading.source,
        timestamp=datetime.now(UTC),
        trend=trend,
        visibility_score=round(visibility_score),
        water_level=round(water_level),
    )
