"""001_country_and_framework_layer

Revision ID: 001_country_framework
Revises: None
Create Date: 2026-09-15 00:00:00.000000

Source of truth:
- docs/plan.md §2.2, §2.9 - §2.13
- docs/02-curriculum-framework-spec.md §1 - §5, §9
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision: str = "001_country_framework"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. countries
    op.create_table(
        "countries",
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("default_locale", sa.String(length=10), nullable=False),
        sa.Column("default_currency", sa.String(length=3), nullable=False),
        sa.Column("status", sa.String(length=20), server_default="active", nullable=False),
        sa.PrimaryKeyConstraint("country_code"),
        sa.CheckConstraint(
            "status IN ('planned','active','paused','sunset')",
            name="check_countries_status",
        ),
    )

    # 2. curriculum_frameworks
    op.create_table(
        "curriculum_frameworks",
        sa.Column("framework_id", sa.String(length=100), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("board", sa.String(length=100), nullable=False),
        sa.Column("subject", sa.String(length=100), nullable=False),
        sa.Column("version", sa.String(length=50), nullable=False),
        sa.Column("locale", sa.String(length=10), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False),
        sa.Column("effective_from", sa.Date(), nullable=False),
        sa.Column("effective_until", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), server_default="draft", nullable=False),
        sa.Column("grading_scale", sa.JSON(), nullable=False),
        sa.Column("exam_structure", sa.JSON(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("framework_id"),
        sa.ForeignKeyConstraint(
            ["country_code"],
            ["countries.country_code"],
            name="fk_curriculum_frameworks_country_code",
        ),
        sa.CheckConstraint(
            "status IN ('draft','active','superseded')",
            name="check_curriculum_frameworks_status",
        ),
    )

    # 3. framework_grade_bands
    op.create_table(
        "framework_grade_bands",
        sa.Column("framework_id", sa.String(length=100), nullable=False),
        sa.Column("band_id", sa.String(length=50), nullable=False),
        sa.Column("ordinal", sa.Integer(), nullable=False),
        sa.Column("typical_age", sa.Integer(), nullable=True),
        sa.Column("label_local", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("framework_id", "band_id"),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["curriculum_frameworks.framework_id"],
            name="fk_framework_grade_bands_framework_id",
        ),
        sa.CheckConstraint(
            "ordinal BETWEEN 1 AND 13",
            name="check_grade_bands_ordinal",
        ),
    )

    # 4. syllabus_objectives
    op.create_table(
        "syllabus_objectives",
        sa.Column("objective_id", sa.String(length=100), nullable=False),
        sa.Column("framework_id", sa.String(length=100), nullable=False),
        sa.Column("code", sa.String(length=100), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("grade_band", sa.String(length=50), nullable=False),
        sa.Column("term", sa.Integer(), nullable=True),
        sa.Column("exam_weight", sa.Float(), nullable=True),
        sa.Column("coverage_status", sa.String(length=20), server_default="unmapped", nullable=False),
        sa.PrimaryKeyConstraint("objective_id"),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["curriculum_frameworks.framework_id"],
            name="fk_syllabus_objectives_framework_id",
        ),
        sa.UniqueConstraint("framework_id", "code", name="uq_framework_objective_code"),
        sa.CheckConstraint(
            "coverage_status IN ('full','partial','unmapped')",
            name="check_syllabus_objectives_coverage_status",
        ),
    )

    # 5. objective_node_map
    op.create_table(
        "objective_node_map",
        sa.Column("objective_id", sa.String(length=100), nullable=False),
        sa.Column("node_id", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("objective_id", "node_id"),
        sa.ForeignKeyConstraint(
            ["objective_id"],
            ["syllabus_objectives.objective_id"],
            name="fk_objective_node_map_objective_id",
        ),
    )

    # 6. learner_framework_pins
    op.create_table(
        "learner_framework_pins",
        sa.Column("learner_id", sa.String(length=36), nullable=False),
        sa.Column("framework_id", sa.String(length=100), nullable=False),
        sa.Column("pinned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("learner_id", "framework_id"),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["curriculum_frameworks.framework_id"],
            name="fk_learner_framework_pins_framework_id",
        ),
    )

    # 7. framework_version_diffs
    op.create_table(
        "framework_version_diffs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("from_framework", sa.String(length=100), nullable=True),
        sa.Column("to_framework", sa.String(length=100), nullable=True),
        sa.Column("objectives_added", sa.JSON(), nullable=True),
        sa.Column("objectives_removed", sa.JSON(), nullable=True),
        sa.Column("objectives_remapped", sa.JSON(), nullable=True),
        sa.Column("coverage_delta", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["from_framework"],
            ["curriculum_frameworks.framework_id"],
            name="fk_framework_version_diffs_from_framework",
        ),
        sa.ForeignKeyConstraint(
            ["to_framework"],
            ["curriculum_frameworks.framework_id"],
            name="fk_framework_version_diffs_to_framework",
        ),
    )

    # 8. framework_rollouts
    op.create_table(
        "framework_rollouts",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("country_code", sa.String(length=2), nullable=False),
        sa.Column("framework_id", sa.String(length=100), nullable=True),
        sa.Column("phase", sa.String(length=20), nullable=False),
        sa.Column("coverage_pct", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("blockers", sa.JSON(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.Column("activated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("superseded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["country_code"],
            ["countries.country_code"],
            name="fk_framework_rollouts_country_code",
        ),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["curriculum_frameworks.framework_id"],
            name="fk_framework_rollouts_framework_id",
        ),
        sa.CheckConstraint(
            "phase IN ('planned','importing','mapping','authoring','reviewing','piloting','active','superseded')",
            name="check_framework_rollouts_phase",
        ),
    )

    # 9. localization_briefs
    op.create_table(
        "localization_briefs",
        sa.Column("framework_id", sa.String(length=100), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("common_names", sa.JSON(), nullable=False),
        sa.Column("cities", sa.JSON(), nullable=False),
        sa.Column("foods", sa.JSON(), nullable=False),
        sa.Column("units_preferred", sa.JSON(), nullable=False),
        sa.Column("avoid", sa.JSON(), nullable=False),
        sa.Column("scenario_bank", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("framework_id"),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["curriculum_frameworks.framework_id"],
            name="fk_localization_briefs_framework_id",
        ),
    )

    # 10. item_localizations
    op.create_table(
        "item_localizations",
        sa.Column("item_id", sa.String(length=36), nullable=False),
        sa.Column("framework_id", sa.String(length=100), nullable=False),
        sa.Column("stem_override", sa.JSON(), nullable=True),
        sa.Column("payload_override", sa.JSON(), nullable=True),
        sa.Column("solution_override", sa.JSON(), nullable=True),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("item_id", "framework_id"),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["curriculum_frameworks.framework_id"],
            name="fk_item_localizations_framework_id",
        ),
    )

    # 11. content_localizations
    op.create_table(
        "content_localizations",
        sa.Column("content_id", sa.String(length=36), nullable=False),
        sa.Column("framework_id", sa.String(length=100), nullable=False),
        sa.Column("section_overrides", sa.JSON(), nullable=True),
        sa.Column("rationale", sa.Text(), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("content_id", "framework_id"),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["curriculum_frameworks.framework_id"],
            name="fk_content_localizations_framework_id",
        ),
    )

    # 12. localization_tokens
    op.create_table(
        "localization_tokens",
        sa.Column("framework_id", sa.String(length=100), nullable=False),
        sa.Column("token_key", sa.String(length=50), nullable=False),
        sa.Column("token_value", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("framework_id", "token_key"),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["curriculum_frameworks.framework_id"],
            name="fk_localization_tokens_framework_id",
        ),
    )

    # 13. framework_cohort_stats
    op.create_table(
        "framework_cohort_stats",
        sa.Column("framework_id", sa.String(length=100), nullable=False),
        sa.Column("snapshot_date", sa.Date(), nullable=False),
        sa.Column("active_learners", sa.Integer(), nullable=False),
        sa.Column("mean_mastery_rate", sa.Numeric(precision=4, scale=3), nullable=False),
        sa.Column("mean_retention_30d", sa.Numeric(precision=4, scale=3), nullable=False),
        sa.Column("mean_success_band", sa.Numeric(precision=4, scale=3), nullable=False),
        sa.Column("item_error_rate", sa.Numeric(precision=4, scale=3), nullable=False),
        sa.PrimaryKeyConstraint("framework_id", "snapshot_date"),
        sa.ForeignKeyConstraint(
            ["framework_id"],
            ["curriculum_frameworks.framework_id"],
            name="fk_framework_cohort_stats_framework_id",
        ),
    )

    # 14. learner_pin_migrations
    op.create_table(
        "learner_pin_migrations",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("learner_id", sa.String(length=36), nullable=False),
        sa.Column("from_framework", sa.String(length=100), nullable=True),
        sa.Column("to_framework", sa.String(length=100), nullable=True),
        sa.Column("reason", sa.String(length=50), nullable=False),
        sa.Column("mastery_preserved", sa.Boolean(), server_default=sa.text("true"), nullable=False),
        sa.Column("migrated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["from_framework"],
            ["curriculum_frameworks.framework_id"],
            name="fk_learner_pin_migrations_from_framework",
        ),
        sa.ForeignKeyConstraint(
            ["to_framework"],
            ["curriculum_frameworks.framework_id"],
            name="fk_learner_pin_migrations_to_framework",
        ),
        sa.CheckConstraint(
            "reason IN ('country_change','board_change','superseded')",
            name="check_learner_pin_migrations_reason",
        ),
    )


def downgrade() -> None:
    # Drop in strict reverse dependency order
    op.drop_table("learner_pin_migrations")
    op.drop_table("framework_cohort_stats")
    op.drop_table("localization_tokens")
    op.drop_table("content_localizations")
    op.drop_table("item_localizations")
    op.drop_table("localization_briefs")
    op.drop_table("framework_rollouts")
    op.drop_table("framework_version_diffs")
    op.drop_table("learner_framework_pins")
    op.drop_table("objective_node_map")
    op.drop_table("syllabus_objectives")
    op.drop_table("framework_grade_bands")
    op.drop_table("curriculum_frameworks")
    op.drop_table("countries")
