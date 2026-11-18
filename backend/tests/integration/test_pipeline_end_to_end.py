"""End-to-End Integration Test for Framework-Aware Content Pipelines.

Source of truth:
- docs/plan.md §3 (Pipelines A1, A2, B, C, D)
- docs/02-curriculum-framework-spec.md
- docs/05-assessment-item-spec.md
- Task 8 §8.9
"""

import json
from datetime import date
import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from backend.app.db.base import Base
from backend.app.db.models.content import (
    SkillNode,
    SkillNodeContent,
    Item,
    Misconception,
    MisconceptionNode,
    ItemMisconception,
)
from backend.app.db.models.framework import (
    Country,
    CurriculumFramework,
    SyllabusObjective,
    ObjectiveNodeMap,
    ObjectiveNodeMapProposal,
    LocalizationBrief,
    LocalizationToken,
    ItemLocalization,
    ContentLocalization,
    LearnerFrameworkPin,
    FrameworkRollout,
    GeminiCall,
    GenerationJob,
)
from backend.app.ai.pipelines.node_pipeline import author_nodes
from backend.app.ai.pipelines.content_pipeline import (
    generate_content_canonical,
    generate_content_localized,
)
from backend.app.ai.pipelines.item_pipeline import generate_items
from backend.app.ai.pipelines.framework_pipeline import (
    extract_objectives,
    map_objectives,
    get_framework_coverage,
)
from backend.app.ai.pipelines.localization_pipeline import refresh_localization
from backend.app.services.framework_service import map_objective, activate_framework
from backend.app.services.content_resolver import (
    resolve_item,
    resolve_content,
    FrameworkPinMismatchError,
)
from backend.app.services.cost_service import get_cost_breakdown
from backend.app.workers.tasks.node_tasks import task_author_nodes
from backend.app.ai import gemini


@pytest.fixture
def db_session():
    """Isolated in-memory SQLite database session."""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    session_factory = sessionmaker(bind=engine)
    session = session_factory()

    yield session

    session.close()
    Base.metadata.drop_all(engine)


def test_pipeline_end_to_end(db_session: Session):
    """Full lifecycle test of Pipelines A1, A2, B, C, D with human review and coverage gating."""

    # -------------------------------------------------------------------------
    # Setup Framework, Brief, Country, and Tokens
    # -------------------------------------------------------------------------
    country = Country(
        country_code="GH",
        name="Ghana",
        default_locale="en-GH",
        default_currency="GHS",
    )
    db_session.add(country)

    framework = CurriculumFramework(
        framework_id="gh_bece_math_2024",
        country_code="GH",
        board="WAEC",
        subject="Mathematics",
        version="2024",
        locale="en-GH",
        currency="GHS",
        effective_from=date(2024, 1, 1),
        status="draft",
        grading_scale=[],
        exam_structure={},
    )
    db_session.add(framework)

    brief = LocalizationBrief(
        framework_id="gh_bece_math_2024",
        currency="GHS",
        common_names=["Kofi", "Ama", "Kwame"],
        cities=["Accra", "Kumasi"],
        foods=["kenkey", "jollof"],
        units_preferred={"length": "cm", "mass": "kg"},
        avoid=["snow", "subway"],
        scenario_bank=[{"title": "Makola Market", "context": "Trading goods in Accra"}],
    )
    db_session.add(brief)

    token = LocalizationToken(
        framework_id="gh_bece_math_2024",
        token_key="currency",
        token_value="GH₵",
    )
    db_session.add(token)

    rollout = FrameworkRollout(
        country_code="GH",
        framework_id="gh_bece_math_2024",
        phase="authoring",
    )
    db_session.add(rollout)
    db_session.commit()

    # -------------------------------------------------------------------------
    # Mock Gemini Responders for all 9 prompts
    # -------------------------------------------------------------------------
    def mock_gemini_responder(model, prompt_name, prompt_version, system_instruction, user_prompt, variables):
        if prompt_name == "node_authoring":
            return {
                "nodes": [
                    {
                        "node_id": "MATH.FRAC.ADD_UNLIKE",
                        "subject": "Mathematics",
                        "topic": "Fractions",
                        "subtopic": "Addition",
                        "title": "Add Fractions with Unlike Denominators",
                        "learner_title": "Adding Unlike Fractions",
                        "description": "Find LCD then add numerators.",
                        "grade_band_hint": "JSS2",
                        "est_minutes": 12,
                        "representations": ["area_model", "symbolic"],
                        "misconceptions": [
                            {
                                "id": "FRAC.ADD_NUM_DEN",
                                "description": "Adds numerators and denominators.",
                                "learner_facing_name": "Adding bottom numbers",
                            },
                            {
                                "id": "FRAC.LCD_MULTIPLY",
                                "description": "Multiplies denominators instead of finding LCM.",
                                "learner_facing_name": "Multiplying bottoms",
                            },
                        ],
                        "candidate_item_capacity": 30,
                    },
                    {
                        "node_id": "MATH.FRAC.SUB_UNLIKE",
                        "subject": "Mathematics",
                        "topic": "Fractions",
                        "subtopic": "Subtraction",
                        "title": "Subtract Fractions with Unlike Denominators",
                        "learner_title": "Subtracting Unlike Fractions",
                        "description": "Find LCD then subtract numerators.",
                        "grade_band_hint": "JSS2",
                        "est_minutes": 12,
                        "representations": ["symbolic"],
                        "misconceptions": [
                            {
                                "id": "FRAC.SUB_DENOM",
                                "description": "Subtracts denominators directly.",
                                "learner_facing_name": "Subtracting bottom numbers",
                            },
                            {
                                "id": "FRAC.ORDER_REVERSE",
                                "description": "Reverses minuend and subtrahend.",
                                "learner_facing_name": "Wrong order subtraction",
                            },
                        ],
                        "candidate_item_capacity": 25,
                    },
                ]
            }, 600, 500

        elif prompt_name == "content_canonical":
            return {
                "summary": "Find a common bottom number. Add the top numbers. Keep the bottom number.",
                "learning_objectives": ["Find LCD", "Add unlike fractions"],
                "sections": [
                    {
                        "section_index": 0,
                        "title": "Finding LCD",
                        "blocks": [{"type": "text", "text": "Find common denominator."}],
                    },
                    {
                        "section_index": 1,
                        "title": "Market Trading Example",
                        "blocks": [{"type": "text", "text": "Merchant buys 1/4 bag and 1/2 bag."}],
                    },
                ],
                "worked_examples": [
                    {"title": "Ex 1", "problem": "1/4 + 1/2", "steps": ["1/2 = 2/4", "1/4 + 2/4 = 3/4"], "solution": "3/4"},
                    {"title": "Ex 2", "problem": "1/3 + 1/6", "steps": ["1/3 = 2/6", "2/6 + 1/6 = 3/6"], "solution": "1/2"},
                    {"title": "Ex 3", "problem": "2/5 + 1/10", "steps": ["2/5 = 4/10", "4/10 + 1/10 = 5/10"], "solution": "1/2"},
                ],
                "key_formulas": [],
                "analogies": [],
                "common_mistakes": [],
                "estimated_minutes": 12,
            }, 800, 600

        elif prompt_name == "framework_extraction":
            return {
                "objectives": [
                    {
                        "code": "JSS2.NUM.1.1",
                        "text": "Add fractions with unlike denominators using lowest common multiples.",
                        "grade_band": "JSS2",
                        "term": 1,
                        "exam_weight": 5.0,
                    }
                ]
            }, 500, 300

        elif prompt_name == "framework_mapping":
            return {
                "proposals": [
                    {
                        "objective_id": "gh_bece_math_2024:JSS2.NUM.1.1",
                        "proposed_node": "MATH.FRAC.ADD_UNLIKE",
                        "confidence": 0.95,
                        "rationale": "Direct match for fraction addition with unlike denominators.",
                    }
                ]
            }, 400, 200

        elif prompt_name == "item_generation":
            stem_templates = [
                "Find the sum of 1/2 and 1/3.",
                "Calculate the value of 1/4 added to 2/5.",
                "Evaluate the fractional expression 3/8 plus 1/6.",
                "What is the total when 2/7 is combined with 3/14?",
                "Determine the result of adding 5/12 and 1/3.",
                "Simplify the arithmetic addition 1/5 plus 4/15.",
                "Compute the combined amount of 3/10 and 2/5.",
                "Add these unlike fractions: 5/6 and 3/4.",
                "A carpenter cuts two pieces of wood measuring 1/8 meter and 3/16 meter. Find total length.",
                "A recipe requires 2/3 cup of milk and 1/4 cup of water. What is total liquid?",
                "During a journey, a traveler walks 3/5 km in morning and 1/2 km in evening. Find distance.",
                "In a garden, 1/6 of plot has roses and 3/8 has lilies. What fraction is planted?",
                "Solve for the sum of 7/18 and 5/9 in lowest terms.",
                "Add 4/21 and 2/7 together.",
                "Compute total weight if package A weighs 3/16 kg and package B weighs 5/8 kg.",
            ]
            items = []
            # Generate 15 items: 5 tier 1, 5 tier 2, 5 tier 3
            for i in range(15):
                tier = 1 if i < 5 else (2 if i < 10 else 3)
                stem = stem_templates[i]
                items.append({
                    "type": "mcq_single",
                    "difficulty_tier": tier,
                    "stem": stem,
                    "payload": {
                        "options": [
                            {"id": "A", "content": f"Ans_{i}", "correct": True},
                            {"id": "B", "content": f"Dist1_{i}", "correct": False, "misconception_id": "FRAC.ADD_NUM_DEN"},
                            {"id": "C", "content": f"Dist2_{i}", "correct": False, "misconception_id": "FRAC.LCD_MULTIPLY"},
                            {"id": "D", "content": f"Dist3_{i}", "correct": False, "misconception_id": "FRAC.LCD_MULTIPLY"},
                        ]
                    },
                    "scoring": {"mode": "exact", "max_marks": 1},
                    "hints": [
                        {"level": 1, "content": "Find common denominator."},
                        {"level": 2, "content": "Convert fractions."},
                        {"level": 3, "content": "Add numerators."},
                    ],
                    "worked_solution": f"Step by step for problem {i}",
                    "offline_capable": True,
                    "media_bytes": 0,
                    "a11y": {"alt_text": "Fractions problem"},
                })
            return {"items": items}, 1200, 1500

        elif prompt_name == "self_evaluation":
            return {
                "overall_score": 0.90,
                "pedagogical_clarity": 0.95,
                "mathematical_correctness": 1.0,
                "diagnostic_depth": 0.90,
                "critique": "Solid diagnostic question.",
                "pass": True,
            }, 300, 150

        elif prompt_name == "item_localization":
            stem = variables.get("stem", "")
            return {
                "stem_override": f"In Accra, Kofi solves: {stem}",
                "payload_override": None,
                "solution_override": "Ghanaian currency solution",
                "rationale": "Accra market framing",
            }, 400, 200

        elif prompt_name == "content_localized":
            return {
                "section_overrides": {
                    "1": {
                        "title": "Makola Market Trading Example",
                        "blocks": [{"type": "text", "text": "A trader in Makola Market buys 1/4 bag and 1/2 bag."}],
                    }
                },
                "glossary_overrides": {},
                "rationale": "Makola market framing",
            }, 600, 300

        elif prompt_name == "localization_refresh":
            target_type = variables.get("target_type")
            if target_type == "content":
                return {
                    "refreshed_override": {
                        "section_overrides": {
                            "1": {
                                "title": "Kumasi Market Trading Example",
                                "blocks": [{"type": "text", "text": "A trader in Kumasi Central Market buys 1/4 bag and 1/2 bag."}],
                            }
                        }
                    },
                    "rationale": "Updated to Kumasi Central Market context",
                }, 500, 250
            else:
                base_stem = variables.get("base_entity", {}).get("stem", "")
                return {
                    "refreshed_override": {
                        "stem_override": f"In Kumasi, Ama solves: {base_stem}",
                        "payload_override": None,
                        "solution_override": "Kumasi market solution",
                    },
                    "rationale": "Updated to Kumasi context",
                }, 500, 250

        return {}, 100, 100

    gemini.set_mock_responder(mock_gemini_responder)

    try:
        # =====================================================================
        # Step 1: Pipeline A1 (Node Authoring)
        # =====================================================================
        authored = author_nodes(
            subject="Mathematics",
            topic="Fractions",
            actor_id="lead-001",
            db=db_session,
        )
        assert len(authored) == 2
        for node in authored:
            assert node.status == "draft"

        # Human Curriculum Lead approves node 1
        node1 = authored[0]
        node1.status = "live"
        db_session.commit()

        # =====================================================================
        # Step 2: Pipeline A2 Mode 1 (Canonical Content Generation)
        # =====================================================================
        content1 = generate_content_canonical(
            node_id=node1.node_id,
            actor_id="lead-001",
            db=db_session,
        )
        assert content1.status == "draft"
        assert content1.version == 1
        assert len(content1.worked_examples) == 3

        # Lead publishes canonical content
        content1.status = "published"
        db_session.commit()

        # =====================================================================
        # Step 3: Pipeline C (Extraction & Mapping Proposals)
        # =====================================================================
        syllabus_text = "JSS2 Mathematics: Add fractions with unlike denominators using lowest common multiples."
        objectives = extract_objectives(
            framework_id="gh_bece_math_2024",
            source=syllabus_text,
            actor_id="lead-001",
            db=db_session,
        )
        assert len(objectives) == 1
        obj = objectives[0]
        assert obj.coverage_status == "unmapped"

        proposals = map_objectives(
            framework_id="gh_bece_math_2024",
            actor_id="lead-001",
            db=db_session,
        )
        assert len(proposals) == 1
        prop = proposals[0]
        assert float(prop.confidence) == 0.95
        assert prop.review_status == "pending"

        # Verification: objective_node_map MUST be empty!
        assert db_session.query(ObjectiveNodeMap).count() == 0

        # Human Curriculum Lead explicitly approves proposal
        mapping = map_objective(
            db=db_session,
            objective_id=obj.objective_id,
            node_id=node1.node_id,
            actor="lead-001",
        )
        assert mapping is not None
        assert db_session.query(ObjectiveNodeMap).count() == 1
        db_session.refresh(obj)
        assert obj.coverage_status in ("partial", "mapped")

        # =====================================================================
        # Step 4: Pipeline B (Item Generation & Localization)
        # =====================================================================
        generated_items = generate_items(
            node_id=node1.node_id,
            count=15,
            actor_id="lead-001",
            db=db_session,
        )
        assert len(generated_items) == 15
        for it in generated_items:
            assert it.status == "tagged"
            # Lead approves and promotes item to live
            it.status = "live"

        # Verify staged item localizations
        staged_locs = (
            db_session.query(ItemLocalization)
            .filter(ItemLocalization.framework_id == "gh_bece_math_2024")
            .all()
        )
        assert len(staged_locs) == 15
        for loc in staged_locs:
            assert loc.review_status == "pending"
            # Lead approves localization
            loc.review_status = "approved"

        db_session.commit()

        # =====================================================================
        # Step 5: Pipeline A2 Mode 2 (Localized Content Overrides)
        # =====================================================================
        content_loc = generate_content_localized(
            content_id=content1.id,
            framework_id="gh_bece_math_2024",
            actor_id="lead-001",
            db=db_session,
        )
        assert content_loc.review_status == "pending"
        assert "1" in content_loc.section_overrides
        # Lead approves content localization
        content_loc.review_status = "approved"
        db_session.commit()

        # =====================================================================
        # Step 6: Content Resolver Verification
        # =====================================================================
        base_item = generated_items[0]
        # Pinned learner sees localized item override
        resolved_pinned = resolve_item(
            db=db_session,
            item_id=base_item.item_id,
            framework_id="gh_bece_math_2024",
            learner_pin="gh_bece_math_2024",
            base_item=base_item,
        )
        assert resolved_pinned["is_localized"] is True
        assert "Accra" in resolved_pinned["stem"]
        # Base item was NOT mutated
        assert "Accra" not in str(base_item.stem)

        # Mismatched pin raises FrameworkPinMismatchError
        with pytest.raises(FrameworkPinMismatchError):
            resolve_item(
                db=db_session,
                item_id=base_item.item_id,
                framework_id="gh_bece_math_2024",
                learner_pin="ng_waec_math_2024",
                base_item=base_item,
            )

        # Pinned learner sees localized section in lesson content
        resolved_content = resolve_content(
            db=db_session,
            content_id=content1.id,
            framework_id="gh_bece_math_2024",
            learner_pin="gh_bece_math_2024",
            base_content=content1,
        )
        assert resolved_content["sections"][1]["title"] == "Makola Market Trading Example"
        # Base content was NOT mutated
        assert content1.sections[1]["title"] == "Market Trading Example"

        # =====================================================================
        # Step 7: Pipeline D (Localization Refresh)
        # =====================================================================
        # Update brief
        brief.cities = ["Kumasi", "Tamale"]
        db_session.commit()

        # Refresh localization
        refresh_res = refresh_localization(
            framework_id="gh_bece_math_2024",
            actor_id="lead-001",
            db=db_session,
        )
        assert refresh_res["refreshed_items"] >= 1
        assert refresh_res["review_status"] == "pending"

        # =====================================================================
        # Step 8: Coverage Gating & Framework Activation
        # =====================================================================
        # Count live items and tier-3 items on node1
        tier3_count = db_session.query(Item).filter(
            Item.node_id == node1.node_id,
            Item.status == "live",
            Item.difficulty_tier == 3,
        ).count()
        total_live = db_session.query(Item).filter(
            Item.node_id == node1.node_id,
            Item.status == "live",
        ).count()
        assert total_live >= 15
        assert tier3_count >= 5

        cov_report = get_framework_coverage("gh_bece_math_2024", db=db_session)
        assert cov_report.total_objectives == 1
        assert cov_report.covered_objectives == 1
        assert cov_report.coverage_pct == 100.0
        assert cov_report.eligible_for_activation is True

        # Activate framework via framework service (requires >= 80% coverage)
        activated_fw = activate_framework(db=db_session, framework_id="gh_bece_math_2024", actor="admin-001")
        assert activated_fw.status == "active"

        # =====================================================================
        # Step 9: Celery Task Invocation
        # =====================================================================
        # Test direct celery task invocation with eager / sync execution
        celery_res = task_author_nodes.apply(
            kwargs={
                "subject": "Mathematics",
                "topic": "Fractions",
                "actor_id": "lead-001",
                "db": db_session,
            }
        )
        assert celery_res.status == "SUCCESS"
        assert len(celery_res.result) > 0

        # =====================================================================
        # Step 10: Cost Analytics Telemetry
        # =====================================================================
        cost_breakdown = get_cost_breakdown(db=db_session)
        totals = cost_breakdown["totals"]
        assert totals["calls"] > 0
        assert totals["input_tokens"] > 0
        assert totals["output_tokens"] > 0
        assert totals["cost_usd"] > 0
        assert len(cost_breakdown["by_pipeline"]) > 0
        frameworks_recorded = [f["framework_id"] for f in cost_breakdown["by_framework"]]
        assert "gh_bece_math_2024" in frameworks_recorded

    finally:
        gemini.clear_mock_responder()
