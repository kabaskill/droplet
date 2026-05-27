from datetime import UTC, datetime

from backend.repositories.snapshots import latest_snapshots


def build_source_health() -> dict:
    snapshots = latest_snapshots()
    provider_counts: dict[str, dict] = {}
    freshness_mix = {"current": 0, "old": 0, "stale": 0}
    fallback_regions = []
    stale_regions = []
    weather_regions = set()
    water_regions = set()

    for snapshot in snapshots:
        freshness_status = snapshot.get("freshnessStatus", "old")
        freshness_mix[freshness_status] += 1

        if freshness_status != "current":
            stale_regions.append(
                {
                    "ageMinutes": snapshot.get("ageMinutes", 0),
                    "freshnessStatus": freshness_status,
                    "regionId": snapshot["regionId"],
                }
            )

        for source in snapshot.get("sources", []):
            kind = source.get("kind", "model")
            label = source.get("label", "Unknown source")
            provider_key = f"{kind}:{label}"

            provider_counts.setdefault(
                provider_key,
                {
                    "kind": kind,
                    "label": label,
                    "regions": 0,
                },
            )
            provider_counts[provider_key]["regions"] += 1

            if kind == "fallback":
                fallback_regions.append(snapshot["regionId"])
            elif kind == "water":
                water_regions.add(snapshot["regionId"])
            elif kind == "weather":
                weather_regions.add(snapshot["regionId"])

    regions_observed = len(snapshots)

    return {
        "fallbackRegions": sorted(set(fallback_regions)),
        "freshnessMix": freshness_mix,
        "generatedAt": datetime.now(UTC).isoformat(),
        "providerCoverage": sorted(
            provider_counts.values(),
            key=lambda provider: (-provider["regions"], provider["label"]),
        ),
        "regionsObserved": regions_observed,
        "staleRegions": sorted(
            stale_regions,
            key=lambda region: (-region["ageMinutes"], region["regionId"]),
        ),
        "waterCoverage": _coverage_percent(len(water_regions), regions_observed),
        "weatherCoverage": _coverage_percent(len(weather_regions), regions_observed),
    }


def _coverage_percent(observed_regions: int, total_regions: int) -> int:
    if total_regions == 0:
        return 0

    return round((observed_regions / total_regions) * 100)
