"""002_review_staging_and_pipelines

Revision ID: 002_review_staging
Revises: 001_country_framework
Create Date: 2026-09-15 12:00:00.000000

Source of truth:
- docs/plan.md §2.1, §2.4, §2.5, §2.10
- Task 8 §8.5, §8.6, §8.8
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "002_review_staging"
down_revision: Union[str, None] = "001_country_framework"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. skill_nodes
    op.create_table(
        "skill_nodes",
        sa.Column("node_id", sa.String(length=100), nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=False),
        sa.Column("topic", sa.String(length=100), nullable=False),
        sa.Column("subtopic", sa.String(length=100), nullable=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("learner_title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("grade_band_hint", sa.String(length=50), nullable=True),
        sa.Column("est_minutes", sa.Integer(), nullable=False),
        sa.Column("difficulty_elo", sa.Integer(), server_default="1200", nullable=False),
        sa.Column("representations", sa.JSON(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("superseded_by", sa.String(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("node_id"),
        sa.ForeignKeyConstraint(["superseded_by"], ["skill_nodes.node_id"], name="fk_skill_nodes_superseded_by"),
        sa.CheckConstraint("est_minutes BETWEEN 8 AND 15", name="check_skill_nodes_est_minutes"),
        sa.CheckConstraint("status IN ('draft','review','live','deprecated')", name="check_skill_nodes_status"),
    )

    # 2. skill_node_prerequisites
    op.create_table(
        "skill_node_prerequisites",
        sa.Column("node_id", sa.String(length=100), nullable=False),
        sa.Column("prerequisite_node_id", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=20), nullable=False),
        sa.PrimaryKeyConstraint("node_id", "prerequisite_node_id"),
        sa.ForeignKeyConstraint(["node_id"], ["skill_nodes.node_id"], name="fk_prereq_node_id"),
        sa.ForeignKeyConstraint(["prerequisite_node_id"], ["skill_nodes.node_id"], name="fk_prereq_prerequisite_node_id"),
        sa.CheckConstraint("type IN ('hard','soft')", name="check_skill_node_prerequisites_type"),
        sa.CheckConstraint("node_id <> prerequisite_node_id", name="check_skill_node_prerequisites_no_self_loop"),
    )

    # 3. skill_node_content
    op.create_table(
        "skill_node_content",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("node_id", sa.String(length=100), nullable=False),
        sa.Column("version", sa.Integer(), server_default="1", nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("learning_objectives", sa.JSON(), nullable=True),
        sa.Column("sections", sa.JSON(), nullable=False),
        sa.Column("worked_examples", sa.JSON(), nullable=False),
        sa.Column("key_formulas", sa.JSON(), nullable=True),
        sa.Column("analogies", sa.JSON(), nullable=True),
        sa.Column("common_mistakes", sa.JSON(), nullable=True),
        sa.Column("estimated_minutes", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("generated_by", sa.String(length=100), nullable=True),
        sa.Column("reviewed_by", sa.String(length=36), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("published_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["node_id"], ["skill_nodes.node_id"], name="fk_skill_node_content_node_id"),
        sa.UniqueConstraint("node_id", "version", name="uq_skill_node_content_node_version"),
        sa.CheckConstraint("status IN ('draft','review','published','archived')", name="check_skill_node_content_status"),
    )

    # 4. items
    op.create_table(
        "items",
        sa.Column("item_id", sa.String(length=36), nullable=False),
        sa.Column("node_id", sa.String(length=100), nullable=False),
        sa.Column("type", sa.String(length=50), nullable=False),
        sa.Column("difficulty_tier", sa.Integer(), nullable=False),
        sa.Column("difficulty_elo", sa.Integer(), server_default="1200", nullable=False),
        sa.Column("stem", sa.JSON(), nullable=False),
        sa.Column("payload", sa.JSON(), nullable=False),
        sa.Column("scoring", sa.JSON(), nullable=False),
        sa.Column("hints", sa.JSON(), nullable=False),
        sa.Column("worked_solution", sa.JSON(), nullable=False),
        sa.Column("locale_variants", sa.JSON(), nullable=True),
        sa.Column("offline_capable", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("media_bytes", sa.Integer(), server_default="0", nullable=False),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("a11y", sa.JSON(), nullable=False),
        sa.Column("p_value", sa.Numeric(precision=4, scale=3), nullable=True),
        sa.Column("discrimination", sa.Numeric(precision=4, scale=3), nullable=True),
        sa.Column("n_responses", sa.Integer(), server_default="0", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("item_id"),
        sa.ForeignKeyConstraint(["node_id"], ["skill_nodes.node_id"], name="fk_items_node_id"),
        sa.CheckConstraint("difficulty_tier IN (1,2,3)", name="check_items_difficulty_tier"),
        sa.CheckConstraint(
            "status IN ('draft','generated','tagged','reviewed','piloting','live','calibrating','calibrated','revision','retired')",
            name="check_items_status",
        ),
    )

    # 5. misconceptions
    op.create_table(
        "misconceptions",
        sa.Column("misconception_id", sa.String(length=100), nullable=False),
        sa.Column("domain", sa.String(length=100), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("learner_facing_name", sa.String(length=200), nullable=False),
        sa.Column("prevalence", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("remediation_id", sa.String(length=100), nullable=True),
        sa.Column("typical_origin", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("misconception_id"),
    )

    # 6. misconception_nodes
    op.create_table(
        "misconception_nodes",
        sa.Column("misconception_id", sa.String(length=100), nullable=False),
        sa.Column("node_id", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("misconception_id", "node_id"),
        sa.ForeignKeyConstraint(["misconception_id"], ["misconceptions.misconception_id"], name="fk_misconception_nodes_misc_id"),
        sa.ForeignKeyConstraint(["node_id"], ["skill_nodes.node_id"], name="fk_misconception_nodes_node_id"),
    )

    # 7. item_misconceptions
    op.create_table(
        "item_misconceptions",
        sa.Column("item_id", sa.String(length=36), nullable=False),
        sa.Column("misconception_id", sa.String(length=100), nullable=False),
        sa.Column("pattern", sa.JSON(), nullable=False),
        sa.PrimaryKeyConstraint("item_id", "misconception_id"),
        sa.ForeignKeyConstraint(["item_id"], ["items.item_id"], name="fk_item_misconceptions_item_id"),
        sa.ForeignKeyConstraint(["misconception_id"], ["misconceptions.misconception_id"], name="fk_item_misconceptions_misc_id"),
    )

    # 8. item_lifecycle_events
    op.create_table(
        "item_lifecycle_events",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("item_id", sa.String(length=36), nullable=False),
        sa.Column("from_status", sa.String(length=20), nullable=True),
        sa.Column("to_status", sa.String(length=20), nullable=False),
        sa.Column("reason", sa.Text(), nullable=True),
        sa.Column("actor_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["item_id"], ["items.item_id"], name="fk_item_lifecycle_events_item_id"),
    )

    # 9. Add review_status to item_localizations
    with op.batch_alter_table("item_localizations") as batch_op:
        batch_op.add_column(sa.Column("review_status", sa.String(length=20), server_default="pending", nullable=False))
        batch_op.create_check_constraint("check_item_localizations_review_status", "review_status IN ('pending','approved','rejected')")

    # 10. Add review_status to content_localizations
    with op.batch_alter_table("content_localizations") as batch_op:
        batch_op.add_column(sa.Column("review_status", sa.String(length=20), server_default="pending", nullable=False))
        batch_op.create_check_constraint("check_content_localizations_review_status", "review_status IN ('pending','approved','rejected')")

    # 11. objective_node_map_proposals
    op.create_table(
        "objective_node_map_proposals",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("framework_id", sa.String(length=100), nullable=False),
        sa.Column("objective_id", sa.String(length=100), nullable=False),
        sa.Column("proposed_node", sa.String(length=100), nullable=False),
        sa.Column("confidence", sa.Numeric(precision=3, scale=2), nullable=False),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("review_status", sa.String(length=20), server_default="pending", nullable=False),
        sa.Column("reviewed_by", sa.String(length=36), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["framework_id"], ["curriculum_frameworks.framework_id"], name="fk_proposals_framework_id"),
        sa.ForeignKeyConstraint(["objective_id"], ["syllabus_objectives.objective_id"], name="fk_proposals_objective_id"),
        sa.UniqueConstraint("framework_id", "objective_id", "proposed_node", name="uq_proposal_framework_obj_node"),
        sa.CheckConstraint("review_status IN ('pending','approved','rejected')", name="check_proposal_review_status"),
    )

    # 12. gemini_calls
    op.create_table(
        "gemini_calls",
        sa.Column("call_id", sa.String(length=36), nullable=False),
        sa.Column("model", sa.String(length=50), nullable=False),
        sa.Column("prompt_version", sa.String(length=20), nullable=False),
        sa.Column("input_tokens", sa.Integer(), nullable=False),
        sa.Column("output_tokens", sa.Integer(), nullable=False),
        sa.Column("cost_estimate", sa.Numeric(precision=8, scale=6), nullable=False),
        sa.Column("latency_ms", sa.Integer(), nullable=False),
        sa.Column("framework_id", sa.String(length=100), nullable=True),
        sa.Column("pipeline_name", sa.String(length=50), nullable=False),
        sa.Column("job_id", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("call_id"),
        sa.ForeignKeyConstraint(["framework_id"], ["curriculum_frameworks.framework_id"], name="fk_gemini_calls_framework_id"),
    )

    # 13. generation_jobs
    op.create_table(
        "generation_jobs",
        sa.Column("job_id", sa.String(length=36), nullable=False),
        sa.Column("job_type", sa.String(length=50), nullable=False),
        sa.Column("target_id", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="queued", nullable=False),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("job_metadata", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("job_id"),
        sa.CheckConstraint("status IN ('queued','running','completed','failed')", name="check_generation_jobs_status"),
    )


def downgrade() -> None:
    op.drop_table("generation_jobs")
    op.drop_table("gemini_calls")
    op.drop_table("objective_node_map_proposals")

    with op.batch_alter_table("content_localizations") as batch_op:
        batch_op.drop_constraint("check_content_localizations_review_status", type_="check")
        batch_op.drop_column("review_status")

    with op.batch_alter_table("item_localizations") as batch_op:
        batch_op.drop_constraint("check_item_localizations_review_status", type_="check")
        batch_op.drop_column("review_status")

    op.drop_table("item_lifecycle_events")
    op.drop_table("item_misconceptions")
    op.drop_table("misconception_nodes")
    op.drop_table("misconceptions")
    op.drop_table("items")
    op.drop_table("skill_node_content")
    op.drop_table("skill_node_prerequisites")
    op.drop_table("skill_nodes")
