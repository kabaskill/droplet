import os
from functools import lru_cache
from typing import Any

import jwt
from jwt import PyJWKClient


class AuthError(Exception):
    pass


def auth_mode() -> str:
    mode = os.getenv("AUTH_MODE", "demo").lower()

    if mode not in {"demo", "keycloak"}:
        return "demo"

    return mode


def auth_config() -> dict[str, str]:
    return {
        "authMode": auth_mode(),
        "clientId": os.getenv("KEYCLOAK_CLIENT_ID", "droplet-frontend"),
        "realm": os.getenv("KEYCLOAK_REALM", "droplet"),
        "url": public_keycloak_url(),
    }


def demo_user() -> dict[str, Any]:
    return {
        "email": "analyst@droplet.local",
        "name": "Droplet Analyst",
        "roles": ["citizen", "analyst", "municipality"],
        "subject": "demo-user",
    }


def internal_keycloak_url() -> str:
    return os.getenv("KEYCLOAK_URL", "http://localhost:8080").rstrip("/")


def public_keycloak_url() -> str:
    return os.getenv("KEYCLOAK_PUBLIC_URL", internal_keycloak_url()).rstrip("/")


@lru_cache(maxsize=1)
def jwks_client() -> PyJWKClient:
    realm = os.getenv("KEYCLOAK_REALM", "droplet")
    return PyJWKClient(
        f"{internal_keycloak_url()}/realms/{realm}/protocol/openid-connect/certs"
    )


def validate_access_token(token: str) -> dict[str, Any]:
    realm = os.getenv("KEYCLOAK_REALM", "droplet")
    client_id = os.getenv("KEYCLOAK_CLIENT_ID", "droplet-frontend")
    issuer = f"{public_keycloak_url()}/realms/{realm}"

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
    except (jwt.InvalidAudienceError, jwt.MissingRequiredClaimError):
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
