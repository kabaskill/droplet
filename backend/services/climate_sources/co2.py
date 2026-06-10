from datetime import UTC, datetime

from backend.services.climate_sources.contracts import (
    DebugStage,
    NormalizedCo2Reading,
    SourceMetadata,
    dataclass_to_debug_dict,
)
from backend.services.environmental_sources import REGION_SOURCE_TARGETS

CAMS_SOURCE = SourceMetadata(
    name="Copernicus Atmosphere Monitoring Service",
    url="https://atmosphere.copernicus.eu/data",
    attribution="Copernicus Atmosphere Monitoring Service",
)
CO2_UNITS = {
    "ageMinutes": "minutes",
    "co2": "ppm",
}
CO2_REQUIRED_CONFIG = (
    "CAMS_ADS_URL",
    "CAMS_ADS_KEY",
    "CAMS_DATASET",
)
CO2_DATASET_CANDIDATES = (
    "cams-global-atmospheric-composition-forecasts",
    "cams-global-ghg-reanalysis-egg4",
)


def build_co2_debug_stage(region_id: str) -> DebugStage:
    target = REGION_SOURCE_TARGETS[region_id]
    normalized = NormalizedCo2Reading(
        age_minutes=None,
        co2_ppm=None,
        observed_at=None,
        region_id=region_id,
        source=CAMS_SOURCE.name,
        status="candidate_requires_dataset_workflow",
        units=CO2_UNITS,
    )

    return DebugStage(
        request={
            "candidate": "CAMS global atmospheric composition forecasts or reanalysis",
            "datasetCandidates": list(CO2_DATASET_CANDIDATES),
            "regionTarget": {
                "latitude": target.latitude,
                "longitude": target.longitude,
            },
            "requiredConfig": [
                *CO2_REQUIRED_CONFIG,
                "regional grid extraction settings",
                "unit conversion rules for selected variable",
            ],
            "workflow": [
                "authenticate with the Copernicus Atmosphere Data Store",
                "request a small region/time subset for the state centroid",
                "extract the nearest grid cell or bounded area average",
                "verify units before converting to ppm",
            ],
            "url": CAMS_SOURCE.url,
        },
        raw_summary=None,
        selected_fields={
            "blockedBy": [
                "credentials",
                "dataset choice",
                "variable/unit verification",
            ],
            "expectedFields": [
                "co2_mole_fraction or equivalent concentration variable",
                "valid_time",
                "latitude",
                "longitude",
                "model_level or pressure_level metadata",
            ],
            "implementationNotes": [
                "Keep CO2 in a dedicated module after solar and air are stable.",
                "Do not block Phase 2 on credentials or dataset-ordering workflows.",
                "Normalize to ppm only after the selected dataset's units are verified.",
            ],
            "lastReviewedAt": datetime.now(UTC).isoformat(),
            "requiredConfig": list(CO2_REQUIRED_CONFIG),
        },
        normalized_output=dataclass_to_debug_dict(normalized),
        warnings=[
            "CO2 is exploratory in Phase 2 because practical CAMS access may require credentials or dataset workflow setup."
        ],
        errors=[],
        source=CAMS_SOURCE,
    )
