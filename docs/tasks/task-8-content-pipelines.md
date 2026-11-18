## TASK 8 — Framework-Aware Content Pipelines

---

**Context:** Tasks 1–7 complete and confirmed. The engine is stable. The framework layer is live: `Country`, `CurriculumFramework`, `FrameworkGradeBand`, `SyllabusObjective`, `ObjectiveNodeMap`, `LocalizationBrief`, `ItemLocalization`, `ContentLocalization`, `LocalizationToken`, `LearnerFrameworkPin`, `FrameworkRollout` exist. The content resolver returns a framework-scoped view without mutating base content. CI is enforcing the country-isolation lint rule.

**Your task:** Implement the four framework-aware content pipelines (A1, A2, B, C, D) end-to-end — prompt library, services, Celery workers, and the coverage reporting that gates framework activation.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§3** — the four pipelines in full, including their framework-aware modes
2. `docs/00-product-plan.md` **§2.4, §2.5, §2.9–§2.13** — schema for `skill_node_content`, `items`, and the country layer
3. `docs/02-curriculum-framework-spec.md` **§2** — atomicity test, prerequisite semantics, naming
4. `docs/02-curriculum-framework-spec.md` **§3** — objective-to-node mapping rules M-1 through M-5
5. `docs/02-curriculum-framework-spec.md` **§6** — curriculum import pipeline, the ten stages
6. `docs/02-curriculum-framework-spec.md` **§9** — governance (no bulk approve, coverage ≥ 80)
7. `docs/05-assessment-item-spec.md` **§1** — Item contract, 17-block model
8. `docs/05-assessment-item-spec.md` **§3** — item types, tier mix, bank composition
9. `docs/05-assessment-item-spec.md` **§7** — item lifecycle
10. `docs/05-assessment-item-spec.md` **§9** — misconception taxonomy
11. `docs/10-engineering-standards.md` **§5** — content CI gates
12. `docs/10-engineering-standards.md` **§9** — definition of done

**Deliverables, in order:**

### 8.1 Prompt library

Create `shared/prompts/v1/` with one file per prompt, each with a `PROMPT_VERSION` header, the system prompt, the user-template, and a `RULES` block. **No prompt text lives in code.**

- `shared/prompts/v1/node_authoring.md` — Pipeline A1
- `shared/prompts/v1/content_canonical.md` — Pipeline A2 Mode 1
- `shared/prompts/v1/content_localized.md` — Pipeline A2 Mode 2
- `shared/prompts/v1/item_generation.md` — Pipeline B step 1
- `shared/prompts/v1/item_localization.md` — Pipeline B step 10
- `shared/prompts/v1/framework_extraction.md` — Pipeline C step 1
- `shared/prompts/v1/framework_mapping.md` — Pipeline C step 3
- `shared/prompts/v1/self_evaluation.md` — the Gemini self-score used in A2 and B
- `shared/prompts/v1/localization_refresh.md` — Pipeline D
- `shared/prompts/CHANGELOG.md` — every change to a prompt records version, author, reason

Every prompt that emits JSON **must** declare `"response_mime_type": "application/json"` and a strict schema. The schema is a JSON file under `shared/prompts/v1/schemas/`.

### 8.2 Gemini client

`backend/app/ai/gemini.py`:

- Wraps `google-generativeai`
- Reads prompt from `shared/prompts/v1/` at load time, caches in memory
- Enforces `response_mime_type=application/json` and JSON schema
- Retries on transient errors with exponential backoff, max 3 attempts
- Emits `gemini_call` telemetry with model, prompt version, token counts, latency
- Uses `gemini-2.5-pro` for A1 and A2 canonical and C, `gemini-2.5-flash` for B and D
- **Never** runs inside `/engine`, never inside a request path that a learner is waiting on

### 8.3 Validation tools

`backend/app/ai/tools/`:

- `sympy_solver.py` — the deterministic math engine. Already specified in Task 1's plan but not yet implemented; implement it fully now.
- `validator.py` — validates a candidate item: SymPy agreement on every numeric answer, every distractor carrying a `misconception_id`, reading level (Flesch-Kincaid) ≥ 2 years below grade band, all media ≤ 40 KB, hints exactly 3.
- `chunker.py` — splits `skill_node_content.sections` (Block[]) into ~500-token chunks, preserving block boundaries.
- `dedup.py` — Weaviate cosine check against the node's existing items and content; reject if any distance < 0.15.
- `objective_extractor.py` — reads a syllabus PDF (or text), returns verbatim objectives with codes and grade bands. Uses `framework_extraction.md`.
- `objective_mapper.py` — proposes objective→node mappings with confidence scores. Uses `framework_mapping.md`. **Never** writes to the DB; returns proposals.

### 8.4 Pipelines

`backend/app/ai/pipelines/`:

**`node_pipeline.py`** — Pipeline A1:
```
author_nodes(subject: str, topic: str, actor_id: UUID) -> list[SkillNode]
  1. Load the node_authoring prompt
  2. Call Gemini
  3. Reject nodes failing the atomicity test (doc 02 §2.1):
     - est_minutes not in [8, 15]
     - fewer than 2 named misconceptions
     - fewer than 20 candidate items' worth of content
  4. Persist as skill_nodes.status = 'draft'
  5. Enqueue a human review task; do not auto-publish
```

**`content_pipeline.py`** — Pipeline A2:
```
generate_content_canonical(node_id: str, actor_id: UUID) -> SkillNodeContent
  1. Load the node and its prerequisites
  2. Load content_canonical prompt
  3. Call Gemini → Block[] sections, worked_examples, formulas, analogies, common_mistakes
  4. Validate: reading level, worked examples ≥ 3, all math in KaTeX
  5. Persist skill_node_content.status = 'draft', version = 1
  6. Chunk → embed → Weaviate SkillNodeContentChunk
  7. Enqueue review

generate_content_localized(content_id: UUID, framework_id: str, actor_id: UUID)
  1. Load the base content, the localization brief, and the localization tokens
  2. Load content_localized prompt
  3. Call Gemini → sparse section_overrides (only sections that reference context)
  4. Validate: SymPy confirms no mathematical content changed
  5. Persist content_localizations row with status implicit (via a staging table or a
     review_status column — use a review_status column, migration in this task)
  6. Re-embed → LocalizedContentChunk
  7. Enqueue review
```

**`item_pipeline.py`** — Pipeline B:
```
generate_items(node_id: str, count: int = 20, actor_id: UUID) -> list[Item]
  1. Load published content + chunks from Weaviate
  2. Load item_generation prompt
  3. Call Gemini → items in the 18-type contract, with the tier mix from doc 05 §8
  4. Validate every item with validator.py:
     - SymPy agrees with every numeric answer
     - Every distractor carries a misconception_id (HARD GATE)
     - Reading level ≥ 2 years below grade band
     - Hints exactly 3
  5. Self-evaluate with self_evaluation prompt; reject if score < 0.7
  6. Dedup via dedup.py; drop if cosine < 0.15
  7. Persist items.status = 'generated' → 'tagged'
  8. For each active framework in the node's affected frameworks:
     - Generate item_localizations overrides via item_localization prompt
     - Re-validate with SymPy
     - Persist item_localizations row
  9. Embed stems → Weaviate ItemChunk and LocalizedContentChunk
  10. Enqueue review
```

**`framework_pipeline.py`** — Pipeline C (extension of the framework layer's import flow):
```
extract_objectives(framework_id: str, source: bytes) -> list[SyllabusObjective]
  1. objective_extractor on the source
  2. Persist as syllabus_objectives.status = 'draft'
  3. Signal the curriculum lead for correction — do not proceed

map_objectives(framework_id: str) -> list[ObjectiveNodeMapProposal]
  1. objective_mapper proposes mappings for every corrected objective
  2. Persist proposals (not mappings) in a staging table
  3. The lead reviews each mapping individually; the mapper service
     (from Task 7) is the only way to create an ObjectiveNodeMap row
  4. Bulk approve remains prohibited at the service layer

compute_coverage(framework_id: str) -> CoverageReport
  1. For each syllabus_objective in the framework, count nodes with ≥ 15
     published items and ≥ 5 tier-3 items
  2. coverage_pct = (# fully covered objectives) / (# objectives)
  3. Persist to framework_rollouts.coverage_pct
  4. Return the report; the framework cannot activate below 80%
```

**`localization_pipeline.py`** — Pipeline D:
```
refresh_localization(framework_id: str, actor_id: UUID)
  1. Load the updated localization brief
  2. Load every item_localizations and content_localizations row for this framework
  3. Regenerate each override via the localization_refresh prompt
  4. SymPy-validate every math-bearing override
  5. Stage as drafts (review_status = 'pending')
  6. Enqueue review; do not auto-replace
```

### 8.5 Celery tasks

`backend/app/workers/tasks/`:

- `node_tasks.py` — `task_author_nodes(subject, topic, actor_id)`
- `content_tasks.py` — `task_generate_content_canonical(node_id, actor_id)`, `task_generate_content_localized(content_id, framework_id, actor_id)`
- `item_tasks.py` — `task_generate_items(node_id, count, actor_id)`
- `framework_tasks.py` — `task_extract_objectives(framework_id, source_key, actor_id)`, `task_map_objectives(framework_id)`, `task_compute_coverage(framework_id)`
- `localization_tasks.py` — `task_refresh_localization(framework_id, actor_id)`
- `embed_tasks.py` — `task_embed_content(content_id)`, `task_embed_item(item_id)`, `task_embed_localized_content(content_id, framework_id)`

Every task:

- Uses `bind=True, max_retries=3`, retries with exponential backoff
- Records `generation_jobs` rows with `job_type`, `target_id`, `status`, `error`
- Writes structured telemetry: model, prompt version, token counts, latency, outcome
- Is idempotent — running the same task twice with the same inputs produces no duplicate rows

Queue priorities (Celery routing):

| Task group | Queue | Rate limit |
|---|---|---|
| Node authoring | `authoring` | 1/min |
| Content canonical | `authoring` | 1/min |
| Content localized | `localization` | 3/min |
| Item generation | `items` | 5/min |
| Framework extraction | `framework` | 1/5min |
| Framework mapping | `framework` | 1/5min |
| Localization refresh | `localization` | 2/min |
| Embedding | `embed` | 20/min |

Gemini rate limiting is enforced **per queue**, using `aiolimiter.AsyncLimiter`. The limiter is shared across workers via Redis. If the shared limiter is unavailable, workers **fail closed** — they do not exceed quota.

### 8.6 Review staging

Add a migration introducing a `review_status` column to `content_localizations`, `item_localizations`, and a staging table `objective_node_map_proposals`:

```sql
ALTER TABLE content_localizations
  ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','approved','rejected'));

ALTER TABLE item_localizations
  ADD COLUMN review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending','approved','rejected'));

CREATE TABLE objective_node_map_proposals (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id   TEXT NOT NULL REFERENCES curriculum_frameworks(framework_id),
  objective_id   TEXT NOT NULL REFERENCES syllabus_objectives(objective_id),
  proposed_node  TEXT NOT NULL REFERENCES skill_nodes(node_id),
  confidence     NUMERIC(3,2) NOT NULL,
  rationale      TEXT,
  review_status  TEXT NOT NULL DEFAULT 'pending'
                 CHECK (review_status IN ('pending','approved','rejected')),
  reviewed_by    UUID REFERENCES users(id),
  reviewed_at    TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (framework_id, objective_id, proposed_node)
);
```

Content resolution (Task 7) must **only** apply `review_status = 'approved'` overrides. Pending or rejected overrides are invisible to learners.

### 8.7 Coverage reporting

`backend/app/services/coverage_service.py`:

- `compute_coverage(framework_id)` implements doc 02 §3 and doc 05 §8.
- Coverage counts an objective as covered only if **every node it maps to** has ≥ 15 published items and ≥ 5 tier-3 items. Partial coverage is reported but does not count.
- Writes to `framework_rollouts.coverage_pct` on every invocation.
- **Never** activates a framework. Activation is a separate service (Task 7), gated on the value this service writes.

### 8.8 Cost tracking

`backend/app/services/cost_service.py`:

- Every Gemini call records an entry in a new `gemini_calls` table (migration in this task): model, prompt version, input tokens, output tokens, cost estimate, framework_id if applicable, job_id.
- The service exposes `cost_by_framework(framework_id)` and `cost_by_pipeline(pipeline_name)`.
- Admin API endpoint `GET /analytics/costs` returns a breakdown.
- The framework expansion UI shows the running cost of each country's generation.

### 8.9 Tests

`backend/tests/unit/pipelines/`:

- `test_node_pipeline.py` — atomicity test rejection cases; a valid node passes; an `est_minutes = 5` node is rejected; a node with 1 named misconception is rejected.
- `test_content_canonical.py` — worked examples ≥ 3; reading level passes; KaTeX validates; a longer-than-allowed content is rejected.
- `test_content_localized.py` — a section with no localizable context is **not** overridden; a section with currency is overridden with the framework's currency; SymPy confirms the mathematical content is unchanged; a localization that changes the answer is rejected.
- `test_item_pipeline.py` — every numeric answer is SymPy-verified; a distractor without a `misconception_id` is rejected; reading level is enforced; a hint set with fewer than 3 hints is rejected; dedup drops a cosine < 0.15 item.
- `test_framework_pipeline.py` — extraction returns verbatim objectives; mapping returns proposals, never direct mappings; coverage computed correctly at the 80% boundary; a proposal cannot be bulk-approved.
- `test_localization_pipeline.py` — refresh regenerates overrides; math-invariance is enforced; approved overrides replace, rejected overrides do not.
- `test_shared_prompt_library.py` — every prompt file has a version header; every JSON-emitting prompt declares the JSON mime type; the CHANGELOG has an entry per version.

`backend/tests/integration/`:

- `test_pipeline_end_to_end.py` — a fake Gemini that returns canned responses drives A1 → A2 → B → C on a small fixture, asserts the resulting rows, and asserts the coverage gate and the review staging.

### 8.10 CI gates

Extend `.github/workflows/content-ci.yml`:

- **Every pipeline writes to `generation_jobs`** — a lint rule that checks each Celery task imports and calls the job recorder.
- **Every Gemini call is cost-recorded** — a lint rule that checks each call site goes through the cost service.
- **Every prompt is loaded from `shared/prompts/v1/`** — a grep gate: no inline prompt strings containing `"You are"` or `"Return JSON"` in `backend/app/ai/pipelines/`.
- **Every localization override has `review_status`** — a query gate run against the test fixture: zero rows without the column populated.
- **No pipeline task ever writes directly to `objective_node_map`** — grep gate on the pipelines folder.

**Definition of done:**

- Every pipeline is implemented, tested, and idempotent.
- Every prompt lives in `shared/prompts/v1/` with a version and a CHANGELOG entry.
- Every Gemini call is cost-tracked.
- Every override passes through a review staging row; unapproved overrides are invisible to learners (asserted in integration test).
- Coverage service computes the correct value at the 80% boundary; a framework at 79.9% cannot activate.
- Bulk approve remains impossible at the service layer and in the proposal staging table.
- The math-invariance gate fails a deliberately-introduced override that changes a numeric answer.
- The country-isolation lint rule still passes.
- `pytest` clean. `npm run test` clean (engine untouched). `npm run simulation` unchanged.
- All new CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the exact JSON schemas the prompts enforce, the shared rate limiter approach, and any place the spec was ambiguous.

**Do not proceed to Task 9 until the pipelines are confirmed.**
