import json
from datetime import UTC, datetime
from typing import Any

from redis.exceptions import RedisError

from backend.cache.redis_client import redis_client

INGESTION_STATUS_KEY = "droplet:ingestion:last-run:v1"


def last_ingestion_status() -> dict[str, Any]:
    try:
        raw_status = redis_client().get(INGESTION_STATUS_KEY)
    except RedisError:
        return _empty_status()

    if not raw_status:
        return _empty_status()

    try:
        return json.loads(raw_status)
    except (TypeError, ValueError):
        return _empty_status()


def record_ingestion_started(trigger: str, started_at: datetime) -> None:
    _write_status(
        {
            "completedAt": "",
            "durationMs": 0,
            "error": "",
            "snapshotRefresh": _empty_refresh_result(),
            "startedAt": started_at.isoformat(),
            "status": "running",
            "trigger": trigger,
        }
    )


def record_ingestion_completed(
    trigger: str,
    started_at: datetime,
    refresh_result: dict[str, int],
) -> None:
    completed_at = datetime.now(UTC)
    _write_status(
        {
            "completedAt": completed_at.isoformat(),
            "durationMs": _duration_ms(started_at, completed_at),
            "error": "",
            "snapshotRefresh": {
                "created": refresh_result.get("created", 0),
                "deleted": refresh_result.get("deleted", 0),
                "processed": refresh_result.get("processed", 0),
                "skipped": refresh_result.get("skipped", 0),
                "updated": refresh_result.get("updated", 0),
            },
            "startedAt": started_at.isoformat(),
            "status": "completed",
            "trigger": trigger,
        }
    )


def record_ingestion_failed(
    trigger: str,
    started_at: datetime,
    error: Exception,
) -> None:
    completed_at = datetime.now(UTC)
    _write_status(
        {
            "completedAt": completed_at.isoformat(),
            "durationMs": _duration_ms(started_at, completed_at),
            "error": str(error),
            "snapshotRefresh": _empty_refresh_result(),
            "startedAt": started_at.isoformat(),
            "status": "failed",
            "trigger": trigger,
        }
    )


def _write_status(status: dict[str, Any]) -> None:
    try:
        redis_client().set(INGESTION_STATUS_KEY, json.dumps(status, default=str))
    except RedisError:
        pass


def _duration_ms(started_at: datetime, completed_at: datetime) -> int:
    return round((completed_at - started_at).total_seconds() * 1000)


def _empty_status() -> dict[str, Any]:
    return {
        "completedAt": "",
        "durationMs": 0,
        "error": "",
        "snapshotRefresh": _empty_refresh_result(),
        "startedAt": "",
        "status": "unknown",
        "trigger": "unknown",
    }


def _empty_refresh_result() -> dict[str, int]:
    return {
        "created": 0,
        "deleted": 0,
        "processed": 0,
        "skipped": 0,
        "updated": 0,
    }
