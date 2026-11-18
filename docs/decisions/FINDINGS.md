# FINDINGS — Engine vs Spec v2 Verification

Generated: 2026-11-18  
Source: `questcademy-apply-changes-prompt.md` Task A

---

## Finding 1: Review attempts update `ability_elo` — MISMATCH

- **File:** `engine/src/elo.ts` ~line 266
- **Code:** `if (attempt.is_review) { kLearner /= 2; }` — applies half-K update, still updates `ability_elo`
- **Spec v2 §5.4:** "Review attempts do NOT update `ability_elo`"
- **Action:** Task C item C1-related fix; needs vector `elo_review_no_ability_update.json`

---

## Finding 2: `max_tier_correct` ignores `hints_used` — MISMATCH

- **File:** `engine/src/statemachine.ts` lines 220–223
- **Code:** `if (attempt.correct && attempt.difficulty_tier > newMaxTier) { newMaxTier = attempt.difficulty_tier; }` — no `hints_used === 0` check
- **Spec v2 §2.1:** "`max_tier_correct` MUST be updated only by a qualifying attempt that is correct with `hints_used == 0`"
- **Action:** Task C (fix); needs vector `mastery_hinted_tier3.json`

---

## Finding 3: `propagate_mastery_down` NOT implemented — KNOWN GAP

- **Confirmed absent** from `engine/src/placement.ts`
- **Spec v2 §7.1 note:** "Not implemented in `/engine` as of the 2026-08-14 note, and pilot-blocking"
- **Action:** Deferred — blocked on DR-001 (prerequisite spine pilot content scope)

---

## Finding 4: `max_tier_correct` is NOT windowed — OPEN / DR-004

- It is a simple max field, never reset per window
- **Spec v2 §2.1 open question:** "it is not windowed, so a Tier-3 correct from long ago still counts"
- **Action:** Needs Albert's decision (DR-004) before any change

---

## Finding 5: `days_until_exam` NOT in `EngineContext` — MISMATCH

- **File:** `engine/src/state.ts` `EngineContext` interface (lines 154–158)
- **Code:** `EngineContext` has only `now` and `rng`; `daysUntilExam` and `frameworkId` are absent
- **Spec v2 §2.4:** adds `daysUntilExam?: number` and `frameworkId?: string` to `EngineContext`
- **Note:** SRS module uses `examWindow` as a direct parameter, bypassing context entirely
- **Action:** Task C item C2 fix; needs vector `exam_proximity_none.json`

---

## Finding 6: `locale_variants` present in item schema (should be removed) — MISMATCH

- **Spec v2** (doc 05 Change Log §1 and Task D §1): remove `locale_variants` from item schema/DB; add `hint_variants`, `printable`, and framework-keyed localizations
- **Action:** Task D item D1

---

## Finding 7: I-11 IS implemented — MATCH (with gap)

- **File:** `engine/src/invariants.ts` lines 391–431: `checkI11()` exists and is implemented
- **Gap:** Needs golden vector `pin_migration_preserves_state.json` (Task B)
- **Action:** Add missing golden vector in Task B

---

## Finding 8: `offer_tutor` Decision action missing — INTENTIONALLY DEFERRED

- **File:** `engine/src/state.ts` — `DecisionAction` type lacks `offer_tutor`
- **Spec v2 §2.3 and §9.1:** `offer_tutor` is marked "(v2, proposed)"
- **Action:** Do NOT implement until DR-003 is ACCEPTED; vector `tutor_offer_triggers.json` added with skip annotation

---

## Finding 9: `PlacementResult` lacks `at_graph_floor` boolean — MISMATCH

- **File:** `engine/src/state.ts` `PlacementResult` interface (lines 260–269)
- **Spec v2 §7.1:** adds `at_graph_floor: boolean` to `PlacementResult`
- **Action:** Task C item C3 fix; needs vector `placement_graph_floor.json`

---

## Finding 10: Interleaving does NOT gate on `correct_total >= 2` — INTENTIONALLY DEFERRED

- **File:** `engine/src/selection.ts` line 360 — only checks `items_since_review >= 3`; `correct_total` field does not exist on `NodeState`
- **Spec v2 §6 step 1:** gating condition is marked "(v2, proposed)"
- **Action:** Do NOT implement until DR-003 is ACCEPTED; existing vector `interleave_cadence.json` annotated with skip

---

## Summary Table

| # | Type | Description | Task |
|---|------|-------------|------|
| 1 | MISMATCH | Review attempts still update `ability_elo` | C (C1) |
| 2 | MISMATCH | `max_tier_correct` ignores `hints_used` | C |
| 3 | KNOWN GAP | `propagate_mastery_down` not implemented | Deferred (DR-001) |
| 4 | OPEN | `max_tier_correct` not windowed | Deferred (DR-004) |
| 5 | MISMATCH | `daysUntilExam`/`frameworkId` absent from `EngineContext` | C (C2) |
| 6 | MISMATCH | `locale_variants` still in item schema | D (D1) |
| 7 | MATCH+GAP | I-11 implemented; golden vector missing | B |
| 8 | DEFERRED | `offer_tutor` action not in `DecisionAction` | Deferred (DR-003) |
| 9 | MISMATCH | `PlacementResult` missing `at_graph_floor` | C (C3) |
| 10 | DEFERRED | Interleaving `correct_total` gate not implemented | Deferred (DR-003) |

---

## Dangling References Audit (Task E4)

As instructed by Task E4, cross-document references were audited across all specifications and verified against existing repository documents:

1. **`doc 01 §3.8` (Dangling Reference):**
   - **Locations:** `docs/02-curriculum-framework-spec.md` line 204, `docs/05-assessment-item-spec.md` line 410.
   - **Finding:** Cites "mock exam generation (doc 01 §3.8)". The repository does not contain a file named `01-*.md`. The canonical product plan is now `docs/00-product-plan.md` (`00-product-plan.md`). In `00-product-plan.md`, mock exam generation and assessment structures are described in §3 and §6, but no §3.8 exists.
   - **Status:** Dangling reference to legacy doc 01 section numbering. Needs resolution to `docs/00-product-plan.md §3 / §6`.

2. **`doc 08` (Missing Document):**
   - **Locations:** `docs/02-curriculum-framework-spec.md` lines 273, 275 (`CurriculumExtractor`, `CurriculumMapper`), `docs/05-assessment-item-spec.md` line 381 (`MarkingService`).
   - **Finding:** Cites `doc 08` as the specification for AI content pipelines and marking services. No `08-*.md` document exists in `docs/` (only docs 00, 02, 03, 04, 05, 10 exist). The corresponding implementations exist in `backend/app/ai/tools/` and `backend/app/ai/pipelines/`.
   - **Status:** Dangling document citation. Needs doc 08 specification authoring or citation update to point to backend service architecture.

3. **`doc 09 §7` and `doc 09 §4` (Missing Document):**
   - **Locations:** `docs/02-curriculum-framework-spec.md` line 279 ("Country context guide (doc 09 §7)"), `docs/03-learning-science-spec.md` line 269 ("The authoring rules in doc 09"), `docs/05-assessment-item-spec.md` lines 155, 662 ("Distractor rules (see doc 09 §4)").
   - **Finding:** Cites `doc 09` as the Content Authoring & Localization Guide. No `09-*.md` file exists in `docs/`.
   - **Status:** Dangling document citation. Content authoring guidelines are partially embedded in `05-assessment-item-spec.md` and `00-product-plan.md §13`.

4. **`Plan §13.7` (Non-existent Plan Subsection):**
   - **Locations:** `docs/02-curriculum-framework-spec.md` lines 224, 386 ("non-WAEC market (Product Plan §13.7)").
   - **Finding:** Cites `Product Plan §13.7` for non-WAEC expansion triggers. In `docs/00-product-plan.md` (`00-product-plan.md`), Section 13 covers Content Pipeline & Localization, ending at §13.6. Expansion and non-WAEC market sequencing are defined in §10.9 and §18 (Roadmap M8+).
   - **Status:** Dangling subsection reference. Should be updated to cite `docs/00-product-plan.md §10.9` and `§18`.

---

## Update — documentation pass, 2026-11-18 (later)

### Status of Findings 1–10 re-checked against the code

| # | Status now | Evidence |
|---|---|---|
| 1 | Open, blocked on DR-002 | `engine/src/elo.ts` still halves K for review attempts; `elo_review_no_ability_update.json` is skipped |
| 2 | Fixed | `statemachine.ts` now requires `hints_used === 0` and a qualifying attempt; vector `mastery_hinted_tier3` exists |
| 3 | Partly done | `propagateMasteryDown` exists in `placement.ts`; its vector `placement_propagates_prerequisites` is skipped pending DR-001 |
| 4 | Open, DR-004 | |
| 5 | Fixed | `EngineContext` has `daysUntilExam` and `frameworkId` |
| 6 | Fixed in the schema | Migration 003 drops `locale_variants`; migration 002 still creates it (history). Old mentions remain only in the superseded docs |
| 7 | Fixed | `pin_migration_preserves_state` vector present and passing |
| 8, 10 | Deferred, DR-003 | |
| 9 | Fixed | `PlacementResult.at_graph_floor` present |

Engine suite on this date: 162 passed, 5 skipped (the skipped ones are the DR-gated vectors).

### New findings

| # | Finding | Where |
|---|---|---|
| 11 | Doc 04 §11 lists I-1 to I-11 but the engine implements `checkI12` and plan/Task 7 describe I-12 ("engine output is framework-agnostic", vector `determinism_across_frameworks`). Doc 04 has no I-12 row. **Resolved 2026-11-18:** I-12 row and vector added to doc 04 §11, §12; "I-1 through I-11" changed to "I-1 through I-12" in the plan and tasks. | `engine/src/invariants.ts`, doc 04 §11 |
| 12 | The docs cited by number in the v2 specs did not exist: 01, 06, 07, 08, 09, 11. Drafted this pass (v0.1/v1, every undecided point marked PROPOSED). | docs/01, 06, 07, 08, 09, 11 |
| 13 | "Doc 11" was used for tech stack, for the analytics taxonomy, and (plan §21.1) for the teacher spec. Resolved: 11 = tech stack and analytics, 12 = teacher product, 13 = safety and privacy. **Resolved:** plan §21.1 paths corrected. | plan §21.1 |
| 14 | Doc 10 §2 named directories that never existed (`/client-android`, `/client-web`, `/server`). Corrected to the real layout. "Plan §13 (Scope Decisions)" no longer exists; reworded. | doc 10 §2, §6 |
| 15 | Mobile `engine_binding.dart` re-implements mastery and Elo; web sync is simulated. Both contradict `docs/sync-contract.md`. | mobile/, web/ |
| 16 | Web calls `/api/learners/attempts` and `/api/tutor/chat`; the backend serves neither. The web tutor is a free-chat surface, contrary to doc 03 §12A. Mock-exam list is hard-coded and includes a Paper 2; the progress page shows an 80-minute target (DR-009). | web/src |
| 17 | Neither renderer uses KaTeX, contrary to doc 05 (all math in KaTeX). | web/, mobile/ |
| 18 | Admin objectives-extract endpoint passes arguments `extract_objectives` does not accept (would 500); admin `GET /costs` calls `get_cost_breakdown` with arguments it does not accept. | backend/app/api/admin.py |
| 19 | Item status spelling: model CHECK uses `piloting`; spec and `framework_service` use `piloted`. | backend models, doc 05 §7 |
| 20 | `difficulty_elo` on nodes is never written; the doc 04 §5.1 derivation is unimplemented on the server. | doc 07 §3 |
| 21 | Doc 04 cites "doc 07 §5/§8" for remediation-dedup state and pending attempts; no spec or table defines either. | doc 07 §5.4 |
| 22 | Content CI installs too few Python packages (no `celery`), so its full-backend-test gate would fail on a clean runner. | .github/workflows/content-ci.yml |
| 23 | Mapper prompt's M-1..M-5 differ from doc 02 §3; item tier split yields 4 Tier-3 per 20, below doc 05 §8; Pipeline D resets approved overrides to pending; limiter defaults are fail-open. | doc 08 Decisions Needed |

### Dangling references (Task E4) — resolution

| Reference | Now |
|---|---|
| doc 01 §3.8, §4.1, §5.1, §12, §13.3, §1 | Resolved by `docs/01-product-and-delivery-spec.md` (all cited sections exist) |
| doc 06 §6, §11 | Resolved by `docs/06-offline-delivery-and-degradation-spec.md` |
| doc 07 §3 | Resolved by `docs/07-data-model-spec.md` §3. Doc 07 §5/§8 as cited by doc 04 for remediation dedup and pending attempts is still undefined (finding 21) |
| doc 08 | Resolved by `docs/08-ai-services-spec.md` |
| doc 09 §4, §7 | Resolved by `docs/09-authoring-rules.md` §4 and §7 |
| doc 11 (tech stack, analytics taxonomy) | Resolved by `docs/11-tech-stack-and-analytics-spec.md`; doc 10 now cites §5 |
| Plan §13.7 | Re-pointed in doc 02 to plan §10.9 and §18 (2026-11-18) |
| Plan §21.1 file names | Corrected (finding 13) |

Citation re-pointing in doc 02 and the I-12 addition to doc 04 were made on the owner's instruction on 2026-11-18; docs 03 and 05 text was not changed beyond the DR links.

### Decisions

Findings 1, 3, 4, 8 and 10, and the Decisions Needed lists in docs 01-13, were decided on 2026-11-18 (DR-001 to DR-019). The code changes they imply are in `IMPLEMENTATION-FOLLOWUPS.md` and are not yet made, so findings 1, 3 and 18-23 remain code defects until then.
