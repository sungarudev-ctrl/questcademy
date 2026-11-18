# 11 — Technology Stack and Analytics Event Taxonomy

Two things in one document: the stack the repository actually uses (and where the specs assume a different one), and the catalogue of events the platform emits or must emit.

**Owner:** Engineering · **Change control:** a new event or a stack change updates this document in the same change (doc 10 §9: "Events instrumented per the analytics event taxonomy"; "Documentation updated if a contract changed").
**Version:** v1 (2026-11-18) — PROPOSED. Individual decisions carry their own status in the Decisions section. Open points are in *Decisions Needed* at the end. Decisions resolved 2026-11-18 (see the Decisions section; DR-019).

> Plan §7 (stack note), plan §9.2 (stack note) and plan §18 (M4) and §20 (action 12) say doc 11 governs the stack where the plan's examples differ. This document records what is built, records the conflict with doc 04's runtime assumptions, and does **not** resolve it (§3, *Decisions Needed* 1–3).

Status marks used in tables: **IMPLEMENTED** (code exists and is exercised), **TYPED ONLY** (a type or table exists, nothing emits or consumes it), **SPECIFIED ONLY** (a doc or task defines it; no code).

---

## 1. The stack as built

| Layer | Technology (evidence) | Notes |
|---|---|---|
| Backend API | Python, FastAPI, Pydantic, SQLAlchemy, Alembic (`backend/app/api/*.py`, `backend/alembic/`) | Routers: `/api/admin`, `/api/analytics`, `/api`, `/api/learners`, `/api/sync`. Auth is a dependency that raises `NotImplementedError` until Task 13 (backend/app/api/sync.py). |
| Workers | Celery with Redis broker and result backend (`backend/app/workers/celery_app.py`) | Queues: `authoring`, `localization`, `items`, `framework`, `embed`. JSON serialisation, UTC. |
| Database | SQLAlchemy; default `sqlite:///./questcademy.db` (`backend/app/db/base.py`); CI migrates on SQLite (`content-ci.yml` Gate 4) | Task 15 §15.1 requires Postgres for JSONB and migrations. See doc 07 §2. |
| Vector store | Weaviate (plan §2.8; Task 8) | SPECIFIED ONLY. Embed tasks return without a Weaviate client (backend/app/workers/tasks/embed_tasks.py). |
| LLM | Gemini through `google.genai` imported lazily in `backend/app/ai/gemini.py`; prompts from `shared/prompts/v1/` | Task 8 §8.2 says the client wraps `google-generativeai`; the import is `google.genai`. |
| Math checks | SymPy (`backend/app/ai/tools/sympy_solver.py`; CI Gate 2) | |
| Engine | TypeScript, no runtime dependencies; jest + ts-jest; `tsc` to `engine/dist` (`engine/package.json`) | 100% coverage gate; forbidden-call grep gate for `Math.random`, `Date.now`, `new Date()`, `fetch(` (`engine-ci.yml`). |
| Engine sidecar | Node ES modules: `engine-bridge/cli.mjs` reads JSON on stdin, writes JSON on stdout; imports `../engine/dist/index.js` (`engine-bridge/replay.mjs`) | The backend runs it with `subprocess.run`, one process per replay, 60 s timeout, failure raises `EngineBridgeError` and the request fails (backend/app/services/engine_bridge.py). |
| Web | Next.js `^15.1`, React `^19`, TypeScript `^5.7`, Tailwind `^3.4`, zustand, vitest (`web/package.json`) | Student app and Content Studio. Task 10 and plan §9.2 say Next.js 14. The engine is imported as TypeScript source through a path alias `@questcademy/engine` → `../engine/src/index.ts` (`web/tsconfig.json`, `web/vitest.config.ts`); it is not a WASM build (Task 10 says WASM). |
| Mobile | Flutter, Dart `^3.5`; `flutter_riverpod`, `go_router`, `dio`, `connectivity_plus`, `flutter_secure_storage`, `shared_preferences` (`mobile/pubspec.yaml`) | No local database package (Task 11 §11.1 names `isar` or `drift`), no KaTeX package, no `mobile/test` directory. |
| Mobile engine | `mobile/lib/core/engine/engine_binding.dart` re-implements mastery, Elo and FSRS in Dart, including `math.pow(10.0, …)` for the Elo expectation | docs/sync-contract.md "Open work" calls this a violation of "no engine predicates in clients"; Task 11 §11.1 requires a single binding to the shared engine source. |
| Design tokens | `shared/design/tokens.json` with a Dart generator (`shared/design/generate_tokens.dart`) | |
| CI | GitHub Actions: `engine-ci.yml` (Node 20), `content-ci.yml` (Python 3.13), `sync-parity.yml` (Node 22, Python 3.12) | Python dependencies are installed ad hoc with `pip install …` in each workflow. No `requirements*.txt` or `pyproject.toml` exists under `backend/`. |
| Observability, IaC, flags, push/WhatsApp/email providers | Prometheus, OpenTelemetry, Terraform/Pulumi, FCM/APNs/VAPID, Meta Cloud API (Tasks 14, 15) | SPECIFIED ONLY. |

Repository layout is as stated in doc 10 §2 (`/engine`, `/engine-bridge`, `/backend`, `/web`, `/mobile`, `/shared`, `/scripts/ci`, `/simulation`).

## 2. Interfaces between components

| Interface | As built | Specified |
|---|---|---|
| Client ↔ backend | REST, no `/v1` prefix; sync at `/api/sync/{attempts,state,cursor}` (docs/sync-contract.md §3) | `/api/v1/…`, OpenAPI at `/api/v1/openapi.json` committed to `shared/schema/openapi.json`, generated SDKs (`openapi-typescript`, `openapi-generator`), JWT with refresh rotation (Task 13 §13.1–13.6). SPECIFIED ONLY. |
| Backend ↔ engine | Subprocess to the Node sidecar; the server replays a learner's whole canonical log per sync (backend/app/services/sync_service.py `derive_learner_state`; docs/sync-contract.md §1) | Plan §7: the server imports `/engine` directly. |
| Client ↔ engine | Web: TS source via alias. Mobile: Dart re-implementation. | Web: WASM build (Task 10). Mobile: `flutter_rust_bridge` or FFI to "the same engine source" (Task 11 §11.1). |
| Parity | `shared/testdata/attempt_log.json` (1000 attempts) hashed through `engine-bridge/canonical.mjs`; golden `attempt_log.hash`; participants server, sidecar, web, mobile (docs/sync-contract.md §9). Server and sidecar tests run in CI (`sync-parity.yml`); no web or mobile parity test is wired (docs/sync-contract.md "Open work"). | Doc 10 §5 parity gate across client and server builds. |

## 3. Stack conflict: doc 04 / plan versus the repository

### 3.1 What each side says

- **Plan §7 and §9.2 (v2 notes).** "Doc 04 §5.2 names V8 (server) and Hermes (client) as the two runtimes, which means the server imports `/engine` directly as TypeScript and the mobile client runs the same module." Plan §9.2: "Doc 04 assumes Node (V8) and React Native (Hermes) runtimes, and doc 11 (tech stack) governs."
- **Doc 04 itself.** Requires E-2 byte-identical outputs on every platform and E-3 "one implementation, or two with a shared conformance test suite that both MUST pass". V8 and Hermes appear in the §5.2 determinism note (transcendental `10^x` may differ in the last bits between runtimes; Elo values must be rounded to 4 decimals after every update). Doc 04 does not name React Native or a server framework; the plan's reading of §5.2 as a runtime decision is the plan's.
- **Repository and doc 10 §2 (revised 2026-11-18).** FastAPI backend, Next.js web, Flutter mobile, TypeScript engine, Node sidecar. Doc 10 §2 records that the earlier `/client-android`, `/client-web`, `/server/*` layout "never existed".
- **Tasks.** Task 10 and Task 12 assume a WASM build of the engine for web and the "Python calls into it via WASM" line (tasks.md master prompt §7 repository tree: "backend/ FastAPI (Python). Calls /engine via WASM"); Task 11 assumes Flutter with a single FFI binding; plan §7 says that line "described a FastAPI backend" and is superseded.

### 3.2 Determinism consequences of each reading

| Reading | Runtimes that execute engine code | What the determinism guarantee rests on | Residual hazard (doc 04 §5.2 class) |
|---|---|---|---|
| **A. Doc 04 / plan assumption**: Node server, React Native (Hermes) client | V8 (Node), Hermes; browsers for any web client | One TypeScript source (E-3 first branch); golden vectors; 4-decimal rounding and baked tier offsets | V8 versus Hermes versus browser engines on `Math.pow`; mitigated by rounding, verified by `determinism_cross_platform.json` (Task 6) |
| **B. Repository as built**: Python server calling a Node sidecar, Next.js web importing the TS source, Flutter mobile with a Dart re-implementation | V8 (sidecar on Node); the browser's JS engine (web); the Dart runtime (mobile) | Server and web: one TypeScript source. Mobile: E-3 second branch, two implementations plus a shared conformance suite. Today the mobile suite does not exist (no `mobile/test`), so E-3 is not satisfied on mobile | Dart's `math.pow` versus V8's `Math.pow` (the Dart file uses `math.pow(10.0, …)` directly, then rounds to 4 decimals). Any rule change must land in two languages with vectors for both (doc 04 change control) |

In reading B the Python backend never executes engine logic itself; it only moves attempt logs to and from the sidecar (docs/sync-contract.md §1). Server determinism therefore equals the sidecar's V8 determinism, and `sync_anomalies.state_mismatch` is the runtime signal that a client implementation has diverged (docs/sync-contract.md §2, §7).

This document does not choose between A and B. See *Decisions Needed* 1–4.

## 4. Cross-cutting rules that bind the stack

- `/engine` imports nothing outside `/engine`; no clock, randomness or network inside it (doc 10 §2, §3; `engine-ci.yml`).
- No engine predicate may be re-implemented in `web/` or `mobile/` (doc 10 §5; `scripts/ci/check_no_client_engine_predicates.py`).
- No model call inside `/engine` or on a request path a learner is waiting on (Task 8 §8.2).
- All timestamps `timestamptz` UTC, learner-local dates separate (doc 10 §3). `attempts.occurred_at` is currently a UTC string (doc 07 §9 item 12).
- No third-party analytics SDK in the mobile app (Task 11 §11.8). The same is not stated for web (*Decisions Needed* 8).
- Structured JSON logs, correlated by trace ID, PII never logged, enforced by lint (Task 15 §15.8). SPECIFIED ONLY.

## 5. Analytics event taxonomy

### 5.1 Principles and conventions

1. **Engine telemetry is for debugging the engine, not for product dashboards** (doc 04 §14; plan §7.8; engine/src/telemetry.ts header). The engine constructs typed events and returns them; the caller dispatches (telemetry.ts; Task 6 deliverable 4). No dispatcher exists in the repository (§5.2).
2. **Payloads carry identifiers only.** Data minimisation (plan §16.1) and "PII is never logged" (Task 15 §15.8). No name, email, phone, free text from a learner, or contact value appears in any event below. Task 17 §17.2 further requires `learner_id` to be hashed for storage in RCT events.
3. **PII classes** used in the tables (classification is PROPOSED; doc 13 is the authority once written):

| Class | Meaning | Examples |
|---|---|---|
| **P0** | No learner reference | `node_id`, `framework_id`, model, token counts, aggregates |
| **P1** | Pseudonymous identifier; linkable to a learner only through the account store | `learner_id`, `session_id`, `attempt_id` |
| **P2** | Learner behaviour attached to a P1 id | correctness, latency, Elo, hint use |
| **P3** | Direct personal data | name, email, phone/WhatsApp number, free-text or media responses |

   **No event in this taxonomy may carry P3.** P2 appears only alongside a P1 id; where RCT rules apply (§5.6) the id is hashed.
4. **Observed conventions.** Engine events use a snake_case `event_type` and an ISO-8601 UTC `timestamp`; the sync-path `content_gap` omits `timestamp` (§5.3). PROPOSED envelope for any new event: `event_type`, `timestamp` (UTC), `framework_id` (tag only, never logic; plan §7.8.1), plus ids as needed.
5. **Doc 10 checklists** (§6 review, §9 definition of done) require new events to be instrumented per this taxonomy. PROPOSED meaning of "per this taxonomy": the event has a row in §5 with name, emitter, fields and PII class before merge.

### 5.2 Engine events (engine/src/telemetry.ts; doc 04 §14)

All ten are `TYPED ONLY`: the types are exported (engine/src/index.ts), but no code in the repository dispatches them. `selection.ts` computes the content-gap flag and discards it (`void isContentGap`); `srs.ts` returns `telemetry: { review_backlog_in_exam_window: n }` on the review queue; `placement` returns `at_graph_floor`; `Decision.reason` carries the `decision_reason` value. Emitter below is the engine module that would construct the event.

| `event_type` | Emitter | Fields | PII | Trigger (spec) |
|---|---|---|---|---|
| `decision_reason` | engine selection and state machine | `learner_id`, `node_id?`, `item_id?`, `action`, `reason`, `timestamp` | P1 | Every decision (doc 04 §2.3). `reason` is the `DecisionReason` union in state.ts (13 values). |
| `expected_vs_actual_success` | engine Elo / attempt evaluation | `learner_id`, `node_id`, `item_id`, `ability_elo`, `item_difficulty_elo`, `expected_p`, `actual_correct`, `timestamp` | P1 + P2 | After each evaluated attempt; feeds the 0.72–0.86 success-band check (plan §17.2 item 2). |
| `pool_exhaustion_level` | engine selection | `learner_id`, `node_id`, `level` (0–3), `usable_items_count`, `timestamp` | P1 | Pool ladder engages (doc 04 §6.3). |
| `escalation_rate` | engine escalation | `learner_id`, `node_id`, `attempts_count`, `misconception_id`, `timestamp` | P1 + P2 | Emitted per escalation; the rate (target < 10%, plan §13.3) is computed downstream. |
| `content_gap` | engine selection | `node_id`, `total_items`, `usable_items`, `timestamp` | P0 | Node has fewer than 8 usable items (doc 04 §6.3; plan §7.8). |
| `provisional_mastery_failure_rate` | engine review / state machine | `learner_id`, `node_id`, `days_since_placement`, `timestamp` | P1 + P2 | Provisionally mastered node fails review. `propagate_mastery_down` is not implemented in `/engine` (doc 04 §5.1), so nothing can produce this today. |
| `invariant_violation` | engine invariants | `invariant_id` (I-1…I-12), `description`, `node_id?`, `timestamp` | P0 | Should be zero; page on non-zero (doc 04 §11, §14; Task 15 §15.8). |
| `placement_at_graph_floor` | engine placement | `learner_id`, `subject`, `frontier_depth`, `timestamp` | P1 | Placement settles at or below `graph_min_depth`; pilot exit criterion (plan §17.2 item 8). |
| `review_backlog_in_exam_window` | engine review queue | `learner_id`, `backlogged_count`, `cap`, `timestamp` | P1 | `total_due > cap` in an exam window (doc 04 §8.2). |
| `tutor_offer` | engine escalation | `learner_id`, `node_id`, `reason`, `timestamp` | P1 | Optional tutor offer (doc 04 §9.1; plan §13.2). Doc 04 defines `reason` as `hint_ladder_exhausted`, `repeat_misconception`, `self_explain`; the type is `string`. |

### 5.3 Sync events (docs/sync-contract.md; backend/app/services/sync_service.py)

| Event / record | Emitter | Fields | PII | Status |
|---|---|---|---|---|
| `sync_anomaly` kind `state_mismatch` | server sync service, row in `sync_anomalies` | `id`, `learner_id`, `node_id`, `local_state`, `server_state`, `attempt_ids`, `sync_no`, `consecutive_count`, `incident`, `resolution`, `created_at` | P1 + P2 (the two states are full `NodeState` JSON including `recent_window` attempts) | IMPLEMENTED (persisted). Triggered when `(status, ability_elo)` differs (docs/sync-contract.md §2). |
| `sync_anomaly` kind `clock_future` | same | same; `occurred_at` rewritten to `server_time − 5 s`, original in `attempts.occurred_at_client` | P1 | IMPLEMENTED. Threshold > 5 min ahead (§4). |
| `sync_anomaly` kind `clock_past` | same | same; attempt stored with `flagged = true` | P1 | IMPLEMENTED. Threshold > 30 days behind. |
| `sync_anomaly` kind `retired_item` | same | same; attempt stored with `excluded_reason = 'retired_item'` | P1 | IMPLEMENTED. |
| `sync_incident` | same, `incident = true` | as `state_mismatch`, after 3 consecutive syncs for the same learner and node | P1 + P2 | IMPLEMENTED as a flag. Paging on it is SPECIFIED ONLY (Task 15 §15.8). |
| `attempt_rejected` | sync API response | `attempt_id`, `reason` (a validation message, `learner_not_authorized`, `unknown_item`, `item_node_mismatch`) | P1 | IMPLEMENTED in the response; not persisted. |
| `attempt_duplicate` / `applied` | sync API response | lists of `attempt_id` | P1 | IMPLEMENTED in the response; not persisted. |
| `content_gap` (sync variant) | server, `telemetry[]` in the sync response | `event_type`, `node_id`, `item_id`, `reason: "attempt_on_retired_item"` | P0 | IMPLEMENTED in the response; not persisted. Same name as the engine event with a different payload (§5.2; *Decisions Needed* 9). |
| `parity_mismatch` | CI / operations | golden hash versus computed hash | P0 | CI part IMPLEMENTED (`sync-parity.yml`); production alert SPECIFIED ONLY (Task 15 §15.8). |

### 5.4 Backend and pipeline events

| Event / record | Emitter | Fields | PII | Status |
|---|---|---|---|---|
| `gemini_call` | `cost_service.record_call`, row in `gemini_calls` | `call_id`, `model`, `prompt_version`, `input_tokens`, `output_tokens`, `cost_estimate`, `latency_ms`, `pipeline_name`, `framework_id?`, `job_id?`, `created_at` | P0 (no prompt or response text stored) | IMPLEMENTED. Task 8 §8.5 also asks for an outcome; none is stored (*Decisions Needed* 12). |
| `generation_job` lifecycle | `job_recorder`, row in `generation_jobs` | `job_id`, `job_type`, `target_id`, `status` (`queued`/`running`/`completed`/`failed`), `error`, `job_metadata`, `started_at`, `completed_at`, `created_at` | P0; `error` is free text from exceptions and must stay free of learner data | IMPLEMENTED. Streamed to Content Studio at `/api/admin/jobs/stream`. |
| `item_lifecycle_transition` | admin API, row in `item_lifecycle_events` | `item_id`, `from_status`, `to_status`, `reason`, `actor_id`, `created_at` | P0 (staff id) | IMPLEMENTED (table); audit. |
| `pin_migration` | framework service, row in `learner_pin_migrations` | `learner_id`, `from_framework`, `to_framework`, `reason`, `mastery_preserved`, `migrated_at` | P1 | IMPLEMENTED (table). |
| `framework_cohort_snapshot` | cross-framework analytics | `framework_id`, `snapshot_date`, `active_learners`, `mean_mastery_rate`, `mean_retention_30d`, `mean_success_band`, `item_error_rate` | P0 (aggregate) | Table and read API IMPLEMENTED; no writer exists in the repository (doc 07 §4). |
| `cost_by_framework`, `cost_by_pipeline` | `GET /api/analytics/costs` | aggregates over `gemini_calls` | P0 | IMPLEMENTED. Alert at 2× running average per framework is SPECIFIED ONLY (Task 15 §15.8). |
| API, pipeline, notification-scheduler metrics and traces | Prometheus / OpenTelemetry | per Task 15 §15.8 | P0 | SPECIFIED ONLY. |

### 5.5 Pilot metrics (plan §12.5, §13.3, §15.2, §17.2; Task 17)

"Source" says where the number comes from today. "Gap" says what no source defines.

| Metric | Defined in | Source today | Gap |
|---|---|---|---|
| Placement completion rate (≥ 85% to exit) | plan §15.2, §17.2 item 1 | `attempts.is_placement` shows participation | No completion event; no definition of "completed" beyond a `PlacementResult` |
| Observed success rate in 0.72–0.86 | plan §17.2 item 2 | `attempts.correct` per learner; engine `expected_vs_actual_success` | Window and unit (per learner per week?) not defined |
| Day-1 / day-7 / day-30 return | plan §15.2, §17.2 item 3 | first/last `attempts.occurred_at` per `learner_id` | "Day" needs learner-local date (doc 10 §3); no timezone is stored in any table |
| Sessions per week | plan §15.2 | `attempts.session_id` | `session_id` is optional (`NULL` allowed); no session start/end event |
| Review completion rate | plan §15.2, §17.2 item 3 | `attempts.is_review` versus engine review queue size | Queue size at the start of the day is not persisted |
| Time to first mastery | plan §15.2 | `learner_node_state.state.mastered_at` versus first attempt | None beyond definition of "first" |
| Nudge opt-in and opt-out rates | plan §15.2 | `notification_preferences` (SPECIFIED ONLY, doc 07 §8.2) | Table not migrated |
| Tutor open rate when offered (> 50% initial target) | plan §13.3 | `tutor_offer` (TYPED ONLY) | No `tutor_opened` event; no tutor service exists |
| Post-tutor correct rate on next attempt at same node | plan §13.3 | `attempts` joined to tutor events | Needs tutor event with `attempt_id` link |
| Escalation rate per node (< 10%) | plan §13.3 | `escalation_rate` (TYPED ONLY) | Denominator (attempts or learners per node) not defined |
| Share of tutor turns off-task | plan §13.3 | none | Requires tutor turn classification; unspecified |
| 30-day retrieval retention | plan §17.2 item 5; Task 17 H1, H2 | review attempts on mastered nodes ≥ 30 days after `mastered_at` | Comparison group is RCT-only (§5.6) |
| `placement_at_graph_floor` rate | plan §17.2 item 8 | `placement_at_graph_floor` (TYPED ONLY) | Threshold "agreed rate" not set |
| Invariant violations = 0; parity green | plan §17.2 item 7 | `invariant_violation`; `sync-parity.yml` | `invariant_violation` has no dispatcher |
| Expected responses per item | plan §17.2 item 9; doc 05 §7 | `items.n_responses` | Nothing increments it in the repository |
| Teacher weekly active users; classes per teacher; learners per class; toolkit-to-class conversion | plan §12.5 | none | Classroom tables SPECIFIED ONLY (doc 07 §8.1); teacher events undefined |
| Weekly minutes (dose, ≥ 12 h over 8 weeks) | doc 03 §12, §14; Task 17 H4 | `attempts.latency_ms` is per attempt only | Reading and lesson time is not captured; see `dose_accumulated` (§5.6) |

### 5.6 RCT events (Task 17 §17.2) — SPECIFIED ONLY

All carry: `learner_id` (hashed for storage), `framework_id`, `node_id` where relevant, `occurred_at`, and the arm assignment. Every producer must call the consent service before emitting; withdrawal excludes the learner from the primary dataset (Task 17 §17.2, §17.7). Shadow-mode variants produce telemetry only and never alter the served item or mastery state (Task 17 §17.3).

| `event_type` | Hypothesis | Fields beyond the common set | PII |
|---|---|---|---|
| `mastery_gate_variant` | H1 | gate (`single_session` or `two_session`); whether the learner crossed it | P1 (hashed) + P2 |
| `success_band_assignment` | H2 | band for the current trial window | P1 (hashed) |
| `remediation_served` | H3 | `misconception_id`; `variant` (`specific` or `generic`); outcome of the next 3 items | P1 (hashed) + P2 |
| `dose_accumulated` | H4 | weekly minutes; exact timestamp window | P1 (hashed) + P2 |
| `nudge_variant` | H5 | arm (no nudge, parent nudge, teacher assignment); delivered, opened, acted upon | P1 (hashed) + P2 |

Assignments are stored in `rct_assignments` (doc 07 §8.3). Doc 03 §14 lists seven open questions; Task 17 registers five (H1–H5). Questions 6 (gains by starting band) and 7 (tutor versus hint ladder) have no instrumentation in Task 17.

### 5.7 Notification events (Task 14) — SPECIFIED ONLY

The `notifications` table records `delivered_at`, `opened_at`, `suppressed`, `suppression_reason` (doc 07 §8.2). Registered notification types: `review_due`, `dose_shortfall`, `streak_at_risk`, `milestone_mastered`, `framework_updated`, `parent_weekly_digest`, `teacher_dose_report`, `teacher_gap_report`, `consent_reminder` (Task 14 §14.1). Task 15 §15.8 asks for delivery and suppression metrics. Consent given and withdrawn are stored with timestamps in `parent_contacts` (Task 14 §14.6). The parent contact value itself is P3 and must never enter an event.

## Change Log

**v1 — 2026-11-18**

- New document. Records the stack as built (§1–2), the conflict with doc 04's runtime assumptions without resolving it (§3), and the event taxonomy (§5).
- Resolves the "doc 11" citations in plan §7, §9.2, §18, §20 and doc 10 §6, §9 to this document.

**Decision records:** none created by this document. Related existing records: DR-010 (pending attempts affect events for deferred marking). Stack and taxonomy decisions below need records.

## Decisions (resolved 2026-11-18)

Recorded in [DR-019](decisions/DR-019-documentation-set-decisions.md), accepted on the owner's delegated instruction. `PROPOSED` markers earlier in this document that concern these items are superseded by the table below. Provisional rows are to be tuned from pilot data; OPEN rows need a named owner. Code and schema consequences are listed in [IMPLEMENTATION-FOLLOWUPS.md](decisions/IMPLEMENTATION-FOLLOWUPS.md).

| ID | Decision | Status |
|---|---|---|
| DD-11-1 | **Runtime assumption.** Keep the repository stack. Plan §7, §9.2, §18 and the doc 04 §5.2 wording are amended: the engine is TypeScript compiled to JavaScript; the runtimes are Node/V8 (server sidecar), the browser engines (web) and an embedded JS runtime (mobile). The cross-runtime hazard is covered by baked constants, 4-decimal rounding and the parity gate across all three. | ACCEPTED |
| DD-11-2 | **Mobile engine path.** DD-01-7. | ACCEPTED (provisional) |
| DD-11-3 | **Web engine delivery.** The web app imports the compiled engine package (the build artifact), not the source through a path alias, so tests exercise what ships. WASM is not needed because the engine is JavaScript. | ACCEPTED |
| DD-11-4 | **Backend and engine coupling.** Subprocess per replay in Phase 0. Provisional budget: sync request p95 at most 1.5 s for a batch of 500 attempts. When p95 exceeds it, move to a long-lived sidecar and replay incrementally from the last stored state. | ACCEPTED (provisional) |
| DD-11-5 | **Pins.** Python 3.12 in all workflows; Node 22 LTS everywhere; Next.js 14 until an upgrade task exists; pnpm for `web/` documented; a pinned `backend/requirements.txt`; PostgreSQL 16 as a CI service next to SQLite. | ACCEPTED |
| DD-11-6 | **API versioning.** All client-facing endpoints move to `/api/v1/...` before the first external client release, with the 12-month compatibility rule (doc 10 §7). Until then `/api/...` is internal. | ACCEPTED |
| DD-11-7 | **Gemini SDK and Weaviate.** `google.genai` is authoritative (Task 8 is amended). Weaviate dedup and retrieval stay specified and are built before item generation runs at scale and before the tutor. | ACCEPTED |
| DD-11-8 | **Analytics sink.** Phase 0: an append-only Postgres `events` table partitioned by month, plus OpenTelemetry for operational metrics. No third-party analytics SDK on any client, web included. | ACCEPTED |
| DD-11-9 | **`content_gap` shape.** One event name `content_gap` with a `source` field (`selection_pool`, `retired_item_attempt`). The engine must emit its own flag. | ACCEPTED |
| DD-11-10 | **Missing events and timezone.** Adopt `session_started`, `session_ended`, `placement_completed`, `tutor_opened`, `review_session_completed`, `teacher_action`. A learner IANA timezone is stored on the learner profile for day-based metrics. | ACCEPTED |
| DD-11-11 | **RCT `learner_id`.** DD-07-8. | ACCEPTED |
| DD-11-12 | **`gemini_call` outcome.** Add an `outcome` column (`ok`, `retry`, `error`, `blocked`) and a coded error field; free text is not stored. | ACCEPTED |
| DD-11-13 | **PII classes.** The P0-P3 scheme is adopted with doc 13 as its authority. `learner_id` in non-RCT events is the raw internal id; RCT exports use the keyed hash. | ACCEPTED |
| DD-11-14 | **'Instrumented per the taxonomy'.** The definition in §5.1 item 5 is adopted for doc 10 §6 and §9. | ACCEPTED |
