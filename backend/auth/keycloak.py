import os
from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient


class AuthError(Exception):
    pass


def auth_mode() -> str:
    return os.getenv("AUTH_MODE", "demo")


def demo_user() -> dict[str, Any]:
    return {
        "email": "analyst@droplet.local",
        "name": "Droplet Analyst",
        "roles": ["citizen", "analyst", "municipality"],
        "subject": "demo-user",
    }


@lru_cache(maxsize=1)
def jwks_client() -> PyJWKClient:
    keycloak_url = os.getenv("KEYCLOAK_URL", "http://localhost:8080").rstrip("/")
    realm = os.getenv("KEYCLOAK_REALM", "droplet")
    return PyJWKClient(f"{keycloak_url}/realms/{realm}/protocol/openid-connect/certs")


def validate_access_token(token: str) -> dict[str, Any]:
    keycloak_url = os.getenv("KEYCLOAK_URL", "http://localhost:8080").rstrip("/")
    realm = os.getenv("KEYCLOAK_REALM", "droplet")
    client_id = os.getenv("KEYCLOAK_CLIENT_ID", "droplet-frontend")
    issuer = f"{keycloak_url}/realms/{realm}"

    try:
        signing_key = jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=issuer,
            options={"verify_exp": True},
        )
    except jwt.InvalidAudienceError:
        signing_key = jwks_client().get_signing_key_from_jwt(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer=issuer,
            options={"verify_aud": False, "verify_exp": True},
        )
    except jwt.PyJWTError as exc:
        raise AuthError(str(exc)) from exc

    roles = set(payload.get("realm_access", {}).get("roles", []))
    roles.update(
        payload.get("resource_access", {})
        .get(client_id, {})
        .get("roles", [])
    )

    return {
        "email": payload.get("email"),
        "name": payload.get("name") or payload.get("preferred_username") or "Droplet user",
        "roles": sorted(roles.intersection({"citizen", "analyst", "municipality"})),
        "subject": payload.get("sub"),
    }
