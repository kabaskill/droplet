"""Reviewed gauge identities. A discovery state is not a statewide measurement."""
from dataclasses import replace
from backend.services.environmental_sources import REGION_SOURCE_TARGETS

GAUGE_IDS = {
    "baden-wurttemberg": "7068d262-f466-44e1-9bfa-832fcc16c433",
    "bavaria": "9f12c405-35ac-4d90-9b7b-023be355867e",
    "berlin": "09e15cf6-f155-4b76-b92f-6c260839121c",
    "brandenburg": "bffdf7f2-6200-42a2-a4bc-a8111e27e043",
    "bremen": "b26bfc88-eb8a-45b9-9dd0-0e41949a2648",
    "hamburg": "d488c5cc-4de9-4631-8ce1-0db0e700b546",
    "hesse": "66ff3eb4-513b-478b-abd2-2f5126ea66fd",
    "lower-saxony": "227e53ca-4dd9-482b-be62-52fdc62a4b4e",
    "mecklenburg-vorpommern": "ca0e4a68-bd50-494c-bd45-abb33c5e1b0a",
    "north-rhine-westphalia": "c0f51e35-d0e8-4318-afaf-c5fcbc29f4c1",
    "rhineland-palatinate": "a37a9aa3-45e9-4d90-9df6-109f3a28a5af",
    "saarland": "1e237d42-66cb-4145-ab99-c8fde205b281",
    "saxony": "70272185-b2b3-4178-96b8-43bea330dcae",
    "saxony-anhalt": "b8567c1e-8610-4c2b-a240-65e8a74919fa",
    "schleswig-holstein": "3ad4013f-644b-47f5-a641-44b332bfecb2",
    # PEGELONLINE has no suitable Erfurt/Gera gauge; never substitute a distant river.
}
TARGETS = dict(REGION_SOURCE_TARGETS)
TARGETS["berlin"] = replace(TARGETS["berlin"], station="BERLIN-MÜHLENDAMM UP", water="SOW")
TARGETS["schleswig-holstein"] = replace(TARGETS["schleswig-holstein"], station="KIEL-HOLTENAU", water="OSTSEE")


def configured_station(stations, region_id, target):
    from backend.services.water_sources import select_station
    station_id = GAUGE_IDS.get(region_id)
    candidates = [station for station in stations if station.get("uuid") == station_id]
    if not candidates:
        raise ValueError("No verified gauge available for this place")
    return select_station(candidates, target)
