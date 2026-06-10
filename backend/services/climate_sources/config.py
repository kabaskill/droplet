import os


def positive_int_env(name: str, fallback: int) -> int:
    try:
        value = int(os.getenv(name, str(fallback)))
    except (TypeError, ValueError):
        return fallback

    return value if value > 0 else fallback


def stale_ttl_env(name: str, fallback: int, fresh_ttl_seconds: int) -> int:
    return max(positive_int_env(name, fallback), fresh_ttl_seconds)


CLIMATE_OBSERVATION_CACHE_FRESH_TTL_SECONDS = positive_int_env(
    "CLIMATE_OBSERVATION_CACHE_FRESH_TTL_SECONDS",
    30 * 60,
)
CLIMATE_OBSERVATION_CACHE_STALE_TTL_SECONDS = stale_ttl_env(
    "CLIMATE_OBSERVATION_CACHE_STALE_TTL_SECONDS",
    3 * 60 * 60,
    CLIMATE_OBSERVATION_CACHE_FRESH_TTL_SECONDS,
)
CLIMATE_STATION_INDEX_CACHE_FRESH_TTL_SECONDS = positive_int_env(
    "CLIMATE_STATION_INDEX_CACHE_FRESH_TTL_SECONDS",
    12 * 60 * 60,
)
CLIMATE_STATION_INDEX_CACHE_STALE_TTL_SECONDS = stale_ttl_env(
    "CLIMATE_STATION_INDEX_CACHE_STALE_TTL_SECONDS",
    7 * 24 * 60 * 60,
    CLIMATE_STATION_INDEX_CACHE_FRESH_TTL_SECONDS,
)
