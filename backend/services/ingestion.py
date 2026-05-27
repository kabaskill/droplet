import os
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from backend.tasks.ingestion import refresh_reservoir_snapshots


def broker_available() -> bool:
    broker_url = os.getenv(
        "CELERY_BROKER_URL",
        os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    )

    try:
        Redis.from_url(
            broker_url,
            socket_connect_timeout=0.25,
            socket_timeout=0.25,
        ).ping()
    except RedisError:
        return False

    return True


def enqueue_snapshot_refresh() -> dict[str, Any]:
    if not broker_available():
        return _completed_response(refresh_reservoir_snapshots())

    try:
        result = refresh_reservoir_snapshots.delay()
    except Exception:
        return _completed_response(refresh_reservoir_snapshots())

    return {
        "status": "queued",
        "taskId": result.id,
    }


def _completed_response(refresh_result: dict[str, int] | int) -> dict[str, Any]:
    if isinstance(refresh_result, int):
        refresh_result = {
            "created": refresh_result,
            "processed": refresh_result,
            "skipped": 0,
            "updated": 0,
        }

    return {
        "snapshotRefresh": refresh_result,
        "snapshotsCreated": refresh_result["created"],
        "snapshotsProcessed": refresh_result["processed"],
        "snapshotsSkipped": refresh_result["skipped"],
        "snapshotsUpdated": refresh_result["updated"],
        "status": "completed",
    }
