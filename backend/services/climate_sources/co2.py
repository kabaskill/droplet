from datetime import UTC, datetime

from backend.services.climate_sources.contracts import (
    DebugStage,
    NormalizedCo2Reading,
    SourceMetadata,
    dataclass_to_debug_dict,
)

CAMS_SOURCE = SourceMetadata(
    name="Copernicus Atmosphere Monitoring Service",
    url="https://atmosphere.copernicus.eu/data",
    attribution="Copernicus Atmosphere Monitoring Service",
)


def build_co2_debug_stage(region_id: str) -> DebugStage:
    normalized = NormalizedCo2Reading(
        co2_ppm=None,
        observed_at=None,
        region_id=region_id,
        source=CAMS_SOURCE.name,
        status="candidate_requires_dataset_workflow",
    )

    return DebugStage(
        request={
            "candidate": "CAMS global atmospheric composition forecasts or reanalysis",
            "requiredConfig": [
                "dataset selection",
                "ADS/CDS access workflow or compatible API client",
                "regional grid extraction around each state's latitude/longitude",
            ],
            "url": CAMS_SOURCE.url,
        },
        raw_summary=None,
        selected_fields={
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
        },
        normalized_output=dataclass_to_debug_dict(normalized),
        warnings=[
            "CO2 is exploratory in Phase 2 because practical CAMS access may require credentials or dataset workflow setup."
        ],
        errors=[],
        source=CAMS_SOURCE,
    )
