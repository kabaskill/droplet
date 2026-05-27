from sqlalchemy import desc, select

from backend.models.database import session_scope
from backend.models.entities import Region, ReservoirSnapshot
from backend.repositories.mappers import snapshot_to_read_model


def latest_snapshots() -> list[dict]:
    with session_scope() as session:
        regions = session.scalars(select(Region).order_by(Region.sort_index)).all()
        latest = []

        for region in regions:
            snapshot = session.scalars(
                select(ReservoirSnapshot)
                .where(ReservoirSnapshot.region_id == region.id)
                .order_by(desc(ReservoirSnapshot.timestamp))
                .limit(1)
            ).first()

            if snapshot:
                latest.append(snapshot_to_read_model(snapshot))

        return latest


def snapshot_history(region_id: str, limit: int = 14) -> list[dict]:
    with session_scope() as session:
        snapshots = session.scalars(
            select(ReservoirSnapshot)
            .where(ReservoirSnapshot.region_id == region_id)
            .order_by(desc(ReservoirSnapshot.timestamp))
            .limit(limit)
        ).all()

        return [snapshot_to_read_model(snapshot) for snapshot in reversed(snapshots)]
