"""Verified upstream history only; never manufacture a year's gauge readings."""
from copy import deepcopy
from datetime import UTC, datetime, timedelta
import logging

from backend.services import environmental_sources as sources
from backend.services.water_sources import (
    SOURCE_ERRORS, finite_number, observation_time, parse_water_station,
)

LOGGER = logging.getLogger(__name__)


def water_history_rows(region_id, station, measurements, now):
    """Keep the final actual sample per hour. Do not carry current quality flags backward."""
    if not isinstance(measurements, list):
        raise ValueError("Unexpected historical measurements")
    template = deepcopy(station)
    series = sources._find_water_level_series(template)
    # The measurements endpoint can be ahead of the cached current-measurement
    # endpoint. Historical rows lack source condition flags and must never become
    # the newest public reading ahead of that verified current observation.
    current = series.get("currentMeasurement") or {}
    try:
        current_at = observation_time(current.get("timestamp"), now)
    except (ValueError, TypeError):
        return []
    zero = series.get("gaugeZero")
    valid_from = zero.get("validFrom") if isinstance(zero, dict) else None
    if not valid_from:
        # Historic datum identity cannot be established from this metadata.
        return []
    try:
        datum_start = datetime.fromisoformat(valid_from).replace(tzinfo=UTC)
    except ValueError:
        return []
    buckets = {}
    for measurement in measurements:
        try:
            stamp = observation_time(measurement.get("timestamp"), now)
            finite_number(measurement.get("value"))
            if stamp < max(datum_start, now - timedelta(days=30)) or stamp >= current_at:
                continue
            bucket = stamp.replace(minute=0, second=0, microsecond=0)
            if bucket not in buckets or stamp > buckets[bucket][0]:
                buckets[bucket] = (stamp, measurement)
        except (AttributeError, ValueError, TypeError):
            continue
    rows = []
    for _, measurement in sorted(buckets.values(), key=lambda item: item[0]):
        series["currentMeasurement"] = {"timestamp": measurement["timestamp"], "value": measurement["value"]}
        rows.append(parse_water_station(region_id, template, now))
    return rows


def rainfall_history_rows(raw_text, station_id, now):
    hours = {}
    for row in sources._read_dwd_rows(raw_text):
        if row.get("STATIONS_ID", "").lstrip("0") != station_id.lstrip("0"):
            continue
        stamp = sources._parse_dwd_timestamp(row.get("MESS_DATUM"))
        if stamp is None or stamp > now:
            continue
        try:
            value = finite_number(row.get("R1"))
            if value < 0:
                value = None
        except (ValueError, TypeError):
            value = None
        if stamp in hours and hours[stamp] != value:
            value = None
        hours[stamp] = value
    windows = []
    for end in sorted(hours):
        if end.hour != 0 or end < now - timedelta(days=365):
            continue
        values = [hours.get(end - timedelta(hours=n)) for n in range(24)]
        if all(value is not None for value in values):
            windows.append((end - timedelta(hours=24), end, round(sum(values), 2)))
    return windows


def backfill_region(region_id, station, rainfall_station, now, http):
    batch = {"water": [], "rainfall": [], "failures": {}}
    if station:
        try:
            url = f"https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/{station['uuid']}/W/measurements.json"
            measurements = sources._get_json(http, url, {"start": "P30D"}, 30)
            batch["water"] = water_history_rows(region_id, station, measurements, now)
        except SOURCE_ERRORS as error:
            LOGGER.warning("Water backfill %s: %s", region_id, error)
            batch["failures"]["water"] = str(error)
    if rainfall_station:
        try:
            url = sources.DWD_PRECIPITATION_PRODUCT_URL.format(station_id=rainfall_station["station_id"])
            raw = sources._fetch_dwd_product_text(http, url, "produkt_rr_stunde_", 30)
            batch["rainfall"] = [
                {**rainfall_station, "window_start": start, "window_end": end, "total_mm": total, "received_at": now}
                for start, end, total in rainfall_history_rows(raw, rainfall_station["station_id"], now)
            ]
        except SOURCE_ERRORS as error:
            LOGGER.warning("Rainfall backfill %s: %s", region_id, error)
            batch["failures"]["rainfall"] = str(error)
    return batch
