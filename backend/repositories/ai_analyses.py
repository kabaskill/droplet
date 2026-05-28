from sqlalchemy import desc, select

from backend.models.database import session_scope
from backend.models.entities import AiAnalysisRecord


def save_ai_analysis(
    request_payload: dict,
    analysis_payload: dict,
    user: dict,
) -> dict:
    scope = request_payload.get("scope") if isinstance(request_payload, dict) else {}
    snapshots = request_payload.get("snapshots")
    regions = request_payload.get("regions")
    record = AiAnalysisRecord(
        analysis_payload=analysis_payload,
        region_count=len(regions) if isinstance(regions, list) else 0,
        request_payload=request_payload,
        requested_role=str(request_payload.get("requestedRole") or "citizen"),
        scope_id=str(scope.get("id") or "unknown") if isinstance(scope, dict) else "unknown",
        scope_label=str(scope.get("label") or "Selected scope")
        if isinstance(scope, dict)
        else "Selected scope",
        scope_type=str(scope.get("type") or "scope") if isinstance(scope, dict) else "scope",
        user_email=user.get("email"),
        user_name=user.get("name"),
        user_subject=str(user.get("subject") or ""),
    )

    if record.region_count == 0 and isinstance(snapshots, list):
        record.region_count = len(snapshots)

    with session_scope() as session:
        session.add(record)
        session.flush()
        session.refresh(record)

        return ai_analysis_to_read_model(record)


def list_ai_analyses(user_subject: str, limit: int = 20) -> list[dict]:
    with session_scope() as session:
        records = session.scalars(
            select(AiAnalysisRecord)
            .where(AiAnalysisRecord.user_subject == user_subject)
            .order_by(desc(AiAnalysisRecord.created_at))
            .limit(limit)
        ).all()

        return [ai_analysis_to_read_model(record) for record in records]


def ai_analysis_to_read_model(record: AiAnalysisRecord) -> dict:
    return {
        "analysis": record.analysis_payload,
        "createdAt": record.created_at.isoformat(),
        "id": record.id,
        "regionCount": record.region_count,
        "request": record.request_payload,
        "requestedRole": record.requested_role,
        "scope": {
            "id": record.scope_id,
            "label": record.scope_label,
            "type": record.scope_type,
        },
        "user": {
            "email": record.user_email,
            "name": record.user_name,
            "subject": record.user_subject,
        },
    }
