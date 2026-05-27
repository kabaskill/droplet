from backend.repositories.snapshots import latest_snapshots


def build_analytics_summary() -> dict:
    snapshots = latest_snapshots()

    if not snapshots:
        return {
            "averageConfidence": 0,
            "averageVisibility": 0,
            "elevatedRiskRegions": 0,
            "lastUpdated": "",
            "regionsObserved": 0,
            "trendMix": {"falling": 0, "rising": 0, "stable": 0},
        }

    trend_mix = {"falling": 0, "rising": 0, "stable": 0}

    for snapshot in snapshots:
        trend_mix[snapshot["trend"]] += 1

    return {
        "averageConfidence": round(
            sum(snapshot["confidenceScore"] for snapshot in snapshots) / len(snapshots)
        ),
        "averageVisibility": round(
            sum(snapshot["visibilityScore"] for snapshot in snapshots) / len(snapshots)
        ),
        "elevatedRiskRegions": sum(
            1
            for snapshot in snapshots
            if snapshot["waterLevel"] > 72 or snapshot["evaporationPressure"] > 60
        ),
        "lastUpdated": max(snapshot["timestamp"] for snapshot in snapshots),
        "regionsObserved": len(snapshots),
        "trendMix": trend_mix,
    }
