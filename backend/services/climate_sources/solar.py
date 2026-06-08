from datetime import UTC, datetime, timedelta
from typing import Any, Mapping

import requests

from backend.domain.snapshots import clamp
from backend.services.climate_sources.contracts import (
    DebugStage,
    NormalizedSolarReading,
    SourceMetadata,
    dataclass_to_debug_dict,
)
from backend.services.environmental_sources import REGION_SOURCE_TARGETS

OPEN_METEO_SATELLITE_RADIATION_URL = "https://satellite-api.open-meteo.com/v1/archive"
SOLAR_SOURCE = SourceMetadata(
    name="Open-Meteo Satellite Radiation API",
    url="https://open-meteo.com/en/docs/satellite-radiation-api",
    attribution="Open-Meteo",
)
SOLAR_HOURLY_FIELDS = (
    "shortwave_radiation",
    "direct_radiation",
    "diffuse_radiation",
    "direct_normal_irradiance",
    "shortwave_radiation_clear_sky",
)
SOLAR_UNITS = {
    "ageMinutes": "minutes",
    "clearSkyRatio": "ratio",
    "diffuseRadiation": "W/m2",
    "directLightShare": "ratio",
    "directNormalIrradiance": "W/m2",
    "directRadiation": "W/m2",
    "score": "0-100",
    "shortwaveRadiation": "W/m2",
}


def build_solar_debug_stage(
    region_id: str,
    http: requests.Session | None = None,
    timeout: float = 8,
) -> DebugStage:
    target = REGION_SOURCE_TARGETS[region_id]
    end_date = datetime.now(UTC).date()
    start_date = end_date - timedelta(days=1)
    params = {
        "end_date": end_date.isoformat(),
        "hourly": ",".join(SOLAR_HOURLY_FIELDS),
        "latitude": target.latitude,
        "longitude": target.longitude,
        "start_date": start_date.isoformat(),
        "timezone": "UTC",
    }
    request = {
        "method": "GET",
        "params": params,
        "url": OPEN_METEO_SATELLITE_RADIATION_URL,
    }
    warnings: list[str] = []
    errors: list[str] = []
    session = http or requests.Session()

    try:
        response = session.get(
            OPEN_METEO_SATELLITE_RADIATION_URL,
            params=params,
            timeout=timeout,
        )
        response.raise_for_status()
        payload = response.json()
        normalized = normalize_solar_payload(region_id, payload, warnings)
        raw_summary = _solar_raw_summary(payload)
        selected = _selected_solar_fields(payload)
    except (requests.RequestException, TypeError, ValueError) as exc:
        errors.append(str(exc))
        raw_summary = None
        selected = {}
        normalized = None
    finally:
        if http is None:
            session.close()

    return DebugStage(
        request=request,
        raw_summary=raw_summary,
        selected_fields=selected,
        normalized_output=dataclass_to_debug_dict(normalized),
        warnings=warnings,
        errors=errors,
        source=SOLAR_SOURCE,
    )


def normalize_solar_payload(
    region_id: str,
    payload: Mapping[str, Any],
    warnings: list[str] | None = None,
) -> NormalizedSolarReading:
    warnings = warnings if warnings is not None else []
    current = _current_solar_fields(payload)

    if not isinstance(current, Mapping):
        raise ValueError("missing Open-Meteo satellite radiation observations")

    observed_at = _parse_timestamp(current.get("time"))
    shortwave = _optional_float(current.get("shortwave_radiation"))
    direct = _optional_float(current.get("direct_radiation"))
    diffuse = _optional_float(current.get("diffuse_radiation"))
    direct_normal_irradiance = _optional_float(current.get("direct_normal_irradiance"))
    clear_sky = _matching_hourly_value(
        payload,
        "shortwave_radiation_clear_sky",
        observed_at,
    )

    if observed_at is None:
        warnings.append("solar observation has no parseable timestamp")
    elif datetime.now(UTC) - observed_at > timedelta(hours=6):
        warnings.append("solar observation is older than six hours")

    clear_sky_ratio = None
    if shortwave is not None and clear_sky and clear_sky > 0:
        clear_sky_ratio = round(clamp(shortwave / clear_sky, 0, 1), 3)

    direct_light_share = None
    total_radiation = None

    if direct is not None and diffuse is not None:
        total_radiation = direct + diffuse
    elif shortwave is not None:
        total_radiation = shortwave

    if direct is not None and total_radiation and total_radiation > 0:
        direct_light_share = round(clamp(direct / total_radiation, 0, 1), 3)

    score = _solar_score(shortwave, clear_sky_ratio, direct_light_share)

    return NormalizedSolarReading(
        age_minutes=_age_minutes(observed_at),
        clear_sky_ratio=clear_sky_ratio,
        diffuse_radiation_w_m2=diffuse,
        direct_normal_irradiance_w_m2=direct_normal_irradiance,
        direct_light_share=direct_light_share,
        direct_radiation_w_m2=direct,
        feasibility_label=_solar_feasibility_label(score),
        observed_at=observed_at,
        region_id=region_id,
        score=score,
        shortwave_radiation_w_m2=shortwave,
        source=SOLAR_SOURCE.name,
        status=_solar_status(shortwave, observed_at, clear_sky_ratio, direct_light_share),
        units=SOLAR_UNITS,
    )


def _solar_score(
    shortwave: float | None,
    clear_sky_ratio: float | None,
    direct_light_share: float | None,
) -> int:
    radiation_score = clamp(((shortwave or 0) / 900) * 100)
    clarity_score = (clear_sky_ratio * 100) if clear_sky_ratio is not None else radiation_score
    direct_score = (direct_light_share * 100) if direct_light_share is not None else 50

    return round(
        clamp((radiation_score * 0.55) + (clarity_score * 0.3) + (direct_score * 0.15))
    )


def _solar_status(
    shortwave: float | None,
    observed_at: datetime | None,
    _clear_sky_ratio: float | None,
    direct_light_share: float | None,
) -> str:
    if shortwave is None or observed_at is None:
        return "unavailable"

    if direct_light_share is None:
        return "partial"

    return "ok"


def _solar_feasibility_label(score: int) -> str:
    if score >= 75:
        return "strong"

    if score >= 45:
        return "moderate"

    if score >= 15:
        return "limited"

    return "low"


def _age_minutes(observed_at: datetime | None) -> int | None:
    if observed_at is None:
        return None

    return round(max(0, (datetime.now(UTC) - observed_at).total_seconds()) / 60)


def _matching_hourly_value(
    payload: Mapping[str, Any],
    field: str,
    observed_at: datetime | None,
) -> float | None:
    hourly = payload.get("hourly")

    if not isinstance(hourly, Mapping):
        return None

    times = hourly.get("time")
    values = hourly.get(field)

    if not isinstance(times, list) or not isinstance(values, list):
        return None

    if observed_at is None:
        return _latest_float(values)

    target_hour = observed_at.replace(minute=0, second=0, microsecond=0)

    for timestamp, value in zip(times, values, strict=False):
        if _parse_timestamp(timestamp) == target_hour:
            return _optional_float(value)

    return _latest_float(values)


def _latest_float(values: list[Any]) -> float | None:
    for value in reversed(values):
        parsed = _optional_float(value)

        if parsed is not None:
            return parsed

    return None


def _solar_raw_summary(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, Mapping):
        return {"type": type(payload).__name__}

    hourly = payload.get("hourly")
    return {
        "currentFields": sorted(payload.get("current", {}).keys())
        if isinstance(payload.get("current"), Mapping)
        else [],
        "hourlyFields": sorted(hourly.keys()) if isinstance(hourly, Mapping) else [],
        "hourlyRows": len(hourly.get("time", [])) if isinstance(hourly, Mapping) else 0,
        "latitude": payload.get("latitude"),
        "longitude": payload.get("longitude"),
    }


def _selected_solar_fields(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, Mapping):
        return {}

    current = _current_solar_fields(payload)

    if not isinstance(current, Mapping):
        return {}

    selected = {
        key: current.get(key)
        for key in ("time", *SOLAR_HOURLY_FIELDS)
        if key in current
    }
    selected["shortwave_radiation_clear_sky"] = _matching_hourly_value(
        payload,
        "shortwave_radiation_clear_sky",
        _parse_timestamp(current.get("time")),
    )

    return selected


def _current_solar_fields(payload: Mapping[str, Any]) -> Mapping[str, Any] | None:
    current = payload.get("current")

    if isinstance(current, Mapping):
        return current

    hourly = payload.get("hourly")

    if not isinstance(hourly, Mapping):
        return None

    times = hourly.get("time")

    if not isinstance(times, list):
        return None

    for index in range(len(times) - 1, -1, -1):
        selected = {"time": times[index]}
        has_observation = False

        for field in SOLAR_HOURLY_FIELDS:
            values = hourly.get(field)

            if not isinstance(values, list) or index >= len(values):
                continue

            selected[field] = values[index]
            has_observation = has_observation or values[index] is not None

        if has_observation:
            return selected

    return None


def _parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)

    return parsed.astimezone(UTC)


def _optional_float(value: Any) -> float | None:
    if value is None:
        return None

    try:
        return float(value)
    except (TypeError, ValueError):
        return None
