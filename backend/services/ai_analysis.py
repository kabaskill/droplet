import json
import os
from typing import Any


def local_analysis(payload: dict[str, Any], role: str) -> dict:
    snapshots = _snapshots_from_payload(payload)
    elevated_snapshots = [
        snapshot
        for snapshot in snapshots
        if _number(snapshot.get("evaporationPressure")) > 58
        or _number(snapshot.get("waterLevel")) < 42
        or _number(snapshot.get("confidenceScore")) < 70
    ]
    high_water_snapshots = [
        snapshot for snapshot in snapshots if _number(snapshot.get("waterLevel")) >= 72
    ]
    risk_level = (
        "high"
        if len(elevated_snapshots) >= max(2, len(snapshots) // 2)
        else "medium"
        if elevated_snapshots or high_water_snapshots
        else "low"
    )
    scope_label = _scope_label(payload)

    return {
        "observations": _local_observations(snapshots),
        "recommendations": _local_recommendations(risk_level, role),
        "riskLevel": risk_level,
        "scopeLabel": scope_label,
        "summary": (
            f"{scope_label} shows {risk_level} operational risk across "
            f"{len(snapshots)} included state{'s' if len(snapshots) != 1 else ''}. "
            "The analysis is based on the latest water level, rainfall, evaporation, "
            "confidence, and source freshness signals."
        ),
    }


def analyze_snapshot_payload(snapshot: dict[str, Any], roles: list[str] | None = None) -> dict:
    return analyze_environment_payload(
        {
            "scope": {"label": snapshot.get("regionId", "Selected state"), "type": "state"},
            "snapshots": [snapshot],
        },
        roles,
    )


def analyze_environment_payload(
    payload: dict[str, Any],
    roles: list[str] | None = None,
) -> dict:
    role = _analysis_role(roles or [])
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        return local_analysis(payload, role)

    from google import genai

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=_gemini_prompt(payload, role),
        config={
            "response_mime_type": "application/json",
        },
    )

    text = response.text or ""

    if not text:
        return local_analysis(payload, role)

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {
            "observations": [],
            "recommendations": [text],
            "riskLevel": "medium",
            "scopeLabel": _scope_label(payload),
            "summary": "Gemini analysis completed.",
        }

    return {
        "observations": _string_list(parsed.get("observations")),
        "recommendations": _string_list(parsed.get("recommendations")),
        "riskLevel": _risk_level(parsed.get("riskLevel")),
        "scopeLabel": str(parsed.get("scopeLabel") or _scope_label(payload)),
        "summary": str(parsed.get("summary") or "Gemini analysis completed."),
    }


def _gemini_prompt(payload: dict[str, Any], role: str) -> str:
    return "\n\n".join(
        [
            (
                "You are Droplet's environmental operations analyst. Analyze the "
                "provided German water-state read model for the authenticated user's "
                f"role: {role}."
            ),
            (
                "Keep the answer short and practical. Focus on water sources, water "
                "levels, rainfall, evaporation pressure, weather events, source "
                "confidence, and what the user should watch next."
            ),
            (
                "Return only JSON with summary, riskLevel, observations, "
                "recommendations, and scopeLabel. riskLevel must be low, medium, or "
                "high. observations and recommendations must be short string arrays."
            ),
            f"Water-state payload:\n{json.dumps(payload)}",
        ]
    )


def _analysis_role(roles: list[str]) -> str:
    if "municipality" in roles:
        return "municipality"

    if "analyst" in roles:
        return "analyst"

    return "citizen"


def _scope_label(payload: dict[str, Any]) -> str:
    scope = payload.get("scope")

    if isinstance(scope, dict) and scope.get("label"):
        return str(scope["label"])

    return "Selected water-state scope"


def _snapshots_from_payload(payload: dict[str, Any]) -> list[dict[str, Any]]:
    snapshots = payload.get("snapshots")

    if isinstance(snapshots, list):
        return [snapshot for snapshot in snapshots if isinstance(snapshot, dict)]

    snapshot = payload.get("snapshot")

    if isinstance(snapshot, dict):
        return [snapshot]

    return []


def _local_observations(snapshots: list[dict[str, Any]]) -> list[str]:
    if not snapshots:
        return ["No current snapshots were included in the analysis request."]

    average_water = _average(snapshot.get("waterLevel") for snapshot in snapshots)
    average_rain = _average(snapshot.get("rainfallIndex") for snapshot in snapshots)
    average_evaporation = _average(
        snapshot.get("evaporationPressure") for snapshot in snapshots
    )
    low_confidence_count = sum(
        1 for snapshot in snapshots if _number(snapshot.get("confidenceScore")) < 70
    )

    observations = [
        f"Average water availability is {round(average_water)} percent across the selected scope.",
        f"Rainfall contribution is {round(average_rain)} percent while evaporation pressure is {round(average_evaporation)} percent.",
    ]

    if low_confidence_count:
        observations.append(
            f"{low_confidence_count} state read model has confidence below 70 percent."
        )

    return observations


def _local_recommendations(risk_level: str, role: str) -> list[str]:
    if role == "citizen":
        return [
            "Watch for updated public water advisories if conditions change.",
            "Use the result as a short regional overview, not an emergency forecast.",
        ]

    if risk_level == "high":
        return [
            "Prioritize source freshness review before operational escalation.",
            "Compare rainfall movement against water-level changes in the next ingestion cycle.",
            "Keep the selected scope visible in the analyst queue.",
        ]

    return [
        "Maintain normal monitoring cadence.",
        "Recheck rainfall and evaporation movement after the next snapshot refresh.",
    ]


def _average(values) -> float:
    numbers = [_number(value) for value in values]

    if not numbers:
        return 0

    return sum(numbers) / len(numbers)


def _number(value: Any) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return 0


def _risk_level(value: Any) -> str:
    normalized = str(value or "medium").lower()

    if normalized in {"high", "low", "medium"}:
        return normalized

    return "medium"


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    return [str(item) for item in value if item]
