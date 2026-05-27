import os
import json
from typing import Any


def local_analysis(snapshot: dict[str, Any]) -> dict:
    evaporation = float(snapshot.get("evaporationPressure", 0))
    visibility = float(snapshot.get("visibilityScore", 0))
    water_level = float(snapshot.get("waterLevel", 0))
    elevated = evaporation > 58 or water_level > 72 or visibility < 64

    return {
        "recommendations": (
            [
                "Keep this region in the analyst review queue.",
                "Compare water-level movement against rainfall before escalation.",
                "Refresh the snapshot if confidence drops below 70 percent.",
            ]
            if elevated
            else [
                "Maintain normal monitoring cadence.",
                "Recheck source freshness during the next ingestion cycle.",
            ]
        ),
        "riskLevel": "medium" if elevated else "low",
        "summary": (
            "The snapshot shows elevated operational pressure and should remain visible."
            if elevated
            else "The snapshot is stable enough for normal operational monitoring."
        ),
    }


def analyze_snapshot_payload(snapshot: dict[str, Any]) -> dict:
    api_key = os.getenv("OPENAI_API_KEY")

    if not api_key:
        return local_analysis(snapshot)

    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        messages=[
            {
                "content": (
                    "Analyze this environmental reservoir snapshot. Return JSON with "
                    "summary, riskLevel, and recommendations."
                ),
                "role": "system",
            },
            {"content": json.dumps(snapshot), "role": "user"},
        ],
        model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
        response_format={"type": "json_object"},
    )

    text = response.choices[0].message.content or ""

    if not text:
        return local_analysis(snapshot)

    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {
            "recommendations": [text],
            "riskLevel": "medium",
            "summary": "OpenAI analysis completed.",
        }

    return {
        "recommendations": parsed.get("recommendations", []),
        "riskLevel": parsed.get("riskLevel", "medium"),
        "summary": parsed.get("summary", "OpenAI analysis completed."),
    }
