from dataclasses import asdict
from datetime import UTC, datetime
from typing import Any

import requests

from backend.domain.regions import STATE_REGIONS
from backend.services.climate_sources.air_quality import (
    build_air_quality_debug_stage,
    fetch_uba_stations,
)
from backend.services.climate_sources.co2 import build_co2_debug_stage
from backend.services.climate_sources.contracts import DebugStage
from backend.services.climate_sources.solar import build_solar_debug_stage
from backend.services.environmental_sources import REGION_SOURCE_TARGETS

DEBUG_SECTIONS = ("water", "sunlight", "air", "co2")


def build_source_normalization_debug(
    region_id: str | None = None,
    sections: list[str] | None = None,
    timeout: float = 8,
) -> dict[str, Any]:
    selected_sections = _selected_sections(sections)
    selected_regions = _selected_regions(region_id)
    response: dict[str, Any] = {
        "meta": {
            "allowedSections": list(DEBUG_SECTIONS),
            "generatedAt": datetime.now(UTC).isoformat(),
            "requestedRegionId": region_id,
            "requestedSections": sections,
            "regionCount": len(selected_regions),
        },
        "regions": selected_regions,
        "sections": selected_sections,
    }

    with requests.Session() as http:
        stations_payload, stations_error = _prefetch_uba_stations(
            selected_sections,
            http,
            timeout,
        )

        for section in selected_sections:
            response[section] = {
                region["id"]: _build_section_for_region(
                    section,
                    region["id"],
                    http,
                    stations_payload,
                    stations_error,
                    timeout,
                )
                for region in selected_regions
            }

    return response


def _selected_sections(sections: list[str] | None) -> list[str]:
    if not sections:
        return list(DEBUG_SECTIONS)

    allowed = set(DEBUG_SECTIONS)
    unknown = sorted({section for section in sections if section not in allowed})

    if unknown:
        raise ValueError(
            "unknown debug sections: "
            f"{', '.join(unknown)}. Allowed sections: {', '.join(DEBUG_SECTIONS)}"
        )

    return sections


def _selected_regions(region_id: str | None) -> list[dict[str, Any]]:
    if region_id is None:
        return [
            {
                "code": region["code"],
                "id": region["id"],
                "name": region["name"],
            }
            for region in STATE_REGIONS
        ]

    for region in STATE_REGIONS:
        if region["id"] == region_id:
            return [
                {
                    "code": region["code"],
                    "id": region["id"],
                    "name": region["name"],
                }
            ]

    raise ValueError(f"unknown regionId: {region_id}")


def _build_section_for_region(
    section: str,
    region_id: str,
    http: requests.Session,
    stations_payload: Any | None,
    stations_error: str | None,
    timeout: float,
) -> dict[str, Any]:
    try:
        if section == "water":
            return _water_debug_stage(region_id)

        if section == "sunlight":
            return _debug_stage_to_dict(
                build_solar_debug_stage(region_id, http=http, timeout=timeout)
            )

        if section == "air":
            return _debug_stage_to_dict(
                build_air_quality_debug_stage(
                    region_id,
                    http=http,
                    stations_error=stations_error,
                    stations_payload=stations_payload,
                    timeout=timeout,
                )
            )

        if section == "co2":
            return _debug_stage_to_dict(build_co2_debug_stage(region_id))
    except Exception as exc:  # Debug route must isolate source failures per section.
        return {
            "errors": [str(exc)],
            "normalizedOutput": None,
            "rawResponseSummary": None,
            "request": {},
            "selectedFields": {},
            "source": None,
            "warnings": [],
        }

    raise ValueError(f"unsupported debug section: {section}")


def _prefetch_uba_stations(
    sections: list[str],
    http: requests.Session,
    timeout: float,
) -> tuple[Any | None, str | None]:
    if "air" not in sections:
        return None, None

    try:
        return fetch_uba_stations(http, timeout), None
    except (requests.RequestException, ValueError) as exc:
        return None, str(exc)


def _water_debug_stage(region_id: str) -> dict[str, Any]:
    target = REGION_SOURCE_TARGETS[region_id]

    return {
        "errors": [],
        "normalizedOutput": None,
        "rawResponseSummary": None,
        "request": {
            "configuredStation": target.station,
            "latitude": target.latitude,
            "longitude": target.longitude,
            "primaryWater": target.water,
            "sources": [
                "Pegelonline W water level",
                "DWD CDC weather observations",
                "Open-Meteo weather fallback",
            ],
        },
        "selectedFields": {
            "water": [
                "currentMeasurement.value",
                "currentMeasurement.timestamp",
                "characteristicValues",
            ],
            "weather": [
                "temperature_c",
                "humidity_percent",
                "24h rainfall_mm",
            ],
        },
        "source": {
            "attribution": "Pegelonline, DWD CDC, Open-Meteo",
            "name": "Existing Droplet water/weather ingestion",
            "url": "backend/services/environmental_sources.py",
        },
        "warnings": [
            "Water/weather ingestion is unchanged in Phase 2; this debug section documents the existing source configuration only."
        ],
    }


def _debug_stage_to_dict(stage: DebugStage) -> dict[str, Any]:
    source = asdict(stage.source)

    return {
        "errors": stage.errors,
        "normalizedOutput": stage.normalized_output,
        "rawResponseSummary": stage.raw_summary,
        "request": stage.request,
        "selectedFields": stage.selected_fields,
        "source": source,
        "warnings": stage.warnings,
    }
