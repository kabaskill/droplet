from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar, cast

from flask import g, jsonify, request

from backend.auth.keycloak import AuthError, auth_mode, demo_user, validate_access_token

F = TypeVar("F", bound=Callable[..., Any])


def require_auth(roles: list[str] | None = None) -> Callable[[F], F]:
    required_roles = set(roles or [])

    def decorator(view: F) -> F:
        @wraps(view)
        def wrapped(*args: Any, **kwargs: Any):
            if auth_mode() == "demo":
                current_user = demo_user()
            else:
                auth_header = request.headers.get("Authorization", "")
                scheme, _, token = auth_header.partition(" ")

                if scheme.lower() != "bearer" or not token:
                    return jsonify({"error": "missing bearer token"}), 401

                try:
                    current_user = validate_access_token(token)
                except AuthError as exc:
                    return jsonify({"error": str(exc)}), 401

            if required_roles and not required_roles.intersection(current_user["roles"]):
                return jsonify({"error": "insufficient role"}), 403

            g.current_user = current_user
            return view(*args, **kwargs)

        return cast(F, wrapped)

    return decorator
