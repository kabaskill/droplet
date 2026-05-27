from sqlalchemy import select

from backend.models.database import session_scope
from backend.models.entities import Region
from backend.repositories.mappers import region_to_read_model


def list_regions() -> list[dict]:
    with session_scope() as session:
        regions = session.scalars(select(Region).order_by(Region.sort_index)).all()
        return [region_to_read_model(region) for region in regions]
