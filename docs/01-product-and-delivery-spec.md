# 01 — Product and Delivery Specification

**Owner:** Product · **Change control:** changes to §1, §5 and §13.3 need a decision record (doc 10 §6)
**Version:** v0.1 DRAFT (2026-11-18) — first writing. Every statement is sourced inline; anything not sourced is marked **PROPOSED**. Individual decisions carry their own status in the Decisions section. Decisions resolved 2026-11-18 (see the Decisions section; DR-019).

> What Questcademy is as a product, what must be true of how it is delivered, and what it deliberately does not do. This document **summarises and indexes**; it does not override docs 02–05 or 10. Where this document and a spec doc disagree, the spec doc wins (doc 00 preamble). Offline and degradation behaviour is owned by doc 06.

**Why this document exists.** Docs 02, 03, 04, 05 and 10 cite "doc 01" sections (§1, §3.2, §3.8, §4.1, §5.1, §7.2, §8, §12, §13.3, §14) and doc 00 (the plan) used to be its only home. The numbering below is fixed so each citation resolves. Where a citation is the only source for a section's content, the section says exactly what the citation implies and no more.

**Document map (fixed numbering):** 00 plan · 01 this document · 02 framework · 03 learning science · 04 engine · 05 assessment · 06 offline and delivery · 07 data model · 08 AI services · 09 authoring rules · 10 engineering standards · 11 tech stack and analytics · 12 teacher product · 13 safety and privacy. Docs 07, 08, 09, 11 and 13 may not yet exist as files; this document points at them only for scope.

---

## 1. Product definition and constraints

Questcademy is a mastery-based exam-preparation platform built on a canonical, grade-agnostic skill graph and a deterministic learning engine (doc 00, Introduction). Learners are placed at their actual frontier, advance only through the mastery predicate, and are served through a client that must work offline.

**Standing constraints.** These bound every other section.

| ID | Constraint | Source |
|---|---|---|
| C-1 | **No video in the default delivery path.** `VideoBlock` exists as a type but is never in the default path. A lesson containing one must have a genuinely equivalent non-video path; video is opt-in or wifi-gated and not bundled by default. A "Video Question" item type is excluded. | doc 05 §1 (Universal rules), §3; doc 06 §11; REJECTED_FEATURES R-18 |
| C-2 | The engine is pure, deterministic, shared between client and server, and offline-capable: every decision is computable from local state alone. | doc 04 E-1..E-4; doc 00 Introduction §5 |
| C-3 | Reference device is a 2 GB RAM, Android 8 handset. Cold start < 2.5 s, memory < 180 MB, bundle ≤ 2 MB. Any feature that fails on it does not ship. | doc 10 §5, §8 |
| C-4 | Dignity: the UI never shows grade level, percentile, rank, comparison to peers, or "behind/ahead" language, to learners or teachers. | doc 03 §2; doc 00 §4.2, §14.2 |
| C-5 | The two-session mastery predicate is never relaxed for engagement. | doc 00 Introduction §2, §4.1; doc 03 §3 |
| C-6 | No new runtime AI (model) dependency on a Tier 0 path (§5.1). The engine decides *when* to escalate; the model only responds. | doc 10 §6, §9; doc 04 §9; doc 03 §12A |
| C-7 | No client implements engine predicates; clients call the one engine build. | doc 04 E-3; sync-contract.md "Open work"; tasks.md Task 12.12 |

**Implementation status.** C-7 is violated by the current mobile client (§15).

## 2. Users and surfaces

| User | Surface | Source |
|---|---|---|
| Learner | Web app (Next.js, PWA) and Flutter app (Android, iOS) | doc 00 §4–§5; tasks.md Tasks 10, 11 |
| Curriculum team / admin | Content Studio (web) | doc 00 §5.4, §6 |
| Classroom teacher | Teacher Toolkit and class dashboard — owned by doc 12 | doc 00 §12, §14 |
| Parent | Weekly summary, later; consent flows — owned by doc 13 | doc 00 §14.4, §16 |

Teachers are the primary distribution channel (doc 00 Introduction; §12.3). Dose is delivered through teacher-scheduled sessions; an optional learner-initiated feature is never the primary loop (doc 03 §11).

## 3. Learner experience

Flow: onboarding → placement → learning path → node reader → practice → mastery gate → FSRS review → dashboard (doc 00 §4). Engine rules live in doc 04; this section states the product behaviour only.

### 3.1 Onboarding and placement

- The framework picker lists `active` frameworks only; a learner may not choose a framework in any other state (doc 00 §7.9.1; tasks.md Task 10.2).
- Placement is a resumable binary search over the prerequisite graph, 15–20 items, hard cap 25. The learner sees no score, grade or comparison; copy is "We're finding your starting point." Placement attempts never count toward mastery (doc 00 §7.3; doc 04 §7).
- Optional exam date sets the exam window used for FSRS compression (tasks.md Task 10.2; doc 04 §8).

### 3.2 Learning path

- A node is **available** when all its hard prerequisites are secured (mastered, needs_review or relearning) (doc 04 I-1). The **frontier** is the available set minus the secured ones (doc 04 test vector `availability_chain_unlocks`, citing this section).
- Exactly one node is shown as the recommended "Next up" (doc 00 §15.1). Nodes are grouped by topic for navigation only; topic never becomes a second dependency system (doc 00 §14.1).
- No grade band is rendered. Locked nodes explain the blocking prerequisite by `learner_title`, never `node_id` (tasks.md Task 10.3).

### 3.3 Node reader

Renders `skill_node_content` through the single shared `BlockRenderer`. Worked examples reveal one step at a time. There is no "Mark Complete" button; progression follows the mastery predicate only (tasks.md Task 10.4). Lesson blocks and the ungated `CheckBlock` are specified in doc 06 §11.

### 3.4 Practice

- Items are selected by the engine each turn (doc 04 §6). Target success band 0.75–0.85; every 4th item from the review queue; remediation override on a repeated misconception; Tier 3 withheld until 2 correct at Tier 2 (doc 00 §4, §7.2).
- Exactly 3 hint levels; level 3 never reveals the answer (doc 05 §5). No negative marking (R-5).
- Feedback is immediate and misconception-specific, using `misconceptions.learner_facing_name` (tasks.md Task 10.5).

### 3.5 Mastery gate

Verbatim in doc 04 §4: ≥ 4 of the last 5 qualifying attempts correct and unhinted; ≥ 1 correct at Tier 3; ≥ 2 distinct correct days that are non-consecutive. Not restated here so there is one source.

### 3.6 Review

FSRS scheduling, daily review cap 8 (hard), exam-aware interval compression, priority relearning > overdue > exam-critical > due (doc 04 §8, I-6; doc 00 §4.3).

### 3.7 Tutor

The tutor is inline in the practice loop, not a side panel; the engine decides when it appears; it is Socratic and never gives the final answer to a live item; numeric claims are SymPy-checked; sessions are turn-capped (doc 00 §13.1; doc 03 §12A). Offline behaviour: doc 06 §10.

### 3.8 Mock exam generation

A mock exam is generated from the learner's framework `exam_structure`:

- **Source of structure.** `ExamStructure.papers[]` supplies paper id, name, item types, duration in minutes, marks and calculator rule; `grading_scale` lives on the framework (doc 02 §3.3). The exam structure "drives mock exam generation and predicted grades" (doc 02 §3.3, citing this section).
- **Mastery isolation.** Mock attempts set `is_exam = true` and never count toward the mastery window (tasks.md Task 10.7; doc 04 §4). How exam attempts affect Elo is doc 04 §5.4's rule, not restated here.
- **Part-level attribution.** A structured multi-part item yields one attempt per part, each attributed to that part's node; this is what makes mock-exam gap reports work (doc 05 §3.12, §4).
- **Report.** Paper-by-paper breakdown, per-node performance, and the learner's predicted score as a **band**, never a rank or percentile (tasks.md Task 10.7; doc 03 §11). The timer is client-side and validated server-side on submission (tasks.md Task 10.7).
- **Scope until structured types ship.** BECE and WAEC are heavily structured-response, which is why item types 3.11 and 3.12 are on the roadmap. Until they and a deferred-marking contract ship, generated mock papers cover **Paper 1 (objective) only**, and teacher-facing mock papers must say so and must not be presented as a full BECE paper (doc 02 §3.3; doc 00 §12.2; doc 05 §3, §3.12; DR-010).
- **Accommodation.** Timed items in exam mode must be extendable via an accommodation flag (doc 05 §6).

### 3.9 Progress dashboard

Node mastery heatmap by topic, FSRS preview for the next 7 days, predicted exam band, weekly minutes against the goal (§12). No grade level, rank, percentile or peer comparison (tasks.md Task 10.8).

### 3.10 Profile

Learner details, framework pin with a "change framework" flow that creates a pin migration and shows mastery is preserved (doc 00 §2.13, I-11), exam date, notification preferences, accessibility settings, sign out and delete account (tasks.md Task 10.9).

## 4. Content pipeline

### 4.1 Stages

Doc 05 §6 and §7 cite stage numbers: "an item failing **stage 10** of the pipeline does not ship", and **stage 11** is Localization. No source lists stages 1–9. The only normative content below is therefore stage 10 and stage 11; the earlier rows are a **PROPOSED** mapping onto the pipelines already described in doc 00 §3 and are not binding until a decision is recorded (§16, item 4).

| Stage | Name | Status | Basis |
|---|---|---|---|
| 1 | Node authoring (Pipeline A1) | PROPOSED | doc 00 §3.1: atomicity test, `draft`, human review queue |
| 2 | Node approval (curriculum lead) | PROPOSED | doc 00 §3.1, §6 |
| 3 | Content generation (Pipeline A2, Mode 1) | PROPOSED | doc 00 §3.2 |
| 4 | Content validation (KaTeX, reading level, ≥ 3 worked examples) | PROPOSED | doc 00 §3.2, §6.1 |
| 5 | Content review and publish | PROPOSED | doc 00 §6.1 |
| 6 | Item generation (Pipeline B) | PROPOSED | doc 00 §3.3 |
| 7 | Machine checks: SymPy answer agreement, distractor tagging (A-2), reading level (A-3), self-evaluation ≥ 0.7, dedup | PROPOSED | doc 00 §3.3 steps 3–7 |
| 8 | Misconception tagging → `tagged` | PROPOSED | doc 05 §7 |
| 9 | Human review → `reviewed` | PROPOSED | doc 05 §7 |
| **10** | **Item gate** — an item that fails does not ship | **Normative by citation** | doc 05 §6 (citing this section) |
| **11** | **Localization** — per-framework overlay; a pipeline stage, not an item status | **Normative by citation** | doc 05 §7 (citing this section) |

Pipeline B in doc 00 numbers its own localization step "10" (§3.3); that numbering is Pipeline B's, not this table's.

### 4.2 Stage 10 — item gate

The sources place these conditions on whether an item (and its node) ships. Each is already specified elsewhere; this section only gathers them.

| Condition | Source |
|---|---|
| Every node has ≥ 15 published items and ≥ 5 at Tier 3 ("published" = status `reviewed` or later: `reviewed`, `piloted`, `live`, `calibrating`, `calibrated`) | doc 10 §5; doc 05 §7, §8 |
| 100% of distractors tagged with a `misconception_id` | doc 10 §5; doc 05 A-2 |
| Exactly 3 hints (levels 1–3) and a worked solution | doc 05 §1, §5 |
| ≥ 2 Tier-3 items per node that are auto-marked and offline-capable | doc 05 A-11 |
| An item with `offline_capable = false` never appears in the mastery path | doc 05 A-6 |
| Accessibility requirements met (alt text, MathML, speech text, ≥ 44 dp targets, tap fallback for drag, etc.) | doc 05 §6 |
| All media assets exist and are optimised; `media_bytes` within the bundle budget | doc 10 §5; doc 05 §1 |
| The item's node exists in the slice | doc 10 §5 |
| Graph is acyclic | doc 10 §5; doc 04 I-7 |

The **serve floor** (8 items, ≥ 2 Tier 3) is a different number: a runtime condition below which the engine emits `content_gap`, not a publish gate (doc 05 §8).

Whether localized overrides are re-gated at stage 10 is not specified (§16, item 4).

### 4.3 Human review

Governance changes (new node, prerequisite change, deprecation, framework version, objective-to-node mapping, grade-band definition) require curriculum-lead approval; **bulk approval of mappings is prohibited** (doc 00 §6, §3.4; doc 02 §9; R-16). Auto-reject conditions are in doc 00 §6.1. Authoring rules proper belong to doc 09.

## 5. Delivery

### 5.1 Delivery tiers

The tiers say which paths must work with no network and no model call. Only the tier *names* and the two fixed points below are in the sources: a "Tier 0 path" must have no model-call dependency (doc 10 §6, §9; doc 00 §13.1 rule 7; doc 03 §12A), and the hint ladder is precomputed at authoring and shipped in the bundle as **Tier 1** (doc 05 §5, citing this section). The remaining detail is **PROPOSED**.

| Tier | Meaning | Contents | Status |
|---|---|---|---|
| **0** | Must work with **no network and no model call**. A model call may never be added to a Tier 0 path. | Engine decisions (selection, mastery, Elo, FSRS, review queue, placement, escalation decision); attempt capture and local queue; rendering of bundled content; local marking of auto-marked item types | Sourced: no-model-call rule (doc 10 §6, §9; doc 04 E-4). Enumeration PROPOSED |
| **1** | **Precomputed at authoring time and shipped in the bundle.** AI is used when authoring, never at runtime. Works offline. | The 3-level hint ladder; worked solutions | Sourced for hints (doc 05 §5) and worked solutions (doc 00 §13.1 rule 4, doc 05 A-10). Remainder PROPOSED |
| **2** | Needs the network and/or a runtime model call. Absence degrades to Tier 1, never blocks a Tier 0 path. | Live tutor dialogue, AI marking of deferred responses, image OCR, audio upload, online-only item types | **PROPOSED** — no source defines Tier 2 (§16, item 1) |

**What the tier rule is *not*:** it does not say what happens when network drops mid-session. That is the degradation ladder, doc 06 §6.

### 5.2 Budgets

| Budget | Value | Source |
|---|---|---|
| Cold start | < 2.5 s on the reference device | doc 10 §5, §8 |
| Memory | < 180 MB on the reference device | doc 10 §5 |
| Bundle | ≤ 2 MB (see ambiguity, §16 item 3) | doc 10 §5; tasks.md Task 10.1, 10.13 |
| Engine operations | `select_next_item` P50 4 ms / P99 15 ms; `build_review_queue` P99 60 ms; rehydrate 400 nodes P99 250 ms (2 GB Android) | doc 04 §13 |
| Android minimum | `minSdkVersion` 26 (Android 8) | tasks.md Task 11.12 |
| Cached item media | items ≤ 40 KB media in the web service-worker pool | tasks.md Task 10.1 |

Reference device: physically on the desk; weekly manual pass of placement, a full session, offline mode, profile switch and sync-after-offline; budgets measured on it, not an emulator (doc 10 §8).

### 5.3 Where the detail lives

Bundle composition, rollout, the degradation ladder, offline capture, deferred marking and lesson-block delivery: **doc 06**. Sync reconciliation: `docs/sync-contract.md`. CI gates: doc 10 §5.

## 6. Platforms

- **Web:** Next.js App Router, TypeScript strict, loads the engine from the engine package; service worker caches shell, active node content, item pool, engine binary and KaTeX fonts (tasks.md Task 10.1).
- **Mobile:** one Flutter codebase for Android and iOS; one engine binding, "exactly one binding and it is the same engine source" (tasks.md Task 11.1).
- **Parity:** the same `BlockRenderer`/`ItemRenderer` are the only sanctioned renderers on web and in Content Studio; Flutter implements them once and is conformance-checked against `shared/renderer-fixtures` (tasks.md Tasks 10, 11.9). Golden attempt-log hash must match across server, web and mobile (sync-contract.md §9).
- **Engine runtime:** doc 04 §5.2 names V8 (server) and Hermes (client). Doc 11 governs where the plan's examples differ (doc 00 §7). Doc 11 is not yet written.

## 7. Content tracks

### 7.1 Default bundle media

Every block type except `VideoBlock` is bundled by default (doc 05 §1 note, via doc 06 §11). Math renders from KaTeX with offline fonts (tasks.md Task 11.5).

### 7.2 Audio bundle track

The audio response item (doc 05 §3.16) records locally and uploads compressed audio (Opus, about 8 KB/s) on sync. It is called "the single highest-impact item type for lower primary" and "the reason the audio bundle track exists" (doc 05 §3.16, citing this section). That is **all** the sources say about the track: format, size budget, how it relates to the ≤ 2 MB gate, and whether prompts are bundled are unspecified (§16, item 5). `AudioBlock` requires a transcript (doc 05 §1).

## 8. Safety and consent (scope only)

The product serves minors. Doc 13 owns the requirements; the plan's current statement is doc 00 §16. Points other docs cite here: explicit parental consent is required for voice capture (doc 05 §3.16), with a retention limit, no model training on voice data, and deletion on request (doc 00 §16); legal counsel confirms per-country obligations and a data-protection impact assessment is completed before the first pilot school (doc 00 §16.1–16.2).

## 9. Teachers and classroom

Owned by doc 12. Constraints that bind this document: teacher tools draw only from items at `reviewed` or later; the dashboard shows what to teach next and which misconception to address, never ranks children; classes and assignments never alter `learner_node_state` or a framework pin (doc 00 §12.2, §14).

## 10. Scope and phasing

| Phase 0 pilot | Scope |
|---|---|
| Country / board / band | Ghana · WAEC BECE · JSS2 Mathematics |
| Nodes | ~50 JSS2 nodes plus a prerequisite spine so placement can find a frontier below JSS2 |
| Items | ≥ 15 per node, ≥ 5 Tier 3, `reviewed` or later |
| Platform | Web and Android, offline-capable |
| Users | 2 pilot schools, onboarded via the Teacher Toolkit |
| Features | Placement, practice, mastery gate, FSRS review, inline tutor, teacher dashboard |

Everything else stays specified but **not built** until Phase 0 exit criteria are met (doc 00 §17.1). Exit criteria: doc 00 §17.2. Roadmap M1–M8: doc 00 §18. Spine content scope is open (DR-001); phase vs milestone labels are open (DR-008). US and ELA are planned and out of Phase 0 scope (doc 02 §8; doc 05 §3).

## 11. Measure of success

The single success measure is **30-day retrieval retention**: whether a learner who mastered a node can still demonstrate it a month later (doc 00 Introduction). Instrumental measures: observed success rate in the 0.72–0.86 band (automatic rollout halt outside it, doc 10 §7); escalation rate per node < 10% (doc 04 §9); tutor open rate and post-tutor correctness (doc 00 §13.3); day-1/7/30 return, sessions per week, review completion, placement completion, time to first mastery (doc 00 §15.2). Engagement is never reported without a paired mastery figure (R-12).

## 12. Dose — weekly minutes

**Status: DECIDED 2026-11-18 (DR-009): 90 minutes a week for P4-JSS3, 60 for P1-P3, minutes only.**

| Claim | Value | Source |
|---|---|---|
| Studied dose | 12 hours over 8 weeks = **90 min/week**. Single district, bundled teacher-led intervention, developer-published report; dose-response is gradual, not a demonstrated threshold. | doc 03 §12 |
| Product goal before DR-009 | ≥ 80 min/week (about 10.7 hours over 8 weeks, just below the studied dose); superseded | doc 03 §12; tasks.md Tasks 10.8, 14 |
| Product goal now | **90 min/week for P4-JSS3; 60 for P1-P3 (provisional)** | DR-009 |
| Weekly goal expressed in minutes | Yes | doc 03 §12 |
| Learner-facing wording | "your goal", not "target" | tasks.md Task 10.8 |
| Session shape | Target 10-minute sessions; `est_minutes` 8–15 | doc 00 §15.1 |
| Nudge dependent on the goal | `dose_shortfall` fires when weekly minutes are below 80% of the learner's goal (72 min at a 90-minute goal) | tasks.md Task 14.1; DR-009 |

The goal remains a configuration parameter per band, not a constant in code. Dose is a precondition, not an outcome (doc 03 §12): minutes without mastery is the failure mode to avoid (doc 03 §11).

## 13. Engagement without gamification

### 13.1 Principle

Pull learners back with relevance and scheduling, not rewards. Any proposed engagement feature is checked against `docs/REJECTED_FEATURES.md` and justified in a decision record; the mastery predicate is never relaxed to move these numbers (doc 00 §15, §15.3).

### 13.2 Permitted mechanisms

| Mechanism | Constraint | Source |
|---|---|---|
| Due-date nudges tied to FSRS `due_at` and the 8/day cap | Opt-in; quiet hours; max 1/day (plan) — 3/day, 10/week caps and quiet hours 21:00–07:00 in Task 14; these differ (§16, item 6) | doc 00 §15.1; tasks.md Task 14.2 |
| "Next up" clarity | Exactly one recommended node; no grade or rank language | doc 00 §15.1 |
| Short sessions | Ends on a win or clear next step | doc 00 §15.1 |
| Teacher assignments | Recommendations only | doc 00 §14, §15.1 |
| Exam countdown | Calendar-aware framing | doc 00 §15.1 |
| Progress visibility | Mastery ring and a days-practised streak, not score; streak has grace days and is never the primary loop; class and school aggregates only | doc 00 §15.1; doc 03 §13 |

### 13.3 Rejected features

Index: `docs/REJECTED_FEATURES.md` (doc 03 wins on any difference). Doc 03 §11 cites this section for the first row.

| Rejected | Reason in brief | Source |
|---|---|---|
| Avatars, collectibles, virtual currency, mentor characters, seasonal events | Social accountability is the dominant dose driver; reward layers optimise engagement while learning stays flat; asset-heavy features are hostile to a 2 MB bundle on a shared 2 GB device | doc 03 §11 |
| Public leaderboards ranking individual children (and any teacher-facing ranking) | Demotivates the bottom half, the target population. Class and school aggregates only | doc 03 §13 |
| Learning styles; personality or learning-profile typing | No reliable effect; privacy liability for minors | doc 03 §13 |
| Negative marking | Teaches risk aversion; corrupts the ability signal | doc 03 §13 |
| Unguided discovery for novices; re-reading as the main activity | Underperforms explicit instruction / little learning | doc 03 §13 |
| Grade-paced progression | The core failure the product exists to fix | doc 03 §13 |
| Streak-only motivation | Constrained: grace days, days practised, never primary loop | doc 03 §13 |
| Unrestricted learner AI chat; side-panel tutor as primary AI surface | Lowers unaided performance; ignored when optional | doc 03 §12A, §13 |
| Video in the default delivery path | Bundle and device constraints (C-1) | doc 05 §1 |

Plan §15 wording on peer comparison and streaks is still to be reconciled with doc 03 (doc 03 Open items).

## 14. Defensibility

The deepest asset is the misconception taxonomy with **measured** prevalence across West African learners, mapped to nodes and remediations (doc 05 §9, citing this section). Prevalence stays null until response volume exists; a small pilot will not provide it (doc 05 §9). Other protected strengths: placement at the real frontier, the spacing-gated predicate, the canonical graph with framework mappings, the deterministic offline engine on a 2 GB phone (doc 00 §11.2). Competitor benchmarks are vendor-sourced and must be re-verified before external use (doc 00 §11).

## 15. Build status (verified against the repository, 2026-11-18)

| Area | Specified | Built |
|---|---|---|
| Engine (`engine/`) | doc 04 | Implemented with tests and golden vectors. Known gaps against spec v2: `propagate_mastery_down` absent (DR-001); `max_tier_correct` is not windowed (DR-004); `offer_tutor` and the `correct_total` interleave gate deferred (DR-003); see `decisions/FINDINGS.md` for the full list and the review-Elo, `EngineContext` and `at_graph_floor` mismatches |
| Backend | docs 02, 05, 08 | Framework layer, generation pipelines (node, content, item, localization, framework), content resolver, coverage and cost services, sync endpoints with engine sidecar (`engine-bridge/`). **Not built:** the student-facing API surface (progress, tests, tutor, dose), notifications, nudges, bundle build, real auth |
| Web | Task 10 | Student and admin screens exist, including a service worker (`web/public/sw.js`). Sync store still simulates replay with a timer; the mock-exam list is hard-coded and includes a Paper 2; the progress page shows "80 minutes target"; the client calls `/api/learners/attempts` and `/api/tutor/chat`, neither of which exists in the backend |
| Mobile | Task 11 | Screens exist. **`engine_binding.dart` re-implements mastery and Elo in Dart, contrary to C-7 and the sync contract.** Offline queue uses `shared_preferences`, not the local database Task 11.1 names |
| Teacher Toolkit, classroom, notifications | doc 12, Task 14 | Not built (no teacher routes) |
| Content bundle and `content-tools/` | doc 06 | Not built; no bundle-size, cold-start or memory gate exists in `.github/workflows` |

## 16. Decisions (resolved 2026-11-18)

Recorded in [DR-019](decisions/DR-019-documentation-set-decisions.md), accepted on the owner's delegated instruction. `PROPOSED` markers earlier in this document that concern these items are superseded by the table below. Provisional rows are to be tuned from pilot data; OPEN rows need a named owner. Code and schema consequences are listed in [IMPLEMENTATION-FOLLOWUPS.md](decisions/IMPLEMENTATION-FOLLOWUPS.md).

| ID | Decision | Status |
|---|---|---|
| DD-01-1 | **Tiers.** Three tiers. Tier 0: the engine, shipped content and everything a learner needs with no network and no model call. Tier 1: shipped, precomputed enhancements with a deterministic fallback (hint ladder, worked solutions). Tier 2: runtime network or model features (live tutor, marking, nudges, sync). The tutor is Tier 2 with the Tier 1 hint ladder as its fallback. Plan §13.1 rule 7 is reworded accordingly. | ACCEPTED |
| DD-01-2 | **Weekly minutes.** DR-009: 90 minutes a week for P4-JSS3, 60 for P1-P3, minutes only. | ACCEPTED |
| DD-01-3 | **What the 2 MB budget measures.** Three separate limits, all enforced in CI: app shell at most 2 MB gzipped excluding media (Task 10); content bundle for the learner's pinned slice (text, items, hints, solutions; excluding audio and video) at most 2 MB gzipped (doc 10 §5); each item's media at most 40 KB (A-5). Audio is outside both and is delivered on demand. | ACCEPTED |
| DD-01-4 | **Pipeline stages 1-9.** The mapping proposed in §4.1 is adopted as normative. Stage 10 also re-gates localized overrides (distractor tagging, math invariance, reading level). | ACCEPTED |
| DD-01-5 | **Audio track.** Out of Phase 0 scope (audio items are Phase-4, lower primary, doc 05 §3.16). Constraints now: never in the default bundle, downloaded on demand, Opus at about 8 KB/s (doc 05 §3.16). Format and size budget are set when audio items enter scope. | ACCEPTED (provisional) |
| DD-01-6 | **Nudge limits.** Per-learner nudges: at most 1 per day (plan §15.1). Absolute ceiling per recipient across all push: 3 per day and 10 per week (Task 14). Quiet hours 21:00-07:00 learner-local. Auto-pause after 4 ignored weeks. Teacher and parent digests are weekly. Opt-in throughout. | ACCEPTED |
| DD-01-7 | **Mobile engine binding.** Embed the built `/engine` bundle in an on-device JavaScript runtime and call it from Dart. A spike on the 2 GB reference device decides the runtime and must show `select_next_item` P99 under 15 ms (doc 04 E-6) and memory under 180 MB. Only if the spike fails may a Dart port be written, and then it must pass every golden vector and the 1000-attempt parity log (doc 04 E-3). Either way the current `engine_binding.dart` is deleted once its replacement passes, and `scripts/ci/check_no_client_engine_predicates.py` must go green. | ACCEPTED (provisional) |
| DD-01-8 | **Phase 0 scope.** DR-001. | ACCEPTED |
| DD-01-9 | **Phase labels.** DR-008. | ACCEPTED |

## Change Log

- v0.1 (2026-11-18): first writing. Created to resolve the citations in docs 02, 03, 04, 05 and 10 (§1, §3.2, §3.8, §4.1, §5.1, §7.2, §8, §12, §13.3, §14). Build status verified against `engine/`, `backend/`, `web/`, `mobile/`.

**Decision records:** DR-001, DR-003, DR-004, DR-008, DR-009, DR-010
