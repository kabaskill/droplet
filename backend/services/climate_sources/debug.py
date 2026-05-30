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
SECTION_ALIASES = {
    "aq": "air",
    "carbon": "co2",
    "radiation": "sunlight",
    "solar": "sunlight",
}


def build_source_normalization_debug(
    region_id: str | None = None,
    region_limit: int | None = None,
    sections: list[str] | None = None,
    timeout: float = 8,
) -> dict[str, Any]:
    selected_sections = _selected_sections(sections)
    selected_regions = _selected_regions(region_id, region_limit)
    response: dict[str, Any] = {
        "meta": {
            "allowedSections": list(DEBUG_SECTIONS),
            "generatedAt": datetime.now(UTC).isoformat(),
            "requestedLimit": region_limit,
            "requestedRegionId": region_id,
            "requestedSections": sections,
            "sectionAliases": SECTION_ALIASES,
            "regionCount": len(selected_regions),
            "sampleOnly": region_id is None and region_limit is not None,
            "selectedRegionIds": [
                region["id"]
                for region in selected_regions
            ],
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
    normalized_sections = [
        SECTION_ALIASES.get(section, section)
        for section in sections
    ]
    unknown = sorted(
        {
            section
            for section in normalized_sections
            if section not in allowed
        }
    )

    if unknown:
        raise ValueError(
            "unknown debug sections: "
            f"{', '.join(unknown)}. Allowed sections: {', '.join(DEBUG_SECTIONS)}. "
            f"Aliases: {', '.join(sorted(SECTION_ALIASES))}"
        )

    return list(dict.fromkeys(normalized_sections))


def _selected_regions(
    region_id: str | None,
    region_limit: int | None,
) -> list[dict[str, Any]]:
    if region_id is None:
        regions = [
            {
                "code": region["code"],
                "id": region["id"],
                "name": region["name"],
            }
            for region in STATE_REGIONS
        ]

        return regions[:region_limit] if region_limit is not None else regions

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
            "summary": {
                "errorCount": 1,
                "normalizedStatus": None,
                "state": "error",
                "warningCount": 0,
            },
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
        "summary": {
            "errorCount": 0,
            "normalizedStatus": None,
            "state": "warning",
            "warningCount": 1,
        },
        "warnings": [
            "Water/weather ingestion is unchanged in Phase 2; this debug section documents the existing source configuration only."
        ],
    }


def _debug_stage_to_dict(stage: DebugStage) -> dict[str, Any]:
    source = asdict(stage.source)
    normalized = stage.normalized_output

    return {
        "errors": stage.errors,
        "normalizedOutput": normalized,
        "rawResponseSummary": stage.raw_summary,
        "request": stage.request,
        "selectedFields": stage.selected_fields,
        "source": source,
        "summary": _stage_summary(normalized, stage.warnings, stage.errors),
        "warnings": stage.warnings,
    }


def _stage_summary(
    normalized: dict[str, Any] | None,
    warnings: list[str],
    errors: list[str],
) -> dict[str, Any]:
    if errors:
        state = "error"
    elif warnings:
        state = "warning"
    else:
        state = "ok"

    return {
        "errorCount": len(errors),
        "normalizedStatus": normalized.get("status") if normalized else None,
        "state": state,
        "warningCount": len(warnings),
    }
