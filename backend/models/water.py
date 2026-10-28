"""Measured observations. Deliberately separate from legacy/demo score tables."""

from datetime import datetime

from sqlalchemy import JSON, DateTime, Float, Index, Integer, String, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class WaterBase(DeclarativeBase):
    pass


class WaterObservation(WaterBase):
    __tablename__ = "water_observations"
    __table_args__ = (
        UniqueConstraint("region_id", "station_id", "observed_at"),
        Index("ix_water_region_time", "region_id", "observed_at"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    region_id: Mapped[str] = mapped_column(String(64))
    station_id: Mapped[str] = mapped_column(String(64))
    station_name: Mapped[str] = mapped_column(String(255))
    water_body: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    level_cm: Mapped[float] = mapped_column(Float)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    condition: Mapped[str] = mapped_column(String(16))
    gauge_zero: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    references: Mapped[list] = mapped_column(JSON)
    source_url: Mapped[str] = mapped_column(String(500))


class RainfallObservation(WaterBase):
    __tablename__ = "rainfall_observations"
    __table_args__ = (
        UniqueConstraint("region_id", "station_id", "window_end"),
        Index("ix_rainfall_region_time", "region_id", "window_end"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    region_id: Mapped[str] = mapped_column(String(64))
    station_id: Mapped[str] = mapped_column(String(64))
    station_name: Mapped[str] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    total_mm: Mapped[float] = mapped_column(Float)
    window_start: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    window_end: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    source_url: Mapped[str] = mapped_column(String(500))


class SavedPlace(WaterBase):
    __tablename__ = "saved_places"
    user_subject: Mapped[str] = mapped_column(String(160), primary_key=True)
    region_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    is_default: Mapped[bool] = mapped_column(default=False)
