from typing import Any

from backend.domain.regions import STATE_REGIONS
from backend.services.climate_refresh_locks import (
    acquire_region_climate_refresh_lock,
    clear_region_climate_refresh_error,
    record_region_climate_refresh_error,
    release_region_climate_refresh_lock,
)
from backend.services.climate_context import refresh_region_climate_context_cache
from backend.workers.celery_app import celery_app


@celery_app.task(name="droplet.refresh_region_climate_context")
def refresh_region_climate_context(region_id: str) -> dict[str, Any]:
    try:
        payload = refresh_region_climate_context_cache(region_id)
    except Exception as exc:
        record_region_climate_refresh_error(region_id, exc)
        raise
    finally:
        release_region_climate_refresh_lock(region_id)

    clear_region_climate_refresh_error(region_id)

    return {
        "generatedAt": payload.get("generatedAt"),
        "regionId": region_id,
        "status": "refreshed",
    }


@celery_app.task(name="droplet.refresh_climate_contexts")
def refresh_climate_contexts() -> dict[str, Any]:
    result: dict[str, Any] = {
        "failed": 0,
        "locked": 0,
        "queued": 0,
        "regions": {},
    }

    for region in STATE_REGIONS:
        region_id = region["id"]

        if not acquire_region_climate_refresh_lock(region_id):
            result["locked"] += 1
            result["regions"][region_id] = {
                "status": "locked",
            }
            continue

        try:
            task = refresh_region_climate_context.delay(region_id)
        except Exception as exc:
            record_region_climate_refresh_error(region_id, exc)
            release_region_climate_refresh_lock(region_id)
            result["failed"] += 1
            result["regions"][region_id] = {
                "error": str(exc),
                "status": "failed",
            }
            continue

        result["queued"] += 1
        result["regions"][region_id] = {
            "status": "queued",
            "taskId": task.id,
        }

    return result
