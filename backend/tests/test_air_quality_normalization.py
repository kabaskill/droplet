import sys
import types
import unittest
from datetime import UTC, datetime, timedelta
from unittest.mock import patch


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


from backend.services.climate_sources import air_quality as aq
from backend.services.climate_sources.contracts import (
    NormalizedAirQualityReading,
    dataclass_to_debug_dict,
)


class AirQualityNormalizationTest(unittest.TestCase):
    def test_open_meteo_fills_partial_uba_without_stale_measurement_warnings(self):
        observed_at = datetime.now(UTC) - timedelta(minutes=10)

        def partial_uba(*_args, **_kwargs):
            return (
                {
                    "pm10": {
                        "data": {
                            "1": {
                                observed_at.isoformat(): [
                                    "1",
                                    None,
                                    "12",
                                    observed_at.isoformat(),
                                ]
                            }
                        }
                    }
                },
                {
                    pollutant: {
                        "params": {"component": component},
                        "url": aq.UBA_MEASURES_URL,
                    }
                    for pollutant, component in aq.UBA_COMPONENT_IDS.items()
                },
                [
                    "UBA o3 measurement unavailable for station 1: timeout",
                    "UBA so2 measurement unavailable for station 1: timeout",
                ],
            )

        def useful_open_meteo_fallback(region_id, _http, _timeout, _warnings, **_kwargs):
            reading = NormalizedAirQualityReading(
                age_minutes=1,
                air_risk_label="low",
                air_risk_score=9,
                co_ug_m3=200.0,
                no2_ug_m3=18.0,
                o3_ug_m3=55.0,
                observed_at=observed_at,
                pm10_ug_m3=10.0,
                pm25_ug_m3=5.0,
                region_id=region_id,
                so2_ug_m3=4.0,
                source=aq.OPEN_METEO_AIR_SOURCE.name,
                station=None,
                status="ok",
                units=aq.AIR_QUALITY_UNITS,
            )

            return {"normalizedOutput": dataclass_to_debug_dict(reading)}

        with (
            patch.object(aq, "_fetch_uba_measurements", partial_uba),
            patch.object(aq, "_open_meteo_comparison", useful_open_meteo_fallback),
        ):
            stage = aq.build_air_quality_debug_stage(
                "berlin",
                stations_payload=[_station()],
                timeout=0.01,
            )

        self.assertEqual("ok", stage.normalized_output["status"])
        self.assertEqual(55.0, stage.normalized_output["o3_ug_m3"])
        self.assertEqual(
            [
                "Open-Meteo filled missing UBA pollutant readings: "
                "PM2.5, NO2, O3, SO2, CO"
            ],
            stage.warnings,
        )

    def test_empty_open_meteo_fallback_does_not_replace_failed_uba(self):
        def empty_uba(*_args, **_kwargs):
            return ({}, {"pm10": {"params": {}, "url": aq.UBA_MEASURES_URL}}, [])

        def empty_open_meteo_fallback(region_id, _http, _timeout, _warnings, **_kwargs):
            reading = NormalizedAirQualityReading(
                age_minutes=None,
                air_risk_label="low",
                air_risk_score=0,
                co_ug_m3=None,
                no2_ug_m3=None,
                o3_ug_m3=None,
                observed_at=None,
                pm10_ug_m3=None,
                pm25_ug_m3=None,
                region_id=region_id,
                so2_ug_m3=None,
                source=aq.OPEN_METEO_AIR_SOURCE.name,
                station=None,
                status="unavailable",
                units=aq.AIR_QUALITY_UNITS,
            )

            return {"normalizedOutput": dataclass_to_debug_dict(reading)}

        with (
            patch.object(aq, "_fetch_uba_measurements", empty_uba),
            patch.object(aq, "_open_meteo_comparison", empty_open_meteo_fallback),
        ):
            stage = aq.build_air_quality_debug_stage(
                "berlin",
                stations_payload=[_station()],
                timeout=0.01,
            )

        self.assertIsNone(stage.normalized_output)
        self.assertEqual(
            ["no usable UBA readings from nearby station candidates"],
            stage.errors,
        )


def _station():
    return {
        "id": "1",
        "latitude": 52.52,
        "longitude": 13.405,
        "name": "Berlin Test",
    }


if __name__ == "__main__":
    unittest.main()
