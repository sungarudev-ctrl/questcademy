"""SQLAlchemy models for Canonical Skill Graph, Content, and Assessment Items.

Source of truth:
- docs/plan.md §2.1, §2.4, §2.5
- docs/05-assessment-item-spec.md §1, §3, §7, §9
"""

import uuid
from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
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

JsonType = JSON().with_variant(JSONB, "postgresql")


class SkillNode(Base):
    """Canonical Skill Node in global knowledge graph (country-agnostic)."""
    __tablename__ = "skill_nodes"

    node_id = Column(String(100), primary_key=True)  # e.g. "MATH.FRAC.ADD_UNLIKE"
    subject = Column(String(100), nullable=False)
    topic = Column(String(100), nullable=False)
    subtopic = Column(String(100), nullable=True)
    title = Column(String(200), nullable=False)
    learner_title = Column(String(200), nullable=False)
    description = Column(Text, nullable=False)
    grade_band_hint = Column(String(50), nullable=True)
    est_minutes = Column(Integer, nullable=False)
    difficulty_elo = Column(Integer, nullable=False, default=1200)
    representations = Column(JsonType, nullable=True)
    status = Column(String(20), nullable=False, default="draft")
    superseded_by = Column(String(100), ForeignKey("skill_nodes.node_id"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        CheckConstraint("est_minutes BETWEEN 8 AND 15", name="check_skill_nodes_est_minutes"),
        CheckConstraint("status IN ('draft','review','live','deprecated')", name="check_skill_nodes_status"),
    )


class SkillNodePrerequisite(Base):
    """Prerequisite relationship between skill nodes."""
    __tablename__ = "skill_node_prerequisites"

    node_id = Column(String(100), ForeignKey("skill_nodes.node_id"), primary_key=True)
    prerequisite_node_id = Column(String(100), ForeignKey("skill_nodes.node_id"), primary_key=True)
    type = Column(String(20), nullable=False)  # 'hard' | 'soft'

    __table_args__ = (
        CheckConstraint("type IN ('hard','soft')", name="check_skill_node_prerequisites_type"),
        CheckConstraint("node_id <> prerequisite_node_id", name="check_skill_node_prerequisites_no_self_loop"),
    )


class SkillNodeContent(Base):
    """Lesson content attached to a SkillNode."""
    __tablename__ = "skill_node_content"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    node_id = Column(String(100), ForeignKey("skill_nodes.node_id"), nullable=False)
    version = Column(Integer, nullable=False, default=1)
    summary = Column(Text, nullable=True)
    learning_objectives = Column(JsonType, nullable=True)
    sections = Column(JsonType, nullable=False)  # Block[] 17-block model
    worked_examples = Column(JsonType, nullable=False)
    key_formulas = Column(JsonType, nullable=True)
    analogies = Column(JsonType, nullable=True)
    common_mistakes = Column(JsonType, nullable=True)
    estimated_minutes = Column(Integer, nullable=False)
    status = Column(String(20), nullable=False, default="draft")
    generated_by = Column(String(100), nullable=True)
    reviewed_by = Column(String(36), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    published_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    __table_args__ = (
        UniqueConstraint("node_id", "version", name="uq_skill_node_content_node_version"),
        CheckConstraint("status IN ('draft','review','published','archived')", name="check_skill_node_content_status"),
    )


class Item(Base):
    """Assessment item adhering to 18-type Item Contract."""
    __tablename__ = "items"

    item_id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    node_id = Column(String(100), ForeignKey("skill_nodes.node_id"), nullable=False)
    type = Column(String(50), nullable=False)
    difficulty_tier = Column(Integer, nullable=False)  # 1, 2, 3
    difficulty_elo = Column(Integer, nullable=False, default=1200)
    stem = Column(JsonType, nullable=False)
    payload = Column(JsonType, nullable=False)
    scoring = Column(JsonType, nullable=False)
    hints = Column(JsonType, nullable=False)  # Exactly 3 hints
    worked_solution = Column(JsonType, nullable=False)
    hint_variants = Column(JsonType, nullable=True)
    printable = Column(Boolean, nullable=False, default=True)
    offline_capable = Column(Boolean, nullable=False, default=True)
    media_bytes = Column(Integer, nullable=False, default=0)
    status = Column(String(20), nullable=False, default="draft")
    a11y = Column(JsonType, nullable=False)
    p_value = Column(Numeric(4, 3), nullable=True)
    discrimination = Column(Numeric(4, 3), nullable=True)
    n_responses = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    __table_args__ = (
        CheckConstraint("difficulty_tier IN (1,2,3)", name="check_items_difficulty_tier"),
        CheckConstraint(
            "status IN ('draft','generated','tagged','reviewed','piloting','live','calibrating','calibrated','revision','retired')",
            name="check_items_status",
        ),
    )


class Misconception(Base):
    """Misconception taxonomy registry (screaming snake DOMAIN.SPECIFIC_BELIEF)."""
    __tablename__ = "misconceptions"

    misconception_id = Column(String(100), primary_key=True)
    domain = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    learner_facing_name = Column(String(200), nullable=False)
    prevalence = Column(Numeric(5, 4), nullable=True)
    remediation_id = Column(String(100), nullable=True)
    typical_origin = Column(Text, nullable=True)


class MisconceptionNode(Base):
    """Many-to-many relationship between misconceptions and skill nodes."""
    __tablename__ = "misconception_nodes"

    misconception_id = Column(String(100), ForeignKey("misconceptions.misconception_id"), primary_key=True)
    node_id = Column(String(100), ForeignKey("skill_nodes.node_id"), primary_key=True)


class ItemMisconception(Base):
    """Maps specific distractors or response patterns to misconceptions."""
    __tablename__ = "item_misconceptions"

    item_id = Column(String(36), ForeignKey("items.item_id"), primary_key=True)
    misconception_id = Column(String(100), ForeignKey("misconceptions.misconception_id"), primary_key=True)
    pattern = Column(JsonType, nullable=False)


class ItemLifecycleEvent(Base):
    """Audit log of item status transitions."""
    __tablename__ = "item_lifecycle_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    item_id = Column(String(36), ForeignKey("items.item_id"), nullable=False)
    from_status = Column(String(20), nullable=True)
    to_status = Column(String(20), nullable=False)
    reason = Column(Text, nullable=True)
    actor_id = Column(String(36), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
