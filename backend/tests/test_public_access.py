import ast
import os
import unittest
from pathlib import Path

from flask import Flask

from backend.auth.decorators import require_auth
from backend.auth.keycloak import demo_user


class PublicAccessTest(unittest.TestCase):
    def setUp(self):
        self.previous_auth_mode = os.environ.get("AUTH_MODE")
        self.app = Flask(__name__)

        @self.app.get("/public")
        def public_route():
            return {"status": "ok"}

        @self.app.post("/account-only")
        @require_auth()
        def account_only_route():
            return {"status": "ok"}

        self.client = self.app.test_client()

    def tearDown(self):
        if self.previous_auth_mode is None:
            os.environ.pop("AUTH_MODE", None)
        else:
            os.environ["AUTH_MODE"] = self.previous_auth_mode

    def test_public_read_does_not_require_a_token(self):
        response = self.client.get("/public")

        self.assertEqual(200, response.status_code)
        self.assertEqual({"status": "ok"}, response.get_json())

    def test_ai_still_requires_an_account(self):
        os.environ["AUTH_MODE"] = "keycloak"

        response = self.client.post("/account-only", json={})

        self.assertEqual(401, response.status_code)
        self.assertEqual("unauthenticated", response.get_json()["code"])

    def test_demo_identity_has_no_roles(self):
        os.environ["AUTH_MODE"] = "demo"

        self.assertNotIn("roles", demo_user())

    def test_legacy_data_and_ai_routes_are_retired(self):
        from backend.api.routes import api_bp
        self.app.register_blueprint(api_bp, url_prefix="/api")
        for route in ("/snapshots", "/analytics/summary", "/forecasts/outlook", "/ai/analyses"):
            self.assertEqual(410, self.client.get("/api" + route).status_code)
        self.assertEqual(410, self.client.post("/api/ai/analyze", json={}).status_code)


if __name__ == "__main__":
    unittest.main()
