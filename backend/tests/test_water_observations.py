import os
import unittest
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from unittest.mock import patch

from flask import Flask
from sqlalchemy import create_engine, func, select, text
from sqlalchemy.orm import Session

from backend.api.water_routes import water_bp
from backend.models.water import RainfallObservation, WaterObservation
from backend.models.water_migrations import migrate_water_schema, versions
from backend.repositories.water import (
    current_conditions,
    observation_history,
    persist_observations,
)
from backend.services import environmental_sources as sources
from backend.services.water_sources import (
    fetch_measured_observations,
    parse_rainfall_product,
    parse_water_station,
    select_station,
)

NOW = datetime(2026, 9, 16, 12, tzinfo=UTC)
STATION_ID = "9f12c405-35ac-4d90-9b7b-023be355867e"


def gauge(value=394, timestamp=NOW):
    return {
        "uuid": STATION_ID,
        "shortname": "PASSAU DONAU",
        "longname": "Passau Donau",
        "latitude": 48.576133,
        "longitude": 13.459076,
        "water": {"shortname": "DONAU", "longname": "Danube"},
        "timeseries": [
            {
                "shortname": "W",
                "unit": "cm",
                "currentMeasurement": {
                    "value": value,
                    "timestamp": timestamp.isoformat(),
                    "stateMnwMhw": "low",
                },
                "gaugeZero": {
                    "value": 286.439,
                    "unit": "m. ü. NHN",
                    "validFrom": "2019-11-01",
                },
                "characteristicValues": [
                    {
                        "shortname": "MNW",
                        "value": 404,
                        "unit": "cm",
                        "timespanStart": "2006-11-01",
                        "timespanEnd": "2015-10-31",
                    }
                ],
            }
        ],
    }


def water(value=394, timestamp=NOW, **changes):
    row = parse_water_station("bavaria", gauge(value, timestamp), NOW)
    return {**row, **changes}


def rain(value=0, end=NOW, **changes):
    return {
        "region_id": "bavaria",
        "station_id": "01234",
        "station_name": "Nearby station",
        "latitude": 48.57,
        "longitude": 13.46,
        "total_mm": value,
        "window_start": end - timedelta(hours=24),
        "window_end": end,
        "received_at": NOW,
        "source_url": sources.DWD_PRECIPITATION_PRODUCT_URL.format(station_id="01234"),
        **changes,
    }


def rain_text(values=None):
    values = {hour: 0 for hour in range(24)} if values is None else values
    return "STATIONS_ID;MESS_DATUM;QN_8;R1;eor\n" + "\n".join(
        f"1234;{(NOW - timedelta(hours=hour)).strftime('%Y%m%d%H')};1;{value};eor"
        for hour, value in values.items()
    )


class WaterSourceTest(unittest.TestCase):
    def test_low_gauge_keeps_centimeters_and_reference_provenance(self):
        row = water()
        self.assertEqual(394, row["level_cm"])
        self.assertEqual("low", row["condition"])
        self.assertEqual(404, row["references"][0]["value"])
        self.assertEqual("2015-10-31", row["references"][0]["timespanEnd"])
        self.assertEqual(STATION_ID, row["station_id"])

    def test_zero_and_negative_gauge_heights_are_not_missing(self):
        for value in (0, -12):
            with self.subTest(value=value):
                self.assertEqual(value, water(value)["level_cm"])

    def test_missing_nonfinite_and_boolean_measurements_are_rejected(self):
        for value in (None, True, "NaN", float("inf")):
            with self.subTest(value=value), self.assertRaises((ValueError, TypeError)):
                water(value)

    def test_invalid_unit_or_timestamp_is_rejected(self):
        for field, value in (
            ("unit", "m"),
            ("timestamp", "2026-09-16T12:00:00"),
            ("timestamp", (NOW + timedelta(hours=1)).isoformat()),
        ):
            payload = gauge()
            series = payload["timeseries"][0]
            (series if field == "unit" else series["currentMeasurement"])[field] = value
            with self.subTest(field=field, value=value), self.assertRaises(ValueError):
                parse_water_station("bavaria", payload, NOW)

    def test_source_malfunction_is_not_a_valid_observation(self):
        payload = gauge()
        payload["timeseries"][0]["currentMeasurement"]["stateMnwMhw"] = "commented"
        with self.assertRaises(ValueError):
            parse_water_station("bavaria", payload, NOW)

    def test_unknown_source_condition_stays_unknown(self):
        payload = gauge()
        payload["timeseries"][0]["currentMeasurement"].pop("stateMnwMhw")
        self.assertEqual(
            "unknown", parse_water_station("bavaria", payload, NOW)["condition"]
        )

    def test_station_selection_requires_same_river_and_distance_bound(self):
        target = sources.REGION_SOURCE_TARGETS["bavaria"]
        wrong_river = gauge()
        wrong_river["water"] = {"shortname": "RHEIN"}
        distant = gauge()
        distant["latitude"] = 54
        with self.assertRaises(sources.SourceFetchError):
            select_station([wrong_river, distant], target)
        self.assertEqual(
            STATION_ID, select_station([wrong_river, gauge()], target)["uuid"]
        )

    def test_complete_zero_rain_is_a_valid_day(self):
        start, end, value = parse_rainfall_product(rain_text(), "01234", NOW)
        self.assertEqual(NOW - timedelta(hours=24), start)
        self.assertEqual(NOW, end)
        self.assertEqual(0, value)

    def test_partial_invalid_or_missing_latest_rain_is_not_a_full_day(self):
        for invalid in (None, -999, -0.1, "NaN"):
            values = {hour: 1 for hour in range(25)}
            if invalid is None:
                del values[5]
            else:
                values[0] = invalid
            with self.subTest(invalid=invalid), self.assertRaises(ValueError):
                parse_rainfall_product(rain_text(values), "01234", NOW)

    def test_rain_window_excludes_the_25th_hour_and_other_stations(self):
        values = {hour: 1 for hour in range(24)}
        values[24] = 100
        raw = rain_text(values) + "\n9999;2026091612;1;200;eor"
        self.assertEqual(24, parse_rainfall_product(raw, "01234", NOW)[2])

    def test_conflicting_duplicate_rain_hour_is_not_counted_twice(self):
        raw = rain_text() + "\n1234;2026091612;1;2;eor"
        with self.assertRaises(ValueError):
            parse_rainfall_product(raw, "01234", NOW)

    def test_water_failure_does_not_prevent_real_zero_rain(self):
        target = {"bavaria": sources.REGION_SOURCE_TARGETS["bavaria"]}
        station = sources.DwdStation(48.57, 13.46, "Nearby station", "01234")
        with (
            patch.object(sources, "_get_json", return_value=[]),
            patch.object(sources, "_nearest_dwd_stations", return_value=[station]),
            patch.object(sources, "_fetch_dwd_product_text", return_value=rain_text()),
        ):
            result = fetch_measured_observations(target, now=NOW)
        self.assertEqual([], result["water"])
        self.assertEqual(0, result["rainfall"][0]["total_mm"])
        self.assertEqual({"bavaria": ["water"]}, result["failures"])

    def test_rain_failure_does_not_prevent_water_or_generate_fallback(self):
        target = {"bavaria": sources.REGION_SOURCE_TARGETS["bavaria"]}
        with (
            patch.object(sources, "_get_json", return_value=[gauge()]),
            patch.object(sources, "_nearest_dwd_stations", return_value=[]),
        ):
            result = fetch_measured_observations(target, now=NOW)
        self.assertEqual(394, result["water"][0]["level_cm"])
        self.assertEqual([], result["rainfall"])
        self.assertEqual({"bavaria": ["rainfall"]}, result["failures"])


class WaterDatabaseCase(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine("sqlite://")
        migrate_water_schema(self.engine)
        self.session = Session(self.engine)

    def tearDown(self):
        self.session.close()
        self.engine.dispose()

    def persist(self, waters=(), rains=()):
        persist_observations(
            self.session, {"water": list(waters), "rainfall": list(rains)}, NOW
        )
        self.session.commit()


class WaterPersistenceTest(WaterDatabaseCase):
    def test_migration_is_idempotent_and_preserves_legacy_data(self):
        with self.engine.begin() as conn:
            conn.execute(
                text("CREATE TABLE reservoir_snapshots (id INTEGER, water_level FLOAT)")
            )
            conn.execute(text("INSERT INTO reservoir_snapshots VALUES (1, 0)"))
        migrate_water_schema(self.engine)
        with self.engine.connect() as conn:
            self.assertEqual(2, conn.scalar(select(func.count()).select_from(versions)))
            self.assertEqual(
                1, conn.scalar(text("SELECT count(*) FROM reservoir_snapshots"))
            )
        self.assertEqual(
            0, self.session.scalar(select(func.count()).select_from(WaterObservation))
        )

    def test_historical_import_cannot_replace_live_source_condition(self):
        self.persist([water(385)])
        persist_observations(self.session, {"water": [water(385, condition="unknown")], "rainfall": []}, NOW, overwrite=False)
        self.session.commit()
        self.assertEqual("low", current_conditions(self.session, "bavaria", NOW)["water"]["condition"])

    def test_duplicate_fetch_and_corrected_reading_upsert_one_observation(self):
        self.persist([water()], [rain()])
        self.persist([water(396)], [rain(1.5)])
        self.assertEqual(
            1, self.session.scalar(select(func.count()).select_from(WaterObservation))
        )
        self.assertEqual(
            1,
            self.session.scalar(select(func.count()).select_from(RainfallObservation)),
        )
        payload = current_conditions(self.session, "bavaria", NOW)
        self.assertEqual(396, payload["water"]["levelCm"])
        self.assertEqual(1.5, payload["rainfall"]["totalMm"])

    def test_missing_rain_is_distinct_from_zero_and_water_remains_available(self):
        self.persist([water()])
        payload = current_conditions(self.session, "bavaria", NOW)
        self.assertEqual("current", payload["water"]["status"])
        self.assertIsNone(payload["rainfall"]["totalMm"])
        self.assertEqual("unavailable", payload["rainfall"]["status"])
        self.persist(rains=[rain(0)])
        self.assertEqual(
            0, current_conditions(self.session, "bavaria", NOW)["rainfall"]["totalMm"]
        )

    def test_failure_keeps_last_known_reading_with_actual_age(self):
        self.persist([water(timestamp=NOW - timedelta(hours=5))])
        self.persist()
        payload = current_conditions(self.session, "bavaria", NOW)
        self.assertEqual(394, payload["water"]["levelCm"])
        self.assertEqual("stale", payload["water"]["status"])
        self.assertEqual(300, payload["water"]["ageMinutes"])
        self.assertIsNone(payload["change24h"])

    def test_change_uses_same_station_datum_and_24_hour_baseline(self):
        self.persist([water(390, NOW - timedelta(hours=24)), water(394)])
        change = current_conditions(self.session, "bavaria", NOW)["change24h"]
        self.assertEqual(4, change["deltaCm"])
        self.assertEqual(24, change["elapsedHours"])

    def test_station_datum_or_missing_baseline_cannot_make_a_change(self):
        for changes in (
            {"station_id": "other-station"},
            {"gauge_zero": {"value": 300, "unit": "m"}},
            {"gauge_zero": None},
        ):
            with self.subTest(changes=changes):
                self.session.query(WaterObservation).delete()
                self.persist(
                    [water(390, NOW - timedelta(hours=24), **changes), water(394)]
                )
                self.assertIsNone(
                    current_conditions(self.session, "bavaria", NOW)["change24h"]
                )

    def test_hour_buckets_keep_real_bounds_and_do_not_sum_rolling_rain(self):
        self.persist(
            [
                water(390, NOW - timedelta(minutes=40)),
                water(394, NOW - timedelta(minutes=10)),
            ],
            [
                rain(2, NOW - timedelta(minutes=40)),
                rain(3, NOW - timedelta(minutes=10)),
            ],
        )
        result = observation_history(
            self.session, "bavaria", NOW - timedelta(hours=1), NOW, "hour"
        )
        self.assertEqual(1, len(result["water"]))
        self.assertEqual(390, result["water"][0]["minCm"])
        self.assertEqual(394, result["water"][0]["lastCm"])
        self.assertEqual(2, result["water"][0]["observations"])
        self.assertEqual(3, result["rainfall"][0]["rainfall24hMm"])

    def test_buckets_do_not_merge_different_gauge_datums(self):
        self.persist(
            [
                water(390, NOW - timedelta(minutes=40)),
                water(
                    394,
                    NOW - timedelta(minutes=10),
                    gauge_zero={"unit": "m", "value": 300},
                ),
            ]
        )
        result = observation_history(
            self.session, "bavaria", NOW - timedelta(hours=1), NOW, "hour"
        )
        self.assertEqual(2, len(result["water"]))

    def test_empty_history_is_not_filled_with_legacy_or_synthetic_points(self):
        result = observation_history(
            self.session, "bavaria", NOW - timedelta(days=7), NOW, "day"
        )
        self.assertEqual([], result["water"])
        self.assertEqual([], result["rainfall"])


class WaterBackfillTest(unittest.TestCase):
    def test_backfill_is_real_hourly_samples_and_respects_datum(self):
        from backend.services.water_backfill import water_history_rows
        payload = gauge()
        points = [
            {"timestamp": (NOW - timedelta(minutes=40)).isoformat(), "value": 390},
            {"timestamp": (NOW - timedelta(minutes=10)).isoformat(), "value": 392},
            {"timestamp": (NOW - timedelta(days=40)).isoformat(), "value": 100},
            {"timestamp": NOW.isoformat(), "value": "NaN"},
        ]
        rows = water_history_rows("bavaria", payload, points, NOW)
        self.assertEqual([392], [row["level_cm"] for row in rows])
        self.assertEqual("unknown", rows[0]["condition"])
        payload["timeseries"][0]["gaugeZero"]["validFrom"] = NOW.isoformat()
        self.assertEqual([], water_history_rows("bavaria", payload, points, NOW))

    def test_backfill_cannot_outrun_current_source_classification(self):
        from backend.services.water_backfill import water_history_rows
        payload = gauge(timestamp=NOW - timedelta(minutes=15))
        points = [
            {"timestamp": (NOW - timedelta(hours=1)).isoformat(), "value": 380},
            {"timestamp": (NOW - timedelta(minutes=15)).isoformat(), "value": 381},
            {"timestamp": NOW.isoformat(), "value": 382},
        ]
        rows = water_history_rows("bavaria", payload, points, NOW)
        self.assertEqual([380], [row["level_cm"] for row in rows])

    def test_backfill_rain_requires_a_complete_measured_day(self):
        from backend.services.water_backfill import rainfall_history_rows
        raw = rain_text({hour: 1 for hour in range(48)})
        rows = rainfall_history_rows(raw, "01234", NOW)
        self.assertEqual(24, rows[0][2])
        self.assertEqual([], rainfall_history_rows(rain_text({12: 1}), "01234", NOW))


class WaterApiTest(WaterDatabaseCase):
    def setUp(self):
        super().setUp()
        self.app = Flask(__name__)
        self.app.register_blueprint(water_bp, url_prefix="/api/water")
        self.client = self.app.test_client()

        @contextmanager
        def sessions():
            yield self.session

        self.session_patch = patch("backend.api.water_routes.session_scope", sessions)
        self.session_patch.start()
        self.auth_patch = patch.dict(os.environ, {"AUTH_MODE": "keycloak"})
        self.auth_patch.start()

    def tearDown(self):
        self.auth_patch.stop()
        self.session_patch.stop()
        super().tearDown()

    def test_guests_can_read_current_conditions_and_recent_history(self):
        self.persist([water()], [rain()])
        for suffix in ("", "/recent"):
            response = self.client.get("/api/water/regions/bavaria" + suffix)
            self.assertEqual(200, response.status_code)
        payload = self.client.get("/api/water/regions/bavaria").get_json()
        self.assertEqual(394, payload["water"]["levelCm"])
        self.assertNotIn("references", payload["water"])

    def test_guests_cannot_request_extended_history_or_details(self):
        for suffix in ("/history", "/details"):
            response = self.client.get("/api/water/regions/bavaria" + suffix)
            self.assertEqual(401, response.status_code)
            self.assertEqual("private, no-store", response.headers["Cache-Control"])
        self.assertEqual(
            400,
            self.client.get(
                "/api/water/regions/bavaria/recent?start=2000-01-01"
            ).status_code,
        )

    def test_authenticated_details_have_references_and_no_shared_cache(self):
        self.persist([water()])
        with patch(
            "backend.auth.decorators.validate_access_token",
            return_value={"subject": "user-a"},
        ):
            response = self.client.get(
                "/api/water/regions/bavaria/details",
                headers={"Authorization": "Bearer test"},
            )
        self.assertEqual(200, response.status_code)
        self.assertEqual(404, response.get_json()["water"]["references"][0]["value"])
        self.assertEqual("private, no-store", response.headers["Cache-Control"])
        self.assertEqual("Authorization", response.headers["Vary"])

    def test_history_dates_are_validated_and_bound_the_query(self):
        valid = "?start=2026-09-15T00:00:00Z&end=2026-09-16T00:00:00Z&interval=hour"
        invalid = (
            "?start=garbage",
            "?start=2020-01-01T00:00:00Z",
            "?start=2026-09-16",
            "?interval=minute",
            "?end=2999-01-01T00:00:00Z",
        )
        with patch(
            "backend.auth.decorators.validate_access_token",
            return_value={"subject": "user-a"},
        ):
            headers = {"Authorization": "Bearer test"}
            self.assertEqual(
                200,
                self.client.get(
                    "/api/water/regions/bavaria/history" + valid, headers=headers
                ).status_code,
            )
            for query in invalid:
                with self.subTest(query=query):
                    self.assertEqual(
                        400,
                        self.client.get(
                            "/api/water/regions/bavaria/history" + query,
                            headers=headers,
                        ).status_code,
                    )

    def test_saved_places_are_private_and_default_is_unique(self):
        headers = {"Authorization": "Bearer test"}
        self.assertEqual(401, self.client.get("/api/water/places").status_code)
        with patch("backend.auth.decorators.validate_access_token", return_value={"subject": "user-a"}):
            for region in ("bavaria", "berlin"):
                self.assertEqual(200, self.client.put("/api/water/places/" + region, json={"isDefault": True}, headers=headers).status_code)
                self.session.commit()
            saved = self.client.get("/api/water/places", headers=headers).get_json()
            self.assertEqual(2, len(saved))
            self.assertEqual(["berlin"], [row["regionId"] for row in saved if row["isDefault"]])
        with patch("backend.auth.decorators.validate_access_token", return_value={"subject": "user-b"}):
            self.assertEqual([], self.client.get("/api/water/places", headers=headers).get_json())
            self.client.delete("/api/water/places/berlin", headers=headers)
        with patch("backend.auth.decorators.validate_access_token", return_value={"subject": "user-a"}):
            self.assertEqual(2, len(self.client.get("/api/water/places", headers=headers).get_json()))

    def test_published_mean_difference_preserves_zero_and_period(self):
        refs = [{"shortname": "MW", "value": 490, "unit": "cm", "timespanStart": "2006", "timespanEnd": "2015"}]
        self.persist([water(385, references=refs)])
        mean = current_conditions(self.session, "bavaria", NOW)["water"]["meanComparison"]
        self.assertEqual(-105, mean["differenceCm"])
        self.assertEqual("2015", mean["periodEnd"])
        self.persist([water(490, references=refs)])
        self.assertEqual(0, current_conditions(self.session, "bavaria", NOW)["water"]["meanComparison"]["differenceCm"])

    def test_unknown_region_has_a_clear_404(self):
        self.assertEqual(404, self.client.get("/api/water/regions/unknown").status_code)


if __name__ == "__main__":
    unittest.main()
