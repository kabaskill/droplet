from backend.models.entities import Region, ReservoirSnapshot


def region_to_read_model(region: Region) -> dict:
    return {
        "basin": region.basin,
        "code": region.code,
        "federalState": region.federal_state,
        "id": region.id,
        "name": region.name,
        "riskProfile": region.risk_profile,
        "sortIndex": region.sort_index,
    }


def snapshot_to_read_model(snapshot: ReservoirSnapshot) -> dict:
    return {
        "confidenceScore": round(snapshot.confidence_score),
        "evaporationPressure": round(snapshot.evaporation_pressure),
        "id": snapshot.id,
        "rainfallIndex": round(snapshot.rainfall_index),
        "regionId": snapshot.region_id,
        "source": snapshot.source,
        "timestamp": snapshot.timestamp.isoformat(),
        "trend": snapshot.trend,
        "visibilityScore": round(snapshot.visibility_score),
        "waterLevel": round(snapshot.water_level),
    }
