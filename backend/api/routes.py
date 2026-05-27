from flask import Blueprint, g, jsonify, request

from backend.auth.decorators import require_auth
from backend.auth.keycloak import auth_config as build_auth_config
from backend.cache.redis_client import read_through_json
from backend.repositories.regions import list_regions
from backend.repositories.snapshots import latest_snapshots, snapshot_history
from backend.services.ai_analysis import analyze_snapshot_payload
from backend.services.analytics import build_analytics_summary
from backend.services.forecast import build_forecast_outlook
from backend.services.ingestion import enqueue_snapshot_refresh, snapshot_refresh_status
from backend.services.ingestion_status import last_ingestion_status
from backend.services.source_health import build_source_health

api_bp = Blueprint("api", __name__)


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
        read_through_json("droplet:regions:v1", 3600, list_regions)
    )


@api_bp.get("/snapshots")
@require_auth()
def snapshots():
    return jsonify(
        read_through_json("droplet:snapshots:latest:v1", 120, latest_snapshots)
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
            f"droplet:snapshots:history:{region_id}:limit:{history_limit}:v1",
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
            "droplet:analytics:summary:v1",
            120,
            build_analytics_summary,
        )
    )


@api_bp.get("/sources/health")
@require_auth(roles=["analyst", "municipality"])
def source_health():
    return jsonify(
        read_through_json(
            "droplet:sources:health:v1",
            120,
            build_source_health,
        )
    )


@api_bp.get("/forecasts/outlook")
@require_auth(roles=["analyst", "municipality"])
def forecast_outlook():
    return jsonify(
        read_through_json(
            "droplet:forecasts:outlook:v1",
            900,
            build_forecast_outlook,
        )
    )


@api_bp.post("/ai/analyze")
@require_auth(roles=["analyst", "municipality"])
def ai_analyze():
    payload = request.get_json(silent=True) or {}
    snapshot = payload.get("snapshot")

    if not isinstance(snapshot, dict):
        return jsonify({"error": "snapshot is required"}), 400

    return jsonify(analyze_snapshot_payload(snapshot))


def _snapshot_history_limit(roles: list[str], requested_limit: str | None) -> int:
    maximum_limit = 30 if "municipality" in roles else 14
    default_limit = maximum_limit

    if requested_limit is None:
        return default_limit

    try:
        parsed_limit = int(requested_limit)
    except ValueError:
        return default_limit

    return max(1, min(parsed_limit, maximum_limit))
