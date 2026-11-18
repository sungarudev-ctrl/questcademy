# DR-019 — Decisions raised by the 2026-11-18 documentation set (docs 01, 06-09, 11-13)

**Status:** ACCEPTED, except rows marked OPEN or provisional
**Date:** 2026-11-18

**Authority:** Accepted on the instruction of the project owner (Albert), 2026-11-18, who delegated the choice of the best option for each item. The owner may supersede any row.

**Status vocabulary.** ACCEPTED: decided. ACCEPTED (provisional): decided, but a parameter or an assumption is to be tuned from pilot data or confirmed by someone else. OPEN: cannot be decided from the sources; named owner needed.

**Implementation.** These are documentation decisions. Where a decision requires a code or schema change it is listed in `IMPLEMENTATION-FOLLOWUPS.md`; none of those changes has been made.


## Doc 01

| ID | Topic | Decision | Status |
|---|---|---|---|
| DD-01-1 | Tiers | Three tiers. Tier 0: the engine, shipped content and everything a learner needs with no network and no model call. Tier 1: shipped, precomputed enhancements with a deterministic fallback (hint ladder, worked solutions). Tier 2: runtime network or model features (live tutor, marking, nudges, sync). The tutor is Tier 2 with the Tier 1 hint ladder as its fallback. Plan §13.1 rule 7 is reworded accordingly. *Why:* Matches how doc 05 §5 already uses Tier 1 for hints, and the rule 'no new runtime AI dependency on a Tier 0 path' stays checkable. | ACCEPTED |
| DD-01-2 | Weekly minutes | DR-009: 90 minutes a week for P4-JSS3, 60 for P1-P3, minutes only. *Why:* See DR-009. | ACCEPTED |
| DD-01-3 | What the 2 MB budget measures | Three separate limits, all enforced in CI: app shell at most 2 MB gzipped excluding media (Task 10); content bundle for the learner's pinned slice (text, items, hints, solutions; excluding audio and video) at most 2 MB gzipped (doc 10 §5); each item's media at most 40 KB (A-5). Audio is outside both and is delivered on demand. *Why:* Resolves the three readings by giving each its own gate instead of picking one. | ACCEPTED |
| DD-01-4 | Pipeline stages 1-9 | The mapping proposed in §4.1 is adopted as normative. Stage 10 also re-gates localized overrides (distractor tagging, math invariance, reading level). *Why:* A localized override is served to learners, so it must pass the same item gate. | ACCEPTED |
| DD-01-5 | Audio track | Out of Phase 0 scope (audio items are Phase-4, lower primary, doc 05 §3.16). Constraints now: never in the default bundle, downloaded on demand, Opus at about 8 KB/s (doc 05 §3.16). Format and size budget are set when audio items enter scope. *Why:* No Phase 0 content needs it; deciding numbers now would be invention. | ACCEPTED (provisional) |
| DD-01-6 | Nudge limits | Per-learner nudges: at most 1 per day (plan §15.1). Absolute ceiling per recipient across all push: 3 per day and 10 per week (Task 14). Quiet hours 21:00-07:00 learner-local. Auto-pause after 4 ignored weeks. Teacher and parent digests are weekly. Opt-in throughout. *Why:* The two sources cover different scopes; both hold. | ACCEPTED |
| DD-01-7 | Mobile engine binding | Embed the built `/engine` bundle in an on-device JavaScript runtime and call it from Dart. A spike on the 2 GB reference device decides the runtime and must show `select_next_item` P99 under 15 ms (doc 04 E-6) and memory under 180 MB. Only if the spike fails may a Dart port be written, and then it must pass every golden vector and the 1000-attempt parity log (doc 04 E-3). Either way the current `engine_binding.dart` is deleted once its replacement passes, and `scripts/ci/check_no_client_engine_predicates.py` must go green. *Why:* One engine implementation is the strongest form of the determinism guarantee; the cross-runtime float hazard is already handled by baked constants, 4-decimal rounding and the parity gate. | ACCEPTED (provisional) |
| DD-01-8 | Phase 0 scope | DR-001. *Why:* See DR-001. | ACCEPTED |
| DD-01-9 | Phase labels | DR-008. *Why:* See DR-008. | ACCEPTED |

## Doc 06

| ID | Topic | Decision | Status |
|---|---|---|---|
| DD-06-1 | 2 MB budget | DD-01-3. | ACCEPTED |
| DD-06-2 | Bundle format | One bundle per framework version (content is immutable per version, doc 02 §5), sliced per learner pin. A client holds the active node, the nodes in its review queue, and its next recommended nodes, up to the content-bundle limit. No fixed node count. *Why:* Follows from immutability of a framework version and the 2 MB limit. | ACCEPTED |
| DD-06-3 | Rollout ladder vs item status | Internal rung: items `reviewed`. Pilot-schools rung: items `piloted` (served to a class, doc 05 §7). 10% and 100% rungs: items `live`. Calibration statuses follow response counts as in doc 05 §7. 'Two pilot schools' is the pilot rung of the Phase 0 pilot. *Why:* Uses the existing status definitions. | ACCEPTED |
| DD-06-4 | Uncached content and rung names | An uncached node is shown as needing a connection and queued for download; it is never hidden. Offline, the engine selects only among cached nodes and returns `queue_empty` when none qualify. The rung names in §6 are adopted as written. The client warns the learner to connect when the oldest unsynced attempt reaches 21 days (provisional), well before the 30-day `flagged` rule (docs/sync-contract.md §4). *Why:* Never hide content (dignity and clarity); the 21-day figure leaves a 9-day margin. | ACCEPTED (provisional) |
| DD-06-5 | Lesson blocks | (a) A `VideoBlock` is valid only if the same node has text and worked-example sections covering the same objectives; a content validator checks this. (b) Video hosting and wifi gating are out of Phase 0 (no video in the default path). (c) Desmos and GeoGebra blocks are online-only (DR-011). (d) `CheckBlock` answers are recorded locally as a non-attempt event `check_answered`; they never feed mastery or Elo. (e) Audio is not in the default bundle. *Why:* Doc 06 §11 and doc 05 §1 already say ungated and non-mastery; this makes it testable. | ACCEPTED |
| DD-06-6 | Tutor tier | DD-01-1: Tier 2 with Tier 1 fallback; at rungs R1 and R2 the tutor is listed unavailable and the hint ladder remains. | ACCEPTED |
| DD-06-7 | Pending attempts | DR-010. | ACCEPTED (provisional) |
| DD-06-8 | Desmos and GeoGebra | DR-011. | ACCEPTED |
| DD-06-9 | Mobile binding and local database | DD-01-7 for the binding. The offline queue moves from `shared_preferences` to an on-device SQLite database partitioned by `learner_id` (docs/sync-contract.md §6). *Why:* Task 11.1 names a local database; a key-value store cannot give per-learner partitioning and atomic queue updates. | ACCEPTED |

## Doc 07

| ID | Topic | Decision | Status |
|---|---|---|---|
| DD-07-1 | Item status spelling | `piloted` everywhere (plan §2.5, doc 05 §7, `framework_service`). A new migration changes the CHECK constraint from `piloting` to `piloted`; `coverage_service` is fixed to match. *Why:* The spec says `piloted`; the CHECK and `coverage_service` are the typo. | ACCEPTED |
| DD-07-2 | Source of truth for the physical schema | From now on doc 07 is authoritative for tables and constraints as migrated. Plan §2 is conceptual. Every schema change needs a migration and a doc 07 update in the same change. The 27 drift rows in doc 07 §9 are recorded as 'accepted differences' unless a row is marked as a defect. *Why:* Migrations are what runs; two normative schemas guarantee drift. | ACCEPTED |
| DD-07-3 | `skill_nodes.difficulty_elo` | Seeded once by the topological pass (doc 04 §5.1) when a node becomes `live`, by a build step in `content-tools`. The engine's per-learner updates are not written back to `skill_nodes`. Item calibration lives on `items.difficulty_elo`. *Why:* Node difficulty is content metadata; per-learner ability lives in state. | ACCEPTED |
| DD-07-4 | Remediation dedup and pending attempts | Two new tables, `remediation_shown` (learner_id, node_id, misconception_id, shown_at) and `pending_attempts` (DR-010). Neither is part of `NodeState`, so the sync snapshot and the parity hash are unaffected. *Why:* Keeps the canonical engine snapshot to exactly the engine's `NodeState`. | ACCEPTED |
| DD-07-5 | Pin cardinality | One current pin per learner: add `is_current` with a partial unique index on `learner_id WHERE is_current`. History rows are kept. Pin migration still never touches node state (I-11). *Why:* Matches doc 02 V-2 and V-6. | ACCEPTED |
| DD-07-6 | Classroom tables | Plan §14.1 names (`schools`, `classes`, `class_members`, `assignments`). Task 14's names are amended. *Why:* Plan names are older, used in docs 12 and 13, and shorter. | ACCEPTED |
| DD-07-7 | Parent contact PII | Application-level encryption of `contact_value` with a key held in the secrets manager; never logged; the minimum fields only. *Why:* Plan §16.1: encryption at rest, data minimisation. | ACCEPTED |
| DD-07-8 | RCT `learner_id` | A keyed hash (HMAC-SHA-256, secret held by the platform and never exported). RCT tables carry no foreign key to `users`. The mapping is reachable only by platform operations. *Why:* Pre-registration needs unlinkable analysis data; Task 17 §17.7 already says hashing. | ACCEPTED |
| DD-07-9 | Retention periods | Engineering defaults, to be confirmed or changed by counsel before the pilot: attempts and learner state for the life of the account, then deletion on request or after the hard-delete grace; tutor transcripts 90 days; raw free-text, photo and audio responses 30 days after marking; notification logs 90 days; parent contacts until consent is withdrawn or the learner is deleted; audit logs 12 months; backups 35 days; hard-delete grace 30 days. *Why:* Plan §16.1 requires defined periods; these are the shortest values that keep the learning record intact. | ACCEPTED (provisional) |
| DD-07-10 | Production types | On PostgreSQL: JSONB, native UUID, `timestamptz` (attempts' `occurred_at` becomes `timestamptz`; the string type was a SQLite convenience). CI runs the migrations against PostgreSQL as well as SQLite. Sync ordering parses instants and never compares strings. *Why:* Doc 10 §3 already requires `timestamptz` UTC. | ACCEPTED |

## Doc 08

| ID | Topic | Decision | Status |
|---|---|---|---|
| DD-08-1 | AI-2 and the tutor | AI-2 is split. Authoring and bulk generation always run through queues, including the admin extraction endpoint, which is changed to enqueue `task_extract_objectives` and its signature bug fixed. Runtime learner-facing services (tutor, marking) are a separate class: allowed on a request path only as Tier 2, with a timeout, a deterministic fallback, a cost cap and SymPy checks; never inside `/engine`. *Why:* The tutor must respond within a session; forbidding it would forbid the product. | ACCEPTED |
| DD-08-2 | One coverage definition | `coverage_service.compute_coverage` is the only definition; `activate_framework` calls it. The weaker function in `framework_service` is removed. *Why:* Activation gates on the stricter, spec-conforming rule. | ACCEPTED |
| DD-08-3 | Limiter defaults | Fail closed: `FAIL_CLOSED` defaults to true and `TESTING` to false. In any non-test environment the workers refuse to start without the shared limiter. *Why:* Task 8 §8.5 says fail closed. | ACCEPTED |
| DD-08-4 | Mapping rules | Doc 02 §3 is the only text of M-1 to M-5; the mapping prompt quotes it verbatim and adds only the confidence bands. *Why:* Two statements of one rule diverge. | ACCEPTED |
| DD-08-5 | Item tier split | Default `count` raised to 24 with a tier mix of 9 / 9 / 6, inside doc 05 §8's 8-12 / 8-12 / 5-8, so at least 5 Tier-3 items survive rejection. *Why:* The current 40/40/20 over 20 yields 4 Tier-3 items, below the publish bar. | ACCEPTED |
| DD-08-6 | Country fallback in code | Remove the `GHS` fallback; raise an error when no brief exists. A fallback may exist in tests only. *Why:* Doc 02 L-2: no country value in code paths. | ACCEPTED |
| DD-08-7 | Pipeline D semantics | Refreshed overrides are written to a separate staging row. The live row is unchanged until a reviewer approves; on rejection the staging row is discarded. *Why:* Plan §3.7: on approval replace, on rejection keep current. | ACCEPTED |
| DD-08-8 | `generation_jobs` schema | The model is authoritative; plan §2.7 is amended (doc 07 carries the columns). *Why:* DD-07-2. | ACCEPTED |
| DD-08-9 | Math-invariance strength | One shared implementation used by the pipelines, the validator and the CI script. If the count of math expressions differs between base and override, the check fails. *Why:* A heuristic that passes when counts differ cannot protect answers. | ACCEPTED |
| DD-08-10 | Pricing | Prices are loaded from configuration, one table. The plan's cost table is regenerated from it. *Why:* Two price tables drift. | ACCEPTED |
| DD-08-11 | Tutor and marking parameters | Tutor turns and marking use the Flash-class model; Pro stays for authoring. Marking below a confidence of 0.8 is never auto-credited and goes to teacher review. Both have a per-learner daily cost cap, configurable. Telemetry is `gemini_call` plus outcome (DD-11-12). The 0.8 threshold and the cap values are provisional. *Why:* Cheapest model that is adequate for short turns; never credit uncertain marking. | ACCEPTED (provisional) |
| DD-08-12 | Who creates mapping rows | Only `framework_service.map_objective` does. The admin endpoint calls it. `check_no_direct_objective_node_map_write.py` is extended to scan `backend/app/api`. *Why:* Doc 02 §9: no bulk approve, one audited path. | ACCEPTED |
| DD-08-13 | Self-explanation grading | DR-018. | ACCEPTED (provisional) |

## Doc 09

| ID | Topic | Decision | Status |
|---|---|---|---|
| DD-09-1 | Currency | The brief stores both the ISO-4217 code and the symbol; the code is authoritative. | ACCEPTED |
| DD-09-2 | Localization context source | `localization_briefs` is the source; `localization_tokens` are materialised from it by one function. The item pipeline reads tokens. *Why:* One source, no drift. | ACCEPTED |
| DD-09-3 | Node ID pattern | Doc 02 §2.3 governs (`SUBJECT.DOMAIN.SPECIFIC_SKILL`); the node-authoring prompt is aligned to it. *Why:* The spec wins over a prompt. | ACCEPTED |
| DD-09-4 | Reading level and auto-reject | A-3 is the only reading-level rule; the 'FK above grade + 3' line in plan §6.1 is deleted. The 300-word minimum and the KaTeX parse failure stay as auto-reject conditions and are implemented in the content validator. *Why:* Two reading rules conflict; the other two checks are cheap and meaningful. | ACCEPTED |
| DD-09-5 | Scope of A-2 check | The validator checks every selectable wrong answer in every type that has one (multi-select, matching, categorization as well as MCQ). *Why:* A-2 is stated for all. | ACCEPTED |
| DD-09-6 | Misconception membership | The validator confirms each `misconception_id` is on the node's misconception list. A hard gate. *Why:* Doc 05 §9. | ACCEPTED |
| DD-09-7 | A-3 for options and hints | The check covers the stem, options and hints. *Why:* The prompt already demands it. | ACCEPTED |
| DD-09-8 | ELA and `printable` | DR-012 and DR-013. | ACCEPTED |
| DD-09-9 | Generated block shape | The generation schema and chunker are aligned to doc 05 §1 (`content`, `katex`/`display`) and `type` is restricted to the 17 block types. *Why:* Doc 05 is the item contract. | ACCEPTED |
| DD-09-10 | Shared items | As DD-08-5 and DD-08-9. | ACCEPTED |

## Doc 11

| ID | Topic | Decision | Status |
|---|---|---|---|
| DD-11-1 | Runtime assumption | Keep the repository stack. Plan §7, §9.2, §18 and the doc 04 §5.2 wording are amended: the engine is TypeScript compiled to JavaScript; the runtimes are Node/V8 (server sidecar), the browser engines (web) and an embedded JS runtime (mobile). The cross-runtime hazard is covered by baked constants, 4-decimal rounding and the parity gate across all three. *Why:* Rewriting the stack to match a sentence is the wrong direction. | ACCEPTED |
| DD-11-2 | Mobile engine path | DD-01-7. | ACCEPTED (provisional) |
| DD-11-3 | Web engine delivery | The web app imports the compiled engine package (the build artifact), not the source through a path alias, so tests exercise what ships. WASM is not needed because the engine is JavaScript. | ACCEPTED |
| DD-11-4 | Backend and engine coupling | Subprocess per replay in Phase 0. Provisional budget: sync request p95 at most 1.5 s for a batch of 500 attempts. When p95 exceeds it, move to a long-lived sidecar and replay incrementally from the last stored state. *Why:* Premature optimisation otherwise; the trigger is explicit. | ACCEPTED (provisional) |
| DD-11-5 | Pins | Python 3.12 in all workflows; Node 22 LTS everywhere; Next.js 14 until an upgrade task exists; pnpm for `web/` documented; a pinned `backend/requirements.txt`; PostgreSQL 16 as a CI service next to SQLite. *Why:* One version per tool. | ACCEPTED |
| DD-11-6 | API versioning | All client-facing endpoints move to `/api/v1/...` before the first external client release, with the 12-month compatibility rule (doc 10 §7). Until then `/api/...` is internal. | ACCEPTED |
| DD-11-7 | Gemini SDK and Weaviate | `google.genai` is authoritative (Task 8 is amended). Weaviate dedup and retrieval stay specified and are built before item generation runs at scale and before the tutor. | ACCEPTED |
| DD-11-8 | Analytics sink | Phase 0: an append-only Postgres `events` table partitioned by month, plus OpenTelemetry for operational metrics. No third-party analytics SDK on any client, web included. *Why:* Smallest thing that serves the pilot metrics and the RCT. | ACCEPTED |
| DD-11-9 | `content_gap` shape | One event name `content_gap` with a `source` field (`selection_pool`, `retired_item_attempt`). The engine must emit its own flag. | ACCEPTED |
| DD-11-10 | Missing events and timezone | Adopt `session_started`, `session_ended`, `placement_completed`, `tutor_opened`, `review_session_completed`, `teacher_action`. A learner IANA timezone is stored on the learner profile for day-based metrics. | ACCEPTED |
| DD-11-11 | RCT `learner_id` | DD-07-8. | ACCEPTED |
| DD-11-12 | `gemini_call` outcome | Add an `outcome` column (`ok`, `retry`, `error`, `blocked`) and a coded error field; free text is not stored. | ACCEPTED |
| DD-11-13 | PII classes | The P0-P3 scheme is adopted with doc 13 as its authority. `learner_id` in non-RCT events is the raw internal id; RCT exports use the keyed hash. | ACCEPTED |
| DD-11-14 | 'Instrumented per the taxonomy' | The definition in §5.1 item 5 is adopted for doc 10 §6 and §9. | ACCEPTED |

## Doc 12

| ID | Topic | Decision | Status |
|---|---|---|---|
| DD-12-1 | Roles | Phase 0: teacher and learner only. A parent is a contact record without a login. School admin is deferred. *Why:* Smallest surface for the pilot. | ACCEPTED |
| DD-12-2 | 'Reviewed or beyond' | `reviewed`, `piloted`, `live`, `calibrating`, `calibrated`. Not `revision` or `retired` (doc 05 §6.3). | ACCEPTED |
| DD-12-3 | Classroom tables | DD-07-6. | ACCEPTED |
| DD-12-4 | Join codes | 8 characters from an unambiguous alphabet (no 0/O, 1/I/L), unique; the teacher can rotate or revoke a code at any time; no automatic expiry in Phase 0; a learner may belong to several classes; a learner leaves by teacher removal or by self-leave, and leaving never changes learner state. The length is provisional. | ACCEPTED (provisional) |
| DD-12-5 | Consent for teacher-created classes | In Phase 0 every class that holds learner data must be linked to a school record, created with the school's attestation (doc 13 DD-13-3). Self-serve teacher classes without a school record wait until counsel has cleared them. The free toolkit itself holds no learner data and needs no school. *Why:* Resolves doc 13 D-3 and D-5 conservatively. | ACCEPTED |
| DD-12-6 | Generated teacher prose | Inputs are `reviewed`+ content only. Generated lesson-plan and reteach prose is shown with an 'AI-drafted, check before use' label and is editable by the teacher. | ACCEPTED |
| DD-12-7 | Dignity in Task 14 reports | Remove the individual sort, the top-versus-bottom-quartile gap trigger and per-learner status words. Keep the persistent-gap rule and misconception counts. A per-learner view shows 'working on' and next node only. *Why:* Plan §14.2, doc 03 §13 (R-7, R-14). | ACCEPTED |
| DD-12-8 | Nudges | DD-01-6. `streak_at_risk` is removed (loss-framed pressure; streaks are constrained, doc 03 §13). `dose_shortfall` fires below 80% of the learner's weekly goal (DR-009). | ACCEPTED |
| DD-12-9 | Pilot numeric floors | Set in the pre-registration document before enrolment and frozen: at least 2 weekly-active teachers per pilot school (provisional); `placement_at_graph_floor` at most 5% (DR-001); expected responses per item stated in advance. The day-7 return floor is OPEN: it needs a baseline the owner must choose; do not set it after data collection starts. | ACCEPTED (provisional) |
| DD-12-10 | `offer_tutor` and self-explanation | DR-003 and DR-018. | ACCEPTED |
| DD-12-11 | `printable` | DR-013. | ACCEPTED |
| DD-12-12 | Paper 2 mocks | DR-010: blocked until pending attempts are built. | ACCEPTED |

## Doc 13

| ID | Topic | Decision | Status |
|---|---|---|---|
| DD-13-1 | Legal basis per country | Cannot be decided by engineering. Counsel must confirm for Ghana, Sierra Leone, Nigeria and any US/EU user before the pilot (plan §16.1, §20 item 7). Nothing here is legal advice. | OPEN |
| DD-13-2 | Minor-consent model | Hybrid: school-mediated consent for class accounts with a parent notice; per-learner parent consent for individual accounts; explicit parent consent always required for voice and photo features. Age thresholds per country are counsel's. | ACCEPTED (provisional) |
| DD-13-3 | School attestation | A named school authority attests (name, role, date) and the record is stored; a school record is mandatory before a class may hold learner data (DD-12-5). | ACCEPTED |
| DD-13-4 | Retention | DD-07-9, including the 30-day hard-delete grace. Counsel may shorten or lengthen. | ACCEPTED (provisional) |
| DD-13-5 | Identity fields | Learner: pseudonymous id, first name or nickname, enrolled band (never shown), framework pin, locale, timezone; no date of birth (an age band at most), no email required (join code). Teacher: name and a contact for login. Parent: contact value and the consent record. *Why:* Plan §16.1 minimisation. | ACCEPTED |
| DD-13-6 | Safeguarding | A designated safeguarding lead is named per deployment before the pilot (the owner supplies the names and contacts: OPEN). On a disclosure of harm or personal data the tutor stops the dialogue, shows a fixed supportive message pointing to a trusted adult or the teacher, and flags the lead; the flag is reviewed the same school day (provisional). | ACCEPTED (provisional) |
| DD-13-7 | Safety suite and image checks | Categories are those in plan §16.2 (jailbreak, self-harm, personal data); required cases must pass 100% before each tutor release; English only at the pilot. Images with a detected face or name text are rejected (conservative). The detector and its error rates are chosen by the security review: OPEN. | ACCEPTED (provisional) |
| DD-13-8 | Audit log | Records actor, role, action, target learner, timestamp. No location. Readable by security and the data-protection owner. Kept 12 months. | ACCEPTED |
| DD-13-9 | Transparency page | Plain English at the pilot; reachable before placement and consent; a reading level suited to a parent or a learner of the lowest enrolled band. | ACCEPTED |
| DD-13-10 | Model provider | Gemini is the provider for authoring. For learner-facing calls (tutor, marking) the paid API with a data-processing agreement, a no-training clause and a confirmed region is a precondition; if it cannot be confirmed before the pilot, the tutor and marking are disabled and the hint ladder is used (fail closed). Counsel and procurement confirm. | ACCEPTED (provisional) |
| DD-13-11 | RCT data access | Researchers receive keyed-hash identifiers only; raw learner data never leaves the platform. What is published is set in the pre-registration. | ACCEPTED |
| DD-13-12 | Notification caps | DD-01-6. | ACCEPTED |

## Label edits made for DR-008

| Where | Was | Now |
|---|---|---|
| Doc 04 §5 title and intro | 'Elo Rating System (Phase 1)', 'for Phase 1' | 'Elo Rating System (v1 algorithm)', 'for the pilot' |
| Doc 04 §8.1 | 'Refit from Questcademy data at Phase 3 (>= 500k reviews)' | 'Refit ... at >= 500k reviews' |
| Doc 04 §10 title | 'Bayesian Knowledge Tracing (Phase 3)' | 'Bayesian Knowledge Tracing (future; triggered by data volume)' |
| Plan §18 | no table | translation table added |

