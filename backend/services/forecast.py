from datetime import UTC, datetime, timedelta
from typing import Any

import requests

from backend.domain.snapshots import clamp
from backend.repositories.snapshots import latest_snapshots
from backend.services.environmental_sources import (
    OPEN_METEO_URL,
    REGION_SOURCE_TARGETS,
    RegionSourceTarget,
    SourceFetchError,
)


def build_forecast_outlook(timeout: float = 6, horizon_hours: int = 48) -> dict[str, Any]:
    generated_at = datetime.now(UTC)
    latest_by_region = {
        snapshot["regionId"]: snapshot
        for snapshot in latest_snapshots()
    }
    regions = []

    with requests.Session() as http:
        for region_id in _region_ids(latest_by_region):
            target = REGION_SOURCE_TARGETS.get(region_id)
            snapshot = latest_by_region.get(region_id)

            if target is None:
                regions.append(_fallback_outlook(region_id, snapshot))
                continue

            try:
                regions.append(
                    _fetch_region_outlook(
                        http,
                        region_id,
                        target,
                        generated_at,
                        horizon_hours,
                        timeout,
                    )
                )
            except (
                requests.RequestException,
                SourceFetchError,
                TypeError,
                ValueError,
            ):
                regions.append(_fallback_outlook(region_id, snapshot))

    forecast_count = sum(1 for region in regions if region["sourceKind"] == "forecast")

    return {
        "coverage": round((forecast_count / len(regions)) * 100) if regions else 0,
        "generatedAt": generated_at.isoformat(),
        "horizonHours": horizon_hours,
        "regions": regions,
    }


def _region_ids(latest_by_region: dict[str, dict[str, Any]]) -> list[str]:
    ids = list(latest_by_region.keys())

    for region_id in REGION_SOURCE_TARGETS:
        if region_id not in latest_by_region:
            ids.append(region_id)

    return ids


def _fetch_region_outlook(
    http: requests.Session,
    region_id: str,
    target: RegionSourceTarget,
    generated_at: datetime,
    horizon_hours: int,
    timeout: float,
) -> dict[str, Any]:
    payload = _get_open_meteo_forecast(http, target, timeout)
    points = _forecast_points(payload, generated_at, horizon_hours)

    if not points:
        raise SourceFetchError("Open-Meteo payload has no forecast points")

    rainfall_mm = round(sum(max(0, point["precipitation"]) for point in points), 1)
    max_temperature_c = round(max(point["temperature"] for point in points), 1)
    min_humidity_percent = round(min(point["humidity"] for point in points))
    evaporation_pressure = _evaporation_pressure(max_temperature_c, min_humidity_percent)
    pressure_score = _pressure_score(rainfall_mm, evaporation_pressure)
    trend = _forecast_trend(rainfall_mm, evaporation_pressure, pressure_score)
    risk_level = _risk_level(pressure_score)

    return {
        "evaporationPressure": evaporation_pressure,
        "forecastRainfallMm": rainfall_mm,
        "maxTemperatureC": max_temperature_c,
        "minHumidityPercent": min_humidity_percent,
        "pressureScore": pressure_score,
        "regionId": region_id,
        "riskLevel": risk_level,
        "source": "Open-Meteo hourly forecast",
        "sourceKind": "forecast",
        "summary": _summary(rainfall_mm, evaporation_pressure, pressure_score),
        "trend": trend,
    }


def _get_open_meteo_forecast(
    http: requests.Session,
    target: RegionSourceTarget,
    timeout: float,
) -> dict[str, Any]:
    response = http.get(
        OPEN_METEO_URL,
        params={
            "forecast_days": "3",
            "hourly": "temperature_2m,relative_humidity_2m,precipitation",
            "latitude": target.latitude,
            "longitude": target.longitude,
            "timezone": "UTC",
        },
        timeout=timeout,
    )
    response.raise_for_status()
    payload = response.json()

    if not isinstance(payload, dict):
        raise SourceFetchError("unexpected Open-Meteo forecast payload")

    return payload


def _forecast_points(
    payload: dict[str, Any],
    generated_at: datetime,
    horizon_hours: int,
) -> list[dict[str, float]]:
    hourly = payload.get("hourly")

    if not isinstance(hourly, dict):
        raise SourceFetchError("missing Open-Meteo hourly block")

    timestamps = hourly.get("time")
    temperatures = hourly.get("temperature_2m")
    humidities = hourly.get("relative_humidity_2m")
    precipitation = hourly.get("precipitation")

    if not all(isinstance(series, list) for series in (
        timestamps,
        temperatures,
        humidities,
        precipitation,
    )):
        raise SourceFetchError("incomplete Open-Meteo hourly series")

    start = generated_at.replace(minute=0, second=0, microsecond=0)
    end = start + timedelta(hours=horizon_hours)
    points = []

    for timestamp, temperature, humidity, rain in zip(
        timestamps,
        temperatures,
        humidities,
        precipitation,
        strict=False,
    ):
        observed_at = _parse_timestamp(timestamp)

        if observed_at is None or not start <= observed_at < end:
            continue

        points.append(
            {
                "humidity": _coerce_float(humidity),
                "precipitation": _coerce_float(rain),
                "temperature": _coerce_float(temperature),
            }
        )

    return points


def _fallback_outlook(
    region_id: str,
    snapshot: dict[str, Any] | None,
) -> dict[str, Any]:
    if snapshot is None:
        return {
            "evaporationPressure": 0,
            "forecastRainfallMm": 0,
            "maxTemperatureC": None,
            "minHumidityPercent": None,
            "pressureScore": 0,
            "regionId": region_id,
            "riskLevel": "low",
            "source": "No forecast source available",
            "sourceKind": "fallback",
            "summary": "Waiting for forecast coverage.",
            "trend": "stable",
        }

    rainfall_index = _coerce_float(snapshot.get("rainfallIndex"))
    evaporation_pressure = round(_coerce_float(snapshot.get("evaporationPressure")))
    pressure_score = round(max(rainfall_index, evaporation_pressure))

    return {
        "evaporationPressure": evaporation_pressure,
        "forecastRainfallMm": round((rainfall_index / 100) * 18, 1),
        "maxTemperatureC": None,
        "minHumidityPercent": None,
        "pressureScore": pressure_score,
        "regionId": region_id,
        "riskLevel": _risk_level(pressure_score),
        "source": f"Snapshot-derived estimate: {snapshot.get('source', 'latest snapshot')}",
        "sourceKind": "fallback",
        "summary": "Forecast source unavailable; outlook derived from latest persisted snapshot.",
        "trend": snapshot.get("trend", "stable"),
    }


def _evaporation_pressure(max_temperature_c: float, min_humidity_percent: float) -> int:
    return round(
        clamp(
            max(0, max_temperature_c - 18) * 4
            + max(0, 62 - min_humidity_percent) * 1.25
        )
    )


def _pressure_score(rainfall_mm: float, evaporation_pressure: int) -> int:
    rainfall_pressure = clamp((rainfall_mm / 35) * 100)
    dominant_pressure = max(rainfall_pressure, evaporation_pressure)
    blended_pressure = (rainfall_pressure + evaporation_pressure) / 2

    return round(clamp(dominant_pressure * 0.7 + blended_pressure * 0.3))


def _forecast_trend(
    rainfall_mm: float,
    evaporation_pressure: int,
    pressure_score: int,
) -> str:
    if rainfall_mm >= 18 or pressure_score >= 68:
        return "rising"

    if evaporation_pressure >= 52 and rainfall_mm < 5:
        return "falling"

    return "stable"


def _risk_level(pressure_score: int) -> str:
    if pressure_score >= 70:
        return "high"

    if pressure_score >= 45:
        return "medium"

    return "low"


def _summary(
    rainfall_mm: float,
    evaporation_pressure: int,
    pressure_score: int,
) -> str:
    if rainfall_mm >= 25:
        return "Wet pressure is elevated across the forecast window."

    if evaporation_pressure >= 58:
        return "Dry heat pressure may reduce short-term reservoir visibility."

    if pressure_score >= 45:
        return "Moderate forecast pressure; keep the region in normal review cadence."

    return "Forecast pressure is low for the next operating window."


def _parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None

    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)

    return parsed.astimezone(UTC)


def _coerce_float(value: Any) -> float:
    if value is None:
        raise ValueError("missing numeric value")

    return float(value)
