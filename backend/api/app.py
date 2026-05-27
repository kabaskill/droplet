import os

from flask import Flask, jsonify
from flask_cors import CORS

from backend.api.routes import api_bp
from backend.models.database import init_database
from backend.repositories.seed import seed_demo_data


def create_app() -> Flask:
    app = Flask(__name__)
    origins = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",")
    CORS(app, resources={r"/api/*": {"origins": origins}})

    init_database()
    seed_demo_data()

    app.register_blueprint(api_bp, url_prefix="/api")

    @app.get("/healthz")
    def healthz():
        return jsonify({"status": "ok", "service": "droplet-backend"})

    return app
