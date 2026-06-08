import os
from datetime import UTC, datetime
from typing import Any

import requests

from backend.cache.keys import cache_key
from backend.cache.redis_client import refresh_stale_while_revalidate_json
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


def _positive_float_env(name: str, fallback: float) -> float:
    try:
        value = float(os.getenv(name, str(fallback)))
    except (TypeError, ValueError):
        return fallback

    return value if value > 0 else fallback


CLIMATE_SOURCE_TIMEOUT_SECONDS = 8.0
CLIMATE_SOURCE_TIMEOUT_SECONDS = _positive_float_env(
    "CLIMATE_SOURCE_TIMEOUT_SECONDS",
    CLIMATE_SOURCE_TIMEOUT_SECONDS,
)
CLIMATE_CONTEXT_FRESH_TTL_SECONDS = 300
CLIMATE_CONTEXT_STALE_TTL_SECONDS = 60 * 60


class UnknownClimateRegionError(ValueError):
    pass


def build_region_climate_context(
    region_id: str,
    timeout: float = CLIMATE_SOURCE_TIMEOUT_SECONDS,
) -> dict[str, Any]:
    _validate_region_id(region_id)

    with requests.Session() as http:
        solar = build_solar_debug_stage(
            region_id,
            cache_enabled=True,
            http=http,
            timeout=timeout,
        )
        air = build_air_quality_debug_stage(
            region_id,
            cache_enabled=True,
            http=http,
            timeout=timeout,
        )

    co2 = build_co2_debug_stage(region_id)

    return {
        "air": _air_context(air),
        "co2": _co2_context(co2),
        "generatedAt": datetime.now(UTC).isoformat(),
        "regionId": region_id,
        "sunlight": _sunlight_context(solar),
    }


def climate_context_cache_key(region_id: str) -> str:
    return cache_key(f"climate:region:{region_id}")


def refresh_region_climate_context_cache(region_id: str) -> dict[str, Any]:
    return refresh_stale_while_revalidate_json(
        climate_context_cache_key(region_id),
        CLIMATE_CONTEXT_FRESH_TTL_SECONDS,
        CLIMATE_CONTEXT_STALE_TTL_SECONDS,
        lambda: build_region_climate_context(region_id),
    )


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
        "source": _text_or_none(normalized.get("source")) or stage.source.name,
        "status": status,
        "warnings": _sunlight_warnings(stage),
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
        "source": _text_or_none(normalized.get("source")) or stage.source.name,
        "station": _station_summary(normalized.get("station")),
        "status": status,
        "warnings": _air_warnings(stage, status),
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


def _sunlight_warnings(stage: DebugStage) -> list[str]:
    warnings: list[str] = []

    if stage.errors:
        warnings.append("Sunlight source unavailable")

    for warning in stage.warnings:
        normalized = warning.lower()

        if "clear-sky radiation field is unavailable" in normalized:
            continue

        if "no parseable timestamp" in normalized:
            warnings.append("Sunlight observation timestamp unavailable")
        elif "older than six hours" in normalized:
            warnings.append("Sunlight observation is older than six hours")
        else:
            warnings.append("Sunlight source returned partial data")

    return _unique_warnings(warnings)


def _air_warnings(stage: DebugStage, status: str) -> list[str]:
    warnings: list[str] = []

    if stage.errors:
        warnings.append("Air quality source unavailable")
    elif status == "partial":
        warnings.append("Air quality source returned partial pollutant coverage")

    for warning in stage.warnings:
        normalized = warning.lower()

        if "missing pollutant readings:" in normalized:
            missing = warning.split(":", 1)[1]
            warnings.append(
                "Missing pollutant readings: "
                f"{_format_pollutant_list(missing.split(','))}"
            )
        elif "stale pollutant readings:" in normalized:
            stale = warning.split(":", 1)[1]
            warnings.append(
                "Stale pollutant readings: "
                f"{_format_pollutant_list(stale.split(','))}"
            )
        elif "air-quality reading is older than twelve hours" in normalized:
            warnings.append("Air quality reading is older than twelve hours")
        elif "no parseable timestamp" in normalized:
            warnings.append("Air quality observation timestamp unavailable")
        elif "open-meteo air-quality fallback unavailable" in normalized:
            warnings.append("Open-Meteo air-quality fallback unavailable")
        elif "open-meteo filled missing uba pollutant readings:" in normalized:
            warnings.append(warning)
        elif "using open-meteo air-quality fallback" in normalized:
            warnings.append("Using Open-Meteo air-quality fallback")
        elif "measurement unavailable" in normalized:
            warnings.append("Some UBA pollutant measurements were unavailable")
        elif "better pollutant coverage" in normalized:
            warnings.append("Using nearby UBA station with better pollutant coverage")

    return _unique_warnings(warnings)


def _format_pollutant_list(values: list[str]) -> str:
    labels = [
        _pollutant_label(value.strip())
        for value in values
        if value.strip()
    ]

    return ", ".join(labels) if labels else "unknown"


def _pollutant_label(value: str) -> str:
    labels = {
        "co": "CO",
        "no2": "NO2",
        "o3": "O3",
        "pm10": "PM10",
        "pm25": "PM2.5",
        "so2": "SO2",
    }

    return labels.get(value.lower(), value.upper())


def _unique_warnings(warnings: list[str]) -> list[str]:
    return list(dict.fromkeys(warnings))


def _station_summary(station: Any) -> dict[str, Any] | None:
    if not isinstance(station, dict):
        return None

    return {
        "id": _text_or_none(station.get("id")),
        "name": _text_or_none(station.get("name")),
        "network": _text_or_none(station.get("network")),
        "setting": _text_or_none(station.get("setting")),
        "stationType": _text_or_none(
            station.get("stationType") or station.get("station_type")
        ),
    }


def _text_or_none(value: Any) -> str | None:
    if value is None:
        return None

    text = str(value).strip()

    return text or None
