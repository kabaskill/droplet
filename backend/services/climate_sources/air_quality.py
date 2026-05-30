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

UBA_STATIONS_URL = "https://www.umweltbundesamt.de/api/air_data/v4/stations/json"
UBA_MEASURES_URL = "https://www.umweltbundesamt.de/api/air_data/v4/measures/json"
OPEN_METEO_AIR_QUALITY_URL = "https://air-quality-api.open-meteo.com/v1/air-quality"
UBA_STATION_PARAMS = {"use": "airquality", "lang": "en", "recent": "true"}
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
OPEN_METEO_CURRENT_FIELDS = (
    "pm10",
    "pm2_5",
    "nitrogen_dioxide",
    "ozone",
    "sulphur_dioxide",
    "carbon_monoxide",
)
POLLUTANTS = ("pm25", "pm10", "no2", "o3", "so2", "co")
UBA_COMPONENT_IDS = {
    "pm10": "1",
    "co": "2",
    "o3": "3",
    "so2": "4",
    "no2": "5",
    "pm25": "9",
}
UBA_COMPONENT_TO_POLLUTANT = {
    component_id: pollutant
    for pollutant, component_id in UBA_COMPONENT_IDS.items()
}
POLLUTANT_LIMITS = {
    "pm25": 25,
    "pm10": 50,
    "no2": 200,
    "o3": 180,
    "so2": 350,
    "co": 10000,
}
POLLUTANT_ALIASES = {
    "pm25": {"pm25", "pm2", "pm2_5", "pm2.5", "PM2", "PM2.5"},
    "pm10": {"pm10", "PM10"},
    "no2": {"nitrogen_dioxide", "no2", "NO2"},
    "o3": {"ozone", "o3", "O3"},
    "so2": {"sulphur_dioxide", "so2", "SO2"},
    "co": {"carbon_monoxide", "co", "CO"},
}


def build_air_quality_debug_stage(
    region_id: str,
    http: requests.Session | None = None,
    timeout: float = 8,
    include_open_meteo_comparison: bool = True,
    stations_error: str | None = None,
    stations_payload: Any | None = None,
) -> DebugStage:
    data_params = _measurement_window_params()
    request = {
        "method": "GET",
        "primary": {"params": UBA_STATION_PARAMS, "url": UBA_STATIONS_URL},
        "readings": {"params": data_params, "url": UBA_MEASURES_URL},
    }
    warnings: list[str] = []
    errors: list[str] = []
    session = http or requests.Session()

    try:
        if stations_error is not None:
            raise ValueError(stations_error)

        if stations_payload is None:
            stations_payload = fetch_uba_stations(session, timeout)

        station = nearest_uba_station(region_id, stations_payload)

        readings_payload = {}
        measurement_requests = {}

        for pollutant, component_id in UBA_COMPONENT_IDS.items():
            pollutant_params = {
                **data_params,
                "component": component_id,
                "station": station["id"],
            }
            measurement_requests[pollutant] = {
                "params": pollutant_params,
                "url": UBA_MEASURES_URL,
            }

            try:
                readings_response = session.get(
                    UBA_MEASURES_URL,
                    params=pollutant_params,
                    timeout=timeout,
                )
                readings_response.raise_for_status()
                readings_payload[pollutant] = readings_response.json()
            except (requests.RequestException, ValueError) as exc:
                warnings.append(f"UBA {pollutant} measurement unavailable: {exc}")

        request["measurements"] = measurement_requests
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


def fetch_uba_stations(
    http: requests.Session,
    timeout: float = 8,
) -> Any:
    response = http.get(
        UBA_STATIONS_URL,
        params=UBA_STATION_PARAMS,
        timeout=timeout,
    )
    response.raise_for_status()

    return response.json()


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
                    "code": station.get("code"),
                    "id": str(station_id),
                    "latitude": latitude,
                    "longitude": longitude,
                    "name": station.get("name") or station.get("station_name"),
                    "network": station.get("network"),
                    "setting": station.get("setting"),
                    "stationType": station.get("station_type"),
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

    _append_air_quality_warnings(warnings, observed_at, values, "UBA")

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


def normalize_open_meteo_air_quality_payload(
    region_id: str,
    payload: Any,
    warnings: list[str] | None = None,
) -> NormalizedAirQualityReading:
    warnings = warnings if warnings is not None else []
    current = payload.get("current") if isinstance(payload, Mapping) else None

    if not isinstance(current, Mapping):
        raise ValueError("missing Open-Meteo current air-quality block")

    observed_at = _parse_timestamp(current.get("time"))
    values = {
        "co": _optional_float(current.get("carbon_monoxide")),
        "no2": _optional_float(current.get("nitrogen_dioxide")),
        "o3": _optional_float(current.get("ozone")),
        "pm10": _optional_float(current.get("pm10")),
        "pm25": _optional_float(current.get("pm2_5")),
        "so2": _optional_float(current.get("sulphur_dioxide")),
    }

    _append_air_quality_warnings(warnings, observed_at, values, "Open-Meteo")

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
        source=OPEN_METEO_AIR_SOURCE.name,
        station=None,
    )


def _open_meteo_comparison(
    region_id: str,
    http: requests.Session,
    timeout: float,
    warnings: list[str],
) -> dict[str, Any] | None:
    target = REGION_SOURCE_TARGETS[region_id]
    params = {
        "current": ",".join(OPEN_METEO_CURRENT_FIELDS),
        "latitude": target.latitude,
        "longitude": target.longitude,
        "timezone": "UTC",
    }
    fallback_warnings: list[str] = []
    fallback_errors: list[str] = []

    try:
        response = http.get(OPEN_METEO_AIR_QUALITY_URL, params=params, timeout=timeout)
        response.raise_for_status()
        payload = response.json()
    except (requests.RequestException, ValueError) as exc:
        warnings.append(f"Open-Meteo air-quality fallback unavailable: {exc}")
        return None

    try:
        normalized = normalize_open_meteo_air_quality_payload(
            region_id,
            payload,
            fallback_warnings,
        )
    except (TypeError, ValueError) as exc:
        fallback_errors.append(str(exc))
        normalized = None

    return {
        "errors": fallback_errors,
        "normalizedOutput": dataclass_to_debug_dict(normalized),
        "request": {"params": params, "url": OPEN_METEO_AIR_QUALITY_URL},
        "rawSummary": _payload_summary(payload),
        "selectedFields": _selected_open_meteo_air_fields(payload),
        "source": dataclass_to_debug_dict(OPEN_METEO_AIR_SOURCE),
        "warnings": fallback_warnings,
    }


def _extract_pollutant_readings(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, Mapping) and any(key in POLLUTANTS for key in payload):
        readings = []

        for pollutant, nested_payload in payload.items():
            if pollutant in POLLUTANTS:
                readings.extend(
                    _extract_pollutant_readings_for_payload(nested_payload, pollutant)
                )

        return readings

    return _extract_pollutant_readings_for_payload(payload, None)


def _extract_pollutant_readings_for_payload(
    payload: Any,
    forced_pollutant: str | None = None,
) -> list[dict[str, Any]]:
    if isinstance(payload, Mapping):
        data = payload.get("data")

        if isinstance(data, Mapping):
            return _normalize_uba_measure_data(data, forced_pollutant)

        for key in ("data", "readings", "values", "airquality"):
            nested = payload.get(key)

            if isinstance(nested, list):
                return [
                    _normalize_reading_item(item, forced_pollutant)
                    for item in nested
                    if isinstance(item, Mapping)
                ]

        if any(alias in payload for aliases in POLLUTANT_ALIASES.values() for alias in aliases):
            return [_normalize_reading_item(payload, forced_pollutant)]

    if isinstance(payload, list):
        readings = []

        for item in payload:
            if isinstance(item, Mapping):
                readings.append(_normalize_reading_item(item, forced_pollutant))
            elif isinstance(item, list):
                readings.append(_normalize_uba_measure_row(item, forced_pollutant))

        return [reading for reading in readings if reading]

    return []


def _normalize_reading_item(
    item: Mapping[str, Any],
    forced_pollutant: str | None = None,
) -> dict[str, Any]:
    normalized = {
        "timestamp": item.get("timestamp")
        or item.get("time")
        or item.get("date")
        or item.get("datetime")
        or item.get("observed_at")
    }

    if forced_pollutant is not None and "value" in item:
        normalized[forced_pollutant] = _convert_pollutant_value(
            forced_pollutant,
            item.get("value"),
        )

    for pollutant, aliases in POLLUTANT_ALIASES.items():
        for alias in aliases:
            if alias in item:
                normalized[pollutant] = _convert_pollutant_value(pollutant, item.get(alias))
                break

    component = item.get("component") or item.get("pollutant")
    if component is not None and "value" in item:
        key = _pollutant_key(component)

        if key is not None:
            normalized[key] = _convert_pollutant_value(key, item.get("value"))

    return normalized


def _normalize_uba_measure_data(
    data: Mapping[str, Any],
    forced_pollutant: str | None,
) -> list[dict[str, Any]]:
    readings = []

    for station_measurements in data.values():
        if isinstance(station_measurements, Mapping):
            for started_at, row in station_measurements.items():
                reading = _normalize_uba_measure_row(
                    row,
                    forced_pollutant,
                    fallback_timestamp=started_at,
                )

                if reading:
                    readings.append(reading)
        elif isinstance(station_measurements, list):
            reading = _normalize_uba_measure_row(
                station_measurements,
                forced_pollutant,
            )

            if reading:
                readings.append(reading)

    return readings


def _normalize_uba_measure_row(
    row: list[Any],
    forced_pollutant: str | None,
    fallback_timestamp: Any = None,
) -> dict[str, Any]:
    if len(row) < 3:
        return {}

    pollutant = forced_pollutant or _pollutant_key(row[0])

    if pollutant is None:
        return {}

    observed_at = row[3] if len(row) > 3 else fallback_timestamp

    return {
        "timestamp": observed_at or fallback_timestamp,
        pollutant: _convert_pollutant_value(pollutant, row[2]),
    }


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

            if isinstance(nested, Mapping):
                stations = []

                for station_id, item in nested.items():
                    station = _normalize_station_item(station_id, item)

                    if station:
                        stations.append(station)

                return stations

        if all(key in payload for key in ("id", "latitude", "longitude")):
            return [payload]

    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, Mapping)]

    return []


def _normalize_station_item(station_id: Any, item: Any) -> dict[str, Any]:
    if isinstance(item, Mapping):
        normalized = dict(item)
        normalized.setdefault("id", station_id)
        return normalized

    if not isinstance(item, list):
        return {}

    return {
        "active_from": _list_get(item, 5),
        "active_to": _list_get(item, 6),
        "city": _list_get(item, 3),
        "code": _list_get(item, 1),
        "id": _list_get(item, 0) or station_id,
        "latitude": _list_get(item, 8),
        "longitude": _list_get(item, 7),
        "name": _list_get(item, 2),
        "network": _list_get(item, 13),
        "setting": _list_get(item, 14),
        "station_type": _list_get(item, 16),
    }


def _selected_air_fields(station: Mapping[str, Any] | None, payload: Any) -> dict[str, Any]:
    readings = _extract_pollutant_readings(payload)
    values = {pollutant: _latest_value(readings, pollutant) for pollutant in POLLUTANTS}
    observed_at = _latest_timestamp(readings)

    return {
        "pollutants": values,
        "station": dict(station) if station is not None else None,
        "timestamp": observed_at.isoformat() if observed_at else None,
    }


def _station_count(payload: Any) -> int:
    return len(_station_items(payload))


def _payload_summary(payload: Any) -> dict[str, Any]:
    if isinstance(payload, Mapping):
        return {"keys": sorted(str(key) for key in payload.keys()), "type": "object"}

    if isinstance(payload, list):
        return {"items": len(payload), "type": "list"}

    return {"type": type(payload).__name__}


def _selected_open_meteo_air_fields(payload: Any) -> dict[str, Any]:
    if not isinstance(payload, Mapping):
        return {}

    current = payload.get("current")

    if not isinstance(current, Mapping):
        return {}

    return {
        key: current.get(key)
        for key in ("time", *OPEN_METEO_CURRENT_FIELDS)
        if key in current
    }


def _append_air_quality_warnings(
    warnings: list[str],
    observed_at: datetime | None,
    values: Mapping[str, float | None],
    source_name: str,
) -> None:
    if observed_at is None:
        warnings.append(f"{source_name} air-quality observation has no parseable timestamp")
    elif datetime.now(UTC) - observed_at > timedelta(hours=12):
        warnings.append(f"{source_name} air-quality reading is older than twelve hours")

    missing = [pollutant for pollutant, value in values.items() if value is None]
    if missing:
        warnings.append(f"{source_name} missing pollutant readings: {', '.join(missing)}")


def _pollutant_key(value: Any) -> str | None:
    normalized = str(value).lower().replace(".", "").replace("_", "")

    if normalized in UBA_COMPONENT_TO_POLLUTANT:
        return UBA_COMPONENT_TO_POLLUTANT[normalized]

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


def _convert_pollutant_value(pollutant: str, value: Any) -> float | None:
    parsed = _optional_float(value)

    if parsed is None:
        return None

    if pollutant == "co":
        return round(parsed * 1000, 3)

    return parsed


def _measurement_window_params() -> dict[str, Any]:
    end = datetime.now(UTC).date()
    start = end - timedelta(days=1)

    return {
        "date_from": start.isoformat(),
        "date_to": end.isoformat(),
        "lang": "en",
        "time_from": 1,
        "time_to": 24,
    }


def _list_get(items: list[Any], index: int) -> Any:
    return items[index] if index < len(items) else None


def _distance_score(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    return ((latitude_a - latitude_b) ** 2) + ((longitude_a - longitude_b) ** 2)
