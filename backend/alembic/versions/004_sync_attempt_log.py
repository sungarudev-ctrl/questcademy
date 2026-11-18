"""004_sync_attempt_log

Revision ID: 004_sync
Revises: 003_schema_v2
Create Date: 2026-11-18 22:00:00.000000

Source of truth: docs/sync-contract.md; docs/04-learning-engine-spec-v2.md §2, §11 (I-8)
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "004_sync"
down_revision: Union[str, None] = "003_schema_v2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "attempts",
        sa.Column("attempt_id", sa.String(36), primary_key=True),
        sa.Column("learner_id", sa.String(36), nullable=False),
        sa.Column("node_id", sa.String(100), sa.ForeignKey("skill_nodes.node_id"), nullable=False),
        sa.Column("item_id", sa.String(36), sa.ForeignKey("items.item_id"), nullable=False),
        sa.Column("difficulty_tier", sa.Integer(), nullable=False),
        sa.Column("correct", sa.Boolean(), nullable=False),
        sa.Column("partial_credit", sa.String(8), nullable=True),
        sa.Column("selected_option", sa.String(100), nullable=True),
        sa.Column("misconception_id", sa.String(100), nullable=True),
        sa.Column("latency_ms", sa.Integer(), nullable=True),
        sa.Column("hints_used", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.String(36), nullable=True),
        sa.Column("occurred_at", sa.String(32), nullable=False),
        sa.Column("occurred_at_client", sa.String(32), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("server_sequence", sa.Integer(), nullable=False, unique=True),
        sa.Column("is_review", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_placement", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_exam", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("flagged", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("included_by_lead", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("excluded_reason", sa.String(40), nullable=True),
        sa.CheckConstraint("hints_used BETWEEN 0 AND 3", name="check_attempts_hints"),
        sa.CheckConstraint("difficulty_tier IN (1,2,3)", name="check_attempts_tier"),
    )
    op.create_index("idx_attempts_learner_node", "attempts", ["learner_id", "node_id", "occurred_at"])

    op.create_table(
        "learner_node_state",
        sa.Column("learner_id", sa.String(36), primary_key=True),
        sa.Column("node_id", sa.String(100), sa.ForeignKey("skill_nodes.node_id"), primary_key=True),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("ability_elo", sa.Float(), nullable=False),
        sa.Column("state", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_table(
        "learner_sync_cursor",
        sa.Column("learner_id", sa.String(36), primary_key=True),
        sa.Column("sync_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("latest_attempt_at", sa.String(32), nullable=True),
    )
    op.create_table(
        "sync_anomalies",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("learner_id", sa.String(36), nullable=False),
        sa.Column("node_id", sa.String(100), nullable=True),
        sa.Column("kind", sa.String(30), nullable=False),
        sa.Column("local_state", sa.JSON(), nullable=True),
        sa.Column("server_state", sa.JSON(), nullable=True),
        sa.Column("attempt_ids", sa.JSON(), nullable=False),
        sa.Column("sync_no", sa.Integer(), nullable=False),
        sa.Column("consecutive_count", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("incident", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("resolution", sa.String(20), nullable=False, server_default="open"),
        sa.Column("resolution_reason", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.CheckConstraint(
            "kind IN ('state_mismatch','clock_future','clock_past','retired_item')",
            name="check_sync_anomaly_kind",
        ),
        sa.CheckConstraint(
            "resolution IN ('open','resolved','false_positive','escalated')",
            name="check_sync_anomaly_resolution",
        ),
    )
    op.create_index("idx_sync_anomalies_learner_node", "sync_anomalies", ["learner_id", "node_id"])


def downgrade() -> None:
    op.drop_index("idx_sync_anomalies_learner_node", table_name="sync_anomalies")
    op.drop_table("sync_anomalies")
    op.drop_table("learner_sync_cursor")
    op.drop_table("learner_node_state")
    op.drop_index("idx_attempts_learner_node", table_name="attempts")
    op.drop_table("attempts")
