import json
import os
from collections.abc import Callable
from typing import TypeVar

from redis import Redis

T = TypeVar("T")


def redis_client() -> Redis:
    return Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))


def read_through_json(key: str, ttl_seconds: int, loader: Callable[[], T]) -> T:
    client = redis_client()
    cached = client.get(key)

    if cached:
        return json.loads(cached)

    value = loader()
    client.setex(key, ttl_seconds, json.dumps(value, default=str))
    return value
