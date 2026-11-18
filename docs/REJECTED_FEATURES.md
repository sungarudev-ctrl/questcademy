# Rejected Features

Features and practices that are popular or requested, and that we have decided not to build. Recorded with the reason so they do not return as feature requests.

**Owner:** Product + Curriculum lead. **Source of truth:** `docs/03-learning-science-spec.md` §11, §12A, §13. This file is the quick index; if it and doc 03 differ, doc 03 wins.

**How to use it.** Any proposed engagement or AI feature is checked against this list before design work starts (plan §15.3, §21.3). If it matches a row, it needs a decision record that argues against the stated reason, not a PR description. Plan §11 states the standing rule: a feature must have a hypothesis for how it increases *mastery*, not just minutes.

| # | Rejected | Status | Reason (short) | Source |
|---|---|---|---|---|
| R-1 | Learning styles (visual / auditory / kinaesthetic matching) | Rejected | No reliable matching effect. We vary representation because it helps everyone. Never label a learner with a style. | doc 03 §13 |
| R-2 | Unguided discovery for novices | Rejected | Minimal guidance underperforms explicit instruction without prior knowledge. Appropriate after fluency. | doc 03 §13 |
| R-3 | Re-reading or re-watching as the main activity | Rejected | Feels productive, produces little (doc 03 §4). | doc 03 §13 |
| R-4 | Grade-paced progression | Rejected | The core failure the product exists to fix (doc 03 §2). | doc 03 §13 |
| R-5 | Negative marking | Rejected | Teaches risk aversion, harms lower-confidence learners, corrupts the ability signal. | doc 03 §13 |
| R-6 | Personality or learning-profile typing | Rejected | No predictive validity for instruction; a privacy liability for minors. | doc 03 §13 |
| R-7 | Public leaderboards ranking individual children | Rejected | Demotivates the bottom half, which is the target population. Class and school aggregates only. Also applies to any teacher-facing ranking of children. | doc 03 §13, §11 |
| R-8 | Avatars, collectibles, virtual currency, mentor characters, seasonal events | Rejected | Social accountability is the dominant dose driver here; reward layers optimise engagement while learning stays flat; asset-heavy features are hostile to a 2 MB bundle on a shared 2 GB device. | doc 03 §11 |
| R-9 | Streak-only motivation | Constrained | A streak is allowed only with grace days, showing days practised (not score), and never as the primary loop. | doc 03 §13; plan §15.1 |
| R-10 | Unrestricted AI chat for learners | Rejected | Unrestricted access raised practice scores and lowered later unaided performance (doc 03 §12A). | doc 03 §13 (v2) |
| R-11 | Optional side-panel tutor as the primary AI surface | Rejected | Optional tutors are ignored. The tutor is inline and engine-triggered (plan §13). | doc 03 §13 (v2) |
| R-12 | Engagement as a proxy for learning | Rejected | Any metric review must pair a minutes figure with a mastery figure. | doc 03 §13 (v2) |
| R-13 | Relaxing the two-session mastery gate to improve engagement | Rejected | The gate is what separates performance from learning (doc 04 §4). | master prompt §2, doc 04 §4 |
| R-14 | Showing grade level, percentile, rank, or "behind / ahead" language to learners or teachers | Rejected | Dignity constraint (doc 03 §2; plan §4.2, §14.2). | plan §4.2 |
| R-15 | A `grade_level` column on `skill_nodes` | Rejected | It is where a per-grade fork begins. Nodes carry `grade_band_hint` for placement seeding only (doc 02). | plan §1 |
| R-16 | Bulk approval of objective-to-node mappings | Rejected | A wrong mapping silently teaches the wrong thing to an exam candidate (doc 02 §9). | plan §3.4, §6 |
| R-17 | A model call on a Tier 0 path | Rejected | Offline-first determinism; the engine decides when, the model only responds. | doc 10 §6 |
| R-18 | Video in the default delivery path | Rejected | Bundle and device constraints (doc 05 §1, doc 01 §1). | doc 05 |

## Adding a row

1. State the proposal and who asked for it.
2. State the reason it fails the standing rule above, citing evidence.
3. Link the decision record. Rows are never deleted; a reversed decision gets a status change and a link to the record that reversed it.

## Change Log

- 2026-11-18: created from doc 03 §11, §12A, §13 and plan §4.2, §14.2, §15.3 (v2 documentation pass).

**Decision records:** DR-003, DR-018 (tutor surface), DR-009 (dose).
