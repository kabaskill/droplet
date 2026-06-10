import json
from datetime import UTC, datetime
from typing import Any

from redis.exceptions import RedisError

from backend.cache.keys import cache_key
from backend.cache.redis_client import redis_client
from backend.services.climate_sources.config import positive_int_env

CLIMATE_REFRESH_LOCK_TTL_SECONDS = positive_int_env(
    "CLIMATE_REFRESH_LOCK_TTL_SECONDS",
    10 * 60,
)
CLIMATE_REFRESH_ERROR_TTL_SECONDS = positive_int_env(
    "CLIMATE_REFRESH_ERROR_TTL_SECONDS",
    60 * 60,
)


def acquire_region_climate_refresh_lock(region_id: str) -> bool:
    try:
        return bool(
            redis_client().set(
                _refresh_lock_key(region_id),
                datetime.now(UTC).isoformat(),
                ex=CLIMATE_REFRESH_LOCK_TTL_SECONDS,
                nx=True,
            )
        )
    except RedisError:
        return False


def release_region_climate_refresh_lock(region_id: str) -> None:
    try:
        redis_client().delete(_refresh_lock_key(region_id))
    except RedisError:
        pass


def record_region_climate_refresh_error(region_id: str, error: Exception) -> None:
    payload = {
        "message": str(error),
        "recordedAt": datetime.now(UTC).isoformat(),
    }

    try:
        redis_client().setex(
            _refresh_error_key(region_id),
            CLIMATE_REFRESH_ERROR_TTL_SECONDS,
            json.dumps(payload, default=str),
        )
    except RedisError:
        pass


def clear_region_climate_refresh_error(region_id: str) -> None:
    try:
        redis_client().delete(_refresh_error_key(region_id))
    except RedisError:
        pass


def region_climate_refresh_error(region_id: str) -> dict[str, Any] | None:
    try:
        cached = redis_client().get(_refresh_error_key(region_id))
    except RedisError:
        return None

    if not cached:
        return None

    try:
        payload = json.loads(cached)
    except (TypeError, ValueError):
        return None

    return payload if isinstance(payload, dict) else None


def _refresh_lock_key(region_id: str) -> str:
    return cache_key(f"climate:region-refresh-lock:{region_id}")


def _refresh_error_key(region_id: str) -> str:
    return cache_key(f"climate:region-refresh-error:{region_id}")
