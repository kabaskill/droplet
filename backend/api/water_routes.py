from datetime import UTC, datetime, timedelta

from flask import Blueprint, g, jsonify, request

from backend.auth.decorators import require_auth
from backend.models.database import session_scope
from backend.repositories.water import (
    DISCOVERY_REGIONS,
    current_conditions,
    observation_history,
)

water_bp = Blueprint("water", __name__)


@water_bp.after_request
def prevent_shared_history_cache(response):
    # Account responses must never enter public intermediary/browser persistence caches.
    response.headers["Cache-Control"] = "private, no-store"
    response.headers["Vary"] = "Authorization"
    return response


@water_bp.get("/regions")
def regions():
    now = datetime.now(UTC)
    with session_scope() as session:
        return jsonify(
            [
                current_conditions(session, region_id, now)
                for region_id in DISCOVERY_REGIONS
            ]
        )


@water_bp.get("/regions/<region_id>")
def region(region_id):
    if region_id not in DISCOVERY_REGIONS:
        return jsonify(error="Unknown region"), 404
    with session_scope() as session:
        return jsonify(current_conditions(session, region_id, datetime.now(UTC)))


@water_bp.get("/regions/<region_id>/recent")
def recent(region_id):
    if region_id not in DISCOVERY_REGIONS:
        return jsonify(error="Unknown region"), 404
    # Ignore no user-controlled historical offsets: guests can only access the latest day.
    if request.args:
        return jsonify(error="Recent history always covers the last 24 hours"), 400
    end = datetime.now(UTC)
    with session_scope() as session:
        return jsonify(
            observation_history(
                session,
                region_id,
                end - timedelta(hours=24),
                end,
                "hour",
                details=False,
            )
        )


@water_bp.get("/regions/<region_id>/details")
@require_auth()
def details(region_id):
    if region_id not in DISCOVERY_REGIONS:
        return jsonify(error="Unknown region"), 404
    with session_scope() as session:
        return jsonify(
            current_conditions(session, region_id, datetime.now(UTC), details=True)
        )


@water_bp.get("/regions/<region_id>/history")
@require_auth()
def history(region_id):
    if region_id not in DISCOVERY_REGIONS:
        return jsonify(error="Unknown region"), 404
    try:
        start, end, interval = history_range(request.args, datetime.now(UTC))
    except ValueError as error:
        return jsonify(error=str(error)), 400
    with session_scope() as session:
        return jsonify(observation_history(session, region_id, start, end, interval))


def history_range(args, now):
    if set(args) - {"start", "end", "interval"}:
        raise ValueError("Unsupported history parameter")
    interval = args.get("interval", "hour")
    if interval not in {"hour", "day"}:
        raise ValueError("interval must be hour or day")

    def parse(value):
        stamp = datetime.fromisoformat(value.replace("Z", "+00:00"))
        if stamp.tzinfo is None:
            raise ValueError("History dates must include a timezone")
        return stamp.astimezone(UTC)

    try:
        end = parse(args["end"]) if "end" in args else now
        start = parse(args["start"]) if "start" in args else end - timedelta(days=7)
    except (ValueError, TypeError):
        raise ValueError("Use ISO timestamps with timezone for start and end") from None
    max_days = 31 if interval == "hour" else 366
    if end > now or start >= end or end - start > timedelta(days=max_days):
        raise ValueError(f"Choose a past range of at most {max_days} days")
    return start, end, interval


@water_bp.route("/places", methods=["GET"])
@require_auth()
def places():
    from sqlalchemy import select
    from backend.models.water import SavedPlace
    with session_scope() as session:
        rows = session.scalars(select(SavedPlace).where(SavedPlace.user_subject == g.current_user["subject"])).all()
        return jsonify([{"regionId": row.region_id, "isDefault": row.is_default} for row in rows])


@water_bp.route("/places/<region_id>", methods=["PUT", "DELETE"])
@require_auth()
def save_place(region_id):
    from sqlalchemy import select, update, text
    from sqlalchemy.dialects.postgresql import insert as pg_insert
    from sqlalchemy.dialects.sqlite import insert as sqlite_insert
    from backend.models.water import SavedPlace
    if region_id not in DISCOVERY_REGIONS:
        return jsonify(error="Unknown region"), 404
    body = request.get_json(silent=True) or {}
    if not isinstance(body, dict) or set(body) - {"isDefault"} or ("isDefault" in body and not isinstance(body["isDefault"], bool)):
        return jsonify(error="isDefault must be a boolean"), 400
    subject = g.current_user["subject"]
    with session_scope() as session:
        dialect = session.get_bind().dialect.name
        if dialect == "postgresql":
            session.execute(text("SELECT pg_advisory_xact_lock(hashtextextended(:subject, 0))"), {"subject": subject})
        row = session.get(SavedPlace, (subject, region_id))
        if request.method == "DELETE":
            if row:
                session.delete(row)
            return jsonify(status="removed")
        default = body.get("isDefault", row.is_default if row else False)
        if default:
            session.execute(update(SavedPlace).where(SavedPlace.user_subject == subject).values(is_default=False))
        insert = pg_insert if dialect == "postgresql" else sqlite_insert
        statement = insert(SavedPlace).values(user_subject=subject, region_id=region_id, is_default=default)
        session.execute(statement.on_conflict_do_update(index_elements=["user_subject", "region_id"], set_={"is_default": default}))
        return jsonify(regionId=region_id, isDefault=default)
