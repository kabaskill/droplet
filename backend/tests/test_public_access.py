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

    def test_core_api_routes_are_public_and_ai_routes_are_protected(self):
        routes_path = Path(__file__).parents[1] / "api" / "routes.py"
        module = ast.parse(routes_path.read_text())
        decorators = {
            node.name: [ast.unparse(decorator) for decorator in node.decorator_list]
            for node in module.body
            if isinstance(node, ast.FunctionDef)
        }

        for route_name in (
            "analytics_summary",
            "forecast_outlook",
            "ingestion_status",
            "region_climate",
            "region_snapshots",
            "regions",
            "snapshots",
            "source_health",
        ):
            self.assertNotIn("require_auth()", decorators[route_name])

        self.assertIn("require_auth()", decorators["ai_analyze"])
        self.assertIn("require_auth()", decorators["ai_analyses"])


if __name__ == "__main__":
    unittest.main()
