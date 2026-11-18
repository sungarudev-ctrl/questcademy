## TASK 13 — Backend API Surface (Student-Facing, Learner-Scoped)

---

**Context:** Tasks 1–12 complete and confirmed. The engine is stable. The framework layer is live. Content pipelines are live. The Content Studio is live. Web and mobile clients exist with offline-first sync. What is missing is the **coherent student-facing API surface** — the endpoints the two clients call for onboarding, learning path, node reader, practice, tutor, mock tests, progress, and profile.

Several endpoints already exist as stubs from earlier tasks. This task completes them, formalises their contracts, and makes the OpenAPI document the single source of truth that both clients consume.

**Your task:** Complete the student-facing API surface, generate the OpenAPI spec, wire the client SDK generation, and enforce the contract in CI.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§4** — student-facing flow
2. `docs/00-product-plan.md` **§5** — UI screens
3. `docs/00-product-plan.md` **§7** — engine interface the API exposes
4. `docs/00-product-plan.md` **§11** — Task 7's framework API (already built)
5. `docs/04-learning-engine-spec.md` **§2** — `NodeState`, `Attempt`, `Decision` shapes
6. `docs/04-learning-engine-spec.md` **§6** — selection
7. `docs/04-learning-engine-spec.md` **§7** — placement (resumable step API)
8. `docs/04-learning-engine-spec.md` **§8** — FSRS scheduling
9. `docs/04-learning-engine-spec.md` **§9** — escalation
10. `docs/05-assessment-item-spec.md` **§1** — Item contract
11. `docs/10-engineering-standards.md` **§5** — CI gates
12. `docs/10-engineering-standards.md` **§7** — release / backward compatibility

**Deliverables, in order:**

### 13.1 API surface

Endpoints, all under `/api/v1/` (versioned per doc 10 §7 — 12-month backward compatibility minimum):

**Learner profile:**

```
GET    /api/v1/me
PATCH  /api/v1/me
GET    /api/v1/me/framework-pin
POST   /api/v1/me/framework-pin/migrate
GET    /api/v1/me/accessibility
PATCH  /api/v1/me/accessibility
GET    /api/v1/me/notifications
PATCH  /api/v1/me/notifications
DELETE /api/v1/me
```

**Onboarding:**

```
GET    /api/v1/onboarding/frameworks               # active frameworks only
POST   /api/v1/onboarding/placement/init
GET    /api/v1/onboarding/placement/state          # resumable
POST   /api/v1/onboarding/placement/probe
POST   /api/v1/onboarding/placement/finalize
GET    /api/v1/onboarding/placement/result
PATCH  /api/v1/onboarding/exam-date
```

Placement endpoints mirror the resumable step API from doc 04 §7. Each step is idempotent and takes the `placement_state_id` returned by `init`.

**Learning path:**

```
GET    /api/v1/learning-path                       # returns ordered list of node states
GET    /api/v1/learning-path/topics                # topic groupings (navigation only)
GET    /api/v1/learning-path/next                  # the engine's next Decision
```

Each node in the response is a resolved view: `learner_title`, `state`, `est_minutes`, blocking prerequisite's `learner_title` if locked. **No grade band. No `node_id` exposure unless needed for a deep link.**

**Node reader:**

```
GET    /api/v1/nodes/{node_id}                     # metadata + prerequisite info
GET    /api/v1/nodes/{node_id}/content             # resolved via content resolver
GET    /api/v1/nodes/{node_id}/progress            # scroll position, time spent
PATCH  /api/v1/nodes/{node_id}/progress
```

Content is resolved server-side through the learner's framework pin. The client never sees localization logic.

**Practice:**

```
POST   /api/v1/practice/sessions                   # start session, get session_id
GET    /api/v1/practice/sessions/{id}/next         # engine-selected next item (Decision)
POST   /api/v1/practice/sessions/{id}/attempts     # submit attempt
POST   /api/v1/practice/sessions/{id}/hints        # record hint usage
POST   /api/v1/practice/sessions/{id}/pause
POST   /api/v1/practice/sessions/{id}/resume
POST   /api/v1/practice/sessions/{id}/end
```

Attempts are the shape from doc 04 §2.1. Hint recording is separate from the attempt because a hint may be consumed without submitting.

**Tutor:**

```
POST   /api/v1/tutor/sessions
POST   /api/v1/tutor/sessions/{id}/messages
GET    /api/v1/tutor/sessions/{id}/messages
POST   /api/v1/tutor/sessions/{id}/image            # OCR input
DELETE /api/v1/tutor/sessions/{id}
```

The tutor never runs inside `/engine`. The engine returns `escalate_to_tutor`; the client opens a session; the server resolves RAG context from the learner's framework pin and calls Gemini.

**Mock tests:**

```
GET    /api/v1/tests/available                     # from ExamStructure of the learner's framework
POST   /api/v1/tests/sessions
GET    /api/v1/tests/sessions/{id}/next
POST   /api/v1/tests/sessions/{id}/attempts
POST   /api/v1/tests/sessions/{id}/submit          # validates timer, returns full report
GET    /api/v1/tests/sessions/{id}/report
```

Mock attempts set `is_exam = true` and never count toward mastery. Error carried forward is applied server-side for structured multi-part papers.

**Progress:**

```
GET    /api/v1/progress/summary
GET    /api/v1/progress/mastery                    # node-level heatmap data
GET    /api/v1/progress/fsrs-preview               # next 7 days of reviews
GET    /api/v1/progress/predicted-score            # band, not point
GET    /api/v1/progress/dose                       # weekly minutes vs goal
```

All response shapes are documented with the dignity constraint in comments: no grade, no percentile, no rank.

**Sync:** already exists from Task 12 under `/api/sync/`. Move under `/api/v1/sync/` with a redirect from the old path. Backward compat window applies.

**Review queue:** exposed via the practice session's `next` endpoint when the engine decides. No standalone endpoint for the client to fetch reviews directly — the engine is the selector.

### 13.2 Response shapes

Every response is a Pydantic v2 model with:

- Field-level `description` used to generate OpenAPI docs.
- `examples` on every non-trivial field for the OpenAPI document.
- Explicit `Optional[...]` typing; no `Any`.

A shared `LearnerSnapshot` model that both the learning path and sync endpoints use, so the client has one shape to reason about.

### 13.3 Authentication and RBAC

- JWT in the `Authorization: Bearer` header.
- Refresh tokens with rotation, sliding window.
- Every endpoint under `/api/v1/me/*` is self-scoped. Attempting to access another learner's data returns 403 with a stable error code — **not** 404, which would leak existence.
- Admin endpoints remain under `/api/admin/` and enforce the `curriculum_lead`, `reviewer`, `content_admin` scopes from Task 7/9.
- Rate limits per learner: 60 req/min for read endpoints, 20 req/min for write endpoints, 10 req/min for tutor messages.

### 13.4 Error contract

Standard error envelope:

```json
{
  "error": {
    "code": "PLACEMENT_STATE_EXPIRED",
    "message": "The placement session expired. Start a new one.",
    "details": { "placement_state_id": "..." }
  }
}
```

Every error code has a stable string and is documented in `docs/api-reference.md`. Codes are never reused for different conditions.

### 13.5 OpenAPI document

- Generated by FastAPI at `/api/v1/openapi.json`.
- Committed to `shared/schema/openapi.json` on every merge to `main`.
- The committed spec is the SDK source of truth. Clients do not hand-write API calls.

### 13.6 Client SDK generation

- **Web:** `openapi-typescript` produces `web/src/lib/api/generated/schema.d.ts`. The hand-written client wrapper imports types from this file; it does not define types itself.
- **Flutter:** `openapi-generator` produces `mobile/lib/api/generated/` with typed models and a client. Hand-written wrappers layer auth and retries on top.
- **CI gate:** a client-side type mismatch with the committed OpenAPI spec fails the build.

### 13.7 Consent and PII

- Every response that includes a field with learner PII is marked in the OpenAPI document with `x-pii: true`.
- A CI check ensures no PII field appears in an unauthenticated endpoint.
- The `DELETE /api/v1/me` endpoint performs a soft delete by default and a hard delete after a 30-day grace period, in line with the platform's privacy policy. The audit trail of the deletion is preserved; the learner data is not.

### 13.8 Tests

- `backend/tests/unit/api/` — one test file per router. Each endpoint tested for:
  - Success with valid input.
  - 401 with no token.
  - 403 with another learner's resource.
  - 422 with malformed input.
  - Rate limit header correctness.
- `backend/tests/integration/api/` — full journeys:
  - Onboard → placement → first node → first practice session → mastery → review.
  - Tutor session with RAG context scoped to the learner's pin.
  - Mock test with error carried forward.
  - Framework pin migration mid-session.
- OpenAPI snapshot test — the committed spec matches the runtime spec after generation.

### 13.9 CI gates

- **OpenAPI committed:** the committed `shared/schema/openapi.json` matches the runtime generation. Fail hard on mismatch.
- **No PII in unauthenticated endpoints** — grep gate on the OpenAPI document.
- **Every endpoint has a stable error code** — a test that walks the routes and asserts each declared error has a code.
- **Client type generation:** running the SDK generators on the committed spec produces no diff. Fail hard on drift.
- **Backward compatibility:** the previous released OpenAPI spec and the current one are diffed. Any breaking change requires a new `/api/vN/` prefix; a breaking change on an existing version fails the build.

### 13.10 Documentation

`docs/api-reference.md` is generated from the OpenAPI document, plus hand-written narrative sections for:

- Authentication flow.
- Rate limits.
- Sync contract (links to `docs/sync-contract.md`).
- Framework pin migration.
- Error code catalogue.

**Definition of done:**

- Every endpoint implemented, tested, and documented.
- The OpenAPI document is generated, committed, and stable.
- Client SDKs generate cleanly from the spec; no hand-written types in either client.
- Backward compatibility gate passes.
- PII audit passes.
- Rate limits enforced and tested.
- Every error has a stable code and a documented reason.
- All CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the exact OpenAPI generation pipeline, the RBAC enforcement pattern, and any place the spec was ambiguous.

**Do not proceed to Task 14 until the API surface is confirmed.**
