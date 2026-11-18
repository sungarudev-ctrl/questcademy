# 07 — Data Model Specification

The consolidated reference for every table: what the schema is at the migration head, what the specs say it should be, and where they differ.

**Owner:** Engineering · **Change control:** every table change ships an Alembic migration with a matching downgrade (tasks Task 7) and updates this document in the same change (doc 10 §9, "Documentation updated if a contract changed").
**Version:** v1 (2026-11-18) — PROPOSED. Describes Alembic head `004_sync`. Individual decisions carry their own status in the Decisions section; open points are in *Decisions Needed* at the end. Decisions resolved 2026-11-18 (see the Decisions section; DR-019).

> Sources, in order of authority for "what exists": `backend/alembic/versions/001`–`004` (the migrated schema), `backend/app/db/models/*.py` (the models). Sources for "what was intended": Product Plan §2 and §14, doc 02, doc 04 §2, doc 05 §1/§7, `docs/sync-contract.md`, `docs/tasks.md` Tasks 12, 14, 17. Where they disagree, §9 lists the disagreement and does not pick a side.

---

## 1. Scope and status legend

| Mark | Meaning |
|---|---|
| **MIGRATED** | An Alembic migration creates the table and a SQLAlchemy model exists. |
| **MODELLED ONLY** | A model or code-level schema exists, with no migration. |
| **SPECIFIED ONLY** | A spec (plan, task, doc) defines it; neither migration nor model exists. |

At `004_sync` all 29 models in `backend/app/db/models/__init__.py` are MIGRATED; no SQL table is MODELLED ONLY. The Weaviate collections (§8.4) are not SQL tables and are marked SPECIFIED ONLY there.

Migration chain: `001_country_framework` (14 tables) → `002_review_staging` (11 tables, 2 altered) → `003_schema_v2` (3 altered) → `004_sync` (4 tables). The CI migration gate runs `upgrade head` then `downgrade base` on SQLite (`.github/workflows/content-ci.yml`, Gate 4). It does not compare models to migrations; §9 was produced by reading both.

## 2. Conventions as migrated

- **Identifiers.** Surrogate keys are `VARCHAR(36)` holding a UUID string, generated in Python (`uuid.uuid4()`), not `UUID` with `gen_random_uuid()` (plan §2 uses `UUID`). Natural keys are `VARCHAR(100)` (`node_id`, `framework_id`, `misconception_id`) (models/content.py, models/framework.py).
- **JSON.** Migrations declare `sa.JSON()`; models declare `JSON().with_variant(JSONB, "postgresql")`. A Postgres database built by `alembic upgrade` therefore gets `JSON`, not `JSONB` (plan §2 specifies JSONB). See §9.
- **Arrays.** `TEXT[]` in the plan (`skill_nodes.representations`, `localization_briefs.common_names/cities/foods/avoid`, `assignments.node_ids`) is `JSON` in the migrated schema.
- **Timestamps.** `created_at`/`updated_at` are `TIMESTAMPTZ` with `server_default=now()`. Exception: `attempts.occurred_at`, `occurred_at_client` and `learner_sync_cursor.latest_attempt_at` are `VARCHAR(32)` ISO-8601 UTC strings (doc 10 §3 says timestamps are `timestamptz`; see §9).
- **Default database.** `DATABASE_URL` defaults to `sqlite:///./questcademy.db` (backend/app/db/base.py). Task 15 §15.1 requires Postgres for anything touching JSONB or migrations; CI migrates on SQLite.
- **Country isolation.** `country_code` exists on `countries`, `curriculum_frameworks`, `framework_rollouts` and nowhere in the content layer (plan §2.9; enforced by `scripts/ci/check_country_isolation.py`).
- **Mastery lives on nodes, not frameworks.** Pins never mutate `learner_node_state` (plan §2.13, I-11; docs/sync-contract.md §8).

## 3. Canonical skill graph (MIGRATED, migration 002)

Country-agnostic. Doc 02 §2 defines the node; plan §2.1 the SQL.

### 3.1 `skill_nodes`

| Column | Type | Null | Default / constraint |
|---|---|---|---|
| `node_id` | VARCHAR(100) | PK | stable identifier, e.g. `MATH.FRAC.ADD_UNLIKE` |
| `subject`, `topic` | VARCHAR(100) | NOT NULL | `topic`/`subtopic` are navigation only (doc 02 §2) |
| `subtopic` | VARCHAR(100) | NULL | |
| `title`, `learner_title` | VARCHAR(200) | NOT NULL | teacher-facing / learner-facing |
| `description` | TEXT | NOT NULL | |
| `grade_band_hint` | VARCHAR(50) | NULL | placement seed only |
| `est_minutes` | INT | NOT NULL | CHECK `est_minutes BETWEEN 8 AND 15` (`check_skill_nodes_est_minutes`) |
| **`difficulty_elo`** | INT | NOT NULL | server default `1200` |
| `representations` | JSON | NULL | plan: `TEXT[]` |
| `status` | VARCHAR(20) | NOT NULL | default `draft`; CHECK in (`draft`,`review`,`live`,`deprecated`) |
| `superseded_by` | VARCHAR(100) | NULL | FK `skill_nodes.node_id` |
| `created_at`, `updated_at` | TIMESTAMPTZ | NULL | `now()` |

**`difficulty_elo` semantics.** Doc 04 §5.1 cites this section as the place the column is defined: it is the node's difficulty on the Elo scale, the base for every item seed (`item seed = node.difficulty_elo + tier_offset(tier)`, T1 −285, T2 −115, T3 +20; doc 04 §5.1; doc 05 §7 revision rule) and an input to the placement graph (`SkillNodeSummary.difficulty_elo`, engine/src/state.ts).

- Doc 04 §5.1 specifies the derivation `difficulty_elo(n) = 1200 + 25 * level(n)` over the prerequisite graph, with `level` = longest prerequisite chain, soft edges counted, cycles an error. The 25-per-level constant is provisional (doc 04 §5.1).
- **Implementation status.** The only code path that sets an item's difficulty writes the literal `1200` (backend/app/ai/pipelines/item_pipeline.py:167). Nothing under `backend/app` writes `skill_nodes.difficulty_elo`; the column holds the default for every node. This confirms doc 04 §5.1's statement that "nothing has ever written it". The derivation is specified, not implemented.
- The engine updates node-level difficulty in memory (`NodeState.difficulty_elo?`, engine/src/state.ts; `initialNodeState` in engine-bridge/replay.mjs) but the sidecar does not write back to `skill_nodes`. Whether the column is seeded once (authoring/graph import) or maintained from responses is open (*Decisions Needed* 3).
- Doc 04 §5.1 names the prerequisite table `node_prerequisites`; the migrated name is `skill_node_prerequisites`.

### 3.2 `skill_node_prerequisites`

| Column | Type | Constraint |
|---|---|---|
| `node_id` | VARCHAR(100) | PK part; FK `skill_nodes.node_id` |
| `prerequisite_node_id` | VARCHAR(100) | PK part; FK `skill_nodes.node_id` |
| `type` | VARCHAR(20) | NOT NULL; CHECK in (`hard`,`soft`) |

Table-level CHECK `node_id <> prerequisite_node_id` (`check_skill_node_prerequisites_no_self_loop`). Plan §2.1 also requires, "at content build", max 3 hard prerequisites, acyclic, depth ≤ 40; none of these is a database constraint (doc 10 §5 gate "skill graph acyclic").

### 3.3 `misconceptions`, `misconception_nodes`

- `misconceptions`: PK `misconception_id` VARCHAR(100); `domain` VARCHAR(100), `description` TEXT, `learner_facing_name` VARCHAR(200) NOT NULL; `prevalence` NUMERIC(5,4) NULL ("measured, not assumed", plan §2.5); `remediation_id` VARCHAR(100) NULL; `typical_origin` TEXT NULL. No FK from `remediation_id` to any table (no remediation table exists).
- `misconception_nodes`: composite PK (`misconception_id` FK, `node_id` FK).

## 4. Curriculum framework layer (MIGRATED, migrations 001 and 003)

| Table | Key columns and constraints as migrated |
|---|---|
| `countries` | PK `country_code` VARCHAR(2); `name`, `default_locale` VARCHAR(10), `default_currency` VARCHAR(3); `status` default `active`, CHECK in (`planned`,`active`,`paused`,`sunset`). |
| `curriculum_frameworks` | PK `framework_id` VARCHAR(100); FK `country_code`; `board`, `subject`, `version` VARCHAR(50), `locale`, `currency`; `effective_from` DATE NOT NULL, `effective_until` DATE; `framework_type` VARCHAR(50) NOT NULL default `standards_aligned`, CHECK in (`exam_board`,`standards_aligned`) (003); `status` default `draft`, CHECK in (`draft`,`active`,`superseded`); `grading_scale` JSON NOT NULL; `exam_structure` JSON NULL (made nullable in 003); `created_at`. |
| `framework_grade_bands` | PK (`framework_id` FK, `band_id` VARCHAR(50)); `ordinal` INT NOT NULL, CHECK `ordinal BETWEEN -1 AND 12` (001 created `1 AND 13`; 003 replaced it); `typical_age` INT NULL; `label_local` NOT NULL. |
| `syllabus_objectives` | PK `objective_id`; FK `framework_id`; `code` NOT NULL; `text` TEXT NOT NULL; `grade_band` VARCHAR(50) NOT NULL (no FK to `framework_grade_bands`); `term` INT; `exam_weight` FLOAT; `coverage_status` default `unmapped`, CHECK in (`full`,`partial`,`unmapped`); UNIQUE (`framework_id`,`code`). |
| `objective_node_map` | PK (`objective_id` FK, `node_id`). **`node_id` has no FK** to `skill_nodes` (created in 001, before `skill_nodes` existed in 002; never added). |
| `learner_framework_pins` | PK (`learner_id` VARCHAR(36), `framework_id` FK); `pinned_at`. `learner_id` has no FK (no `users` table). A composite PK permits several pins per learner; whether exactly one is "current" is not stated anywhere (*Decisions Needed* 5). |
| `framework_version_diffs` | PK `id`; FKs `from_framework`, `to_framework` (both nullable); JSON `objectives_added`, `objectives_removed`, `objectives_remapped`, `coverage_delta`. |
| `framework_rollouts` | PK `id`; FK `country_code` NOT NULL, FK `framework_id` NULL; `phase` CHECK in (`planned`,`importing`,`mapping`,`authoring`,`reviewing`,`piloting`,`active`,`superseded`); `coverage_pct` NUMERIC(5,2); `blockers` JSON; `started_at`, `activated_at`, `superseded_at`; `notes`. |
| `learner_pin_migrations` | PK `id`; `learner_id` (no FK); FKs `from_framework`, `to_framework`; `reason` CHECK in (`country_change`,`board_change`,`superseded`); `mastery_preserved` BOOL default true; `migrated_at`. |
| `framework_cohort_stats` | PK (`framework_id` FK, `snapshot_date` DATE); `active_learners` INT; `mean_mastery_rate`, `mean_retention_30d`, `mean_success_band`, `item_error_rate` NUMERIC(4,3) NOT NULL. Never joined to `skill_nodes` or `items` (plan §2.12; backend/app/api/analytics.py). |
| `objective_node_map_proposals` | (migration 002) PK `id`; FKs `framework_id`, `objective_id`; `proposed_node` VARCHAR(100) (no FK); `confidence` NUMERIC(3,2); `rationale`; `review_status` default `pending`, CHECK in (`pending`,`approved`,`rejected`); `reviewed_by` VARCHAR(36); `reviewed_at`; UNIQUE (`framework_id`,`objective_id`,`proposed_node`). AI proposals are staged here and never written straight to `objective_node_map` (tasks Task 8 §8.6; CI Gate 9). |

Framework immutability once `active` (doc 02 V-1) and the `exam_structure` requirement for `framework_type = 'exam_board'` (plan §2.2) are not database constraints.

## 5. Learner state and the attempt log (MIGRATED, migration 004)

Spec: doc 04 §2; docs/sync-contract.md. The attempt log is the source of truth; `learner_node_state` is derived by replaying it through the engine sidecar (docs/sync-contract.md §1; backend/app/services/sync_service.py).

### 5.1 `attempts` (append-only)

| Column | Type | Null / constraint |
|---|---|---|
| `attempt_id` | VARCHAR(36) | PK; client UUID v4; the PK is the idempotency key (I-8) |
| `learner_id` | VARCHAR(36) | NOT NULL; no FK |
| `node_id` | VARCHAR(100) | NOT NULL; FK `skill_nodes` |
| `item_id` | VARCHAR(36) | NOT NULL; FK `items` |
| `difficulty_tier` | INT | NOT NULL; CHECK in (1,2,3) |
| `correct` | BOOL | NOT NULL |
| `partial_credit` | VARCHAR(8) | NULL (string form of 0.0–1.0; plan: `NUMERIC(3,2)`) |
| `selected_option`, `misconception_id` | VARCHAR(100) | NULL |
| `latency_ms` | INT | NULL |
| `hints_used` | INT | NOT NULL; CHECK 0..3 |
| `session_id` | VARCHAR(36) | NULL |
| `occurred_at` | VARCHAR(32) | NOT NULL; ISO-8601 UTC, possibly rewritten for clock skew |
| `occurred_at_client` | VARCHAR(32) | NOT NULL; as sent |
| `received_at` | TIMESTAMPTZ | NOT NULL; `now()` |
| `server_sequence` | INT | NOT NULL, UNIQUE; monotonic on receipt |
| `is_review`, `is_placement`, `is_exam` | BOOL | NOT NULL default false |
| `flagged` | BOOL | NOT NULL default false (`clock_past`: excluded from mastery unless `included_by_lead`) |
| `included_by_lead` | BOOL | NOT NULL default false |
| `excluded_reason` | VARCHAR(40) | NULL; `retired_item` or NULL |

Index `idx_attempts_learner_node` (`learner_id`,`node_id`,`occurred_at`). Ordering for replay is `(occurred_at, attempt_id)`, never locale-aware (docs/sync-contract.md §2). Sync-only columns (`occurred_at_client`, `received_at`, `server_sequence`, `flagged`, `included_by_lead`, `excluded_reason`) are not in the engine `Attempt` type (engine/src/state.ts).

### 5.2 `learner_node_state`

PK (`learner_id` VARCHAR(36), `node_id` FK `skill_nodes`); `status` VARCHAR(20) NOT NULL (no default, no CHECK); `ability_elo` FLOAT NOT NULL; `state` JSON NOT NULL ("full engine NodeState, canonical source", models/sync.py); `updated_at`. Never written by a pin migration (I-11; tested by checksum, docs/sync-contract.md §8). Plan §2.6 specifies one column per `NodeState` field; the migrated schema stores them in `state`.

### 5.3 `learner_sync_cursor`, `sync_anomalies`

- `learner_sync_cursor`: PK `learner_id`; `sync_count` INT NOT NULL default 0; `latest_attempt_at` VARCHAR(32) NULL.
- `sync_anomalies` (docs/sync-contract.md §7): PK `id`; `learner_id`; `node_id` NULL; `kind` CHECK in (`state_mismatch`,`clock_future`,`clock_past`,`retired_item`); `local_state`, `server_state` JSON NULL; `attempt_ids` JSON NOT NULL; `sync_no` INT; `consecutive_count` INT default 1; `incident` BOOL default false (set when `state_mismatch` repeats for the same learner and node in 3 consecutive syncs); `resolution` CHECK in (`open`,`resolved`,`false_positive`,`escalated`), default `open`; `resolution_reason` TEXT; `created_at`. Index `idx_sync_anomalies_learner_node`.

### 5.4 State the engine needs but no table holds

Doc 04 §2.2 removed `misconception_hits` and kept per-learner remediation dedup (`remediation_shown_recently`) out of `NodeState`, pointing at "doc 07 §5/§8" for where it is persisted. Neither the migrated schema nor any spec defines that storage. See *Decisions Needed* 4. Pending attempts for deferred-marking items (DR-010) likewise have no storage.

## 6. Lesson content and items (MIGRATED, migrations 002 and 003)

### 6.1 `skill_node_content`

PK `id`; FK `node_id`; `version` INT NOT NULL default 1; UNIQUE (`node_id`,`version`); `summary`; JSON `learning_objectives` NULL, `sections` NOT NULL (Block[], 17-block model), `worked_examples` NOT NULL, `key_formulas`, `analogies`, `common_mistakes` NULL; `estimated_minutes` INT NOT NULL; `status` default `draft`, CHECK in (`draft`,`review`,`published`,`archived`); `generated_by` VARCHAR(100); `reviewed_by` VARCHAR(36) (no FK); `reviewed_at`, `published_at`, `created_at`, `updated_at`.

### 6.2 `items`

PK `item_id` VARCHAR(36); FK `node_id` NOT NULL; `type` VARCHAR(50) NOT NULL (no CHECK; 18 types, doc 05 §3); `difficulty_tier` CHECK in (1,2,3); `difficulty_elo` INT NOT NULL default 1200; JSON NOT NULL `stem`, `payload`, `scoring`, `hints`, `worked_solution`, `a11y`; `hint_variants` JSON NULL; `printable` BOOL NOT NULL default **true** (003); `offline_capable` BOOL NOT NULL default true; `media_bytes` INT NOT NULL default 0; `status` VARCHAR(20) NOT NULL default `draft`; `p_value`, `discrimination` NUMERIC(4,3) NULL; `n_responses` INT NOT NULL default 0; `created_at`.

`status` CHECK (`check_items_status`): `draft`, `generated`, `tagged`, `reviewed`, **`piloting`**, `live`, `calibrating`, `calibrated`, `revision`, `retired`. Doc 05 §7 and plan §2.5 name the status `piloted`. "Exactly 3 hints" (doc 05 §1) is not a database constraint. `locale_variants` existed after 002 and was dropped in 003 (localization is an overlay, doc 05 §1; doc 02 L-1/L-2).

### 6.3 `item_misconceptions`, `item_lifecycle_events`

- `item_misconceptions`: PK (`item_id` FK, `misconception_id` FK); `pattern` JSON NOT NULL.
- `item_lifecycle_events`: PK `id`; FK `item_id` NOT NULL; `from_status` NULL, `to_status` NOT NULL (VARCHAR(20), no CHECK against the item status set); `reason` TEXT; `actor_id` VARCHAR(36) (no FK); `created_at`.

### 6.4 Localization overlay (migration 001; `review_status` added in 002)

| Table | Key | Columns |
|---|---|---|
| `item_localizations` | PK (`item_id`, `framework_id` FK) | `item_id` has no FK to `items`; JSON `stem_override`, `payload_override`, `solution_override`; `rationale`; `review_status` NOT NULL default `pending`, CHECK in (`pending`,`approved`,`rejected`); `created_by`; `created_at` |
| `content_localizations` | PK (`content_id`, `framework_id` FK) | `content_id` has no FK to `skill_node_content`; `section_overrides` JSON; `rationale`; `review_status` (same CHECK); `created_by`; `created_at` |
| `localization_tokens` | PK (`framework_id` FK, `token_key` VARCHAR(50)) | `token_value` VARCHAR(100) NOT NULL |
| `localization_briefs` | PK `framework_id` FK | `currency` VARCHAR(10); JSON NOT NULL `common_names`, `cities`, `foods`, `units_preferred`, `avoid`, `scenario_bank`; `updated_at` |

Resolver rule (plan §2.10): serve the base item; apply overrides only where a row exists for (`item_id`, `framework_id`) (backend/app/services/content_resolver.py).

## 7. Pipeline and cost tables (MIGRATED, migration 002)

- `generation_jobs`: PK `job_id`; `job_type` VARCHAR(50) NOT NULL; `target_id` VARCHAR(100) NOT NULL; `status` default `queued`, CHECK in (`queued`,`running`,`completed`,`failed`); `error` TEXT; `job_metadata` JSON; `started_at`, `completed_at`, `created_at`.
- `gemini_calls`: PK `call_id`; `model` VARCHAR(50), `prompt_version` VARCHAR(20), `input_tokens`, `output_tokens` INT, `cost_estimate` NUMERIC(8,6), `latency_ms` INT, `pipeline_name` VARCHAR(50) NOT NULL; `framework_id` FK NULL; `job_id` VARCHAR(36) NULL (no FK to `generation_jobs`); `created_at`. Written by `cost_service.record_call` (backend/app/services/cost_service.py). No outcome column (see doc 11 §5.3).
- `framework_cohort_stats` and `objective_node_map_proposals` are in §4.

## 8. Specified only (no migration, no model)

### 8.1 Identity and classroom

| Table | Specified in | Notes |
|---|---|---|
| `users` | plan §2.2, §2.4–2.6, §14.1 (referenced as an FK target by many specified tables) | Not specified as a table. Roles used by code are `X-User-Role` header values `admin`, `curriculum_lead` (backend/app/api/analytics.py); Task 13 §13.3 lists JWT scopes `curriculum_lead`, `reviewer`, `content_admin`. `get_principal` raises `NotImplementedError` until Task 13 (backend/app/api/sync.py). |
| `academic_calendars` | plan §2.3; doc 02 §4 | Needs optional `school_id`/`district_id` (doc 02 §4); the plan SQL has `calendar_id`, `year_label`, `terms`, `holidays`, `exam_windows`, `year_rollover_date`. `daysUntilExam` for the engine is resolved by the caller from this table (plan §7.8.1; doc 04 §2.4). |
| `skill_node_content_revisions` | plan §2.4 | Full-snapshot history per content version. |
| `schools`, `classes`, `class_members`, `assignments` | plan §14.1 | Rule: classes and assignments never alter `learner_node_state` or a pin. |
| `teacher_classrooms`, `teacher_classroom_members` | tasks Task 14 §14.8 | Same purpose as `classes`/`class_members` with different names and no `join_code`. Duplicate specification (*Decisions Needed* 6). |

### 8.2 Notifications (tasks Task 14 §14.8)

`notification_preferences` (PK learner, channel, type), `notifications` (in-app and delivery log: `payload` JSONB, `delivered_at`, `opened_at`, `suppressed`, `suppression_reason`), `parent_contacts` (PK learner, `contact_kind`; `contact_value` TEXT, `consent_given_at`, `consent_withdrawn_at`, `locale`). `parent_contacts.contact_value` is contact PII stored in the clear in the task's schema (*Decisions Needed* 7).

### 8.3 RCT (tasks Task 17 §17.2)

`rct_assignments`: `id`, `trial_id`, `learner_id` UUID REFERENCES `users(id)`, `node_id` FK, `arm`, `assigned_at`, UNIQUE (`trial_id`,`learner_id`,`node_id`). The same task says `learner_id` in RCT tables must be a hash, not the raw UUID (§17.7 CI gate), which a foreign key to `users(id)` cannot satisfy (*Decisions Needed* 8).

### 8.4 Weaviate collections (plan §2.8)

`SkillNodeContentChunk`, `ItemChunk`, `FrameworkObjectiveChunk` (plan). Code references `SkillNodeContentChunk`, `ItemChunk` and `LocalizedContentChunk`; the embed tasks only record a `generation_jobs` row and return, with no Weaviate client (backend/app/workers/tasks/embed_tasks.py). SPECIFIED ONLY. `LocalizedContentChunk` is in code and not in plan §2.8; `FrameworkObjectiveChunk` is in the plan and not in code.

## 9. Drift: plan §2 and docs versus the migrated schema

| # | Item | Spec says | Migrated / modelled | Status |
|---|---|---|---|---|
| 1 | `items.status` value | `piloted` (plan §2.5; doc 05 §7) | `piloting` in CHECK (models/content.py; 002); `coverage_service.PUBLISHED_ITEM_STATUSES` uses `piloting`, `framework_service.PUBLISHED_ITEM_STATUSES` uses `piloted` (backend/app/services/) | Open; the `piloted` entry can never match a row |
| 2 | `framework_grade_bands.ordinal` | plan §2.2: 1..13; doc 02 §3.2 v2: -1..12 (proposed, DR-016) | 001: `BETWEEN 1 AND 13`; 003 and model: `BETWEEN -1 AND 12` | Head matches doc 02; plan §2.2 stale |
| 3 | `curriculum_frameworks.framework_type` default | plan §2.2: `exam_board` | `standards_aligned` (003; DR-015 Option B) | Open |
| 4 | `exam_structure` required for `exam_board` | plan §2.2 | nullable, no CHECK | Application-level only |
| 5 | `items.printable` default | plan §2.5: FALSE | server default true (003) | Open; DR-013 |
| 6 | `items.offline_capable` | NOT NULL, no default | NOT NULL, default true | Minor |
| 7 | Key type | `UUID` + `gen_random_uuid()` | `VARCHAR(36)`, Python-side uuid4 | Intentional (SQLite-compatible); not recorded in a DR |
| 8 | JSON type | `JSONB` | `JSON` in migrations; JSONB only if models create the schema | Open |
| 9 | Array columns | `TEXT[]` | `JSON` | Minor |
| 10 | `generation_jobs` | `id`, `params`, `attempts`, `created_by`, `finished_at`; status `done`; `target_id` nullable; `job_type` in `node`,`content`,`items`,`expand`,`embed` (plan §2.7) | `job_id`, `job_metadata`, `started_at`, `completed_at`; status `completed`; `target_id` NOT NULL; no `attempts`/`created_by`; embed tasks use `embed_content` etc. | Open |
| 11 | `attempts.partial_credit` | `NUMERIC(3,2)` | `VARCHAR(8)` | Open |
| 12 | `attempts.occurred_at` | `TIMESTAMPTZ` NOT NULL (plan §2.6; doc 10 §3) | `VARCHAR(32)` | Open |
| 13 | `attempts` index order | `occurred_at DESC` | ascending | Minor |
| 14 | `attempts` extra columns | none | `occurred_at_client`, `received_at`, `server_sequence`, `flagged`, `included_by_lead`, `excluded_reason` | Added by docs/sync-contract.md |
| 15 | `learner_node_state` shape | one column per `NodeState` field; `status` default `locked` with CHECK; `ability_elo` INT default 1200 (plan §2.6) | `status` no default/CHECK; `ability_elo` FLOAT; rest in `state` JSON | Open |
| 16 | `NodeState` fields | doc 04 §2.2 | engine/src/state.ts adds `difficulty_elo?`, `last_escalated_at?`; `correct_total` (doc 04 §2.2, proposed) is absent | Doc 04 and `state.ts` differ |
| 17 | `learner_framework_pins` | `learner_id` FK `users(id)` | no FK (no `users`) | Pending `users` |
| 18 | `reviewed_by`, `created_by`, `actor_id`, `changed_by` | FK `users(id)` | plain `VARCHAR(36)` | Pending `users` |
| 19 | `objective_node_map.node_id` | FK `skill_nodes` (plan §2.2) | no FK | Open |
| 20 | `item_localizations.item_id`, `content_localizations.content_id` | FK to `items` / `skill_node_content` (plan §2.10) | no FK | Open |
| 21 | `item_misconceptions.misconception_id` | plain `TEXT` (plan §2.5) | FK `misconceptions` | Stricter than plan |
| 22 | Tables not in plan §2 | — | `gemini_calls`, `objective_node_map_proposals`, `learner_sync_cursor`, `sync_anomalies` (Task 8 §8.6 and §8.8; docs/sync-contract.md) | Plan §2 lacks them |
| 23 | Plan-only tables | `users`, `academic_calendars`, `skill_node_content_revisions`, `schools`, `classes`, `class_members`, `assignments` | not migrated | SPECIFIED ONLY (§8) |
| 24 | Task-only tables | `notification_preferences`, `notifications`, `parent_contacts`, `teacher_classrooms`, `teacher_classroom_members`, `rct_assignments` | not migrated | SPECIFIED ONLY (§8) |
| 25 | Source citations inside code | migrations 003/004 and `models/sync.py` cite `docs/02-curriculum-framework-spec-v2.md`, `docs/05-assessment-item-spec-v2.md`, `docs/04-learning-engine-spec-v2.md`; models cite `docs/plan.md` | those files do not exist (`docs/00-product-plan.md`, `docs/02-…-spec.md`, etc.) | Stale references; no code edit made here |
| 26 | Doc 04 table name | `node_prerequisites` (doc 04 §5.1) | `skill_node_prerequisites` | Doc 04 stale |
| 27 | Sync endpoint prefix | `/api/sync/*` (docs/sync-contract.md §3) | implemented as `/api/sync` | Task 13 §13.1 specifies `/api/v1/`; see doc 11 §6 |

## 10. Tables keyed by `learner_id`

Listed for deletion and export scoping (Task 13 §13.7 `DELETE /api/v1/me`; plan §16.1 "learner/parent deletion request path; attempt log exports"): `attempts`, `learner_node_state`, `learner_sync_cursor`, `sync_anomalies`, `learner_framework_pins`, `learner_pin_migrations`. Specified only: `notification_preferences`, `notifications`, `parent_contacts`, `class_members`, `teacher_classroom_members`, `rct_assignments`. `learner_id` is a pseudonymous UUID; no table in the migrated schema stores a name, email, phone or date of birth (there is no `users` table). Retention periods are not defined in any source (*Decisions Needed* 9).

## Change Log

**v1 — 2026-11-18**

- New document. Consolidates the schema from migrations 001–004 and the models; adds the drift table (§9) and the status marks (§1).
- Fixes the citation target for doc 04 §5.1 (`skill_nodes.difficulty_elo`, §3.1) and records that the derivation is specified but not implemented.

**Decision records:** DR-010, DR-013, DR-015, DR-016 (existing, all PROPOSED). No decision record exists yet for items 1, 7, 8, 10–12, 15, 19 or 20 of §9; none is created by this document.

## Decisions (resolved 2026-11-18)

Recorded in [DR-019](decisions/DR-019-documentation-set-decisions.md), accepted on the owner's delegated instruction. `PROPOSED` markers earlier in this document that concern these items are superseded by the table below. Provisional rows are to be tuned from pilot data; OPEN rows need a named owner. Code and schema consequences are listed in [IMPLEMENTATION-FOLLOWUPS.md](decisions/IMPLEMENTATION-FOLLOWUPS.md).

| ID | Decision | Status |
|---|---|---|
| DD-07-1 | **Item status spelling.** `piloted` everywhere (plan §2.5, doc 05 §7, `framework_service`). A new migration changes the CHECK constraint from `piloting` to `piloted`; `coverage_service` is fixed to match. | ACCEPTED |
| DD-07-2 | **Source of truth for the physical schema.** From now on doc 07 is authoritative for tables and constraints as migrated. Plan §2 is conceptual. Every schema change needs a migration and a doc 07 update in the same change. The 27 drift rows in doc 07 §9 are recorded as 'accepted differences' unless a row is marked as a defect. | ACCEPTED |
| DD-07-3 | **`skill_nodes.difficulty_elo`.** Seeded once by the topological pass (doc 04 §5.1) when a node becomes `live`, by a build step in `content-tools`. The engine's per-learner updates are not written back to `skill_nodes`. Item calibration lives on `items.difficulty_elo`. | ACCEPTED |
| DD-07-4 | **Remediation dedup and pending attempts.** Two new tables, `remediation_shown` (learner_id, node_id, misconception_id, shown_at) and `pending_attempts` (DR-010). Neither is part of `NodeState`, so the sync snapshot and the parity hash are unaffected. | ACCEPTED |
| DD-07-5 | **Pin cardinality.** One current pin per learner: add `is_current` with a partial unique index on `learner_id WHERE is_current`. History rows are kept. Pin migration still never touches node state (I-11). | ACCEPTED |
| DD-07-6 | **Classroom tables.** Plan §14.1 names (`schools`, `classes`, `class_members`, `assignments`). Task 14's names are amended. | ACCEPTED |
| DD-07-7 | **Parent contact PII.** Application-level encryption of `contact_value` with a key held in the secrets manager; never logged; the minimum fields only. | ACCEPTED |
| DD-07-8 | **RCT `learner_id`.** A keyed hash (HMAC-SHA-256, secret held by the platform and never exported). RCT tables carry no foreign key to `users`. The mapping is reachable only by platform operations. | ACCEPTED |
| DD-07-9 | **Retention periods.** Engineering defaults, to be confirmed or changed by counsel before the pilot: attempts and learner state for the life of the account, then deletion on request or after the hard-delete grace; tutor transcripts 90 days; raw free-text, photo and audio responses 30 days after marking; notification logs 90 days; parent contacts until consent is withdrawn or the learner is deleted; audit logs 12 months; backups 35 days; hard-delete grace 30 days. | ACCEPTED (provisional) |
| DD-07-10 | **Production types.** On PostgreSQL: JSONB, native UUID, `timestamptz` (attempts' `occurred_at` becomes `timestamptz`; the string type was a SQLite convenience). CI runs the migrations against PostgreSQL as well as SQLite. Sync ordering parses instants and never compares strings. | ACCEPTED |
