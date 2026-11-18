"""SQLAlchemy models for Country and Curriculum Framework layer.

Source of truth:
- docs/plan.md §2.2, §2.9 - §2.13
- docs/02-curriculum-framework-spec.md §1 - §5, §9
"""

import uuid
from datetime import datetime
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.types import JSON
from backend.app.db.base import Base

# Use JSONB for postgres, fallback to JSON for sqlite/others
JsonType = JSON().with_variant(JSONB, "postgresql")


class Country(Base):
    """Country registry. Data-only; no content code path branches on this."""
    __tablename__ = "countries"

    country_code = Column(String(2), primary_key=True)  # ISO-3166 alpha-2
    name = Column(String(100), nullable=False)
    default_locale = Column(String(10), nullable=False)  # e.g., 'en-GH', 'en-NG'
    default_currency = Column(String(3), nullable=False)  # ISO-4217, e.g., 'GHS'
    status = Column(String(20), nullable=False, default="active")

    __table_args__ = (
        CheckConstraint(
            "status IN ('planned','active','paused','sunset')",
            name="check_countries_status",
        ),
    )


class CurriculumFramework(Base):
    """Curriculum Framework object (per board, versioned, immutable once active)."""
    __tablename__ = "curriculum_frameworks"

    framework_id = Column(String(100), primary_key=True)  # e.g., "gh_bece_math_2024"
    country_code = Column(String(2), ForeignKey("countries.country_code"), nullable=False)
    board = Column(String(100), nullable=False)
    subject = Column(String(100), nullable=False)
    version = Column(String(50), nullable=False)
    locale = Column(String(10), nullable=False)
    currency = Column(String(3), nullable=False)
    effective_from = Column(Date, nullable=False)
    effective_until = Column(Date, nullable=True)
    framework_type = Column(String(50), nullable=False, default="standards_aligned")
    status = Column(String(20), nullable=False, default="draft")
    grading_scale = Column(JsonType, nullable=False)
    exam_structure = Column(JsonType, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','active','superseded')",
            name="check_curriculum_frameworks_status",
        ),
        CheckConstraint(
            "framework_type IN ('exam_board','standards_aligned')",
            name="check_curriculum_frameworks_type",
        ),
    )


class FrameworkGradeBand(Base):
    """Grade bands for a framework. Ordinal -1..12 accommodates Pre-K (-1) and K (0)."""
    __tablename__ = "framework_grade_bands"

    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), primary_key=True)
    band_id = Column(String(50), primary_key=True)  # e.g. "JSS2"
    ordinal = Column(Integer, nullable=False)  # normalized -1..12
    typical_age = Column(Integer, nullable=True)
    label_local = Column(String(100), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "ordinal BETWEEN -1 AND 12",
            name="check_grade_bands_ordinal",
        ),
    )


class SyllabusObjective(Base):
    """Syllabus objectives verbatim from official syllabus."""
    __tablename__ = "syllabus_objectives"

    objective_id = Column(String(100), primary_key=True)
    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), nullable=False)
    code = Column(String(100), nullable=False)  # e.g. "JSS2.NUM.3.2"
    text = Column(Text, nullable=False)
    grade_band = Column(String(50), nullable=False)
    term = Column(Integer, nullable=True)
    exam_weight = Column(Float, nullable=True)
    coverage_status = Column(String(20), nullable=False, default="unmapped")

    __table_args__ = (
        UniqueConstraint("framework_id", "code", name="uq_framework_objective_code"),
        CheckConstraint(
            "coverage_status IN ('full','partial','unmapped')",
            name="check_syllabus_objectives_coverage_status",
        ),
    )


class ObjectiveNodeMap(Base):
    """Many-to-many map between syllabus objectives and canonical skill nodes."""
    __tablename__ = "objective_node_map"

    objective_id = Column(String(100), ForeignKey("syllabus_objectives.objective_id"), primary_key=True)
    node_id = Column(String(100), primary_key=True)


class LearnerFrameworkPin(Base):
    """Pin associating a learner with an enrolled framework version."""
    __tablename__ = "learner_framework_pins"

    learner_id = Column(String(36), primary_key=True)
    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), primary_key=True)
    pinned_at = Column(DateTime(timezone=True), server_default=func.now())


class FrameworkVersionDiff(Base):
    """Version diff reports generated on new framework version import."""
    __tablename__ = "framework_version_diffs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    from_framework = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), nullable=True)
    to_framework = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), nullable=True)
    objectives_added = Column(JsonType, nullable=True)
    objectives_removed = Column(JsonType, nullable=True)
    objectives_remapped = Column(JsonType, nullable=True)
    coverage_delta = Column(JsonType, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class FrameworkRollout(Base):
    """Lifecycle progress of a country's framework implementation."""
    __tablename__ = "framework_rollouts"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    country_code = Column(String(2), ForeignKey("countries.country_code"), nullable=False)
    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), nullable=True)
    phase = Column(String(20), nullable=False)
    coverage_pct = Column(Numeric(5, 2), nullable=True)
    blockers = Column(JsonType, nullable=True)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    activated_at = Column(DateTime(timezone=True), nullable=True)
    superseded_at = Column(DateTime(timezone=True), nullable=True)
    notes = Column(Text, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "phase IN ('planned','importing','mapping','authoring','reviewing','piloting','active','superseded')",
            name="check_framework_rollouts_phase",
        ),
    )


class LocalizationBrief(Base):
    """Country-specific authoring context and word-problem rules."""
    __tablename__ = "localization_briefs"

    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), primary_key=True)
    currency = Column(String(10), nullable=False)
    common_names = Column(JsonType, nullable=False)  # list of strings
    cities = Column(JsonType, nullable=False)        # list of strings
    foods = Column(JsonType, nullable=False)         # list of strings
    units_preferred = Column(JsonType, nullable=False)  # dict e.g. {'length': 'cm', 'mass': 'kg'}
    avoid = Column(JsonType, nullable=False)         # list of strings e.g. ['snow', 'Thanksgiving']
    scenario_bank = Column(JsonType, nullable=False) # list of pre-approved word problem scenarios
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class ItemLocalization(Base):
    """Per-framework overlay on a base item."""
    __tablename__ = "item_localizations"

    item_id = Column(String(36), primary_key=True)
    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), primary_key=True)
    stem_override = Column(JsonType, nullable=True)
    payload_override = Column(JsonType, nullable=True)
    solution_override = Column(JsonType, nullable=True)
    rationale = Column(Text, nullable=True)
    review_status = Column(String(20), nullable=False, default="pending")
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "review_status IN ('pending','approved','rejected')",
            name="check_item_localizations_review_status",
        ),
    )


class ContentLocalization(Base):
    """Per-framework overlay on skill node lesson content."""
    __tablename__ = "content_localizations"

    content_id = Column(String(36), primary_key=True)
    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), primary_key=True)
    section_overrides = Column(JsonType, nullable=True)
    rationale = Column(Text, nullable=True)
    review_status = Column(String(20), nullable=False, default="pending")
    created_by = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "review_status IN ('pending','approved','rejected')",
            name="check_content_localizations_review_status",
        ),
    )


class LocalizationToken(Base):
    """Reference tokens used by word problems, keyed by framework."""
    __tablename__ = "localization_tokens"

    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), primary_key=True)
    token_key = Column(String(50), primary_key=True)  # e.g. 'currency', 'common_name', 'city'
    token_value = Column(String(100), nullable=False)  # e.g. '₵', 'Ama', 'Accra'


class FrameworkCohortStats(Base):
    """Cross-framework analytics snapshot. Never joins to skill_nodes or items."""
    __tablename__ = "framework_cohort_stats"

    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), primary_key=True)
    snapshot_date = Column(Date, primary_key=True)
    active_learners = Column(Integer, nullable=False)
    mean_mastery_rate = Column(Numeric(4, 3), nullable=False)
    mean_retention_30d = Column(Numeric(4, 3), nullable=False)
    mean_success_band = Column(Numeric(4, 3), nullable=False)
    item_error_rate = Column(Numeric(4, 3), nullable=False)


class LearnerPinMigration(Base):
    """Audit trail for learner framework pin migrations."""
    __tablename__ = "learner_pin_migrations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    learner_id = Column(String(36), nullable=False)
    from_framework = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), nullable=True)
    to_framework = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), nullable=True)
    reason = Column(String(50), nullable=False)
    mastery_preserved = Column(Boolean, nullable=False, default=True)
    migrated_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "reason IN ('country_change','board_change','superseded')",
            name="check_learner_pin_migrations_reason",
        ),
    )


class ObjectiveNodeMapProposal(Base):
    """Staging table for AI-proposed objective-to-node mappings."""
    __tablename__ = "objective_node_map_proposals"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), nullable=False)
    objective_id = Column(String(100), ForeignKey("syllabus_objectives.objective_id"), nullable=False)
    proposed_node = Column(String(100), nullable=False)
    confidence = Column(Numeric(3, 2), nullable=False)
    rationale = Column(Text, nullable=True)
    review_status = Column(String(20), nullable=False, default="pending")
    reviewed_by = Column(String(36), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        UniqueConstraint("framework_id", "objective_id", "proposed_node", name="uq_proposal_framework_obj_node"),
        CheckConstraint(
            "review_status IN ('pending','approved','rejected')",
            name="check_proposal_review_status",
        ),
    )


class GeminiCall(Base):
    """Telemetry and cost tracking for every Gemini API call."""
    __tablename__ = "gemini_calls"

    call_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    model = Column(String(50), nullable=False)
    prompt_version = Column(String(20), nullable=False)
    input_tokens = Column(Integer, nullable=False)
    output_tokens = Column(Integer, nullable=False)
    cost_estimate = Column(Numeric(8, 6), nullable=False)
    latency_ms = Column(Integer, nullable=False)
    framework_id = Column(String(100), ForeignKey("curriculum_frameworks.framework_id"), nullable=True)
    pipeline_name = Column(String(50), nullable=False)
    job_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class GenerationJob(Base):
    """Tracking table for asynchronous content generation jobs."""
    __tablename__ = "generation_jobs"

    job_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    job_type = Column(String(50), nullable=False)
    target_id = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False, default="queued")
    error = Column(Text, nullable=True)
    job_metadata = Column(JsonType, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint(
            "status IN ('queued','running','completed','failed')",
            name="check_generation_jobs_status",
        ),
    )

