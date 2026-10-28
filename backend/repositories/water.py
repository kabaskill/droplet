"""Read/write measured observations without consulting legacy snapshot history."""

import hashlib
import json
from datetime import UTC, datetime, timedelta

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert as postgres_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.orm import Session

from backend.domain.regions import STATE_REGIONS
from backend.models.water import RainfallObservation, WaterObservation

DISCOVERY_REGIONS = {region["id"]: region for region in STATE_REGIONS}


def utc(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def iso(value: datetime) -> str:
    return utc(value).isoformat()


def persist_observations(
    session: Session, batch: dict, now: datetime, retention_days: int = 395, overwrite: bool = True
) -> dict:
    insert = {"postgresql": postgres_insert, "sqlite": sqlite_insert}[
        session.get_bind().dialect.name
    ]
    counts = {"water": 0, "rainfall": 0, "deleted": 0}
    for kind, model, time_column in (
        ("water", WaterObservation, "observed_at"),
        ("rainfall", RainfallObservation, "window_end"),
    ):
        for values in batch[kind]:
            if values["region_id"] not in DISCOVERY_REGIONS:
                raise ValueError("Unknown discovery region")
            statement = insert(model).values(**values)
            session.execute(
                statement.on_conflict_do_update(
                    index_elements=["region_id", "station_id", time_column],
                    set_={
                        key: getattr(statement.excluded, key)
                        for key in values
                        if key not in {"region_id", "station_id", time_column}
                    },
                ) if overwrite else statement.on_conflict_do_nothing(
                    index_elements=["region_id", "station_id", time_column]
                )
            )
            counts[kind] += 1
        if retention_days > 0:
            result = session.execute(
                delete(model).where(
                    getattr(model, time_column) < now - timedelta(days=retention_days)
                )
            )
            counts["deleted"] += result.rowcount or 0
    return counts


def freshness(stamp: datetime | None, now: datetime, current_hours: int = 2) -> dict:
    if stamp is None:
        return {"status": "unavailable", "ageMinutes": None}
    age = max(0, int((now - utc(stamp)).total_seconds() / 60))
    return {
        "status": "current" if age <= current_hours * 60 else "stale",
        "ageMinutes": age,
    }


def station(row) -> dict:
    return {
        "id": row.station_id,
        "name": row.station_name,
        "latitude": row.latitude,
        "longitude": row.longitude,
    }


def mean_comparison(row: WaterObservation) -> dict | None:
    # MW is the published historical mean, never an average across different gauges.
    for reference in row.references:
        if reference.get("shortname") == "MW" and reference.get("unit") == "cm":
            return {
                "meanCm": reference["value"],
                "differenceCm": round(row.level_cm - reference["value"], 2),
                "periodStart": reference.get("timespanStart"),
                "periodEnd": reference.get("timespanEnd"),
            }
    return None


def water_payload(row: WaterObservation | None, now: datetime, details=False) -> dict:
    if row is None:
        return {
            **freshness(None, now),
            "levelCm": None,
            "observedAt": None,
            "condition": "unknown",
            "station": None,
            "source": None,
        }
    result = {
        **freshness(row.observed_at, now),
        "levelCm": row.level_cm,
        "observedAt": iso(row.observed_at),
        "condition": row.condition,
        "station": {**station(row), "waterBody": row.water_body},
        "source": {"name": "PEGELONLINE", "url": row.source_url},
        "provenance": "observed",
        "meanComparison": mean_comparison(row),
        "tidal": any(r.get("shortname") in {"MThw", "MTnw"} for r in row.references),
    }
    if details:
        result.update(gaugeZero=row.gauge_zero, references=row.references)
    return result


def rain_payload(row: RainfallObservation | None, now: datetime) -> dict:
    if row is None:
        return {
            **freshness(None, now),
            "totalMm": None,
            "windowStart": None,
            "windowEnd": None,
            "station": None,
            "source": None,
        }
    # DWD's recent hourly archive is typically published daily, unlike live gauges.
    return {
        **freshness(row.window_end, now, current_hours=36),
        "totalMm": row.total_mm,
        "windowStart": iso(row.window_start),
        "windowEnd": iso(row.window_end),
        "station": station(row),
        "source": {"name": "DWD CDC", "url": row.source_url},
        "provenance": "observed",
        "hoursCovered": 24,
    }


def latest_for_region(session: Session, model, region_id: str, column):
    return session.scalars(
        select(model)
        .where(model.region_id == region_id)
        .order_by(column.desc(), model.received_at.desc(), model.id.desc())
        .limit(1)
    ).first()


def recent_change(
    session: Session, row: WaterObservation | None, now: datetime
) -> dict | None:
    if (
        row is None
        or not row.gauge_zero
        or freshness(row.observed_at, now)["status"] != "current"
    ):
        return None
    target = utc(row.observed_at) - timedelta(hours=24)
    candidates = session.scalars(
        select(WaterObservation).where(
            WaterObservation.region_id == row.region_id,
            WaterObservation.station_id == row.station_id,
            WaterObservation.observed_at >= target - timedelta(hours=1),
            WaterObservation.observed_at <= target + timedelta(hours=1),
        )
    ).all()
    candidates = [
        candidate for candidate in candidates if candidate.gauge_zero == row.gauge_zero
    ]
    if not candidates:
        return None
    baseline = min(
        candidates,
        key=lambda candidate: abs(
            (utc(candidate.observed_at) - target).total_seconds()
        ),
    )
    return {
        "deltaCm": round(row.level_cm - baseline.level_cm, 2),
        "from": iso(baseline.observed_at),
        "to": iso(row.observed_at),
        "elapsedHours": round(
            (utc(row.observed_at) - utc(baseline.observed_at)).total_seconds() / 3600, 2
        ),
    }


def current_conditions(
    session: Session, region_id: str, now: datetime, details=False
) -> dict:
    region = DISCOVERY_REGIONS[region_id]
    water = latest_for_region(
        session, WaterObservation, region_id, WaterObservation.observed_at
    )
    rainfall = latest_for_region(
        session, RainfallObservation, region_id, RainfallObservation.window_end
    )
    return {
        "discoveryRegion": {"id": region_id, "name": region["name"], "code": region["code"]},
        "coverage": "individual_stations",
        "water": water_payload(water, now, details),
        "rainfall": rain_payload(rainfall, now),
        "change24h": recent_change(session, water, now),
    }


def observation_history(
    session: Session,
    region_id: str,
    start: datetime,
    end: datetime,
    interval: str,
    details: bool = True,
) -> dict:
    """Time buckets preserve station/datum boundaries. Never sum rolling rain totals."""

    def bucket(stamp):
        stamp = utc(stamp).replace(minute=0, second=0, microsecond=0)
        return stamp.replace(hour=0) if interval == "day" else stamp

    water_groups: dict[tuple, list] = {}
    for row in session.scalars(
        select(WaterObservation)
        .where(
            WaterObservation.region_id == region_id,
            WaterObservation.observed_at >= start,
            WaterObservation.observed_at < end,
        )
        .order_by(WaterObservation.observed_at, WaterObservation.id)
    ):
        key = (
            bucket(row.observed_at),
            row.station_id,
            json.dumps(row.gauge_zero, sort_keys=True),
        )
        water_groups.setdefault(key, []).append(row)
    water = []
    for (stamp, station_id, datum), rows in water_groups.items():
        values = [row.level_cm for row in rows]
        water.append(
            {
                "bucketStart": iso(stamp),
                "station": {**station(rows[-1]), "waterBody": rows[-1].water_body},
                "seriesId": hashlib.sha256(
                    f"{station_id}:{datum}".encode()
                ).hexdigest()[:24],
                **({"gaugeZero": rows[-1].gauge_zero} if details else {}),
                "firstObservedAt": iso(rows[0].observed_at),
                "lastObservedAt": iso(rows[-1].observed_at),
                "firstCm": values[0],
                "lastCm": values[-1],
                "minCm": min(values),
                "maxCm": max(values),
                "observations": len(rows),
            }
        )
    rain_groups = {}
    for row in session.scalars(
        select(RainfallObservation)
        .where(
            RainfallObservation.region_id == region_id,
            RainfallObservation.window_end >= start,
            RainfallObservation.window_end < end,
        )
        .order_by(RainfallObservation.window_end, RainfallObservation.id)
    ):
        rain_groups[(bucket(row.window_end), row.station_id)] = row
    rainfall = [
        {
            "bucketStart": iso(stamp),
            "station": station(row),
            "rainfall24hMm": row.total_mm,
            "windowStart": iso(row.window_start),
            "windowEnd": iso(row.window_end),
        }
        for (stamp, _), row in rain_groups.items()
    ]
    return {
        "discoveryRegionId": region_id,
        "start": iso(start),
        "end": iso(end),
        "interval": interval,
        "water": water,
        "rainfall": rainfall,
        "provenance": "observed",
    }
