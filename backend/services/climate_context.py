from datetime import UTC, datetime
from typing import Any

import requests

from backend.domain.regions import STATE_REGIONS
from backend.services.climate_sources.air_quality import build_air_quality_debug_stage
from backend.services.climate_sources.co2 import (
    CAMS_SOURCE,
    CO2_DATASET_CANDIDATES,
    CO2_REQUIRED_CONFIG,
    build_co2_debug_stage,
)
from backend.services.climate_sources.contracts import DebugStage
from backend.services.climate_sources.solar import build_solar_debug_stage

CLIMATE_SOURCE_TIMEOUT_SECONDS = 8


class UnknownClimateRegionError(ValueError):
    pass


def build_region_climate_context(
    region_id: str,
    timeout: float = CLIMATE_SOURCE_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    _validate_region_id(region_id)

    with requests.Session() as http:
        solar = build_solar_debug_stage(region_id, http=http, timeout=timeout)
        air = build_air_quality_debug_stage(region_id, http=http, timeout=timeout)

    co2 = build_co2_debug_stage(region_id)

    return {
        "air": _air_context(air),
        "co2": _co2_context(co2),
        "generatedAt": datetime.now(UTC).isoformat(),
        "regionId": region_id,
        "sunlight": _sunlight_context(solar),
    }


def _validate_region_id(region_id: str) -> None:
    if region_id not in {region["id"] for region in STATE_REGIONS}:
        raise UnknownClimateRegionError(f"unknown regionId: {region_id}")


def _sunlight_context(stage: DebugStage) -> dict[str, Any]:
    normalized = stage.normalized_output or {}
    status = _normalized_status(normalized)
    score = normalized.get("score")

    return {
        "ageMinutes": normalized.get("age_minutes"),
        "clearSkyRatio": normalized.get("clear_sky_ratio"),
        "directLightShare": normalized.get("direct_light_share"),
        "irradiance": {
            "diffuseRadiation": normalized.get("diffuse_radiation_w_m2"),
            "directNormalIrradiance": normalized.get("direct_normal_irradiance_w_m2"),
            "directRadiation": normalized.get("direct_radiation_w_m2"),
            "shortwaveRadiation": normalized.get("shortwave_radiation_w_m2"),
        },
        "label": normalized.get("feasibility_label") or "unavailable",
        "observedAt": normalized.get("observed_at"),
        "score": score if isinstance(score, int | float) else None,
        "status": status,
        "warnings": _source_warnings(stage, "Sunlight source unavailable"),
    }


def _air_context(stage: DebugStage) -> dict[str, Any]:
    normalized = stage.normalized_output or {}
    status = _normalized_status(normalized)
    risk_score = normalized.get("air_risk_score")

    return {
        "ageMinutes": normalized.get("age_minutes"),
        "observedAt": normalized.get("observed_at"),
        "pollutants": {
            "co": normalized.get("co_ug_m3"),
            "no2": normalized.get("no2_ug_m3"),
            "o3": normalized.get("o3_ug_m3"),
            "pm10": normalized.get("pm10_ug_m3"),
            "pm25": normalized.get("pm25_ug_m3"),
            "so2": normalized.get("so2_ug_m3"),
        },
        "riskLabel": normalized.get("air_risk_label") or "unavailable",
        "riskScore": risk_score if isinstance(risk_score, int | float) else None,
        "station": _station_summary(normalized.get("station")),
        "status": status,
        "warnings": _source_warnings(stage, "Air quality source unavailable"),
    }


def _co2_context(stage: DebugStage) -> dict[str, Any]:
    normalized = stage.normalized_output or {}

    return {
        "blockers": [
            "credentials",
            "dataset choice",
            "variable/unit verification",
        ],
        "datasetCandidates": list(CO2_DATASET_CANDIDATES),
        "requiredConfig": [
            *CO2_REQUIRED_CONFIG,
            "regional grid extraction settings",
            "unit conversion rules for selected variable",
        ],
        "source": normalized.get("source") or CAMS_SOURCE.name,
        "status": normalized.get("status") or "candidate_requires_dataset_workflow",
        "warnings": list(stage.warnings),
    }


def _normalized_status(normalized: dict[str, Any]) -> str:
    status = normalized.get("status")

    return status if isinstance(status, str) and status else "unavailable"


def _source_warnings(stage: DebugStage, error_prefix: str) -> list[str]:
    warnings = list(stage.warnings)
    warnings.extend(f"{error_prefix}: {error}" for error in stage.errors)

    return warnings


def _station_summary(station: Any) -> dict[str, Any] | None:
    if not isinstance(station, dict):
        return None

    return {
        "id": station.get("id"),
        "name": station.get("name"),
        "network": station.get("network"),
        "setting": station.get("setting"),
        "stationType": station.get("stationType"),
    }
