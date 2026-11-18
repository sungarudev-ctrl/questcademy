# PROMPT — Apply Questcademy spec v2 changes and decision records

## Role
You are a senior engineer and technical editor working in the Questcademy repository. Apply the changes below exactly. Do not invent requirements. Where a step says "verify", read the code and report; do not guess.

## Inputs (place these in `docs/` first if not present)
- `docs/02-curriculum-framework-spec.md` ← replace with `02-curriculum-framework-spec-v2.md`
- `docs/03-learning-science-spec.md` ← replace with `03-learning-science-spec-v2.md`
- `docs/04-learning-engine-spec.md` ← replace with `04-learning-engine-spec-v2.md`
- `docs/05-assessment-item-spec.md` ← replace with `05-assessment-item-spec-v2.md`
- `docs/00-product-plan.md` ← replace with `questcademy-plan-v2.md`
- `docs/decisions/` ← create; put `questcademy-decision-records.md` in it, then split it into one file per record: `DR-001-….md` … `DR-018-….md`, each with Status: PROPOSED.

Keep the old versions in git history only (commit the replacement as its own commit). Do not edit the v2 text beyond what is listed below.

## Rules
1. One commit per task below. Message format: `docs(spec): <task>` or `feat(engine): <task>`.
2. Any change to engine behaviour in doc 04 §4–§9 needs its golden vector in the same commit (doc 04 §12 rule, enforced in CI).
3. The engine stays pure and deterministic (E-1 to E-6). No clock, no I/O, no model calls.
4. If code contradicts a spec statement, stop that task, write the finding to `docs/decisions/FINDINGS.md`, and continue with the next task.
5. Never mark a DR as ACCEPTED. Only Albert does that.

## Task A — Verify the code against the specs (report only)
Read `engine/` and report in `docs/decisions/FINDINGS.md`:
1. Do review attempts change `ability_elo`? (DR-002; answers doc 04 §5.1 vs §5.4.)
2. Is `hints_used` ignored in `max_tier_correct` updates? (doc 04 §2.1.)
3. Is `propagate_mastery_down` implemented? (doc 04 §7.1, pilot-blocking.)
4. Is `max_tier_correct` windowed? (DR-004.)
5. Does anything read `days_until_exam` from outside `EngineContext`? (doc 04 §2.4.)
6. Do `locale_variants` or `country_code` appear on nodes, items or misconceptions in the schema or content? (doc 02 L-2; doc 05.)
For each: file, line, current behaviour, and whether it matches v2.

## Task B — Add the new golden vectors (`engine/testdata/`)
Create the vectors listed as "(v2)" in doc 04 §12, with inputs and expected outputs derived from the spec text:
`mastery_hinted_tier3`, `mastery_blockers`, `elo_review_no_ability_update`, `exam_proximity_none`, `review_backlog_exam_window_telemetry`, `placement_propagates_prerequisites`, `placement_graph_floor`, `tutor_offer_triggers`, `pin_migration_preserves_state`, `forecast_band_not_point`, and the revised `interleave_cadence`.
Register them in the conformance runner. Vectors for unimplemented behaviour must be added as expected-failing (`skip: "pending DR-00X"`), not deleted.

## Task C — Engine changes that are already decided in the v2 text
Implement, each with its vector:
1. `max_tier_correct` updates only on qualifying, correct, `hints_used == 0` attempts.
2. `EngineContext` with `days_until_exam`, `frameworkId` (telemetry only); `None` ⇒ compression 1.0.
3. `PlacementResult.at_graph_floor` and telemetry `placement_at_graph_floor`.
4. Telemetry `review_backlog_in_exam_window` and `tutor_offer`.
5. I-11 assertion: a pin migration never mutates `NodeState`.
Do NOT implement items marked "proposed" in doc 04 (`correct_total`/interleave gate, `mastery_blockers`, `offer_tutor`) until DR-003 is ACCEPTED; add them behind a feature flag only if Albert asks.

## Task D — Content schema and CI (doc 02 §10, doc 05)
1. Remove `locale_variants` from the item schema and DB; add `hint_variants`, `printable`, and framework-keyed `item_localizations` / `content_localizations` (L-1).
2. Add a CI check that `country_code` exists only on frameworks (L-2). Build fails otherwise.
3. Add a CI check that any localization override changing a numeric answer is SymPy-verified (L-3).
4. Coverage gate counts items with status `reviewed` or later (doc 02 §6, doc 05 §7), minimum 15 per node and ≥5 at Tier 3 for publish.
5. Quality threshold uses `|difficulty_elo - item_seed| > 400` where `item_seed = node.difficulty_elo + tier_offset` (T1 −285, T2 −115, T3 +20).
6. Rule A-3 applies to maths and science only.
7. Rules A-9 (printable items only in teacher quizzes), A-10 (worked solutions only after the item closes), A-11 (each node has ≥2 auto-marked offline Tier-3 items) as content validators.
8. Framework schema: `framework_type` (`exam_board` | `standards_aligned`), nullable `exam_structure`, ordinal range −1..12.

## Task E — Cross-document sweep
1. Replace stale phase labels with the Product Plan roadmap labels (DR-008) in docs 01–05.
2. Add "I-1 through I-11" wherever invariants are enumerated.
3. Add a `Decision records:` line to each doc's Change Log citing the DR IDs it depends on (02: DR-015, DR-016, DR-017; 03: DR-009, DR-018; 04: DR-001 to DR-007, DR-010; 05: DR-010 to DR-014).
4. Check dangling references (doc 01 §3.8, doc 08, doc 09 §7, Plan §13.7). List any that do not exist in `FINDINGS.md`; do not fix them silently.

## Task F — Open items left for Albert (do not act)
DR-001 (prerequisite spine), DR-004 to DR-007 (need simulation or pilot data), DR-009 (80 vs 90 min/week in doc 01 §12), DR-010 (pending-attempt contract), DR-011 to DR-014, DR-016, DR-018. Just make sure each has its own file and is linked from the relevant doc's Decisions Needed list.

## Definition of done
- CI green with the new vectors (pending ones explicitly skipped with a DR reference).
- `FINDINGS.md` lists every mismatch between code and spec.
- No DR marked ACCEPTED.
- A summary in the final message: tasks done, tasks blocked and why, vectors added, files changed.
