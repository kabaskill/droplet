from datetime import UTC, datetime

from backend.models.entities import Region, ReservoirSnapshot


def region_to_read_model(region: Region) -> dict:
    return {
        "basin": region.basin,
        "code": region.code,
        "federalState": region.federal_state,
        "id": region.id,
        "name": region.name,
        "riskProfile": region.risk_profile,
        "sortIndex": region.sort_index,
    }


def snapshot_to_read_model(snapshot: ReservoirSnapshot) -> dict:
    age_minutes = _snapshot_age_minutes(snapshot.timestamp)

    return {
        "ageMinutes": age_minutes,
        "confidenceScore": round(snapshot.confidence_score),
        "evaporationPressure": round(snapshot.evaporation_pressure),
        "freshnessStatus": _freshness_status(age_minutes),
        "id": snapshot.id,
        "rainfallIndex": round(snapshot.rainfall_index),
        "regionId": snapshot.region_id,
        "source": snapshot.source,
        "sources": _source_components(snapshot.source),
        "timestamp": snapshot.timestamp.isoformat(),
        "trend": snapshot.trend,
        "visibilityScore": round(snapshot.visibility_score),
        "waterLevel": round(snapshot.water_level),
    }


def _snapshot_age_minutes(timestamp: datetime) -> int:
    observed_at = timestamp if timestamp.tzinfo else timestamp.replace(tzinfo=UTC)
    age_seconds = max(0, (datetime.now(UTC) - observed_at.astimezone(UTC)).total_seconds())

    return round(age_seconds / 60)


def _freshness_status(age_minutes: int) -> str:
    if age_minutes <= 120:
        return "current"

    if age_minutes <= 360:
        return "stale"

    return "old"


def _source_components(source: str) -> list[dict]:
    weather_markers = [
        ", DWD CDC:",
        ", Open-Meteo",
        ", fallback weather context",
    ]

    if source.startswith(("Pegelonline W:", "fallback water model")):
        for marker in weather_markers:
            if marker not in source:
                continue

            marker_index = source.index(marker)
            labels = [
                source[:marker_index],
                source[marker_index + 2 :],
            ]

            return [
                _source_component(label)
                for label in labels
                if label
            ]

    if "," in source and not source.startswith("DWD CDC:"):
        return [
            _source_component(label)
            for label in source.split(",")
            if label.strip()
        ]

    return [_source_component(source)]


def _source_component(label: str) -> dict:
    normalized_label = label.strip()

    return {
        "kind": _source_kind(normalized_label),
        "label": normalized_label,
    }


def _source_kind(label: str) -> str:
    if "Pegelonline" in label:
        return "water"

    if label.startswith(("DWD", "Open-Meteo")):
        return "weather"

    if "fallback" in label.lower():
        return "fallback"

    return "model"
