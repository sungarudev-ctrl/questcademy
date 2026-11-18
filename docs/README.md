# Questcademy documentation

Start with `00-product-plan.md`. Where a numbered spec and the plan disagree, the numbered spec wins. Docs 01, 06–09 and 11–13 are first drafts (2026-11-18), sourced inline. Their open questions were decided on the owner's delegated instruction the same day (`decisions/`, DR-001 to DR-019); each doc's Decisions section lists the outcome, and body text marked PROPOSED is superseded by it. Provisional and OPEN rows are called out. The code and schema work the decisions require is listed, undone, in `decisions/IMPLEMENTATION-FOLLOWUPS.md`.

| Doc | Owns | Status |
|---|---|---|
| [00 Product plan](00-product-plan.md) | Vision, architecture, schema, roadmap | v2 |
| [01 Product and delivery](01-product-and-delivery-spec.md) | Learner experience, delivery tiers, budgets, dose | v0.1 draft |
| [02 Curriculum framework](02-curriculum-framework-spec.md) | Three-layer model, mapping, governance | v2 |
| [03 Learning science](03-learning-science-spec.md) | Pedagogical commitments, rejections | v2 |
| [04 Learning engine](04-learning-engine-spec.md) | Mastery, Elo, selection, placement, FSRS, invariants | v2 |
| [05 Assessment and items](05-assessment-item-spec.md) | Item contract, types, lifecycle, misconceptions | v2 |
| [06 Offline, delivery, degradation](06-offline-delivery-and-degradation-spec.md) | Bundle, offline ladder, lesson blocks | v0.1 draft |
| [07 Data model](07-data-model-spec.md) | Tables as migrated vs specified, drift from plan | v1 |
| [08 AI services](08-ai-services-spec.md) | Pipelines, tools, tutor, marking | v1 |
| [09 Authoring rules](09-authoring-rules.md) | Node, content, item, distractor, localization rules | v1 |
| [10 Engineering standards](10-engineering-standards.md) | Agents, tests, CI gates, definition of done | v1 (layout corrected) |
| [11 Tech stack and analytics](11-tech-stack-and-analytics-spec.md) | Stack as built, event taxonomy | v1 |
| [12 Teacher product](12-teacher-product-spec.md) | Toolkit, classroom, tutor, engagement | draft |
| [13 Safety and privacy](13-safety-and-privacy-spec.md) | Consent, data protection, tutor safety | draft |

Also: [sync-contract.md](sync-contract.md) (client/server reconciliation), [REJECTED_FEATURES.md](REJECTED_FEATURES.md), [decisions/](decisions/) (DR-001 to DR-018, all PROPOSED; [FINDINGS.md](decisions/FINDINGS.md) lists spec-versus-code mismatches), [tasks/](tasks/) (agent hand-offs and build status), [runbooks/](runbooks/), [brand_identity.md](brand_identity.md).

Not yet written because they are outputs of unstarted tasks: `api-reference.md` (Task 13), further runbooks (Task 15), `rct/` (Task 17), `curriculum-team/` (Task 16).
