# Implementation follow-ups from the 2026-11-18 decisions

The decisions in DR-001 to DR-019 were made in documents only. This list is the code, schema, CI and test work they require. **None of it has been done.** Order is by dependency; engine items follow doc 10 §1 and §6 (tests first, second reviewer, simulation diff with a `simulation/CHANGELOG.md` entry).

## Engine (hand-verified tier; vector in the same commit)

| # | Change | Decision | Vector |
|---|---|---|---|
| E1 | Review attempts leave `ability_elo` unchanged (`elo.ts`) | DR-002 | un-skip `elo_review_no_ability_update` |
| E2 | Interleave gate: `items_since_review >= 3` and >= 2 correct in `recent_window` (`selection.ts`) | DR-003 | revise and un-skip `interleave_cadence` |
| E3 | `offer_tutor` decision with `hint_ladder_exhausted`, `repeat_misconception`, `self_explain` | DR-003, DR-018 | un-skip `tutor_offer_triggers` |
| E4 | `mastery_blockers` derived from `recent_window` | DR-003 | un-skip `mastery_blockers` |
| E5 | Emit the engine's own `content_gap` flag with `source` | DD-11-9 | extend an existing selection vector |
| E6 | `propagate_mastery_down` vector un-skipped once the spine exists | DR-001 | un-skip `placement_propagates_prerequisites` |
| E7 | Numeric-answer parser: framework locale separator, grouping stripped, unambiguous other separator accepted | DR-014 | new `numeric_parse_locale` |
| E8 | New metric: age of the Tier-3 attempt behind each mastery | DR-004 | telemetry only |

## Backend and schema

| # | Change | Decision |
|---|---|---|
| B1 | Migration 005: item status CHECK `piloting` to `piloted`; fix `coverage_service` | DD-07-1 |
| B2 | `learner_framework_pins.is_current` with a partial unique index | DD-07-5 |
| B3 | Tables `pending_attempts`, `remediation_shown` | DR-010, DD-07-4 |
| B4 | Rename classroom tables to plan §14.1 names when they are built; amend Task 14 | DD-07-6 |
| B5 | Postgres types (JSONB, UUID, `timestamptz` for `occurred_at`); CI runs migrations on Postgres 16 | DD-07-10 |
| B6 | `events` table (monthly partitions); `gemini_calls.outcome` and coded error | DD-11-8, DD-11-12 |
| B7 | Encrypted `parent_contacts.contact_value`; HMAC `learner_id` in RCT tables | DD-07-7, DD-07-8 |
| B8 | `activate_framework` calls `coverage_service`; delete the second coverage function | DD-08-2 |
| B9 | Limiter fail-closed defaults; refuse to start without the shared limiter | DD-08-3 |
| B10 | Admin objectives-extract endpoint enqueues the task; fix the bad call signature; fix `GET /costs` signature | DD-08-1 |
| B11 | Admin mapping endpoint calls `map_objective`; extend `check_no_direct_objective_node_map_write.py` to `api/` | DD-08-12 |
| B12 | Pipeline D writes to a staging row; remove the `GHS` fallback; prices from configuration | DD-08-7, DD-08-6, DD-08-10 |
| B13 | One shared math-invariance function; fail when expression counts differ | DD-08-9 |
| B14 | Item pipeline defaults: count 24, mix 9/9/6 | DD-08-5 |
| B15 | Validators: A-2 for all selectable-wrong-answer types, `misconception_id` membership, A-3 on options and hints, content 300-word minimum and KaTeX parse, `printable` derivation, VideoBlock equivalent-path check, block shape per doc 05 §1 | DD-09-4..7, DD-09-9, DR-013, DD-06-5 |
| B16 | Align the node-authoring prompt to doc 02 §2.3; mapping prompt quotes M-1..M-5 verbatim; tokens materialised from briefs | DD-09-3, DD-08-4, DD-09-2 |
| B17 | Seed `skill_nodes.difficulty_elo` at node publish (topological pass) | DD-07-3 |
| B18 | Endpoints under `/api/v1/` before the first external client release | DD-11-6 |
| B19 | `backend/requirements.txt` (pinned); Python 3.12, Node 22 in all workflows; fix the content-CI dependency list (celery, aiolimiter, redis) | DD-11-5 |
| B20 | Sync-anomalies admin API and view | docs/sync-contract.md |

## Clients

| # | Change | Decision |
|---|---|---|
| C1 | Mobile: spike an embedded JS runtime on the 2 GB reference device (P99 < 15 ms, memory < 180 MB); then replace `engine_binding.dart`; Dart port only if the spike fails, with full vector and parity coverage | DD-01-7 |
| C2 | Mobile: SQLite per-learner queue instead of `shared_preferences` | DD-06-9 |
| C3 | Web: import the compiled engine package, not source by alias; wire sync to the server; delete the timer simulation | DD-11-3, sync contract |
| C4 | Web: replace the free-chat tutor page and side panel with the inline, engine-triggered tutor; remove `/api/tutor/chat` as a free-chat surface | DR-003, doc 12 §6, R-10, R-11 |
| C5 | Web: progress page uses the per-band goal (90 / 60), not "80 minutes target"; mock-exam list from the framework's `exam_structure`, Paper 1 only | DR-009, DR-010 |
| C6 | Both: render math with KaTeX | doc 05 §1 |
| C7 | Both: nudge and notification caps and quiet hours as in DD-01-6; remove `streak_at_risk` | DD-01-6, DD-12-8 |

## Content and process

| # | Change | Decision |
|---|---|---|
| P1 | Pilot spine: map the hard-prerequisite closure of the pilot nodes; run the placement diagnostic; target `placement_at_graph_floor` <= 5% | DR-001 |
| P2 | Sierra Leone: attach the partner's confirmation of `grading_scale` before activation | DR-017 |
| P3 | Licence check for the offline graphing library | DR-011 |
| P4 | Pre-registration document: freeze pilot numeric floors (DD-12-9), including the day-7 return floor that is still OPEN | DD-12-9 |
| P5 | Teacher reports: remove the individual sort, quartile gap trigger and per-learner status words from Task 14's design | DD-12-7 |
| P6 | Plan §21.1 and doc cross-references checked against the final numbering | docs pass |

## Still OPEN (needs a person, not a decision by documentation)

| Item | Needs |
|---|---|
| Legal basis per country; minimum ages (DD-13-1, DD-13-2) | Counsel |
| Confirmation of the retention defaults (DD-07-9) | Counsel |
| Named safeguarding lead and contacts (DD-13-6) | Owner |
| Face and name detector and its error rates (DD-13-7) | Security review |
| Learner-facing model provider terms: DPA, no-training clause, region (DD-13-10) | Counsel and procurement |
| Sierra Leone grading cut-offs (DR-017) | In-country curriculum partner |
| Day-7 return floor (DD-12-9) | Owner, before enrolment |
| Provisional parameters to confirm from pilot data | DR-004, DR-005, DR-006, DR-010 (14 days), DR-018 (3 s), DD-06-4 (21 days), DD-08-11 (0.8), DD-11-4 (1.5 s), DD-12-4 (8 characters) |
