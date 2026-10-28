"""Observed water/rainfall only: no scores, modeled weather, or synthetic fallbacks."""

import logging
import math
import zipfile
from datetime import UTC, datetime, timedelta
from typing import Any, Mapping
from uuid import UUID

import requests

from backend.services import environmental_sources as sources
from backend.services.water_catalog import TARGETS, configured_station

LOGGER = logging.getLogger(__name__)
MAX_STATION_DISTANCE_KM = 50
SOURCE_ERRORS = (
    requests.RequestException,
    sources.SourceFetchError,
    ValueError,
    TypeError,
    KeyError,
    zipfile.BadZipFile,
)


def finite_number(value: Any) -> float:
    if value is None or isinstance(value, bool):
        raise ValueError("Missing numeric measurement")
    result = float(value)
    if not math.isfinite(result):
        raise ValueError("Non-finite measurement")
    return result


def observation_time(value: Any, now: datetime) -> datetime:
    if not isinstance(value, str):
        raise ValueError("Missing observation timestamp")
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError("Observation timestamp must have a timezone")
    parsed = parsed.astimezone(UTC)
    if parsed > now + timedelta(minutes=5):
        raise ValueError("Observation timestamp is in the future")
    return parsed


def select_station(stations: list, target: sources.RegionSourceTarget) -> dict:
    candidates = []
    wanted = sources._normalize_name(target.station)
    for station in stations:
        if not isinstance(station, dict) or not sources._station_water_matches(
            station, target
        ):
            continue
        try:
            lat = finite_number(station.get("latitude"))
            lon = finite_number(station.get("longitude"))
            if not -90 <= lat <= 90 or not -180 <= lon <= 180:
                continue
            sources._find_water_level_series(station)
        except SOURCE_ERRORS:
            continue
        distance = sources._distance_km(target.latitude, target.longitude, lat, lon)
        if distance > MAX_STATION_DISTANCE_KM:
            continue
        names = [
            sources._normalize_name(station.get(key))
            for key in ("shortname", "longname")
        ]
        rank = (
            0 if wanted in names else 1 if any(wanted in name for name in names) else 2
        )
        candidates.append((rank, distance, str(station.get("uuid", "")), station))
    if not candidates:
        raise sources.SourceFetchError(
            "No water gauge within 50 km on the configured river"
        )
    return min(candidates, key=lambda item: item[:3])[3]


def parse_water_station(
    region_id: str, station: Mapping[str, Any], now: datetime
) -> dict:
    station_id = str(UUID(str(station["uuid"])))
    series = sources._find_water_level_series(station)
    if series.get("unit") != "cm":
        raise ValueError("Unsupported gauge unit")
    measurement = series["currentMeasurement"]
    if not isinstance(measurement, Mapping):
        raise ValueError("Missing gauge measurement")
    level = finite_number(measurement["value"])
    observed_at = observation_time(measurement.get("timestamp"), now)
    # Signed gauge heights are valid. Never clamp them or interpret zero as absence.
    condition = measurement.get("stateMnwMhw")
    if condition == "commented" or measurement.get("stateNswHsw") == "commented":
        raise ValueError("Gauge reports a malfunction or source comment")
    if condition not in {"low", "normal", "high"}:
        condition = "unknown"
    references = []
    for item in series.get("characteristicValues") or []:
        if (
            not isinstance(item, dict)
            or item.get("unit") != "cm"
            or not isinstance(item.get("shortname"), str)
        ):
            continue
        try:
            value = finite_number(item.get("value"))
        except (ValueError, TypeError):
            continue
        reference = {
            key: item[key]
            for key in (
                "shortname",
                "longname",
                "unit",
                "validFrom",
                "timespanStart",
                "timespanEnd",
                "occurrences",
            )
            if key in item
        }
        reference["value"] = value
        references.append(reference)
    zero = series.get("gaugeZero")
    if isinstance(zero, dict) and isinstance(zero.get("unit"), str):
        try:
            zero = {
                "value": finite_number(zero.get("value")),
                "unit": zero["unit"],
                "validFrom": zero.get("validFrom"),
            }
        except (ValueError, TypeError):
            zero = None
    else:
        zero = None
    name = station.get("longname") or station.get("shortname")
    water_metadata = station.get("water")
    if not isinstance(water_metadata, Mapping):
        raise ValueError("Missing river identity")
    water = water_metadata.get("longname") or water_metadata.get("shortname")
    if not isinstance(name, str) or not name or not isinstance(water, str) or not water:
        raise ValueError("Missing gauge identity")
    latitude, longitude = (
        finite_number(station["latitude"]),
        finite_number(station["longitude"]),
    )
    if not -90 <= latitude <= 90 or not -180 <= longitude <= 180:
        raise ValueError("Invalid gauge coordinates")
    return dict(
        region_id=region_id,
        station_id=station_id,
        station_name=name,
        water_body=water,
        latitude=latitude,
        longitude=longitude,
        level_cm=level,
        condition=condition,
        observed_at=observed_at,
        received_at=now,
        gauge_zero=zero,
        references=references,
        source_url=f"https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/{station_id}/W.json?includeCurrentMeasurement=true&includeCharacteristicValues=true",
    )


def parse_rainfall_product(
    raw_text: str, station_id: str, now: datetime
) -> tuple[datetime, datetime, float]:
    """Require all 24 hourly observations; a partial sum is not 24-hour rainfall."""
    hours: dict[datetime, float | None] = {}
    for row in sources._read_dwd_rows(raw_text):
        if row.get("STATIONS_ID", "").lstrip("0") != station_id.lstrip("0"):
            continue
        stamp = sources._parse_dwd_timestamp(row.get("MESS_DATUM"))
        if stamp is None:
            continue
        if stamp > now + timedelta(minutes=5):
            raise ValueError("Rainfall timestamp is in the future")
        try:
            value = finite_number(row.get("R1"))
            if value < 0:
                value = None
        except (ValueError, TypeError):
            value = None
        if stamp in hours and hours[stamp] != value:
            value = None
        hours[stamp] = value
    if not hours:
        raise ValueError("No rainfall observations for the selected station")
    end = max(hours)
    values = [hours.get(end - timedelta(hours=offset)) for offset in range(24)]
    if any(value is None for value in values):
        raise ValueError("Incomplete 24-hour rainfall window")
    return end - timedelta(hours=24), end, round(sum(values), 2)


def fetch_measured_observations(
    targets=None, timeout: float = 8, now: datetime | None = None
) -> dict:
    targets = TARGETS if targets is None else targets
    now = now or datetime.now(UTC)
    result: dict = {"water": [], "rainfall": [], "failures": {}}
    with requests.Session() as http:
        try:
            stations = sources._get_json(
                http,
                sources.PEGELONLINE_URL,
                {
                    "includeTimeseries": "true",
                    "includeCurrentMeasurement": "true",
                    "includeCharacteristicValues": "true",
                    "prettyprint": "false",
                },
                timeout,
            )
            if not isinstance(stations, list):
                raise ValueError("Unexpected gauge payload")
        except SOURCE_ERRORS as error:
            LOGGER.warning("Measured water source unavailable: %s", error)
            stations = []
        rain_products: dict[str, tuple[datetime, datetime, float]] = {}
        for region_id, target in targets.items():
            failures = []
            try:
                result["water"].append(
                    parse_water_station(
                        region_id, configured_station(stations, region_id, target), now
                    )
                )
            except SOURCE_ERRORS as error:
                LOGGER.warning(
                    "Measured water unavailable for %s: %s", region_id, error
                )
                failures.append("water")
            try:
                candidates = sources._nearest_dwd_stations(
                    http, sources.DWD_SOURCE_KIND_PRECIPITATION, target, timeout
                )
                rain = None
                for station in candidates:
                    if (
                        sources._distance_km(
                            target.latitude,
                            target.longitude,
                            station.latitude,
                            station.longitude,
                        )
                        > MAX_STATION_DISTANCE_KM
                    ):
                        continue
                    url = sources.DWD_PRECIPITATION_PRODUCT_URL.format(
                        station_id=station.station_id
                    )
                    try:
                        if station.station_id not in rain_products:
                            raw_text = sources._fetch_dwd_product_text(
                                http, url, "produkt_rr_stunde_", timeout
                            )
                            rain_products[station.station_id] = parse_rainfall_product(
                                raw_text, station.station_id, now
                            )
                        start, end, total = rain_products[station.station_id]
                        rain = dict(
                            region_id=region_id,
                            station_id=station.station_id,
                            station_name=station.name,
                            latitude=station.latitude,
                            longitude=station.longitude,
                            total_mm=total,
                            window_start=start,
                            window_end=end,
                            received_at=now,
                            source_url=url,
                        )
                        break
                    except SOURCE_ERRORS:
                        continue
                if rain is None:
                    raise ValueError("No complete rainfall product within 50 km")
                result["rainfall"].append(rain)
            except SOURCE_ERRORS as error:
                LOGGER.warning(
                    "Measured rainfall unavailable for %s: %s", region_id, error
                )
                failures.append("rainfall")
            if failures:
                result["failures"][region_id] = failures
    return result
