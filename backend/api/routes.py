from flask import Blueprint, g, jsonify, request

from backend.auth.decorators import require_auth
from backend.auth.keycloak import auth_config as build_auth_config
from backend.cache.keys import cache_key
from backend.cache.redis_client import (
    read_stale_while_revalidate_json_with_metadata,
    read_through_json,
)
from backend.repositories.ai_analyses import list_ai_analyses, save_ai_analysis
from backend.repositories.regions import list_regions
from backend.repositories.snapshots import latest_snapshots, snapshot_history
from backend.services.ai_analysis import (
    AiAnalysisError,
    analyze_environment_payload,
    analyze_snapshot_payload,
)
from backend.services.analytics import build_analytics_summary
from backend.services.climate_context import (
    CLIMATE_CONTEXT_FRESH_TTL_SECONDS,
    CLIMATE_CONTEXT_STALE_TTL_SECONDS,
    UnknownClimateRegionError,
    build_region_climate_context,
    climate_context_cache_key,
)
from backend.services.forecast import build_forecast_outlook
from backend.services.ingestion import enqueue_snapshot_refresh, snapshot_refresh_status
from backend.services.ingestion_status import last_ingestion_status
from backend.services.climate_sources.debug import build_source_normalization_debug
from backend.services.source_health import build_source_health

api_bp = Blueprint("api", __name__)
DEFAULT_DEBUG_REGION_LIMIT = 1


@api_bp.get("/auth/config")
def auth_config():
    return jsonify(build_auth_config())


@api_bp.get("/auth/me")
@require_auth()
def auth_me():
    return jsonify(g.current_user)


@api_bp.get("/regions")
@require_auth()
def regions():
    return jsonify(
        read_through_json(cache_key("regions"), 3600, list_regions)
    )


@api_bp.get("/snapshots")
@require_auth()
def snapshots():
    return jsonify(
        read_through_json(cache_key("snapshots:latest"), 120, latest_snapshots)
    )


@api_bp.get("/snapshots/<region_id>")
@require_auth()
def region_snapshots(region_id: str):
    history_limit = _snapshot_history_limit(
        g.current_user["roles"],
        request.args.get("limit"),
    )

    return jsonify(
        read_through_json(
            cache_key(f"snapshots:history:{region_id}:limit:{history_limit}"),
            120,
            lambda: snapshot_history(region_id, limit=history_limit),
        )
    )


@api_bp.post("/snapshots/refresh")
@require_auth(roles=["analyst", "municipality"])
def refresh_snapshots():
    return jsonify(enqueue_snapshot_refresh()), 202


@api_bp.get("/snapshots/refresh/<task_id>")
@require_auth(roles=["analyst", "municipality"])
def refresh_snapshot_status(task_id: str):
    return jsonify(snapshot_refresh_status(task_id))


@api_bp.get("/ingestion/status")
@require_auth(roles=["analyst", "municipality"])
def ingestion_status():
    return jsonify(last_ingestion_status())


@api_bp.get("/analytics/summary")
@require_auth(roles=["analyst", "municipality"])
def analytics_summary():
    return jsonify(
        read_through_json(
            cache_key("analytics:summary"),
            120,
            build_analytics_summary,
        )
    )


@api_bp.get("/sources/health")
@require_auth(roles=["analyst", "municipality"])
def source_health():
    return jsonify(
        read_through_json(
            cache_key("sources:health"),
            120,
            build_source_health,
        )
    )


@api_bp.get("/climate/regions/<region_id>")
@require_auth()
def region_climate(region_id: str):
    try:
        payload, cache_metadata = read_stale_while_revalidate_json_with_metadata(
            climate_context_cache_key(region_id),
            CLIMATE_CONTEXT_FRESH_TTL_SECONDS,
            CLIMATE_CONTEXT_STALE_TTL_SECONDS,
            lambda: build_region_climate_context(region_id),
        )
    except UnknownClimateRegionError as exc:
        return jsonify({"code": "unknown_region", "error": str(exc)}), 404

    return jsonify({**payload, "cache": cache_metadata})


@api_bp.get("/debug/source-normalization")
@api_bp.get("/debug/source-normalization/")
def source_normalization_debug():
    sections = request.args.get("sections")
    parsed_sections = _debug_sections(sections)
    region_id = request.args.get("regionId")

    try:
        payload = build_source_normalization_debug(
            region_limit=_debug_region_limit(request.args.get("limit"), region_id),
            region_id=region_id,
            sections=parsed_sections,
        )
    except ValueError as exc:
        return jsonify({"error": str(exc)}), 400

    return jsonify(payload)


def _debug_sections(requested_sections: str | None) -> list[str] | None:
    if requested_sections is None:
        return None

    return [
        section.strip().lower()
        for section in requested_sections.split(",")
        if section.strip()
    ]


def _debug_region_limit(
    requested_limit: str | None,
    region_id: str | None,
) -> int | None:
    if requested_limit is None:
        return None if region_id is not None else DEFAULT_DEBUG_REGION_LIMIT

    try:
        parsed_limit = int(requested_limit)
    except ValueError:
        raise ValueError("limit must be an integer") from None

    if parsed_limit < 1:
        raise ValueError("limit must be at least 1")

    return min(parsed_limit, 16)


@api_bp.get("/forecasts/outlook")
@require_auth(roles=["analyst", "municipality"])
def forecast_outlook():
    return jsonify(
        read_through_json(
            cache_key("forecasts:outlook"),
            900,
            build_forecast_outlook,
        )
    )


@api_bp.post("/ai/analyze")
@require_auth()
def ai_analyze():
    payload = request.get_json(silent=True) or {}

    if isinstance(payload.get("snapshots"), list):
        if not any(isinstance(snapshot, dict) for snapshot in payload["snapshots"]):
            return jsonify({"error": "at least one snapshot is required"}), 400

        try:
            analysis = analyze_environment_payload(payload, g.current_user["roles"])
        except AiAnalysisError as exc:
            return jsonify({"error": str(exc)}), 502

        save_ai_analysis(payload, analysis, g.current_user)

        return jsonify(analysis)

    snapshot = payload.get("snapshot")

    if not isinstance(snapshot, dict):
        return jsonify({"error": "snapshot or snapshots are required"}), 400

    analysis_payload = {
        "generatedAt": payload.get("generatedAt"),
        "requestedRole": payload.get("requestedRole"),
        "scope": {
            "id": snapshot.get("regionId", "selected-state"),
            "label": snapshot.get("regionId", "Selected state"),
            "type": "state",
        },
        "snapshots": [snapshot],
    }

    try:
        analysis = analyze_snapshot_payload(snapshot, g.current_user["roles"])
    except AiAnalysisError as exc:
        return jsonify({"error": str(exc)}), 502

    save_ai_analysis(analysis_payload, analysis, g.current_user)

    return jsonify(analysis)


@api_bp.get("/ai/analyses")
@require_auth()
def ai_analyses():
    return jsonify(
        list_ai_analyses(
            str(g.current_user.get("subject") or ""),
            limit=_analysis_history_limit(request.args.get("limit")),
        )
    )


def _snapshot_history_limit(roles: list[str], requested_limit: str | None) -> int:
    maximum_limit = 365 if "municipality" in roles else 90
    default_limit = maximum_limit

    if requested_limit is None:
        return default_limit

    try:
        parsed_limit = int(requested_limit)
    except ValueError:
        return default_limit

    return max(1, min(parsed_limit, maximum_limit))


def _analysis_history_limit(requested_limit: str | None) -> int:
    if requested_limit is None:
        return 20

    try:
        parsed_limit = int(requested_limit)
    except ValueError:
        return 20

    return max(1, min(parsed_limit, 50))
