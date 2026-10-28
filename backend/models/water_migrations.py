"""Additive, versioned migrations for the new water schema.

Run once before deploying readers/workers: python -m backend.models.water_migrations
Legacy tables and their data are never modified or backfilled by this migration.
"""

from datetime import UTC, datetime

from sqlalchemy import Column, DateTime, MetaData, String, Table, select, text
from sqlalchemy.engine import Engine

from backend.models.water import RainfallObservation, WaterObservation, SavedPlace

metadata = MetaData()
versions = Table(
    "water_schema_versions",
    metadata,
    Column("version", String(64), primary_key=True),
    Column("applied_at", DateTime(timezone=True), nullable=False),
)
VERSION = "001_measured_water_and_rainfall"
PLACES_VERSION = "002_saved_places"


def migrate_water_schema(engine: Engine) -> None:
    with engine.begin() as connection:
        # Serialize concurrent deployments, including creation of the version table.
        if engine.dialect.name == "postgresql":
            connection.execute(text("SELECT pg_advisory_xact_lock(7342060916)"))
        elif engine.dialect.name == "sqlite":
            connection.exec_driver_sql("BEGIN IMMEDIATE")
        else:
            raise ValueError("Water migrations support PostgreSQL and SQLite")
        versions.create(connection, checkfirst=True)
        applied = set(connection.scalars(select(versions.c.version)))
        if applied - {VERSION, PLACES_VERSION}:
            raise RuntimeError("Water schema is newer than this application")
        if VERSION not in applied:
            WaterObservation.__table__.create(connection, checkfirst=True)
            RainfallObservation.__table__.create(connection, checkfirst=True)
            connection.execute(
                versions.insert().values(version=VERSION, applied_at=datetime.now(UTC))
            )

        if PLACES_VERSION not in applied:
            SavedPlace.__table__.create(connection, checkfirst=True)
            connection.execute(versions.insert().values(version=PLACES_VERSION, applied_at=datetime.now(UTC)))


if __name__ == "__main__":
    from backend.models.database import engine

    migrate_water_schema(engine)
    print(f"Water schema ready: {VERSION}")
