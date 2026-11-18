"""Sync / attempt-log models.

Source of truth:
- docs/sync-contract.md
- docs/04-learning-engine-spec-v2.md §2, §11 (I-8)
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    func,
)
from sqlalchemy.types import JSON
from sqlalchemy.dialects.postgresql import JSONB

from backend.app.db.base import Base

JsonType = JSON().with_variant(JSONB, "postgresql")


class AttemptRecord(Base):
    """Append-only canonical attempt log. attempt_id is the idempotency key (I-8)."""

    __tablename__ = "attempts"

    attempt_id = Column(String(36), primary_key=True)  # client UUID v4; PK == DB-level uniqueness
    learner_id = Column(String(36), nullable=False)
    node_id = Column(String(100), ForeignKey("skill_nodes.node_id"), nullable=False)
    item_id = Column(String(36), ForeignKey("items.item_id"), nullable=False)
    difficulty_tier = Column(Integer, nullable=False)
    correct = Column(Boolean, nullable=False)
    partial_credit = Column(String(8), nullable=True)
    selected_option = Column(String(100), nullable=True)
    misconception_id = Column(String(100), nullable=True)
    latency_ms = Column(Integer, nullable=True)
    hints_used = Column(Integer, nullable=False)
    session_id = Column(String(36), nullable=True)
    occurred_at = Column(String(32), nullable=False)  # ISO-8601 UTC, possibly rewritten (clock skew)
    occurred_at_client = Column(String(32), nullable=False)  # as sent
    received_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    server_sequence = Column(Integer, nullable=False, unique=True)
    is_review = Column(Boolean, nullable=False, default=False)
    is_placement = Column(Boolean, nullable=False, default=False)
    is_exam = Column(Boolean, nullable=False, default=False)
    flagged = Column(Boolean, nullable=False, default=False)
    included_by_lead = Column(Boolean, nullable=False, default=False)
    excluded_reason = Column(String(40), nullable=True)  # 'retired_item' | NULL

    __table_args__ = (
        CheckConstraint("hints_used BETWEEN 0 AND 3", name="check_attempts_hints"),
        CheckConstraint("difficulty_tier IN (1,2,3)", name="check_attempts_tier"),
        Index("idx_attempts_learner_node", "learner_id", "node_id", "occurred_at"),
    )


class LearnerNodeStateRecord(Base):
    """Server-derived engine NodeState. Never written by pin migration (I-11)."""

    __tablename__ = "learner_node_state"

    learner_id = Column(String(36), primary_key=True)
    node_id = Column(String(100), ForeignKey("skill_nodes.node_id"), primary_key=True)
    status = Column(String(20), nullable=False)
    ability_elo = Column(Float, nullable=False)
    state = Column(JsonType, nullable=False)  # full engine NodeState, canonical source
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class LearnerSyncCursor(Base):
    __tablename__ = "learner_sync_cursor"

    learner_id = Column(String(36), primary_key=True)
    sync_count = Column(Integer, nullable=False, default=0)
    latest_attempt_at = Column(String(32), nullable=True)


class SyncAnomaly(Base):
    """Local-vs-server disagreement or clock rewrite (docs/sync-contract.md §7)."""

    __tablename__ = "sync_anomalies"

    id = Column(String(36), primary_key=True)
    learner_id = Column(String(36), nullable=False)
    node_id = Column(String(100), nullable=True)
    kind = Column(String(30), nullable=False)
    local_state = Column(JsonType, nullable=True)
    server_state = Column(JsonType, nullable=True)
    attempt_ids = Column(JsonType, nullable=False, default=list)
    sync_no = Column(Integer, nullable=False)
    consecutive_count = Column(Integer, nullable=False, default=1)
    incident = Column(Boolean, nullable=False, default=False)
    resolution = Column(String(20), nullable=False, default="open")
    resolution_reason = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "kind IN ('state_mismatch','clock_future','clock_past','retired_item')",
            name="check_sync_anomaly_kind",
        ),
        CheckConstraint(
            "resolution IN ('open','resolved','false_positive','escalated')",
            name="check_sync_anomaly_resolution",
        ),
        Index("idx_sync_anomalies_learner_node", "learner_id", "node_id"),
    )
