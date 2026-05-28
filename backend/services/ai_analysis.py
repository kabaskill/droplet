import json
import os
from typing import Any


class AiAnalysisError(RuntimeError):
    pass


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
    role = _analysis_role(roles or [], payload.get("requestedRole"))
    api_key = os.getenv("GEMINI_API_KEY")

    if not api_key:
        raise AiAnalysisError("Gemini API key is not configured")

    from google import genai

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            contents=_gemini_prompt(payload, role),
            config={
                "response_mime_type": "application/json",
            },
        )
    except Exception as exc:
        raise AiAnalysisError("Gemini analysis request failed") from exc

    text = response.text or ""

    if not text:
        raise AiAnalysisError("Gemini returned an empty analysis")

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError as exc:
        raise AiAnalysisError("Gemini returned invalid analysis JSON") from exc

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


def _analysis_role(roles: list[str], requested_role: Any = None) -> str:
    if requested_role in {"citizen", "analyst", "municipality"}:
        if requested_role in roles:
            return str(requested_role)

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


def _risk_level(value: Any) -> str:
    normalized = str(value or "medium").lower()

    if normalized in {"high", "low", "medium"}:
        return normalized

    return "medium"


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []

    return [str(item) for item in value if item]
