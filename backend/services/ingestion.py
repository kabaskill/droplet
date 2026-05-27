import os
from typing import Any

from redis import Redis
from redis.exceptions import RedisError

from backend.tasks.ingestion import refresh_demo_snapshots


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
        snapshots_created = refresh_demo_snapshots()

        return {
            "snapshotsCreated": snapshots_created,
            "status": "completed",
        }

    try:
        result = refresh_demo_snapshots.delay()
    except Exception:
        snapshots_created = refresh_demo_snapshots()

        return {
            "snapshotsCreated": snapshots_created,
            "status": "completed",
        }

    return {
        "status": "queued",
        "taskId": result.id,
    }
