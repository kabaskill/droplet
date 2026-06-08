from typing import Any

from backend.domain.regions import STATE_REGIONS
from backend.services.climate_context import refresh_region_climate_context_cache
from backend.workers.celery_app import celery_app


@celery_app.task(name="droplet.refresh_region_climate_context")
def refresh_region_climate_context(region_id: str) -> dict[str, Any]:
    payload = refresh_region_climate_context_cache(region_id)

    return {
        "generatedAt": payload.get("generatedAt"),
        "regionId": region_id,
        "status": "refreshed",
    }


@celery_app.task(name="droplet.refresh_climate_contexts")
def refresh_climate_contexts() -> dict[str, Any]:
    result: dict[str, Any] = {
        "failed": 0,
        "refreshed": 0,
        "regions": {},
    }

    for region in STATE_REGIONS:
        region_id = region["id"]

        try:
            payload = refresh_region_climate_context_cache(region_id)
        except Exception as exc:
            result["failed"] += 1
            result["regions"][region_id] = {
                "error": str(exc),
                "status": "failed",
            }
            continue

        result["refreshed"] += 1
        result["regions"][region_id] = {
            "generatedAt": payload.get("generatedAt"),
            "status": "refreshed",
        }

    return result
