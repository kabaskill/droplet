import json
import os
import threading
from collections.abc import Callable
from datetime import UTC, datetime, timedelta
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
    except (TypeError, ValueError):
        pass

    value = loader()

    try:
        client.setex(key, ttl_seconds, json.dumps(value, default=str))
    except RedisError:
        pass

    return value


def read_stale_while_revalidate_json(
    key: str,
    fresh_ttl_seconds: int,
    stale_ttl_seconds: int,
    loader: Callable[[], T],
) -> T:
    client = redis_client()

    try:
        cached = client.get(key)

        if cached:
            value, fresh_until = _cached_value_and_fresh_until(cached)

            if fresh_until is not None and datetime.now(UTC) < fresh_until:
                return value

            _start_cache_refresh(
                key,
                fresh_ttl_seconds,
                stale_ttl_seconds,
                loader,
            )

            return value
    except RedisError:
        return loader()
    except (TypeError, ValueError):
        pass

    value = loader()
    _write_stale_cache(key, fresh_ttl_seconds, stale_ttl_seconds, value)

    return value


def refresh_stale_while_revalidate_json(
    key: str,
    fresh_ttl_seconds: int,
    stale_ttl_seconds: int,
    loader: Callable[[], T],
) -> T:
    value = loader()
    _write_stale_cache(key, fresh_ttl_seconds, stale_ttl_seconds, value)

    return value


def delete_cache_keys(keys: list[str]) -> None:
    if not keys:
        return

    try:
        redis_client().delete(*keys)
    except RedisError:
        pass


def _cached_value_and_fresh_until(cached: bytes) -> tuple[Any, datetime | None]:
    payload = json.loads(cached)

    if not isinstance(payload, dict) or payload.get("_cacheEnvelope") != "swr-json-v1":
        return payload, None

    return payload.get("value"), _parse_datetime(payload.get("freshUntil"))


def _start_cache_refresh(
    key: str,
    fresh_ttl_seconds: int,
    stale_ttl_seconds: int,
    loader: Callable[[], T],
) -> None:
    lock_key = f"{key}:refresh-lock"

    try:
        acquired = redis_client().set(
            lock_key,
            "1",
            ex=max(30, min(fresh_ttl_seconds, 120)),
            nx=True,
        )
    except RedisError:
        return

    if not acquired:
        return

    thread = threading.Thread(
        daemon=True,
        target=_refresh_stale_cache,
        args=(key, fresh_ttl_seconds, stale_ttl_seconds, loader, lock_key),
    )
    thread.start()


def _refresh_stale_cache(
    key: str,
    fresh_ttl_seconds: int,
    stale_ttl_seconds: int,
    loader: Callable[[], T],
    lock_key: str,
) -> None:
    try:
        value = loader()
        _write_stale_cache(key, fresh_ttl_seconds, stale_ttl_seconds, value)
    except Exception:
        pass
    finally:
        try:
            redis_client().delete(lock_key)
        except RedisError:
            pass


def _write_stale_cache(
    key: str,
    fresh_ttl_seconds: int,
    stale_ttl_seconds: int,
    value: Any,
) -> None:
    now = datetime.now(UTC)
    envelope = {
        "_cacheEnvelope": "swr-json-v1",
        "freshUntil": (now + timedelta(seconds=fresh_ttl_seconds)).isoformat(),
        "storedAt": now.isoformat(),
        "value": value,
    }

    try:
        redis_client().setex(
            key,
            max(fresh_ttl_seconds, stale_ttl_seconds),
            json.dumps(envelope, default=str),
        )
    except RedisError:
        pass


def _parse_datetime(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None

    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)

    return parsed.astimezone(UTC)


def delete_cache_pattern(pattern: str) -> None:
    try:
        client = redis_client()
        keys: list[Any] = list(client.scan_iter(pattern))

        if keys:
            client.delete(*keys)
    except RedisError:
        pass
