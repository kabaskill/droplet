from dataclasses import asdict, dataclass
from datetime import datetime
from typing import Any


@dataclass(frozen=True)
class SourceMetadata:
    name: str
    url: str
    attribution: str | None = None


@dataclass(frozen=True)
class DebugStage:
    request: dict[str, Any]
    raw_summary: dict[str, Any] | None
    selected_fields: dict[str, Any]
    normalized_output: dict[str, Any] | None
    warnings: list[str]
    errors: list[str]
    source: SourceMetadata


@dataclass(frozen=True)
class NormalizedSolarReading:
    age_minutes: int | None
    clear_sky_ratio: float | None
    diffuse_radiation_w_m2: float | None
    direct_normal_irradiance_w_m2: float | None
    direct_light_share: float | None
    direct_radiation_w_m2: float | None
    observed_at: datetime | None
    region_id: str
    score: int
    shortwave_radiation_w_m2: float | None
    source: str
    status: str


@dataclass(frozen=True)
class NormalizedAirQualityReading:
    age_minutes: int | None
    air_risk_score: int
    co_ug_m3: float | None
    no2_ug_m3: float | None
    o3_ug_m3: float | None
    observed_at: datetime | None
    pm10_ug_m3: float | None
    pm25_ug_m3: float | None
    region_id: str
    so2_ug_m3: float | None
    source: str
    station: dict[str, Any] | None
    status: str


@dataclass(frozen=True)
class NormalizedCo2Reading:
    age_minutes: int | None
    co2_ppm: float | None
    observed_at: datetime | None
    region_id: str
    source: str
    status: str


def dataclass_to_debug_dict(value: Any) -> dict[str, Any] | None:
    if value is None:
        return None

    def convert(item: Any) -> Any:
        if isinstance(item, datetime):
            return item.isoformat()

        if isinstance(item, list):
            return [convert(entry) for entry in item]

        if isinstance(item, dict):
            return {key: convert(entry) for key, entry in item.items()}

        return item

    return convert(asdict(value))
