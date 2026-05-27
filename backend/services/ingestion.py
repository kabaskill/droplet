import os
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from backend.tasks.ingestion import refresh_reservoir_snapshots
from backend.workers.celery_app import celery_app


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


def snapshot_refresh_status(task_id: str) -> dict[str, Any]:
    task_result = celery_app.AsyncResult(task_id)
    state = task_result.state

    if state == "SUCCESS":
        return _completed_response(task_result.result, task_id)

    if state == "FAILURE":
        return {
            "error": str(task_result.result),
            "status": "failed",
            "taskId": task_id,
        }

    if state in {"STARTED", "RETRY"}:
        return {
            "status": "running",
            "taskId": task_id,
        }

    return {
        "status": "queued",
        "taskId": task_id,
    }


def _completed_response(
    refresh_result: dict[str, int] | int,
    task_id: str | None = None,
) -> dict[str, Any]:
    if isinstance(refresh_result, int):
        refresh_result = {
            "created": refresh_result,
            "processed": refresh_result,
            "skipped": 0,
            "updated": 0,
        }

    response = {
        "snapshotRefresh": refresh_result,
        "snapshotsCreated": refresh_result["created"],
        "snapshotsProcessed": refresh_result["processed"],
        "snapshotsSkipped": refresh_result["skipped"],
        "snapshotsUpdated": refresh_result["updated"],
        "status": "completed",
    }

    if task_id:
        response["taskId"] = task_id

    return response
