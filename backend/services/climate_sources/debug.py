from dataclasses import asdict
from typing import Any

from backend.domain.regions import STATE_REGIONS
from backend.services.climate_sources.air_quality import build_air_quality_debug_stage
from backend.services.climate_sources.co2 import build_co2_debug_stage
from backend.services.climate_sources.contracts import DebugStage
from backend.services.climate_sources.solar import build_solar_debug_stage
from backend.services.environmental_sources import REGION_SOURCE_TARGETS

DEBUG_SECTIONS = ("water", "sunlight", "air", "co2")


def build_source_normalization_debug(
    region_id: str | None = None,
    sections: list[str] | None = None,
) -> dict[str, Any]:
    selected_sections = _selected_sections(sections)
    selected_regions = _selected_regions(region_id)
    response: dict[str, Any] = {
        "regions": selected_regions,
        "sections": selected_sections,
    }

    for section in selected_sections:
        response[section] = {
            region["id"]: _build_section_for_region(section, region["id"])
            for region in selected_regions
        }

    return response


def _selected_sections(sections: list[str] | None) -> list[str]:
    if not sections:
        return list(DEBUG_SECTIONS)

    allowed = set(DEBUG_SECTIONS)
    return [section for section in sections if section in allowed]


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


def _build_section_for_region(section: str, region_id: str) -> dict[str, Any]:
    try:
        if section == "water":
            return _water_debug_stage(region_id)

        if section == "sunlight":
            return _debug_stage_to_dict(build_solar_debug_stage(region_id))

        if section == "air":
            return _debug_stage_to_dict(build_air_quality_debug_stage(region_id))

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
