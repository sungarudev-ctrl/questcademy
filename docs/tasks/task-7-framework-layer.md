# TASK 7 — Country and Framework Layer
Paste this to the agent after Task 6 is confirmed complete.

Context: Tasks 1–6 complete and confirmed. The engine is stable. The backend, content pipelines, and Content Studio are not yet built.

Your task: Implement the country and framework layer end-to-end — schema, service, API, and the framework-scoped content resolver. This is the last piece of foundational work before the content pipelines are built.

Read first, in this order:

docs/00-product-plan.md §2 (updated) — the full schema, including §2.9 through §2.13

docs/00-product-plan.md §3 (updated) — the pipelines with framework-aware modes

docs/00-product-plan.md §5 (updated) — the API surface

docs/00-product-plan.md §6 — governance, especially the framework activation gate

docs/00-product-plan.md §7 — the engine (verify I-12 is specified but does not yet exist)

docs/02-curriculum-framework-spec.md — the three-layer model, in full

docs/02-curriculum-framework-spec.md §5 — versioning and cohort pinning

docs/02-curriculum-framework-spec.md §9 — governance

Deliverables, in order:

Alembic migrations for every new table in §2.9 through §2.13. Every table has an upgrade and a matching downgrade. Every FK is explicit. Every CHECK constraint matches the spec.

backend/app/db/models/framework.py — SQLAlchemy models for Country, CurriculumFramework (extended), FrameworkGradeBand, SyllabusObjective, ObjectiveNodeMap, LearnerFrameworkPin, FrameworkVersionDiff, FrameworkRollout, LocalizationBrief, ItemLocalization, ContentLocalization, LocalizationToken, FrameworkCohortStats, LearnerPinMigration.

backend/app/services/framework_service.py — service-layer functions:

create_framework(country, board, subject, version, ...) → draft framework

import_objectives(framework_id, pdf_or_text) → calls the extractor, stages drafts

map_objective(objective_id, node_id, actor) → creates a single mapping; fails if called in bulk (the service enforces the no-bulk-approve rule from doc 02 §9)

compute_coverage(framework_id) → coverage_pct per §6

activate_framework(framework_id, actor) → fails unless coverage_pct >= 80

supersede_framework(framework_id, new_framework_id, actor) → generates a version diff, does not mutate learner pins

migrate_learner_pin(learner_id, to_framework_id, reason, actor) → creates a LearnerPinMigration row; does not touch learner_node_state

refresh_localization(framework_id, actor) → stages drafts from the updated brief

backend/app/services/content_resolver.py — the framework-aware content resolver:

resolve_item(item_id, framework_id, learner_pin) → Item — applies item_localizations overrides on top of the base item

resolve_content(content_id, framework_id, learner_pin) → SkillNodeContent — applies content_localizations overrides

The resolver never mutates the base item. It returns a view.

If the learner's pin does not match framework_id, the resolver raises a typed error. Callers must pass the learner's actual pin.

backend/app/api/frameworks.py — the API endpoints in §5. Every endpoint enforced with the appropriate RBAC scope (curriculum lead for write operations, anyone for read on active frameworks).

backend/app/api/learners.py — add endpoints for POST /learners/:id/change-framework and GET /learners/:id/framework-history.

backend/app/api/analytics.py — add GET /analytics/frameworks/compare. Reads from framework_cohort_stats only. Does not join to skill_nodes or items.

backend/tests/unit/test_framework_service.py — tests for every service function. In particular:

activate_framework raises when coverage is 79.9%

map_objective cannot be called with a list (type-level and runtime)

migrate_learner_pin leaves learner_node_state byte-identical

compute_coverage correctly counts objectives with ≥ 15 published items

backend/tests/unit/test_content_resolver.py — tests for the resolver:

With no localization row, base item is returned unchanged

With a localization row, overrides are applied and the base row is unchanged after the call

With a mismatched pin, the resolver raises

engine/src/invariants.ts — add I-11 (pin migration never mutates node state) and I-12 (engine output is framework-agnostic). I-12's check is implemented as a test in engine/test/determinism.test.ts, not as a runtime assertion.

engine/testdata/determinism_across_frameworks.json — the vector asserting that the same attempt sequence with two different frameworkId values produces byte-identical state.

.github/workflows/content-ci.yml — the country-isolation lint rule and the localization math-invariance gate from §9.

docs/runbooks/framework-expansion.md — the step-by-step process a curriculum lead follows to add a country. Copy the eleven steps from §3.4 of the plan, with the exact commands and API calls.

Definition of done:

All migrations apply cleanly and downgrade cleanly.

Every service function has a passing unit test.

activate_framework raises below 80% coverage — tested.

map_objective cannot be called in bulk — tested.

migrate_learner_pin leaves node state byte-identical — tested with a checksum.

The content resolver returns the base item when no localization exists, and returns the localized view without mutating the base when one exists — both tested.

determinism_across_frameworks.json passes.

The country-isolation lint rule fails the build if country_code appears in any forbidden file — test it with a deliberate violation.

The math-invariance gate fails the build if an override changes a numeric answer without SymPy verification — test it with a deliberate violation.

npm run typecheck && npm run test && npm run simulation clean.

pytest clean.

Report at the end: which sections you read, the exact SQL of the country-isolation lint rule, how you verified the pin migration does not touch node state, and any place the spec was ambiguous.

Do not proceed to content pipelines until framework service is confirmed.

## After Task 7 — What This Guarantees
After Task 7 lands, the following are true and enforced by CI:

Adding a country is a content project. The codebase does not change.

Mastery is preserved across country changes, board changes, and framework supersessions. Enforced by I-11.

The engine's decisions are byte-identical across frameworks. Enforced by I-12 and the determinism vector.

A framework cannot go live below 80% coverage. Enforced at the service layer.

Mappings cannot be bulk-approved. Enforced at the service layer.

Localization cannot alter mathematics. Enforced at the CI gate.

Cross-country analytics never touch content tables. Enforced by the query path.

Every one of those is a data-level property, not a convention. That is what makes the abstraction real.
