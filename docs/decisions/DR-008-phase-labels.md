# DR-008 — Align Phase Labels with Product Plan Roadmap (M1–M8)

**Status:** ACCEPTED (see Decision below)
**Date:** 2026-11-18
**Depends on:** docs/00-product-plan.md §18, docs/02-curriculum-framework-spec.md, docs/04-learning-engine-spec.md

## Context
Legacy documentation references 'Phase 1', 'Phase 2', and 'Phase 3'. The canonical Product Plan (`00-product-plan.md` §18) defines milestones M1 through M8. Cross-spec references need harmonization.

## Decision needed
Formally align all milestone and phase terminology across specs 01–05 to use the M1–M8 Product Plan roadmap labels.

## Options
Option A: Replace all occurrences of Phase 1/2/3 with corresponding M1–M8 milestone tags.
Option B: Maintain a translation table in docs/00-product-plan.md.

## Inventory (added 2026-11-18, documentation pass — informs the decision; no label has been changed)

"Phase" is used in three unrelated senses, so a mechanical Phase-to-M-label replacement (Option A) would be wrong in places:

| Sense | Where | Examples |
|---|---|---|
| Pilot scope | plan §17, §18, §20 | "Phase 0 pilot", "Phase 0 exit criteria" (maps to roadmap M6–M7) |
| Market expansion order | plan §10.9; doc 02 §8 | Phase 2 Sierra Leone, Phase 3 Nigeria, Phase 4 Nigeria state boards, Phase 5+ other WAEC markets |
| Algorithm / content maturity | doc 04 §5, §8.1, §10; doc 05; plan §8 | "Elo (Phase 1)", "BKT (Phase 3)", "refit FSRS weights at Phase 3 (≥ 500k reviews)", "at Phase 1 exit", "Phase 1 target ~150 misconceptions", "Phase 4 senior secondary" item types |

The roadmap (plan §18) has M1–M8 plus a Phase 0 pilot at M6, but no M-label corresponds to "Phase 1" in the third sense (it reads as the first content phase, roughly M3–M5), "Phase 3" (data volume, not a date), or "Phase 4 / senior secondary" (not scheduled).

Recommended shape (for the owner to accept or reject): Option B with a translation table in plan §18, plus renaming the algorithm/content-maturity uses to data-volume triggers (for example "refit at ≥ 500k reviews") instead of phase numbers, since those are not calendar milestones.

---

## Decision (2026-11-18)

**Status:** ACCEPTED

Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option. The owner may reverse any of these by superseding the record.

**Decision.** Option B, with the renaming that the inventory recommended. (1) Plan §18 carries a translation table: Phase 0 pilot = M6-M7; expansion order labels (Phase 2 Sierra Leone, Phase 3 Nigeria, Phase 4 Nigeria state boards) are kept and renamed 'Expansion E2, E3, E4' with M8+ as their window. (2) Algorithm and content-maturity uses of 'Phase N' become data-volume or scope triggers.

**Why.** Phase is used in three unrelated senses (see the inventory below); a mechanical replacement with M-labels would make 'refit FSRS at Phase 3' read as a date when it is a data-volume condition.

**Consequences and follow-up.** Edits made in the documentation pass: plan §18 translation table; doc 04 §5 and §10 titles and the FSRS refit sentence; doc 05 and doc 02 labels per the table in DR-019 section 'Label edits'.

**Revisit.** None.
