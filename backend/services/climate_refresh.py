from typing import Any

from backend.services.climate_context import validate_climate_region_id
from backend.services.climate_refresh_locks import (
    acquire_region_climate_refresh_lock,
    record_region_climate_refresh_error,
    region_climate_refresh_error,
    release_region_climate_refresh_lock,
)
from backend.services.ingestion import broker_available
from backend.tasks.climate import refresh_region_climate_context


def enqueue_region_climate_refresh(region_id: str) -> dict[str, Any]:
    validate_climate_region_id(region_id)

    if not acquire_region_climate_refresh_lock(region_id):
        return {
            "lastRefreshError": region_climate_refresh_error(region_id),
            "refreshStarted": False,
            "refreshState": "locked",
            "taskId": None,
        }

    if not broker_available():
        error = RuntimeError("climate refresh broker unavailable")
        record_region_climate_refresh_error(region_id, error)
        release_region_climate_refresh_lock(region_id)
        return {
            "lastRefreshError": region_climate_refresh_error(region_id),
            "refreshStarted": False,
            "refreshState": "failed",
            "taskId": None,
        }

    try:
        result = refresh_region_climate_context.delay(region_id)
    except Exception as exc:
        record_region_climate_refresh_error(region_id, exc)
        release_region_climate_refresh_lock(region_id)
        return {
            "lastRefreshError": region_climate_refresh_error(region_id),
            "refreshStarted": False,
            "refreshState": "failed",
            "taskId": None,
        }

    return {
        "lastRefreshError": region_climate_refresh_error(region_id),
        "refreshStarted": True,
        "refreshState": "queued",
        "taskId": result.id,
    }


def idle_region_climate_refresh(region_id: str) -> dict[str, Any]:
    validate_climate_region_id(region_id)

    return {
        "lastRefreshError": region_climate_refresh_error(region_id),
        "refreshStarted": False,
        "refreshState": "idle",
        "taskId": None,
    }
