import os

from flask import Flask, jsonify
from flask_cors import CORS

from backend.api.routes import api_bp
from backend.api.water_routes import water_bp
from backend.models.database import init_database


def create_app() -> Flask:
    app = Flask(__name__)
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    CORS(app, resources={r"/api/*": {"origins": origins}})

    init_database()

    app.register_blueprint(api_bp, url_prefix="/api")
    app.register_blueprint(water_bp, url_prefix="/api/water")

    @app.get("/healthz")
    def healthz():
        return jsonify({"status": "ok", "service": "droplet-backend"})

    return app
