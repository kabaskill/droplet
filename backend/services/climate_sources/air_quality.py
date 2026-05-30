from datetime import UTC, datetime, timedelta
from typing import Any, Mapping

import requests

from backend.domain.snapshots import clamp
from backend.services.climate_sources.contracts import (
    DebugStage,
    NormalizedAirQualityReading,
    SourceMetadata,
    dataclass_to_debug_dict,
)
from backend.services.environmental_sources import REGION_SOURCE_TARGETS

UBA_STATIONS_URL = "https://www.umweltbundesamt.de/api/air_data/v3/stations/json"
UBA_AIR_DATA_URL = "https://www.umweltbundesamt.de/api/air_data/v3/airquality/json"
OPEN_METEO_AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
UBA_SOURCE = SourceMetadata(
    name="Umweltbundesamt Luftdaten API",
    url="https://www.umweltbundesamt.de/dokument/schnittstellenbeschreibung-luftdaten-api",
    attribution="Umweltbundesamt",
)
OPEN_METEO_AIR_SOURCE = SourceMetadata(
    name="Open-Meteo Air Quality API",
    url="https://open-meteo.com/en/docs/air-quality-api",
    attribution="Open-Meteo",
)
POLLUTANTS = ("pm25", "pm10", "no2", "o3", "so2", "co")
POLLUTANT_LIMITS = {
    "pm25": 25,
    "pm10": 50,
    "no2": 200,
    "o3": 180,
    "so2": 350,
    "co": 10000,
}
POLLUTANT_ALIASES = {
    "pm25": {"pm25", "pm2_5", "pm2.5", "PM2.5"},
    "pm10": {"pm10", "PM10"},
    "no2": {"no2", "NO2"},
    "o3": {"o3", "O3"},
    "so2": {"so2", "SO2"},
    "co": {"co", "CO"},
}


def build_air_quality_debug_stage(
    region_id: str,
    http: requests.Session | None = None,
    timeout: float = 8,
    include_open_meteo_comparison: bool = True,
) -> DebugStage:
    target = REGION_SOURCE_TARGETS[region_id]
    station_params = {"use": "airquality", "lang": "en"}
    data_params = {"lang": "en"}
    request = {
        "method": "GET",
        "primary": {"params": station_params, "url": UBA_STATIONS_URL},
        "readings": {"params": data_params, "url": UBA_AIR_DATA_URL},
    }
    warnings: list[str] = []
    errors: list[str] = []
    session = http or requests.Session()

    try:
        stations_response = session.get(
            UBA_STATIONS_URL,
            params=station_params,
            timeout=timeout,
        )
        stations_response.raise_for_status()
        stations_payload = stations_response.json()
        station = nearest_uba_station(region_id, stations_payload)

        data_params["station"] = station["id"]
        readings_response = session.get(
            UBA_AIR_DATA_URL,
            params=data_params,
            timeout=timeout,
        )
        readings_response.raise_for_status()
        readings_payload = readings_response.json()
        normalized = normalize_uba_air_quality_payload(
            region_id,
            station,
            readings_payload,
            warnings,
        )
        selected = _selected_air_fields(station, readings_payload)
        raw_summary = {
            "readings": _payload_summary(readings_payload),
            "stationCount": _station_count(stations_payload),
        }
    except (requests.RequestException, KeyError, TypeError, ValueError) as exc:
        errors.append(str(exc))
        station = None
        readings_payload = None
        normalized = None
        selected = {}
        raw_summary = None

    if normalized is None and include_open_meteo_comparison:
        comparison = _open_meteo_comparison(region_id, session, timeout, warnings)
        selected["openMeteoFallback"] = comparison

    if http is None:
        session.close()

    return DebugStage(
        request=request,
        raw_summary=raw_summary,
        selected_fields=selected,
        normalized_output=dataclass_to_debug_dict(normalized),
        warnings=warnings,
        errors=errors,
        source=UBA_SOURCE,
    )


def nearest_uba_station(
    region_id: str,
    payload: Any,
) -> dict[str, Any]:
    target = REGION_SOURCE_TARGETS[region_id]
    stations = _station_items(payload)
    candidates = []

    for station in stations:
        latitude = _optional_float(
            station.get("latitude")
            or station.get("lat")
            or station.get("station_latitude")
        )
        longitude = _optional_float(
            station.get("longitude")
            or station.get("lon")
            or station.get("lng")
            or station.get("station_longitude")
        )
        station_id = station.get("id") or station.get("station_id") or station.get("code")

        if latitude is None or longitude is None or station_id is None:
            continue

        candidates.append(
            (
                _distance_score(target.latitude, target.longitude, latitude, longitude),
                {
                    "id": str(station_id),
                    "latitude": latitude,
                    "longitude": longitude,
                    "name": station.get("name") or station.get("station_name"),
                },
            )
        )

    if not candidates:
        raise ValueError("no usable UBA station coordinates")

    candidates.sort(key=lambda item: item[0])
    return candidates[0][1]


def normalize_uba_air_quality_payload(
    region_id: str,
    station: Mapping[str, Any] | None,
    payload: Any,
    warnings: list[str] | None = None,
) -> NormalizedAirQualityReading:
    warnings = warnings if warnings is not None else []
    readings = _extract_pollutant_readings(payload)

    if not readings:
        raise ValueError("UBA payload has no usable pollutant readings")

    observed_at = _latest_timestamp(readings)
    values = {pollutant: _latest_value(readings, pollutant) for pollutant in POLLUTANTS}

    if observed_at is None:
        warnings.append("air-quality observation has no parseable timestamp")
    elif datetime.now(UTC) - observed_at > timedelta(hours=12):
        warnings.append("air-quality station reading is older than twelve hours")

    missing = [pollutant for pollutant, value in values.items() if value is None]
    if missing:
        warnings.append(f"missing pollutant readings: {', '.join(missing)}")

    return NormalizedAirQualityReading(
        air_risk_score=_air_risk_score(values),
        co_ug_m3=values["co"],
        no2_ug_m3=values["no2"],
        o3_ug_m3=values["o3"],
        observed_at=observed_at,
        pm10_ug_m3=values["pm10"],
        pm25_ug_m3=values["pm25"],
        region_id=region_id,
        so2_ug_m3=values["so2"],
        source=UBA_SOURCE.name,
        station=dict(station) if station is not None else None,
    )


def _open_meteo_comparison(
    region_id: str,
    http: requests.Session,
    timeout: float,
    warnings: list[str],
) -> dict[str, Any] | None:
    target = REGION_SOURCE_TARGETS[region_id]
    params = {
        "current": "pm10,pm2_5,nitrogen_dioxide,ozone,sulphur_dioxide,carbon_monoxide",
        "latitude": target.latitude,
        "longitude": target.longitude,
        "timezone": "UTC",
    }

    try:
        response = http.get(OPEN_METEO_AIR_QUALITY_URL, params=params, timeout=timeout)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        warnings.append(f"Open-Meteo air-quality fallback unavailable: {exc}")
        return None

    return {
        "request": {"params": params, "url": OPEN_METEO_AIR_QUALITY_URL},
        "rawSummary": _payload_summary(payload),
        "selectedFields": payload.get("current") if isinstance(payload, Mapping) else None,
        "source": dataclass_to_debug_dict(OPEN_METEO_AIR_SOURCE),
    }


def _extract_pollutant_readings(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, Mapping):
        for key in ("data", "readings", "values", "airquality"):
            nested = payload.get(key)

            if isinstance(nested, list):
                return [_normalize_reading_item(item) for item in nested if isinstance(item, Mapping)]

        if any(alias in payload for aliases in POLLUTANT_ALIASES.values() for alias in aliases):
            return [_normalize_reading_item(payload)]

    if isinstance(payload, list):
        return [_normalize_reading_item(item) for item in payload if isinstance(item, Mapping)]

    return []


def _normalize_reading_item(item: Mapping[str, Any]) -> dict[str, Any]:
    normalized = {
        "timestamp": item.get("timestamp")
        or item.get("time")
        or item.get("date")
        or item.get("datetime")
        or item.get("observed_at")
    }

    for pollutant, aliases in POLLUTANT_ALIASES.items():
        for alias in aliases:
            if alias in item:
                normalized[pollutant] = item.get(alias)
                break

    component = item.get("component") or item.get("pollutant")
    if component is not None and "value" in item:
        key = _pollutant_key(component)

        if key is not None:
            normalized[key] = item.get("value")

    return normalized


def _latest_value(readings: list[Mapping[str, Any]], pollutant: str) -> float | None:
    dated = sorted(
        readings,
        key=lambda item: _parse_timestamp(item.get("timestamp")) or datetime.min.replace(tzinfo=UTC),
    )

    for item in reversed(dated):
        parsed = _optional_float(item.get(pollutant))

        if parsed is not None:
            return parsed

    return None


def _latest_timestamp(readings: list[Mapping[str, Any]]) -> datetime | None:
    timestamps = [
        parsed
        for parsed in (_parse_timestamp(item.get("timestamp")) for item in readings)
        if parsed is not None
    ]

    return max(timestamps) if timestamps else None


def _air_risk_score(values: Mapping[str, float | None]) -> int:
    scores = []

    for pollutant, value in values.items():
        limit = POLLUTANT_LIMITS[pollutant]

        if value is not None:
            scores.append(clamp((value / limit) * 100))

    return round(max(scores) if scores else 0)


def _station_items(payload: Any) -> list[Mapping[str, Any]]:
    if isinstance(payload, Mapping):
        for key in ("data", "stations", "items"):
            nested = payload.get(key)

            if isinstance(nested, list):
                return [item for item in nested if isinstance(item, Mapping)]

        if all(key in payload for key in ("id", "latitude", "longitude")):
            return [payload]

    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, Mapping)]

    return []


def _selected_air_fields(station: Mapping[str, Any] | None, payload: Any) -> dict[str, Any]:
    readings = _extract_pollutant_readings(payload)
    values = {pollutant: _latest_value(readings, pollutant) for pollutant in POLLUTANTS}

    return {
        "pollutants": values,
        "station": dict(station) if station is not None else None,
        "timestamp": (_latest_timestamp(readings).isoformat() if _latest_timestamp(readings) else None),
    }


def _station_count(payload: Any) -> int:
    return len(_station_items(payload))


def _payload_summary(payload: Any) -> dict[str, Any]:
    if isinstance(payload, Mapping):
        return {"keys": sorted(str(key) for key in payload.keys()), "type": "object"}

    if isinstance(payload, list):
        return {"items": len(payload), "type": "list"}

    return {"type": type(payload).__name__}


def _pollutant_key(value: Any) -> str | None:
    normalized = str(value).lower().replace(".", "").replace("_", "")

    for pollutant, aliases in POLLUTANT_ALIASES.items():
        if normalized in {alias.lower().replace(".", "").replace("_", "") for alias in aliases}:
            return pollutant

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


def _distance_score(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    return ((latitude_a - latitude_b) ** 2) + ((longitude_a - longitude_b) ** 2)
