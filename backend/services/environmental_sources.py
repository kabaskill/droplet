import csv
import io
import logging
import math
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any, Mapping

import requests

from backend.domain.snapshots import EnvironmentalReading, clamp

LOGGER = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
PEGELONLINE_URL = "https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations.json"
DWD_TEMPERATURE_STATIONS_URL = (
    "https://opendata.dwd.de/climate_environment/CDC/observations_germany/"
    "climate/hourly/air_temperature/recent/TU_Stundenwerte_Beschreibung_Stationen.txt"
)
DWD_PRECIPITATION_STATIONS_URL = (
    "https://opendata.dwd.de/climate_environment/CDC/observations_germany/"
    "climate/hourly/precipitation/recent/RR_Stundenwerte_Beschreibung_Stationen.txt"
)
DWD_TEMPERATURE_PRODUCT_URL = (
    "https://opendata.dwd.de/climate_environment/CDC/observations_germany/"
    "climate/hourly/air_temperature/recent/stundenwerte_TU_{station_id}_akt.zip"
)
DWD_PRECIPITATION_PRODUCT_URL = (
    "https://opendata.dwd.de/climate_environment/CDC/observations_germany/"
    "climate/hourly/precipitation/recent/stundenwerte_RR_{station_id}_akt.zip"
)
DWD_SOURCE_KIND_TEMPERATURE = "temperature"
DWD_SOURCE_KIND_PRECIPITATION = "precipitation"
MAX_SOURCE_LABEL_LENGTH = 160


class SourceFetchError(RuntimeError):
    pass


@dataclass(frozen=True)
class RegionSourceTarget:
    latitude: float
    longitude: float
    station: str
    water: str


@dataclass(frozen=True)
class WaterLevelReading:
    normalized_water_level: float | None
    observed_at: datetime | None
    source: str
    water_level_cm: float


@dataclass(frozen=True)
class WeatherReading:
    humidity_percent: float
    observed_at: datetime | None
    rainfall_mm: float
    source: str
    temperature_c: float


@dataclass(frozen=True)
class DwdStation:
    latitude: float
    longitude: float
    name: str
    station_id: str


@dataclass(frozen=True)
class DwdTemperatureObservation:
    humidity_percent: float
    observed_at: datetime
    temperature_c: float


@dataclass(frozen=True)
class DwdPrecipitationObservation:
    observed_at: datetime
    rainfall_mm: float


REGION_SOURCE_TARGETS = {
    "danube-south": RegionSourceTarget(
        latitude=48.5745,
        longitude=13.4657,
        station="PASSAU DONAU",
        water="DONAU",
    ),
    "elbe-upper": RegionSourceTarget(
        latitude=51.0504,
        longitude=13.7373,
        station="DRESDEN",
        water="ELBE",
    ),
    "oder-east": RegionSourceTarget(
        latitude=52.3415,
        longitude=14.5514,
        station="FRANKFURT1 (ODER)",
        water="ODER",
    ),
    "rhine-lower": RegionSourceTarget(
        latitude=51.4344,
        longitude=6.7623,
        station="DUISBURG-RUHRORT",
        water="RHEIN",
    ),
    "weser-central": RegionSourceTarget(
        latitude=51.4197,
        longitude=9.6506,
        station="HANN.MUENDEN",
        water="WESER",
    ),
}

_DWD_STATION_CACHE: dict[str, list[DwdStation]] = {}


def fetch_environmental_readings(
    fallback_readings: Mapping[str, EnvironmentalReading],
    timeout: float = 8,
) -> dict[str, EnvironmentalReading]:
    readings = dict(fallback_readings)

    with requests.Session() as http:
        for region_id, target in REGION_SOURCE_TARGETS.items():
            fallback = fallback_readings.get(region_id)

            if fallback is None:
                continue

            water = _fetch_source(
                lambda: _fetch_pegelonline_water_level(http, target, timeout),
                "Pegelonline",
                region_id,
            )
            weather = _fetch_source(
                lambda: _fetch_dwd_weather(http, target, timeout),
                "DWD",
                region_id,
            )

            if weather is None:
                weather = _fetch_source(
                    lambda: _fetch_open_meteo_weather(http, target, timeout),
                    "Open-Meteo",
                    region_id,
                )

            if water is None and weather is None:
                continue

            readings[region_id] = EnvironmentalReading(
                humidity_percent=(
                    weather.humidity_percent if weather else fallback.humidity_percent
                ),
                rainfall_mm=weather.rainfall_mm if weather else fallback.rainfall_mm,
                source=_build_source_label(water, weather),
                temperature_c=weather.temperature_c if weather else fallback.temperature_c,
                water_level_cm=water.water_level_cm if water else fallback.water_level_cm,
                observed_at=(water.observed_at if water else None)
                or (weather.observed_at if weather else None),
                normalized_water_level=water.normalized_water_level if water else None,
            )

    return readings


def _fetch_source(fetcher, source_name: str, region_id: str):
    try:
        return fetcher()
    except (
        requests.RequestException,
        SourceFetchError,
        TypeError,
        ValueError,
        zipfile.BadZipFile,
    ) as exc:
        LOGGER.warning("%s fetch failed for %s: %s", source_name, region_id, exc)
        return None


def _fetch_pegelonline_water_level(
    http: requests.Session,
    target: RegionSourceTarget,
    timeout: float,
) -> WaterLevelReading:
    payload = _get_json(
        http,
        PEGELONLINE_URL,
        {
            "includeCharacteristicValues": "true",
            "includeCurrentMeasurement": "true",
            "includeTimeseries": "true",
            "prettyprint": "false",
            "waters": target.water,
        },
        timeout,
    )

    if not isinstance(payload, list):
        raise SourceFetchError("unexpected Pegelonline station payload")

    station = _find_station(payload, target.station)
    water_series = _find_water_level_series(station)
    current_measurement = water_series.get("currentMeasurement")

    if not isinstance(current_measurement, dict):
        raise SourceFetchError(f"missing current W measurement for {target.station}")

    water_level_cm = _coerce_float(
        current_measurement.get("value"),
        f"missing W value for {target.station}",
    )
    characteristics = _characteristic_values(water_series)
    station_name = _text(station.get("shortname"), target.station)
    water = station.get("water") if isinstance(station.get("water"), dict) else {}
    water_name = _text(water.get("shortname"), target.water)

    return WaterLevelReading(
        normalized_water_level=_normalize_water_level(water_level_cm, characteristics),
        observed_at=_parse_timestamp(current_measurement.get("timestamp")),
        source=_water_source_label(station_name, water_name),
        water_level_cm=water_level_cm,
    )


def _fetch_dwd_weather(
    http: requests.Session,
    target: RegionSourceTarget,
    timeout: float,
) -> WeatherReading:
    temperature_station, temperature = _fetch_nearest_dwd_temperature(
        http,
        target,
        timeout,
    )
    precipitation_station, precipitation = _fetch_nearest_dwd_precipitation(
        http,
        target,
        timeout,
    )

    return WeatherReading(
        humidity_percent=temperature.humidity_percent,
        observed_at=max(temperature.observed_at, precipitation.observed_at),
        rainfall_mm=precipitation.rainfall_mm,
        source=_dwd_source_label(temperature_station, precipitation_station),
        temperature_c=temperature.temperature_c,
    )


def _fetch_open_meteo_weather(
    http: requests.Session,
    target: RegionSourceTarget,
    timeout: float,
) -> WeatherReading:
    payload = _get_json(
        http,
        OPEN_METEO_URL,
        {
            "current": "temperature_2m,relative_humidity_2m,precipitation,rain",
            "forecast_days": "1",
            "hourly": "precipitation",
            "latitude": target.latitude,
            "longitude": target.longitude,
            "past_days": "1",
            "timezone": "UTC",
        },
        timeout,
    )

    if not isinstance(payload, dict):
        raise SourceFetchError("unexpected Open-Meteo payload")

    current = payload.get("current")

    if not isinstance(current, dict):
        raise SourceFetchError("missing Open-Meteo current block")

    observed_at = _parse_timestamp(current.get("time"))
    current_rainfall = _coerce_float(
        current.get("precipitation", current.get("rain", 0)),
        "missing current precipitation",
    )

    return WeatherReading(
        humidity_percent=_coerce_float(
            current.get("relative_humidity_2m"),
            "missing relative humidity",
        ),
        observed_at=observed_at,
        rainfall_mm=_sum_recent_precipitation(payload, observed_at) or current_rainfall,
        source="Open-Meteo current weather",
        temperature_c=_coerce_float(current.get("temperature_2m"), "missing temperature"),
    )


def _fetch_nearest_dwd_temperature(
    http: requests.Session,
    target: RegionSourceTarget,
    timeout: float,
) -> tuple[DwdStation, DwdTemperatureObservation]:
    errors = []

    for station in _nearest_dwd_stations(
        http,
        DWD_SOURCE_KIND_TEMPERATURE,
        target,
        timeout,
    ):
        try:
            return station, _fetch_dwd_temperature(http, station.station_id, timeout)
        except (
            requests.RequestException,
            SourceFetchError,
            ValueError,
            zipfile.BadZipFile,
        ) as exc:
            errors.append(f"{station.station_id}: {exc}")

    raise SourceFetchError(f"no usable DWD temperature product: {'; '.join(errors)}")


def _fetch_nearest_dwd_precipitation(
    http: requests.Session,
    target: RegionSourceTarget,
    timeout: float,
) -> tuple[DwdStation, DwdPrecipitationObservation]:
    errors = []

    for station in _nearest_dwd_stations(
        http,
        DWD_SOURCE_KIND_PRECIPITATION,
        target,
        timeout,
    ):
        try:
            return station, _fetch_dwd_precipitation(http, station.station_id, timeout)
        except (
            requests.RequestException,
            SourceFetchError,
            ValueError,
            zipfile.BadZipFile,
        ) as exc:
            errors.append(f"{station.station_id}: {exc}")

    raise SourceFetchError(f"no usable DWD precipitation product: {'; '.join(errors)}")


def _nearest_dwd_stations(
    http: requests.Session,
    source_kind: str,
    target: RegionSourceTarget,
    timeout: float,
    limit: int = 12,
) -> list[DwdStation]:
    stations = _dwd_station_index(http, source_kind, timeout)

    if not stations:
        raise SourceFetchError(f"no active DWD {source_kind} stations")

    return sorted(
        stations,
        key=lambda station: _distance_km(
            target.latitude,
            target.longitude,
            station.latitude,
            station.longitude,
        ),
    )[:limit]


def _dwd_station_index(
    http: requests.Session,
    source_kind: str,
    timeout: float,
) -> list[DwdStation]:
    cached = _DWD_STATION_CACHE.get(source_kind)

    if cached is not None:
        return cached

    url = (
        DWD_TEMPERATURE_STATIONS_URL
        if source_kind == DWD_SOURCE_KIND_TEMPERATURE
        else DWD_PRECIPITATION_STATIONS_URL
    )
    response = http.get(url, timeout=timeout)
    response.raise_for_status()
    stations = _parse_dwd_station_description(response.content.decode("latin-1"))
    _DWD_STATION_CACHE[source_kind] = stations

    return stations


def _parse_dwd_station_description(raw_text: str) -> list[DwdStation]:
    stations = []
    active_cutoff = int((datetime.now(UTC) - timedelta(days=14)).strftime("%Y%m%d"))

    for line in raw_text.splitlines():
        if not line or line.startswith(("Stations_id", "-----------")):
            continue

        parts = line.split(maxsplit=6)

        if len(parts) < 7:
            continue

        station_id, _, until_date, _, latitude, longitude, remainder = parts

        try:
            if int(until_date) < active_cutoff:
                continue

            stations.append(
                DwdStation(
                    latitude=float(latitude),
                    longitude=float(longitude),
                    name=remainder[:41].strip(),
                    station_id=station_id,
                )
            )
        except ValueError:
            continue

    return stations


def _fetch_dwd_temperature(
    http: requests.Session,
    station_id: str,
    timeout: float,
) -> DwdTemperatureObservation:
    text = _fetch_dwd_product_text(
        http,
        DWD_TEMPERATURE_PRODUCT_URL.format(station_id=station_id),
        "produkt_tu_stunde_",
        timeout,
    )
    rows = _read_dwd_rows(text)

    for row in reversed(rows):
        observed_at = _parse_dwd_timestamp(row.get("MESS_DATUM"))
        temperature = _dwd_float(row.get("TT_TU"))
        humidity = _dwd_float(row.get("RF_TU"))

        if observed_at is not None and temperature is not None and humidity is not None:
            return DwdTemperatureObservation(
                humidity_percent=humidity,
                observed_at=observed_at,
                temperature_c=temperature,
            )

    raise SourceFetchError(f"no valid DWD temperature data for {station_id}")


def _fetch_dwd_precipitation(
    http: requests.Session,
    station_id: str,
    timeout: float,
) -> DwdPrecipitationObservation:
    text = _fetch_dwd_product_text(
        http,
        DWD_PRECIPITATION_PRODUCT_URL.format(station_id=station_id),
        "produkt_rr_stunde_",
        timeout,
    )
    records = []

    for row in _read_dwd_rows(text):
        observed_at = _parse_dwd_timestamp(row.get("MESS_DATUM"))
        rainfall = _dwd_float(row.get("R1"))

        if observed_at is not None and rainfall is not None:
            records.append((observed_at, rainfall))

    if not records:
        raise SourceFetchError(f"no valid DWD precipitation data for {station_id}")

    latest_observed_at = max(observed_at for observed_at, _ in records)
    window_start = latest_observed_at - timedelta(hours=24)
    rainfall_total = sum(
        rainfall
        for observed_at, rainfall in records
        if window_start < observed_at <= latest_observed_at
    )

    return DwdPrecipitationObservation(
        observed_at=latest_observed_at,
        rainfall_mm=round(rainfall_total, 2),
    )


def _fetch_dwd_product_text(
    http: requests.Session,
    url: str,
    product_prefix: str,
    timeout: float,
) -> str:
    response = http.get(url, timeout=timeout)
    response.raise_for_status()

    with zipfile.ZipFile(io.BytesIO(response.content)) as archive:
        product_names = [
            name
            for name in archive.namelist()
            if name.startswith(product_prefix) and name.endswith(".txt")
        ]

        if not product_names:
            raise SourceFetchError(f"DWD product missing {product_prefix}")

        return archive.read(product_names[0]).decode("latin-1")


def _read_dwd_rows(raw_text: str) -> list[dict[str, str]]:
    rows = []
    reader = csv.DictReader(io.StringIO(raw_text), delimiter=";")

    for row in reader:
        rows.append(
            {
                key.strip(): value.strip()
                for key, value in row.items()
                if key is not None and value is not None
            }
        )

    return rows


def _get_json(
    http: requests.Session,
    url: str,
    params: dict[str, Any],
    timeout: float,
) -> Any:
    response = http.get(url, params=params, timeout=timeout)
    response.raise_for_status()
    return response.json()


def _find_station(stations: list[Any], station_name: str) -> dict[str, Any]:
    normalized_name = _normalize_name(station_name)

    for station in stations:
        if not isinstance(station, dict):
            continue

        candidates = [
            _normalize_name(station.get("shortname")),
            _normalize_name(station.get("longname")),
        ]

        if normalized_name in candidates:
            return station

    for station in stations:
        if not isinstance(station, dict):
            continue

        candidates = [
            _normalize_name(station.get("shortname")),
            _normalize_name(station.get("longname")),
        ]

        if any(normalized_name in candidate for candidate in candidates):
            return station

    raise SourceFetchError(f"station not found: {station_name}")


def _find_water_level_series(station: Mapping[str, Any]) -> dict[str, Any]:
    timeseries = station.get("timeseries")

    if not isinstance(timeseries, list):
        raise SourceFetchError("station has no timeseries")

    for series in timeseries:
        if isinstance(series, dict) and series.get("shortname") == "W":
            return series

    raise SourceFetchError("station has no W timeseries")


def _characteristic_values(series: Mapping[str, Any]) -> dict[str, float]:
    values = {}
    raw_values = series.get("characteristicValues")

    if not isinstance(raw_values, list):
        return values

    for item in raw_values:
        if not isinstance(item, dict):
            continue

        shortname = item.get("shortname")

        if isinstance(shortname, str):
            try:
                values[shortname] = _coerce_float(item.get("value"), shortname)
            except (TypeError, ValueError):
                continue

    return values


def _normalize_water_level(
    water_level_cm: float,
    characteristics: Mapping[str, float],
) -> float | None:
    for low_key, high_key in (("MNW", "MHW"), ("NNW", "HHW"), ("GlW", "HSW")):
        low = characteristics.get(low_key)
        high = characteristics.get(high_key)

        if low is not None and high is not None and high > low:
            return clamp(((water_level_cm - low) / (high - low)) * 100)

    return None


def _sum_recent_precipitation(
    payload: Mapping[str, Any],
    observed_at: datetime | None,
) -> float | None:
    hourly = payload.get("hourly")

    if not isinstance(hourly, dict):
        return None

    timestamps = hourly.get("time")
    values = hourly.get("precipitation")

    if not isinstance(timestamps, list) or not isinstance(values, list):
        return None

    end = observed_at or datetime.now(UTC)
    start = end - timedelta(hours=24)
    total = 0.0
    matched = False

    for timestamp, value in zip(timestamps, values, strict=False):
        parsed_timestamp = _parse_timestamp(timestamp)

        if parsed_timestamp is None or not start <= parsed_timestamp <= end:
            continue

        total += _coerce_float(value, "invalid precipitation value")
        matched = True

    return round(total, 2) if matched else None


def _parse_dwd_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None

    try:
        return datetime.strptime(value, "%Y%m%d%H").replace(tzinfo=UTC)
    except ValueError:
        return None


def _dwd_float(value: Any) -> float | None:
    if value is None:
        return None

    try:
        parsed = float(value)
    except ValueError:
        return None

    if parsed <= -999:
        return None

    return parsed


def _parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None

    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)

    return parsed.astimezone(UTC)


def _coerce_float(value: Any, error_message: str) -> float:
    if value is None:
        raise ValueError(error_message)

    return float(value)


def _normalize_name(value: Any) -> str:
    if not isinstance(value, str):
        return ""

    return " ".join(value.upper().split())


def _distance_km(
    latitude_a: float,
    longitude_a: float,
    latitude_b: float,
    longitude_b: float,
) -> float:
    radius_km = 6371.0
    delta_latitude = math.radians(latitude_b - latitude_a)
    delta_longitude = math.radians(longitude_b - longitude_a)
    start_latitude = math.radians(latitude_a)
    end_latitude = math.radians(latitude_b)
    haversine = (
        math.sin(delta_latitude / 2) ** 2
        + math.cos(start_latitude)
        * math.cos(end_latitude)
        * math.sin(delta_longitude / 2) ** 2
    )

    return radius_km * 2 * math.atan2(math.sqrt(haversine), math.sqrt(1 - haversine))


def _text(value: Any, fallback: str) -> str:
    return value if isinstance(value, str) and value else fallback


def _water_source_label(station_name: str, water_name: str) -> str:
    if f"({water_name})" in station_name:
        return f"Pegelonline W: {station_name}"

    return f"Pegelonline W: {station_name} ({water_name})"


def _dwd_source_label(
    temperature_station: DwdStation,
    precipitation_station: DwdStation,
) -> str:
    if temperature_station.station_id == precipitation_station.station_id:
        return f"DWD CDC: {temperature_station.name}"

    return f"DWD CDC: T {temperature_station.name}, R {precipitation_station.name}"


def _build_source_label(
    water: WaterLevelReading | None,
    weather: WeatherReading | None,
) -> str:
    parts = [
        water.source if water else "fallback water model",
        weather.source if weather else "fallback weather context",
    ]

    label = ", ".join(parts)

    if len(label) <= MAX_SOURCE_LABEL_LENGTH:
        return label

    return f"{label[: MAX_SOURCE_LABEL_LENGTH - 3]}..."
