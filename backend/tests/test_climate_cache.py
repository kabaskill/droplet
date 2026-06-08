import json
import sys
import types
import unittest
from datetime import UTC, datetime, timedelta


if "redis" not in sys.modules:
    redis_module = types.ModuleType("redis")
    redis_exceptions = types.ModuleType("redis.exceptions")

    class Redis:
        @staticmethod
        def from_url(*args, **kwargs):
            return None

    class RedisError(Exception):
        pass

    redis_module.Redis = Redis
    redis_exceptions.RedisError = RedisError
    sys.modules["redis"] = redis_module
    sys.modules["redis.exceptions"] = redis_exceptions


from backend.cache import redis_client as cache


class FakeRedis:
    def __init__(self, cached=None):
        self.cached = cached
        self.delete_calls = []
        self.set_calls = []
        self.setex_calls = []

    def delete(self, *keys):
        self.delete_calls.append(keys)

    def get(self, _key):
        return self.cached

    def set(self, *args, **kwargs):
        self.set_calls.append((args, kwargs))
        return False

    def setex(self, key, ttl, value):
        self.setex_calls.append((key, ttl, json.loads(value)))


class StaleWhileRevalidateCacheTest(unittest.TestCase):
    def setUp(self):
        self.original_redis_client = cache.redis_client

    def tearDown(self):
        cache.redis_client = self.original_redis_client

    def test_miss_writes_enveloped_value_and_metadata(self):
        fake = FakeRedis()
        cache.redis_client = lambda: fake

        value, metadata = cache.read_stale_while_revalidate_json_with_metadata(
            "climate:test",
            300,
            3600,
            lambda: {"regionId": "berlin"},
        )

        self.assertEqual({"regionId": "berlin"}, value)
        self.assertEqual("miss", metadata["status"])
        self.assertFalse(metadata["refreshStarted"])
        self.assertEqual(3600, fake.setex_calls[0][1])
        self.assertEqual("swr-json-v1", fake.setex_calls[0][2]["_cacheEnvelope"])
        self.assertEqual({"regionId": "berlin"}, fake.setex_calls[0][2]["value"])

    def test_fresh_cached_value_skips_loader(self):
        fake = FakeRedis(
            json.dumps(
                {
                    "_cacheEnvelope": "swr-json-v1",
                    "freshUntil": (
                        datetime.now(UTC) + timedelta(minutes=5)
                    ).isoformat(),
                    "staleUntil": (
                        datetime.now(UTC) + timedelta(hours=1)
                    ).isoformat(),
                    "storedAt": datetime.now(UTC).isoformat(),
                    "value": {"regionId": "hamburg"},
                }
            ).encode()
        )
        cache.redis_client = lambda: fake

        value, metadata = cache.read_stale_while_revalidate_json_with_metadata(
            "climate:test",
            300,
            3600,
            lambda: self.fail("fresh cache should not call loader"),
        )

        self.assertEqual({"regionId": "hamburg"}, value)
        self.assertEqual("fresh", metadata["status"])
        self.assertFalse(metadata["refreshStarted"])
        self.assertEqual([], fake.set_calls)

    def test_stale_cached_value_returns_immediately(self):
        fake = FakeRedis(
            json.dumps(
                {
                    "_cacheEnvelope": "swr-json-v1",
                    "freshUntil": (
                        datetime.now(UTC) - timedelta(seconds=1)
                    ).isoformat(),
                    "staleUntil": (
                        datetime.now(UTC) + timedelta(hours=1)
                    ).isoformat(),
                    "storedAt": datetime.now(UTC).isoformat(),
                    "value": {"regionId": "stale"},
                }
            ).encode()
        )
        cache.redis_client = lambda: fake

        value, metadata = cache.read_stale_while_revalidate_json_with_metadata(
            "climate:test",
            300,
            3600,
            lambda: {"regionId": "refresh"},
        )

        self.assertEqual({"regionId": "stale"}, value)
        self.assertEqual("stale", metadata["status"])
        self.assertFalse(metadata["refreshStarted"])
        self.assertEqual(1, len(fake.set_calls))


if __name__ == "__main__":
    unittest.main()
