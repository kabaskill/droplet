import json
import os
from collections.abc import Callable
from typing import Any, TypeVar

from redis import Redis
from redis.exceptions import RedisError

T = TypeVar("T")


def redis_client() -> Redis:
    return Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"))


def read_through_json(key: str, ttl_seconds: int, loader: Callable[[], T]) -> T:
    client = redis_client()

    try:
        cached = client.get(key)

        if cached:
            return json.loads(cached)
    except RedisError:
        return loader()

    value = loader()

    try:
        client.setex(key, ttl_seconds, json.dumps(value, default=str))
    except RedisError:
        pass

    return value


def delete_cache_keys(keys: list[str]) -> None:
    if not keys:
        return

    try:
        redis_client().delete(*keys)
    except RedisError:
        pass


def delete_cache_pattern(pattern: str) -> None:
    try:
        client = redis_client()
        keys: list[Any] = list(client.scan_iter(pattern))

        if keys:
            client.delete(*keys)
    except RedisError:
        pass
