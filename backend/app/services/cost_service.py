"""Cost tracking service for Gemini AI calls.

Source of truth:
- docs/plan.md §3.6
- Task 8 §8.8
"""

import uuid
from decimal import Decimal
from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend.app.db.base import get_db_context
from backend.app.db.models.framework import GeminiCall

# Pricing per million tokens (USD)
# gemini-2.5-pro: $1.25 / 1M input, $5.00 / 1M output
# gemini-2.5-flash: $0.075 / 1M input, $0.30 / 1M output
PRICING_PER_TOKEN = {
    "gemini-2.5-pro": {
        "input": Decimal("0.00000125"),
        "output": Decimal("0.00000500"),
    },
    "gemini-2.5-flash": {
        "input": Decimal("0.000000075"),
        "output": Decimal("0.000000300"),
    },
}

DEFAULT_PRICING = {
    "input": Decimal("0.00000100"),
    "output": Decimal("0.00000300"),
}


def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> Decimal:
    """Calculate the estimated USD cost for a Gemini API call."""
    pricing = PRICING_PER_TOKEN.get(model, DEFAULT_PRICING)
    cost = (Decimal(input_tokens) * pricing["input"]) + (Decimal(output_tokens) * pricing["output"])
    return round(cost, 6)


def record_call(
    model: str,
    prompt_version: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: int,
    pipeline_name: str,
    framework_id: Optional[str] = None,
    job_id: Optional[str] = None,
    db: Optional[Session] = None,
) -> GeminiCall:
    """Record a Gemini call entry into the gemini_calls table."""
    cost = estimate_cost(model, input_tokens, output_tokens)

    def _persist(session: Session) -> GeminiCall:
        record = GeminiCall(
            call_id=str(uuid.uuid4()),
            model=model,
            prompt_version=prompt_version,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            cost_estimate=cost,
            latency_ms=latency_ms,
            framework_id=framework_id,
            pipeline_name=pipeline_name,
            job_id=job_id,
        )
        session.add(record)
        session.commit()
        session.refresh(record)
        return record

    if db is not None:
        return _persist(db)
    try:
        with get_db_context() as session:
            return _persist(session)
    except Exception:
        # If default DB has not run migrations yet, ensure tables exist
        from backend.app.db.base import Base, engine
        Base.metadata.create_all(engine)
        with get_db_context() as session:
            return _persist(session)



def cost_by_framework(framework_id: str, db: Optional[Session] = None) -> Dict[str, Any]:
    """Get aggregated cost and token breakdown for a specific curriculum framework."""
    def _query(session: Session) -> Dict[str, Any]:
        rows = (
            session.query(
                func.count(GeminiCall.call_id).label("total_calls"),
                func.sum(GeminiCall.input_tokens).label("total_input_tokens"),
                func.sum(GeminiCall.output_tokens).label("total_output_tokens"),
                func.sum(GeminiCall.cost_estimate).label("total_cost_usd"),
            )
            .filter(GeminiCall.framework_id == framework_id)
            .first()
        )
        return {
            "framework_id": framework_id,
            "total_calls": rows.total_calls or 0,
            "total_input_tokens": rows.total_input_tokens or 0,
            "total_output_tokens": rows.total_output_tokens or 0,
            "total_cost_usd": float(rows.total_cost_usd or 0.0),
        }

    if db is not None:
        return _query(db)
    with get_db_context() as session:
        return _query(session)


def cost_by_pipeline(pipeline_name: str, db: Optional[Session] = None) -> Dict[str, Any]:
    """Get aggregated cost and token breakdown for a specific pipeline."""
    def _query(session: Session) -> Dict[str, Any]:
        rows = (
            session.query(
                func.count(GeminiCall.call_id).label("total_calls"),
                func.sum(GeminiCall.input_tokens).label("total_input_tokens"),
                func.sum(GeminiCall.output_tokens).label("total_output_tokens"),
                func.sum(GeminiCall.cost_estimate).label("total_cost_usd"),
            )
            .filter(GeminiCall.pipeline_name == pipeline_name)
            .first()
        )
        return {
            "pipeline_name": pipeline_name,
            "total_calls": rows.total_calls or 0,
            "total_input_tokens": rows.total_input_tokens or 0,
            "total_output_tokens": rows.total_output_tokens or 0,
            "total_cost_usd": float(rows.total_cost_usd or 0.0),
        }

    if db is not None:
        return _query(db)
    with get_db_context() as session:
        return _query(session)


def get_cost_breakdown(db: Optional[Session] = None) -> Dict[str, Any]:
    """Admin breakdown of all AI generation costs grouped by pipeline and framework."""
    def _query(session: Session) -> Dict[str, Any]:
        pipeline_breakdown = (
            session.query(
                GeminiCall.pipeline_name,
                func.count(GeminiCall.call_id).label("calls"),
                func.sum(GeminiCall.input_tokens).label("input_tokens"),
                func.sum(GeminiCall.output_tokens).label("output_tokens"),
                func.sum(GeminiCall.cost_estimate).label("cost_usd"),
            )
            .group_by(GeminiCall.pipeline_name)
            .all()
        )

        framework_breakdown = (
            session.query(
                GeminiCall.framework_id,
                func.count(GeminiCall.call_id).label("calls"),
                func.sum(GeminiCall.input_tokens).label("input_tokens"),
                func.sum(GeminiCall.output_tokens).label("output_tokens"),
                func.sum(GeminiCall.cost_estimate).label("cost_usd"),
            )
            .filter(GeminiCall.framework_id.isnot(None))
            .group_by(GeminiCall.framework_id)
            .all()
        )

        total_row = (
            session.query(
                func.count(GeminiCall.call_id).label("total_calls"),
                func.sum(GeminiCall.input_tokens).label("total_input_tokens"),
                func.sum(GeminiCall.output_tokens).label("total_output_tokens"),
                func.sum(GeminiCall.cost_estimate).label("total_cost_usd"),
            )
            .first()
        )

        return {
            "totals": {
                "calls": total_row.total_calls or 0,
                "input_tokens": total_row.total_input_tokens or 0,
                "output_tokens": total_row.total_output_tokens or 0,
                "cost_usd": float(total_row.total_cost_usd or 0.0),
            },
            "by_pipeline": [
                {
                    "pipeline_name": r.pipeline_name,
                    "calls": r.calls,
                    "input_tokens": r.input_tokens,
                    "output_tokens": r.output_tokens,
                    "cost_usd": float(r.cost_usd),
                }
                for r in pipeline_breakdown
            ],
            "by_framework": [
                {
                    "framework_id": r.framework_id,
                    "calls": r.calls,
                    "input_tokens": r.input_tokens,
                    "output_tokens": r.output_tokens,
                    "cost_usd": float(r.cost_usd),
                }
                for r in framework_breakdown
            ],
        }

    if db is not None:
        return _query(db)
    with get_db_context() as session:
        return _query(session)
