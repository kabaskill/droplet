from datetime import UTC, datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend.models.database import Base


class Region(Base):
    __tablename__ = "regions"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    basin: Mapped[str] = mapped_column(String(80), nullable=False)
    code: Mapped[str] = mapped_column(String(24), nullable=False, unique=True)
    federal_state: Mapped[str] = mapped_column(String(120), nullable=False)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    risk_profile: Mapped[str] = mapped_column(String(24), nullable=False)
    sort_index: Mapped[int] = mapped_column(Integer, default=0)

    snapshots: Mapped[list["ReservoirSnapshot"]] = relationship(
        back_populates="region",
        cascade="all, delete-orphan",
    )


class ReservoirSnapshot(Base):
    __tablename__ = "reservoir_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    evaporation_pressure: Mapped[float] = mapped_column(Float, nullable=False)
    rainfall_index: Mapped[float] = mapped_column(Float, nullable=False)
    region_id: Mapped[str] = mapped_column(ForeignKey("regions.id"), nullable=False)
    source: Mapped[str] = mapped_column(String(160), nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(UTC),
        nullable=False,
    )
    trend: Mapped[str] = mapped_column(String(20), nullable=False)
    visibility_score: Mapped[float] = mapped_column(Float, nullable=False)
    water_level: Mapped[float] = mapped_column(Float, nullable=False)

    region: Mapped[Region] = relationship(back_populates="snapshots")
