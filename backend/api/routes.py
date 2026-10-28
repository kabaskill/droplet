"""Public identity configuration. Legacy computed-data endpoints are retired."""
from flask import Blueprint, g, jsonify
from backend.auth.decorators import require_auth
from backend.auth.keycloak import auth_config as build_auth_config

api_bp = Blueprint("api", __name__)

@api_bp.get("/auth/config")
def auth_config():
    return jsonify(build_auth_config())

@api_bp.get("/auth/me")
@require_auth()
def auth_me():
    return jsonify(g.current_user)

@api_bp.route("/<path:legacy_path>", methods=["GET", "POST"])
def retired(legacy_path):
    return jsonify(error="This endpoint has been retired. Use /api/water/regions for measured observations."), 410
