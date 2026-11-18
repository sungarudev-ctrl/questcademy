# Questcademy — Project Instructions

Mastery-based exam-prep platform: a canonical skill graph, per-board curriculum frameworks, and a pure deterministic learning engine shared by every client. Start with `docs/README.md` (the doc map) and `docs/00-product-plan.md`. Where a numbered spec (docs 01–13) and the plan disagree, **the numbered spec wins**. Decisions live in `docs/decisions/` (DR-001 to DR-019); code and schema work those decisions require is listed in `docs/decisions/IMPLEMENTATION-FOLLOWUPS.md`.

## Web and mobile are developed together

**Hard rule: the web app (`web/`) and the mobile app (`mobile/`) advance in lockstep. Neither may be ahead of the other.**

1. **One feature, two clients, one change.** Any learner-facing feature, screen, flow, copy change, or behaviour fix is implemented on **both** `web/` and `mobile/` in the same task, and finished and reviewed together. Do not start a feature on one platform and leave the other for later. A task is not done until both platforms are done.
2. **Never merge half a feature.** If one platform cannot ship a feature yet, stop and ask the owner. Do not land it on the other platform alone. The only exceptions are platform-specific work listed in `docs/tasks/task-11-mobile.md` §11.12 (signing, push, store assets) and web-only admin surfaces (`web/src/app/(admin)`, the Content Studio, which has no mobile counterpart).
3. **Same contract, same fixtures.** Both clients consume the same API, the same engine, and the same fixtures:
   - Block and item rendering is checked against `shared/renderer-fixtures/` on both platforms.
   - Sync and engine parity is checked against `shared/testdata/attempt_log.json` and its golden hash `attempt_log.hash` on both platforms (`docs/sync-contract.md` §9).
   - Design tokens come from `shared/design/tokens.json`; neither client hard-codes colours, spacing or type.
4. **Same tests.** For every screen or flow, add equivalent tests on both platforms (web: vitest; mobile: `flutter test`). A web test without its mobile twin is incomplete, and the reverse.
5. **Parity checklist in every change.** Before declaring done, state in your final message, per feature: web done, mobile done, shared fixture or contract used, both platforms' tests run. If you could not run one platform's tests (for example Flutter is not installed), say so plainly and treat the feature as not finished.
6. **No platform-specific behaviour that changes learning.** Placement, practice, mastery, review, tutor offers, the dose goal and every user-visible rule come from the engine and server, identically on both. UI idiom may differ; behaviour may not.
7. **Fix drift immediately.** If you find the platforms already differ (a screen, a string, an endpoint, a rule), record it, and close the gap before adding anything new on the leading platform. Known drift to close first is in "Known state" below.
8. **Plans and estimates cover both.** When planning, break work into web and mobile tasks of equal scope and order them so both complete together.

## Architecture

| Path | Role |
|---|---|
| `engine/` | Pure TypeScript learning engine. Zero dependencies. The single implementation of mastery, Elo, selection, placement, FSRS (docs/04). |
| `engine-bridge/` | Node sidecar that runs the real engine build for the Python backend. |
| `backend/` | FastAPI, Celery, Alembic migrations, AI pipelines, sync endpoints (docs/07, 08). |
| `web/` | Next.js student app and Content Studio. |
| `mobile/` | Flutter student app (iOS and Android). |
| `shared/` | Prompts and schemas, design tokens, renderer fixtures, parity test data. |
| `simulation/` | Synthetic-learner harness; its baseline guards engine changes. |
| `scripts/ci/` | CI gate scripts. |
| `docs/` | The specification set. The spec is the primary artefact; code follows it. |

## Engine rules (non-negotiable)

- `/engine` imports nothing outside `/engine`. No clock reads, no randomness except the injected seeded PRNG, no network, no `any`, no model calls (docs/04 E-1 to E-6; docs/10 §3).
- **Hand-verified tier:** `mastery.ts`, `elo.ts`, `selection.ts`, `placement.ts`. Write tests from the doc 04 §12 vectors first, then the code, then verify every branch against the spec. Do not generate these from a prose description and trust them.
- Any change to mastery, Elo, selection or scheduling needs a conformance vector in the same commit, a simulation re-run, and a `simulation/CHANGELOG.md` entry. 100% branch coverage is enforced.
- **Clients never re-implement engine logic.** Web imports the compiled engine package. Mobile binds to the same engine build (decision DD-01-7: an embedded JavaScript runtime, confirmed by a spike on the reference device; a Dart port only if the spike fails, and then it must pass every vector and the parity log). `scripts/ci/check_no_client_engine_predicates.py` must pass.
- The two-session mastery gate is never relaxed for engagement. The UI never shows grade level, percentile, rank, or "behind/ahead" wording (dignity constraint, docs/03 §2).

## Other hard constraints

- No model call on a Tier 0 path (docs/01 §5.1, DD-01-1). The tutor is Tier 2 with a Tier 1 hint-ladder fallback, inline and engine-triggered, never a free-chat surface (docs/REJECTED_FEATURES.md R-10, R-11).
- Country is data: `country_code` appears on frameworks only (docs/02 L-2). Localization is an overlay, never a fork, and never changes the maths (L-3).
- Mapping objectives to nodes is per mapping; bulk approve is prohibited and only `framework_service.map_objective` creates `objective_node_map` rows.
- Pin migration never mutates `learner_node_state` (I-11). Engine output is framework-agnostic (I-12).
- Learner-facing features sit behind a feature flag, work offline where docs/06 requires, and are checked on the reference device (2 GB RAM, Android 8; docs/10 §8).
- Check any engagement or AI feature against `docs/REJECTED_FEATURES.md` before designing it.
- Money is integer minor units. Timestamps are `timestamptz` UTC; learner-local dates are separate.

## Commands

| What | Command |
|---|---|
| Engine tests, typecheck | `cd engine && npm run typecheck && npm test` |
| Engine build (needed by the sidecar and web) | `cd engine && npm run build` |
| Simulation | `cd engine && npm run simulation` and `npm run simulation:diff` |
| Sidecar and parity tests | `node --test engine-bridge/test/replay.test.mjs` |
| Backend tests | `.venv/Scripts/python.exe -m pytest backend/tests` |
| Migrations | `alembic -c backend/alembic.ini upgrade head` (use `-x sqlalchemy.url=...` for scratch databases) |
| Web | `cd web && npm run typecheck && npm test && npm run lint` |
| Mobile | `cd mobile && flutter analyze && flutter test` |
| Client-logic gate | `python scripts/ci/check_no_client_engine_predicates.py` |

Node 22, Python 3.12 (decision DD-11-5). The `.venv` at the repo root is the Python environment.

## Working rules

- **Read before writing:** read the spec section that owns the contract before implementing it, and cite it in your final message. If the spec is silent or conflicts with code, stop and ask; do not guess. Spec changes need the owner's sign-off (docs/10 §6).
- **Decisions:** `docs/decisions/` records are accepted by the owner. Do not reverse one without a new record. Provisional and OPEN items are listed in `IMPLEMENTATION-FOLLOWUPS.md`.
- **Tests first** for the engine; for everything else, real tests that do not assert the implementation back at itself. Deliberately-violated CI gates must fail.
- **Never touch secrets:** do not open `.env` or anything under `docs/firebase-project/`, and never print or log their contents.
- **Git:** the remote is `https://github.com/sungarudev-ctrl/questcademy.git`, default branch `main`. Work on short-lived branches and open pull requests; do not push to `main` directly. Never commit or push without being asked, and never force-push.
- **Secrets never enter git.** `.gitignore` excludes `.env`, `docs/firebase-project/`, the Firebase client files (`google-services.json`, `GoogleService-Info.plist`; each developer places their own locally), service-account keys and `*.db`. Add new variable names to `.env.example` (names only, never values). Before any commit, check `git status` and `git diff --cached --stat` for stray secrets or databases. If a secret is ever committed, treat it as compromised and rotate it; removing the commit is not enough.
- Before any destructive overwrite of a document or data file, make a copy or ask. Do not delete database files.
- **Keep docs in step with code:** when a contract changes, update the owning doc in the same change (doc 07 for schema, `docs/sync-contract.md` for sync, doc 11 §5 for events).
- **Report faithfully:** say what was run and what was not; failing tests are reported with output, not summarised away.
- End a work session by updating `docs/tasks/README.md` status if a task's status changed.

## Known state (verify before relying on it)

Update this list as items close.

- Engine, framework layer, pipelines, Content Studio and the server side of sync are built and tested.
- **Platform drift to close first:** mobile re-implements mastery and Elo in `mobile/lib/core/engine/engine_binding.dart`; web sync is a timer simulation that calls endpoints the backend does not serve (`/api/learners/attempts`, `/api/tutor/chat`); the web tutor is a free-chat surface; neither client renders math with KaTeX; web shows an "80 minutes target" (the goal is now 90 / 60, DR-009); the web mock-exam list is hard-coded and includes a Paper 2; mobile's offline queue is `shared_preferences`, not a per-learner database.
- Not built: the student-facing API (Task 13), notifications (14), infrastructure (15), curriculum onboarding (16), RCT instrumentation (17), the classroom layer and teacher toolkit (doc 12).
- `docs/decisions/FINDINGS.md` lists every known spec-versus-code mismatch.
