# 08 — AI Services Specification

**Owner:** Engineering + Curriculum lead · **Change control:** strict for §1 (hard rules) and §3.7/§3.8 (governance gates); append-mostly elsewhere
**Version:** v1 (2026-11-18) — first write of a document cited by docs 02, 04 and 05 but never written. Every normative line cites its source. Individual decisions carry their own status in the Decisions section; open points are in *Decisions Needed* and marked **PROPOSED**. Decisions resolved 2026-11-18 (see the Decisions section; DR-019).

> Where AI is allowed to run in Questcademy, what it may produce, and what stops it from doing harm. The authoring pipelines exist in code and are described as built. The tutor and `MarkingService` are specified only.

**How status was verified.** *IMPLEMENTED* = code exists in the repository and a test or CI gate covers it. *PARTIAL* = code exists but diverges from, or omits part of, its spec. *SPECIFIED ONLY* = a spec exists and no code does. Verification on 2026-11-18 was by reading `backend/app/ai/**`, `backend/app/workers/**`, `backend/app/services/**`, `backend/app/api/admin.py`, `shared/prompts/v1/**` and `scripts/ci/*.py`; code was not executed for this document.

**Component names.** doc 02 §6 and doc 05 §3.11 cite `CurriculumExtractor`, `CurriculumMapper` and `MarkingService`. In code the first two are `ObjectiveExtractor` (`backend/app/ai/tools/objective_extractor.py`) and `ObjectiveMapper` (`objective_mapper.py`); `MarkingService` does not exist.

---

## 1. Hard rules

| ID | Rule | Source | Enforced by |
|---|---|---|---|
| AI-1 | The engine decides *when* AI is used; the model only responds. No model call inside `/engine`. | Plan §13.1 r1; doc 04 §9; doc 03 §12A; tasks.md Task 8 §8.2 | Architecture. `/engine` is TypeScript and imports nothing (doc 10 §2); no CI gate checks for model calls |
| AI-2 | Authoring pipelines never run on a request path a learner waits on. They run as queued jobs. | tasks.md Task 8 §8.2 | Celery routing (`backend/app/workers/celery_app.py`). See Decisions Needed 1 and 11 |
| AI-3 | Only `backend/app/ai/gemini.py` may import the Gemini SDK. | tasks.md Task 8 §8.10 | `scripts/ci/check_gemini_cost_recorded.py` |
| AI-4 | No prompt text in code. Prompts live in `shared/prompts/v1/*.md` with a schema. | tasks.md Task 8 §8.1, §8.10 | `scripts/ci/check_prompt_locations.py`; `backend/tests/unit/pipelines/test_shared_prompt_library.py` |
| AI-5 | Every Gemini call writes a `gemini_calls` row (model, prompt version, tokens, cost estimate, latency, framework, job). | tasks.md Task 8 §8.8; plan §3.6 | `GeminiClient.generate_json` calls `cost_service.record_call` |
| AI-6 | Every Celery task writes a `generation_jobs` row and updates its status. | tasks.md Task 8 §8.5, §8.10 | `scripts/ci/check_generation_jobs_recorded.py` |
| AI-7 | AI never writes `objective_node_map`. It proposes into `objective_node_map_proposals`; a human confirms each mapping. | doc 02 §3, §6 stage 5, §9; plan §3.4 | `scripts/ci/check_no_direct_objective_node_map_write.py` (scans `backend/app/ai` and `backend/app/workers`) |
| AI-8 | AI never auto-publishes. Nodes land as `draft`, content as `draft`, items as `tagged` (never served, doc 05 §7), localizations and proposals as `review_status = 'pending'`. A pipeline may not set `approved`. | plan §3.1, §3.2; doc 05 §7; tasks.md Task 8 §8.6 | `scripts/ci/check_localization_review_status.py`; `admin.py` approve endpoints |
| AI-9 | No bulk approval of items, content, mappings or localizations. | doc 02 §9; plan §6 | `scripts/ci/check_no_bulk_endpoints.py`; `/bulk` returns 405 (`backend/app/api/admin.py`); `BulkMappingProhibitedError` (`framework_service.py`) |
| AI-10 | A localization override never changes mathematics. Numeric-answer changes fail the gate. | doc 02 L-3, L-5 | `verify_math_invariance` (`sympy_solver.py`); `scripts/ci/check_math_invariance.py`; re-checked on approval (`admin.py`) |
| AI-11 | Learners see only `approved` overrides. | tasks.md Task 8 §8.6 | `backend/app/services/content_resolver.py` |
| AI-12 | Rate limits are per queue, shared across workers, and fail closed when the shared limiter is down. | tasks.md Task 8 §8.5 | `backend/app/workers/limiter.py` — see §2.4 for a default that departs from this |
| AI-13 | No runtime AI dependency on a Tier 0 path. | plan §13.1 r7; doc 03 §12A; doc 10 §6 | Review checklist item only |
| AI-14 | Learner free text, photos and audio sent to a model: strip EXIF/location, reject faces/names, retention limit, no model training, parental consent for voice, deletion on request. | plan §16.1; doc 05 §3.15, §3.16 | Not yet enforced (no runtime service exists) |

---

## 2. Shared components

### 2.1 `GeminiClient` (`backend/app/ai/gemini.py`) — IMPLEMENTED

| Aspect | Behaviour |
|---|---|
| Entry point | `GeminiClient.generate_json(prompt_name, variables, model?, framework_id?, job_id?, db?, max_retries=3)` returns parsed JSON |
| Prompt load | Reads `shared/prompts/v1/<name>.md`, parses frontmatter (`PROMPT_VERSION`, `schema`, `model_target`, `pipeline`), splits `# System Prompt`, `# RULES`, `# User Template`; caches in memory |
| Variable substitution | `{{key}}` replaced by the value; dicts and lists are JSON-serialised |
| Model | `model` argument, else the prompt's `model_target`, else `gemini-2.5-flash`. Spec: Pro for A1, A2 canonical and C; Flash for B and D (Task 8 §8.2). The prompt files match that split (§2.2) |
| Output | `response_mime_type = application/json` is hard-coded; the prompt's JSON schema is passed as `response_schema` when declared |
| Retry | Up to 3 attempts, `2**attempt` s backoff, on **any** exception including a JSON parse failure. After the last attempt raises `RuntimeError` |
| Cost | `cost_service.record_call` after each successful API response, before the JSON is parsed. If the response has no usage metadata the call is recorded as 500 input and 500 output tokens |
| Test seam | `set_mock_responder` / `clear_mock_responder` replace the live call; the mock path is also cost-recorded |
| Credential | Read from the environment (`GEMINI_API_KEY`); never logged |

Gaps against Task 8 §8.2: the spec says "wraps `google-generativeai`"; the code imports `google.genai`. The spec also says "emits `gemini_call` telemetry"; the code writes the `gemini_calls` row only (no structured log line: no logging calls exist under `backend/app/ai` or `backend/app/workers`).

### 2.2 Prompt library (`shared/prompts/v1/`) — IMPLEMENTED

All nine prompts are at `PROMPT_VERSION: 1.0.0`; the changelog is `shared/prompts/CHANGELOG.md` (version, author, date, rationale per change — tasks.md Task 8 §8.1).

| Prompt file | Pipeline tag | Model target | Schema (`schemas/`) | Called by |
|---|---|---|---|---|
| `node_authoring.md` | A1 | gemini-2.5-pro | `node_authoring.json` | `node_pipeline.author_nodes` |
| `content_canonical.md` | A2_mode_1 | gemini-2.5-pro | `content_canonical.json` | `content_pipeline.generate_content_canonical` |
| `content_localized.md` | A2_mode_2 | gemini-2.5-pro | `content_localized.json` | `content_pipeline.generate_content_localized` |
| `item_generation.md` | B_step_1 | gemini-2.5-flash | `item_generation.json` | `item_pipeline.generate_items` |
| `item_localization.md` | B_step_10 | gemini-2.5-flash | `item_localization.json` | `item_pipeline.generate_items` |
| `framework_extraction.md` | C_step_1 | gemini-2.5-pro | `framework_extraction.json` | `ObjectiveExtractor.extract` |
| `framework_mapping.md` | C_step_3 | gemini-2.5-pro | `framework_mapping.json` | `ObjectiveMapper.propose_mappings` |
| `self_evaluation.md` | self_evaluation | gemini-2.5-flash | `self_evaluation.json` | `item_pipeline.generate_items` only |
| `localization_refresh.md` | D | gemini-2.5-flash | `localization_refresh.json` | `localization_pipeline.refresh_localization` |

**Rule for changing a prompt (tasks.md Task 8 §8.1, §8.9):** bump `PROMPT_VERSION`, add a changelog entry, keep the schema in step. The pipeline tag in the frontmatter becomes `gemini_calls.pipeline_name`, so renaming a tag splits cost history.

There is no prompt for the tutor, `MarkingService` or self-explanation evaluation.

### 2.3 Validation and support tools (`backend/app/ai/tools/`)

| Tool | Purpose | Gate or output | Status |
|---|---|---|---|
| `sympy_solver.py` | Deterministic maths: numeric equality, algebraic equivalence, `verify_math_invariance` | Invariance compares all numbers in order, then LaTeX `$…$` pairs for algebraic equivalence. If the count of `$…$` expressions differs it returns true once the numbers match | IMPLEMENTED. Heuristic, not a full parse; see Decisions Needed 9 |
| `validator.py` | `validate_item`: hints, media, reading level, distractor tagging, SymPy answer agreement. Also `check_item_quality_threshold`, `validate_rule_a9`, `a10`, `a11` | Returns `ValidationResult(is_valid, errors, flesch_kincaid_grade)`. Item-by-item gates are in §3.4 | IMPLEMENTED. `validate_rule_a9/a10/a11` and the quality-threshold check are not called by any pipeline |
| `dedup.py` | Reject a candidate if any cosine distance to an existing text is `< 0.15` | Term-frequency cosine computed locally | PARTIAL. Spec says Weaviate (plan §3.3 step 7; Task 8 §8.3); no Weaviate call exists |
| `chunker.py` | Split lesson sections into ~500-token chunks without splitting a block | Token estimate is `len(text) // 4` | PARTIAL. The only caller (`generate_content_canonical`) discards the result; nothing is embedded |
| `objective_extractor.py` | Verbatim objectives from syllabus text via `framework_extraction` | List of `{code, text, grade_band, …}` | IMPLEMENTED for text input. No PDF parsing (Task 8 §8.3 says "PDF or text") |
| `objective_mapper.py` | Proposals `{objective_id, proposed_node, confidence, rationale}` via `framework_mapping`. **Never writes to the database** | Proposals only | IMPLEMENTED |

### 2.4 Queues and rate limits (`celery_app.py`, `limiter.py`) — PARTIAL

| Queue | Tasks | Limit in code | Limit in spec | Source |
|---|---|---|---|---|
| `authoring` | `task_author_nodes`, `task_generate_content_canonical` | 1 per 60 s (shared by both tasks) | 1/min | Task 8 §8.5; plan §3.5 |
| `localization` | `task_generate_content_localized`, `task_refresh_localization` | 3 per 60 s (shared) | 3/min content; 2/min refresh | Task 8 §8.5 |
| `items` | `task_generate_items` | 5 per 60 s | 5/min | Task 8 §8.5 |
| `framework` | `task_extract_objectives`, `task_map_objectives`, `task_compute_coverage` | 1 per 300 s (shared) | 1/5 min | Task 8 §8.5 |
| `embed` | `task_embed_content`, `task_embed_item`, `task_embed_localized_content` | 20 per 60 s | 20/min | Task 8 §8.5 |

- **Mechanism.** The limiter is a Redis `INCR`/`EXPIRE` fixed window per queue (`rate_limit:<queue>`). Task 8 §8.5 names `aiolimiter.AsyncLimiter`; the code does not use it. A fixed window permits a burst at a window boundary.
- **Exceeded limit.** `RateLimitExceededError` is raised inside the task's `try`; the task marks the job `failed` and retries with backoff (below).
- **Fail-closed default.** `acquire_rate_limit` reads `TESTING` (default `true`) and `FAIL_CLOSED` (default `false`). With neither set it uses a per-process in-memory limiter and never touches Redis, so the limit is not shared across workers; and with Redis down and `FAIL_CLOSED` unset it lets the call through. AI-12 holds only if production sets `TESTING=false` and `FAIL_CLOSED=true`. See Decisions Needed 3.
- **Retries.** Every task is `bind=True, max_retries=3` with `countdown = 2**retries × base` where base is 60 s (nodes, canonical content, coverage), 120 s (extraction, mapping), 30 s (items, localization), 10 s (embed).

### 2.5 Job recorder (`job_recorder.py`) — IMPLEMENTED

`create_generation_job` writes `generation_jobs` (`job_id`, `job_type`, `target_id`, `status`, `error`, `job_metadata`, `started_at`, `completed_at`) in `queued`; `update_job_status` moves it to `running`, `completed` or `failed`. A Celery retry runs the task body again and so creates a **new** job row; the earlier `failed` row stays. Plan §2.7's DDL (`done`, `finished_at`, `params`, `attempts`, `created_by`) differs from the model; see Decisions Needed 8.

### 2.6 Cost tracking (`cost_service.py`) — IMPLEMENTED

`estimate_cost(model, input_tokens, output_tokens)` uses a hard-coded per-million-token table: `gemini-2.5-pro` $1.25 in / $5.00 out; `gemini-2.5-flash` $0.075 in / $0.30 out; any other model $1.00 / $3.00. Aggregations: `cost_by_framework`, `cost_by_pipeline`, `get_cost_breakdown` (totals, by pipeline, by framework). The plan's per-operation table (plan §3.6) lists "author 1 node" at $0.008 and "generate 1 content" at $0.010; the code's own price table gives about $0.015 and $0.0275 for the token counts in that same table. See Decisions Needed 10.

### 2.7 Telemetry — PARTIAL

| Signal | Where | Notes |
|---|---|---|
| Per-call model, prompt version, tokens, cost estimate, latency, framework, pipeline, job | `gemini_calls` | Complete |
| Per-job status and error | `generation_jobs` | Complete |
| Per-call outcome, per-candidate rejection reasons | Nowhere | Task 8 §8.5 asks for "outcome". Rejected items and failed gates are dropped without a record (see §3.4) |
| Cost view | `GET /analytics/costs` (`analytics.py`) returns the by-framework, by-pipeline or overall breakdown. `GET /costs` in `admin.py` calls `get_cost_breakdown(framework_id=…, pipeline_name=…, db=…)`, but the function accepts only `db` (read from signatures; would raise `TypeError`) | Task 8 §8.8 |

---

## 3. Authoring pipelines

Common to every pipeline in this section: **Model** is the prompt's `model_target`; **Never** includes AI-1 to AI-6 and AI-8; **Cost tracking** is `gemini_calls` through `GeminiClient`; **Telemetry** is `gemini_calls` plus `generation_jobs`; **Producers**: no code in `backend/app` enqueues any task (no `.delay`, `.apply_async` or `send_task`), so today the pipelines are reachable from tests and from `POST /api/admin/frameworks/{id}/objectives/extract` only (§3.6).

### 3.1 Pipeline A1 — Skill node authoring — IMPLEMENTED

| Aspect | Spec |
|---|---|
| Purpose | Propose candidate atomic `SkillNode`s for a subject and topic (plan §3.1) |
| Code | `node_pipeline.author_nodes`; task `task_author_nodes` (queue `authoring`) |
| Inputs | `subject`, `topic`, optional `context` (learning objectives) |
| Prompt / model | `node_authoring.md` · gemini-2.5-pro |
| Outputs | `skill_nodes` rows with `status = 'draft'`; `misconceptions` and `misconception_nodes` rows. Existing `node_id` is reused (idempotent) |
| Validation gates | `validate_node_atomicity`: `est_minutes` in 8–15; at least 2 named misconceptions; `candidate_item_capacity >= 20`. Any failing candidate raises `AtomicityTestError` and **aborts the whole batch**; the pipeline commits only after the loop, so no node from that run is stored. Criteria 2 and 3 of doc 02 §2.1 (single mastery criterion; one failure reason) are in the prompt and human review only |
| Never | Auto-publish (draft → `review` → `live` is a curriculum-lead action, plan §3.1 step 4); reuse or rename a `node_id` (doc 02 §2.3); add a grade column to a node (doc 02 §1) |
| Failure | Gemini error: retried 3 times in the client, then the task retries up to 3 times; job `failed`. Atomicity failure: the same retry path, so a deterministic failure is retried pointlessly |
| Queue / limit | `authoring`, 1/min |
| Gaps | `candidate_item_capacity` is checked but not persisted. Step 5 of plan §3.1 (embed into `SkillNodeContentChunk`) is not done here. "Enqueue a human review task" (Task 8 §8.4) has no code; review is by listing `draft` rows |

### 3.2 Pipeline A2 Mode 1 — Canonical lesson content — PARTIAL

| Aspect | Spec |
|---|---|
| Purpose | Generate country-agnostic lesson content for a `live` node (plan §3.2) |
| Code | `content_pipeline.generate_content_canonical`; task `task_generate_content_canonical` (queue `authoring`) |
| Inputs | `node_id`; the node, its prerequisites and misconceptions |
| Prompt / model | `content_canonical.md` · gemini-2.5-pro. `generated_by` is stored as the literal `gemini-2.5-pro`, not the model actually used |
| Outputs | `skill_node_content` row, `status = 'draft'`, `version` = latest + 1 |
| Validation gates | At least 3 worked examples (`ContentValidationError`); Flesch-Kincaid of the **summary** at most (target grade − 2) using the node's `grade_band_hint` (default JSS2). No subject check (A-3 applies to maths and science only, doc 05 A-3) |
| Not implemented | KaTeX parse check; the 300-word minimum; the `FK > grade + 3` auto-reject (plan §6.1); self-evaluation (Task 8 §8.1 says `self_evaluation` is used in A2); embedding to Weaviate; review notification |
| Never | Country-specific content: the prompt forbids hard-coded currencies, local names and alien contexts (prompt rule 5; doc 02 L-1); auto-publish |
| Failure | Validation error raised, no row persisted, task retries (same pointless retry as 3.1) |
| Queue / limit | `authoring`, 1/min |

### 3.3 Pipeline A2 Mode 2 — Localized content — IMPLEMENTED (staging only)

| Aspect | Spec |
|---|---|
| Purpose | Sparse per-section overrides for one framework from its localization brief (plan §3.2 Mode 2; doc 02 §10) |
| Code | `content_pipeline.generate_content_localized`; task `task_generate_content_localized` (queue `localization`) |
| Inputs | `content_id`, `framework_id`; base sections; `localization_briefs` row and `localization_tokens` (doc 09 §7). If no brief exists the pipeline falls back to token values and `GHS` — a country default in code, see Decisions Needed 6 |
| Prompt / model | `content_localized.md` · gemini-2.5-pro |
| Outputs | `content_localizations` row, `review_status = 'pending'` (an existing row is overwritten and reset to `pending`) |
| Validation gates | `verify_math_invariance` on every overridden section; failure raises `ContentValidationError` and nothing is stored |
| Never | Override a section with no local context (prompt rule 1); change any number or equation; use an item on the brief's `avoid` list; set `approved` |
| Failure | As 3.2 |
| Queue / limit | `localization`, 3/min |
| Gaps | Re-embedding to `LocalizedContentChunk` (plan §3.2 step 4) is not done; the `avoid` list is enforced by the prompt only, no code scans output for it |

### 3.4 Pipeline B — Item generation and item localization — PARTIAL

| Aspect | Spec |
|---|---|
| Purpose | Generate candidate items for a node and stage localizations for each active mapped framework (plan §3.3) |
| Code | `item_pipeline.generate_items`; task `task_generate_items` (queue `items`) |
| Inputs | `node_id`, `count` (default 20); node, latest content summary, named misconceptions |
| Prompts / models | `item_generation.md`, `item_localization.md`, `self_evaluation.md` · gemini-2.5-flash |
| Outputs | `items` rows `status = 'tagged'`, `difficulty_elo = 1200`; `item_misconceptions` rows per tagged distractor; `item_localizations` rows `review_status = 'pending'` |
| Order of gates in code | (1) `validate_item` (below); (2) `self_evaluation` score `>= 0.70`; (3) `check_duplicate` against existing stems on the node, distance `< 0.15` drops; (4) persist; (5) per active framework: localize, then `verify_math_invariance` |
| `validate_item` gates | Exactly 3 hints with levels `[1, 2, 3]`; `media_bytes <= 40960`; reading level on the stem (maths and science subjects only; the pipeline does not pass `subject`, so the default `maths` applies); A-2 on `mcq_single` and `mcq` (every non-correct option has a `misconception_id` matching `^[A-Z0-9]+(?:\.[A-Z0-9_]+)+$`); for `numeric`, the last number in `worked_solution` must match `payload.answer` within tolerance |
| Tier mix | `count` split 40% / 40% / remainder (8 / 8 / 4 for 20), passed to the prompt |
| Never | Serve an item (it is `tagged`, doc 05 §7); approve a localization; alter a distractor's `misconception_id` in a localization (`item_localization` prompt rule 4). A failed localization never blocks the base item (plan §2.10: the base item is always valid) |
| Failure | A candidate failing any gate is dropped with no stored reason (the batch continues). A failed localization is dropped, not retried. Gemini or DB errors fail the task and retry. If `self_evaluation` returns no `overall_score`, the code defaults it to `1.0` (fail-open) |
| Queue / limit | `items`, 5/min; a 20-item run makes 1 generation call, 20 self-evaluation calls and up to 20 localization calls per mapped framework, all inside one 5/min slot |
| Gaps | Spec status flow `generated → tagged` (plan §3.3 step 8): code writes `tagged` directly. `validate_item` is not given the A-2 check for multi-select or other selectable types (doc 05 A-2 says "every selectable wrong answer"). The A-1, A-4, A-5 (SVG/WebP), A-6, A-7, A-8 rules are not machine-checked. A `solution_override` alone (no stem or payload override) is not persisted. Embedding of stems (plan §3.3 step 9) is not done. Bank-level A-11 is not computed. The item tier split yields 4 Tier-3 items per 20, below the 5–8 of doc 05 §8 (Decisions Needed 5) |

### 3.5 Pipeline D — Localization refresh — IMPLEMENTED (staging only)

| Aspect | Spec |
|---|---|
| Purpose | Regenerate every item and content override for a framework against an updated brief (plan §3.7; doc 02 L-4) |
| Code | `localization_pipeline.refresh_localization`; task `task_refresh_localization` (queue `localization`) |
| Inputs | `framework_id`; the framework's brief, `item_localizations`, `content_localizations` |
| Prompt / model | `localization_refresh.md` · gemini-2.5-flash |
| Outputs | Existing override rows updated in place, `review_status = 'pending'` |
| Validation gates | `verify_math_invariance` per item and per section; failure raises `LocalizationRefreshError`, aborting the run (no commit) |
| Never | Set `approved`; change any number or equation; leave an `avoid` item in place (prompt rules 1, 2) |
| Spec vs code | Plan §3.7: "on approval, replace; on rejection, keep current". The code overwrites the existing row and sets it to `pending`, so a refreshed `approved` row **stops being served** until re-approved; "keep current" is not implemented. Decisions Needed 7 |
| Failure | One invariance failure aborts the whole framework run |
| Queue / limit | `localization`, 3/min in code, 2/min in Task 8 §8.5 |
| Note | `framework_service.refresh_localization` is a stub that returns zero counts; it is not Pipeline D |

### 3.6 Pipeline C — Framework expansion (extraction, mapping, coverage) — IMPLEMENTED (with one defect)

Maps to doc 02 §6 and plan §3.4. Components:

| Step | Code | Prompt / model | Output | Human gate that follows |
|---|---|---|---|---|
| Extraction (doc 02 §6 stage 2) | `framework_pipeline.extract_objectives` via `ObjectiveExtractor`; task `task_extract_objectives` (queue `framework`) | `framework_extraction.md` · pro | `syllabus_objectives` with `coverage_status = 'unmapped'`; existing `objective_id` (`<framework>:<code>`) reused | Curriculum lead corrects every objective (stage 3). The pipeline stops; it does not call the mapper |
| Mapping (stage 4) | `framework_pipeline.map_objectives` via `ObjectiveMapper`; task `task_map_objectives` | `framework_mapping.md` · pro | `objective_node_map_proposals`, `review_status = 'pending'`, unique per `(framework, objective, node)` | Per-proposal confirm or reject in `admin.py` (`/mappings/{id}/confirm`, `/reject`); stage 5 is a hard gate (doc 02 §6) |
| Gaps (stage 6) | Objectives with no proposal stay `unmapped` (prompt rule 3: do not invent a node) | — | — | Curriculum lead (stage 7: node authoring, Pipeline A1) |
| Coverage (stage 9) | `coverage_service.compute_coverage`; task `task_compute_coverage` | None (no model) | `CoverageReport`; writes `coverage_pct` to the latest `framework_rollouts` row | Activation is a separate human action; coverage never activates (Task 8 §8.7) |

Rules and limits:

- **Verbatim.** Extraction text must be transcribed word for word, not summarised (prompt rule 1; doc 02 §3 `SyllabusObjective.text`). Syllabus provenance and licence status are recorded by the curriculum lead at stage 1 (doc 02 §6); the pipeline does not check them.
- **Mapping rules.** The mapper cites "M-1 to M-5 (doc 02 §3)" but restates them differently from doc 02 (e.g. its M-3 is "do not map a node merely because it is a prerequisite"; doc 02 M-3 is about unmapped objectives). See Decisions Needed 4.
- **Confidence.** A proposal's confidence is advisory and never auto-confirms (doc 02 §6: "AI mapping confidence is not sufficient"). Missing confidence defaults to `0.8` in the code.
- **Candidate catalogue.** `map_objectives` sends all `skill_nodes` regardless of status, and does not check that `proposed_node` exists before storing; `proposed_node` in the model has no foreign key (Task 8 §8.6 specifies one).
- **Coverage.** `coverage_service` counts an objective as covered only when every mapped node has at least 15 items at `reviewed` or beyond and at least 5 at Tier 3 (doc 02 §6 stage 9; doc 05 §7, §8). `framework_service.compute_coverage` — the function `activate_framework` calls — counts a total of 15 across mapped nodes, has no Tier-3 condition and lists `piloting` instead of `piloted`. See Decisions Needed 2.
- **Failure.** Extraction or mapping errors fail the job and retry (120 s base). Partially persisted output is not rolled back by the pipeline beyond the session commit boundary.
- **Queue / limit.** `framework`, 1 per 5 minutes across all three tasks.
- **Defect (found by reading signatures).** `POST /api/admin/frameworks/{id}/objectives/extract` calls `extract_objectives(framework_id, text=…, grade_bands=<list>, job_id, db)`. The function takes `source` (not `text`), requires `actor_id`, and expects `grade_bands` as a string. As written the call raises `TypeError` and the endpoint returns 500. It also runs inline in the request and so bypasses the queue, the rate limiter and the `generation_jobs` CI gate. Status of the endpoint: not working. Decisions Needed 1.
- **Not implemented.** PDF upload and parsing; framework version diff (doc 02 §5.2) is a separate service (`FrameworkVersionDiff`), not an AI step.

### 3.7 Embedding tasks — SPECIFIED ONLY (stubs)

`task_embed_content`, `task_embed_item` and `task_embed_localized_content` (queue `embed`, 20/min) create a job row, take a rate-limit token and return `{"status": "embedded"}`. They write nothing to Weaviate (the code comment says "in actual deployment"). Collections specified: `SkillNodeContentChunk`, `ItemChunk`, `FrameworkObjectiveChunk`, `LocalizedContentChunk` (plan §2.8, §3.2). No model call is made by these tasks; they exist for the tutor's retrieval (§4.1) and for dedup (§2.3).

### 3.8 Governance map

| Output | Initial state | Human action | Final state | Who (doc 02 §9; tasks.md Task 16 §16.1) |
|---|---|---|---|---|
| Skill node | `draft` | Approve | `review` → `live` | Curriculum lead |
| Content (canonical) | `draft` | Approve | published | Reviewer |
| Item | `tagged` | `POST /items/{id}/approve` (refuses if any distractor lacks a `misconception_id`) | `reviewed` | Reviewer |
| Item/content localization | `pending` | Approve (re-runs math invariance) or reject | `approved` / `rejected` | Reviewer per override |
| Mapping proposal | `pending` | Confirm one (creates `objective_node_map` row) or reject | `approved` / `rejected` | Curriculum lead, per mapping |
| Framework | `draft` | Activate at coverage ≥ 80% | `active` | Curriculum lead + diff review |

`admin.py`'s `confirm_mapping_proposal` inserts the `ObjectiveNodeMap` row itself rather than calling `framework_service.map_objective` (which Task 8 §8.4 names as the only creator, and which is the only file on the CI gate's permitted list). The CI gate does not scan `backend/app/api`. See Decisions Needed 12.

---

## 4. Runtime AI services — SPECIFIED ONLY

Neither exists in code. A search of `backend/`, `engine/`, `web/` and `mobile/` finds no `MarkingService`, no tutor service and no tutor prompt. The related student API (Task 13) is "Not started" (tasks/README.md).

### 4.1 Tutor service

| Aspect | Spec |
|---|---|
| Purpose | Inline Socratic help inside the practice loop at moments the engine chooses (plan §13; doc 03 §12A) |
| Trigger | `Decision::escalate_to_tutor { node_id, misconception_id }` — IMPLEMENTED in `engine/src/escalation.ts` (doc 04 §9). The optional `Decision::offer_tutor` with reasons `hint_ladder_exhausted`, `repeat_misconception`, `self_explain` (doc 04 §9.1; plan §13.2) is **not implemented**; its vector `engine/testdata/tutor_offer_triggers.json` is skipped pending DR-003 |
| Inputs | A session seeded with `node_id`, `misconception_id`, the item and the learner's last answer (plan §13.1 r3). Free-form questions are allowed but secondary |
| Retrieval | RAG over `SkillNodeContentChunk` and `LocalizedContentChunk`, filtered by the learner's pinned `framework_id`. The client never sends a framework id (tasks.md Task 10 §10.6) |
| Outputs | Short Socratic turns rendered through `BlockRenderer` (Task 10 §10.6). Turn cap initially 6, then return to practice (plan §13.1 r8) |
| Model / prompt | **Not specified.** No tutor prompt file, no model choice in any source (Decisions Needed 11) |
| Validation | Every numeric claim checked by SymPy before display; on disagreement fall back to the precomputed worked solution (plan §13.1 r6; doc 03 §12A) |
| Never | Decide pacing, mastery or selection (plan §13.1 r1); give the final answer to a live item (r4; doc 05 A-10); reveal a worked solution before the item closes (A-10); act as open chat on a live item or as an unrestricted chatbot (doc 03 §12A, §13); run inside `/engine`; be required on a Tier 0 path (r7); change mastery, Elo or the review schedule — an offer is not an attempt and dialogue is not graded (plan §13.2; doc 04 §9.1) |
| Offline | The learner gets the precomputed hint ladder and worked solution (plan §13.1 r7) |
| Failure | Fall back to the hint ladder and worked solution; never block practice |
| Endpoints (Task 13, not started) | `POST /api/v1/tutor/sessions`, `POST …/{id}/messages`, `GET …/{id}/messages`, `POST …/{id}/image` (OCR), `DELETE …/{id}` |
| Rate limit | 10 tutor messages per minute per learner (tasks.md Task 13 rate-limit line); no queue limit is specified because the path is synchronous |
| Cost / telemetry | Not specified for the tutor. Metrics: open rate when offered (target > 50%), next-attempt correctness vs matched baseline, escalation rate per node (< 10%), off-task share (plan §13.3; doc 03 §12A) |
| Safety | Age-appropriate moderation, off-topic and unsafe refusal, safeguarding escalation; tutor safety suite (jailbreak, self-harm, personal data) passes before each tutor release (plan §16.1, §16.2). Images of minors' work: AI-14 |
| Status | **SPECIFIED ONLY** |

Self-explanation prompt after a correct Tier-3 answer: a candidate, unrated (doc 03 §12A). doc 04 §9.1 says the learner's explanation is not graded; DR-018 (PROPOSED) asks for an AI evaluation protocol. See Decisions Needed 13.

### 4.2 `MarkingService`

| Aspect | Spec |
|---|---|
| Purpose | Mark free-text, photo and audio responses, and give structured multi-part responses their part-level marks (doc 05 §3.11, §3.12, §3.15, §3.16, §4) |
| Inputs | Short constructed response (§3.11): the answer, a `rubric` of criteria with marks, `exemplars` (full, partial, zero), `misconception_indicators`. Photo (§3.15): the compressed image. Audio (§3.16): Opus audio, `passage`, `target_wcpm`, `phoneme_focus` |
| Outputs | Per-criterion marks, an evidence span and a misconception flag (§3.11), mapped to `marks_awarded` and so to the attempt outcome `correct = marks_awarded == max_marks` (doc 05 §4). Structured items yield one attempt per part, each attributed to the part's node, with error carried forward (§3.12; §4) |
| Marking mode | Criterion by criterion, never holistic, because holistic LLM grading is unstable across runs (§3.11). Scoring mode `rubric` (§4) |
| Anchors | An item without at least 3 real exemplars per band must not ship (§3.11) |
| Confidence | Below a threshold, the response goes to the teacher review queue, not to the learner. Marks are advisory to the teacher and binding to the engine only above the threshold (§3.11). **The threshold value is not specified anywhere** (Decisions Needed 11) |
| Never | Let spelling, grammar or handwriting affect a mathematics mark (§3.11); apply negative marking (§4); be on the mastery path for photo upload (§3.15: "never on the mastery path"); run inside `/engine`; run before parental consent for voice (§3.16) |
| Offline | Answer captured locally, queued, marked on sync (§3.11). Photo upload is online only (§3.15). The engine contract for a pending attempt is **undecided** (DR-010, PROPOSED), so no deferred-marked type may ship (doc 05 Decisions Needed 1) |
| Model / prompt | Not specified; §3.15 says "marked by a vision model". No prompt file exists |
| Data handling | AI-14: EXIF and location stripped, face/name rejection, retention limit, no model training, deletion on request; photos ≤ 200 KB (doc 05 §3.15) |
| Cost / telemetry / rate limit | Not specified |
| Status | **SPECIFIED ONLY** |

---

## 5. doc 02 §6 stage to component map

| doc 02 §6 stage | Owner | doc 08 component | Plan §3.4 step |
|---|---|---|---|
| 1 Acquire syllabus | Curriculum lead | None (provenance and licence recorded by hand) | Input |
| 2 AI extraction | `CurriculumExtractor` | `ObjectiveExtractor` / `framework_extraction` (§3.6) | 1 |
| 3 Human correction | Curriculum lead | `admin.py` objective update | 2 |
| 4 Auto-map | `CurriculumMapper` | `ObjectiveMapper` / `framework_mapping` (§3.6) | 3 |
| 5 Human mapping review | Curriculum lead | `admin.py` confirm/reject per proposal | 4 |
| 6 Gap identification | Automated | `coverage_service` unmapped list | 5 |
| 7 Node authoring | Curriculum lead | Pipeline A1 (§3.1) | 6 |
| 8 Localization brief | Curriculum lead | `localization_briefs` row (doc 09 §7) | (plan lists the brief as an input) |
| — | — | Pipeline A2 Mode 2 and B step 10 (§3.3, §3.4) | 7, 8 |
| 9 Coverage report | Automated | `coverage_service` (§3.6) | 9 |
| 10 Publish | Content admin | `framework_service.activate_framework` (not AI) | 10, 11 |

Plan §3.4 has 11 steps and puts the localization passes after node authoring; doc 02 v2 moved the brief ahead of coverage as an input to item localization. This table follows doc 02.

---

## 6. Implementation status

| Component | Status | Evidence |
|---|---|---|
| `GeminiClient`, prompt loader, cost recording | IMPLEMENTED | `gemini.py`, `cost_service.py`; telemetry shortfalls in §2.1, §2.7 |
| Prompt library (9 prompts) | IMPLEMENTED | `shared/prompts/v1/`, `CHANGELOG.md` |
| Pipeline A1 | IMPLEMENTED | §3.1 |
| Pipeline A2 Mode 1 | PARTIAL | §3.2 |
| Pipeline A2 Mode 2 | IMPLEMENTED (no embedding) | §3.3 |
| Pipeline B | PARTIAL | §3.4 |
| Pipeline C | IMPLEMENTED; admin extract endpoint defective | §3.6 |
| Pipeline D | IMPLEMENTED; replace/keep semantics differ from plan | §3.5 |
| Rate limiter and queues | PARTIAL | §2.4 |
| Embedding tasks | SPECIFIED ONLY (stubs) | §3.7 |
| Semantic dedup via Weaviate | PARTIAL | §2.3 |
| Task producers (enqueue calls) | SPECIFIED ONLY | no `.delay` or `.apply_async` in `backend/app` |
| Tutor service | SPECIFIED ONLY | §4.1 |
| `offer_tutor` engine decision | SPECIFIED ONLY | pending DR-003 |
| `MarkingService` | SPECIFIED ONLY | §4.2 |
| Self-explanation evaluation | SPECIFIED ONLY | DR-018, PROPOSED |

---

## Decisions (resolved 2026-11-18)

Recorded in [DR-019](decisions/DR-019-documentation-set-decisions.md), accepted on the owner's delegated instruction. `PROPOSED` markers earlier in this document that concern these items are superseded by the table below. Provisional rows are to be tuned from pilot data; OPEN rows need a named owner. Code and schema consequences are listed in [IMPLEMENTATION-FOLLOWUPS.md](decisions/IMPLEMENTATION-FOLLOWUPS.md).

| ID | Decision | Status |
|---|---|---|
| DD-08-1 | **AI-2 and the tutor.** AI-2 is split. Authoring and bulk generation always run through queues, including the admin extraction endpoint, which is changed to enqueue `task_extract_objectives` and its signature bug fixed. Runtime learner-facing services (tutor, marking) are a separate class: allowed on a request path only as Tier 2, with a timeout, a deterministic fallback, a cost cap and SymPy checks; never inside `/engine`. | ACCEPTED |
| DD-08-2 | **One coverage definition.** `coverage_service.compute_coverage` is the only definition; `activate_framework` calls it. The weaker function in `framework_service` is removed. | ACCEPTED |
| DD-08-3 | **Limiter defaults.** Fail closed: `FAIL_CLOSED` defaults to true and `TESTING` to false. In any non-test environment the workers refuse to start without the shared limiter. | ACCEPTED |
| DD-08-4 | **Mapping rules.** Doc 02 §3 is the only text of M-1 to M-5; the mapping prompt quotes it verbatim and adds only the confidence bands. | ACCEPTED |
| DD-08-5 | **Item tier split.** Default `count` raised to 24 with a tier mix of 9 / 9 / 6, inside doc 05 §8's 8-12 / 8-12 / 5-8, so at least 5 Tier-3 items survive rejection. | ACCEPTED |
| DD-08-6 | **Country fallback in code.** Remove the `GHS` fallback; raise an error when no brief exists. A fallback may exist in tests only. | ACCEPTED |
| DD-08-7 | **Pipeline D semantics.** Refreshed overrides are written to a separate staging row. The live row is unchanged until a reviewer approves; on rejection the staging row is discarded. | ACCEPTED |
| DD-08-8 | **`generation_jobs` schema.** The model is authoritative; plan §2.7 is amended (doc 07 carries the columns). | ACCEPTED |
| DD-08-9 | **Math-invariance strength.** One shared implementation used by the pipelines, the validator and the CI script. If the count of math expressions differs between base and override, the check fails. | ACCEPTED |
| DD-08-10 | **Pricing.** Prices are loaded from configuration, one table. The plan's cost table is regenerated from it. | ACCEPTED |
| DD-08-11 | **Tutor and marking parameters.** Tutor turns and marking use the Flash-class model; Pro stays for authoring. Marking below a confidence of 0.8 is never auto-credited and goes to teacher review. Both have a per-learner daily cost cap, configurable. Telemetry is `gemini_call` plus outcome (DD-11-12). The 0.8 threshold and the cap values are provisional. | ACCEPTED (provisional) |
| DD-08-12 | **Who creates mapping rows.** Only `framework_service.map_objective` does. The admin endpoint calls it. `check_no_direct_objective_node_map_write.py` is extended to scan `backend/app/api`. | ACCEPTED |
| DD-08-13 | **Self-explanation grading.** DR-018. | ACCEPTED (provisional) |

---

## Change Log

**v1 — 2026-11-18**

- First version. Specifies the authoring pipelines as built (§2, §3), the runtime tutor and `MarkingService` as specified only (§4), the doc 02 §6 stage map (§5), and records 13 open decisions.
- Resolves the dangling citations to doc 08 in doc 02 §6, doc 04 §9 and doc 05 §3.11 (and the `docs/decisions/FINDINGS.md` dangling-references audit, item 2).

**Decision records:** DR-003 (`offer_tutor`), DR-010 (pending attempts), DR-018 (self-explanation) — all PROPOSED and related. New records are needed for Decisions Needed 1 to 13.
