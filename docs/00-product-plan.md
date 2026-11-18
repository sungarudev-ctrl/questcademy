# 🎓Questcademy — Introduction

## What It Is

Questcademy is an **AI-powered exam preparation platform** built on a **canonical curriculum engine**. It is not a chatbot wrapper around a language model. It is not a video course. It is not a question bank with a search bar.

It is a **learning system** — a deterministic engine that knows, for every learner, at every moment, exactly what they should work on next, why it matters, and whether they have actually learned it.

The platform serves three kinds of users:

- **Learners** preparing for high-stakes exams, who need to know what to study, practice at the right level, and prove mastery before moving on.
- **Educators and curriculum teams**, who need to author, review, and deploy curriculum content at scale — across multiple exam boards and grade bands — without forking the codebase for every market.
- **Classroom teachers and parents**, who need to see which learners are stuck on which misconception, save planning time, and trust that the platform is safe for children. Teachers are also the primary distribution channel (see §12).

Everything else — the AI tutor, the item bank, the analytics dashboard, the mobile app — exists to serve those two relationships.

---

## The Problem It Solves

### For Learners

The modal learner in a JSS classroom operates **2 to 4 years below** the curriculum they are enrolled in. Grade-paced instruction is unintelligible to them, so instructional time yields nothing. Meanwhile:

- Private tutoring costs $30–100/hour — unaffordable for the vast majority.
- Existing apps give **answers**, not **understanding**.
- MCQ banks teach pattern-matching, not the underlying skill.
- Progress is measured in minutes watched, not in **mastery demonstrated**.
- Content is written for one country, one syllabus, one exam board — and does not travel.

A learner who cannot add fractions with unlike denominators does not fail *one* topic. They fail every topic downstream. Time-paced instruction guarantees accumulating debt — and that debt compounds silently, invisibly, until the exam exposes it.

### For Educators and Publishers

Building curriculum content that serves multiple exam boards means either:

- **Forking the content** per board — which does not scale, or
- **Reducing to the lowest common denominator** — which serves no one well.

Mathematics is the same everywhere. What differs is *when* a syllabus expects it, *how* it is assessed, and *what context* it is dressed in. Yet most platforms bake grade level, exam board, and country **into the content itself** — which means every new market is a rewrite.

---

## What It Seeks to Achieve

Questcademy is built around five commitments. Each is a design decision that cannot be relaxed without abandoning what the platform is for.

### 1. Teach at the Right Level, Not the Enrolled Grade

Learners are placed by a **diagnostic that finds their actual frontier** — not their enrolled grade, not their age, not their percentile. A JSS2 learner may work at P4 nodes without any signal of deficiency. The interface never shows grade level, rank, or comparison to peers. Copy is forward-looking: *"your starting point," "next up."*

This is the single highest-leverage commitment in the platform. Randomised evaluations across multiple regions show that grouping by demonstrated level produces large gains where curriculum-paced remediation produces near zero.

### 2. Mastery Before Advancement — With the Spacing Effect Baked In

Progression is gated by a **mastery predicate**, not by time or completion. Mastery requires:

- ≥ 4 of the last 5 qualifying attempts correct, unhinted
- ≥ 1 correct at the highest difficulty tier (transfer)
- ≥ 2 distinct correct days, **non-consecutive**

That last clause is not arbitrary. It encodes the spacing effect directly into the gate. A learner who grinds one node for twenty minutes has demonstrated **performance**, not **learning**. The two-session rule is the difference between the two — and it is the commitment most likely to be attacked for hurting engagement metrics, and the one that must never be relaxed.

### 3. One Canonical Skill Graph, Many Curricula

Content is authored once — against a **global, grade-agnostic skill graph** — and mapped to as many exam boards, syllabi, and grade bands as needed. Each curriculum framework is a versioned layer of *objectives* and *mappings*, not a fork. Each academic calendar is a data row, not a code path.

Adding a new exam board is a content project, not an engineering project. If it requires a schema change, the abstraction has failed.

### 4. Diagnose Misconceptions, Not Just Errors

Every wrong answer on every multiple-choice item is mapped to a **named belief** the learner is applying. Not "incorrect" — the specific rule, wrong, that produces the wrong answer. A learner who adds numerators and denominators receives a response addressing *that belief*, not a restatement of the correct method.

The misconception taxonomy — with **measured prevalence** across real learners, not assumed from Western literature — is the platform's deepest asset. It is what turns feedback from a verdict into a diagnosis.

### 5. A Deterministic Engine That Runs Everywhere

The learning engine is **pure, deterministic, and shared identically between client and server**. Same inputs produce byte-identical outputs on every platform. It makes no network calls, reads no clock, and generates no randomness except through an injected seeded PRNG.

This is not an architectural preference. It is what makes offline-first delivery possible. It is what makes client-server parity testable. It is what makes the engine's decisions debuggable, reproducible, and — critically — auditable. When a learner's progression changes, the reason is a value in a log, not a mystery.

---

## What It Is Not

Questcademy deliberately rejects a set of popular features that research does not support, or that undermine the platform's core commitments:

- **No learning styles** — no matching visual/auditory/kinaesthetic profiles. Representation is varied because multiple representations help *everyone*, not because a learner "is a visual learner."
- **No public leaderboards ranking individual children** — they demotivate the bottom half, which is precisely the target population.
- **No avatar economies, collectibles, or seasonal events** — extrinsic reward layers risk optimising engagement metrics while learning outcomes stay flat.
- **No negative marking** — it teaches risk aversion, harms lower-confidence learners disproportionately, and corrupts the ability signal.
- **No unguided discovery** for novices — minimally-guided instruction underperforms explicit instruction for learners without domain knowledge.
- **No grade-paced progression** — this is the core failure the platform exists to fix.

Each rejection is recorded with its reason so it does not reappear as a feature request.

---

## The Measure of Success

Not minutes watched. Not questions answered. Not daily active users.

The measure is **30-day retrieval retention** — whether a learner who "mastered" a node can still demonstrate that mastery a month later. Everything else — engagement, content coverage, item calibration, prediction accuracy — is instrumental to that single number.

The platform is built on the belief that **learning is provable, and what is provable can be built**. Every commitment above exists to make that provability real.

---

**Questcademy** — *a canonical curriculum engine with a deterministic learning kernel. Curriculum authored once. Delivered at the learner's actual level. Mastery earned, not assumed.*



# 🎓 Questcademy — Canonical Curriculum Engine (Aligned Plan)

This is the **definitive working plan**, aligned against the normative specification set:

| Doc | Owns |
|---|---|
| **02 — Curriculum Framework** | Three-layer model: skill graph / framework / calendar |
| **03 — Learning Science** | Mastery, spacing, retrieval, explicit rejections |
| **04 — Learning Engine** | Pure deterministic engine, mastery predicate, Elo, FSRS |
| **05 — Assessment & Items** | 18 item types, 17-block content, misconception taxonomy |
| **10 — Engineering Standards** | CI gates, `/engine` purity, reference device, trust tiers |

Where this plan and a spec doc disagree, **the spec doc wins**. Where this plan is silent, consult the spec doc.

---

## 1. 🧭 Strategic Shift — The Three-Layer Model

The lesson is **not** the atomic unit. The **canonical skill node** is. Lessons are content attached to a node; items are assessments attached to a node; progress lives on the node, grade-agnostically.

```
┌──────────────────────────────────────────────────────┐
│  CANONICAL SKILL GRAPH        (per subject, global)  │
│  Atomic skills + prerequisites. Authored once.       │
└──────────────────────┬───────────────────────────────┘
                       │  objective_node_map (many-to-many)
┌──────────────────────┴───────────────────────────────┐
│  CURRICULUM FRAMEWORK         (per board, versioned) │
│  Syllabus objectives, grade bands, weightings        │
└──────────────────────┬───────────────────────────────┘
                       │  scheduling
┌──────────────────────┴───────────────────────────────┐
│  ACADEMIC CALENDAR            (per school)           │
│  Terms, holidays, exam windows, year boundaries      │
└──────────────────────────────────────────────────────┘
```

**Load-bearing claim:** mathematics is the same everywhere. `MATH.FRAC.ADD_UNLIKE` is one node across every market. What differs is when a syllabus expects it, how it's assessed, and what context dresses it.

| Layer | Owns | Never owns |
|---|---|---|
| Canonical graph | Skills, prerequisites, difficulty, item bank | Grade levels, exam boards, dates |
| Framework | Objectives, mapping, grade bands, weightings, grading scale | Skill definitions, prerequisites |
| Calendar | Terms, holidays, exam dates, year rollover | Anything pedagogical |

**Violation to watch:** a `grade_level` column appearing on `skill_nodes`. That is the fork beginning. Nodes carry `grade_band_hint` for placement seeding only — explicitly non-authoritative.

**What this replaces from the old plan:**

| Old (naive lesson-first) | New (canonical-first) |
|---|---|
| Grade → Subject → Unit → Lesson → Concept | SkillNode graph + Framework mapping + Calendar |
| Lesson is atomic | SkillNode is atomic; lesson is content attached to a node |
| Grade stored on lesson | Grade stored on framework grade band |
| One curriculum for all markets | Frameworks are versioned per board |
| SM-2 spaced repetition | FSRS, engine-owned |
| Percent-based mastery | Two-session non-consecutive mastery predicate |
| Simple questions table | 18-type Item contract with 17-block content model |

---

## 2. 🗂️ Database Schema

### 2.1 Canonical Skill Graph

```sql
-- Canonical skill graph (global)
CREATE TABLE skill_nodes (
  node_id          TEXT PRIMARY KEY,          -- "MATH.FRAC.ADD_UNLIKE" — stable forever
  subject          TEXT NOT NULL,
  topic            TEXT NOT NULL,             -- navigation only; NOT a dependency
  subtopic         TEXT,                      -- navigation only
  title            TEXT NOT NULL,             -- teacher-facing
  learner_title    TEXT NOT NULL,             -- learner-facing
  description      TEXT NOT NULL,
  grade_band_hint  TEXT,                      -- "P5-JSS1" — placement seed ONLY, non-authoritative
  est_minutes      INT NOT NULL CHECK (est_minutes BETWEEN 8 AND 15),
  difficulty_elo   INT NOT NULL DEFAULT 1200, -- engine-maintained (doc 04 §5.1)
  representations  TEXT[],                    -- 'area_model', 'number_line', 'symbolic'
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','review','live','deprecated')),
  superseded_by    TEXT REFERENCES skill_nodes(node_id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Prerequisites: hard gates availability; soft orders recommendations
CREATE TABLE skill_node_prerequisites (
  node_id              TEXT REFERENCES skill_nodes(node_id),
  prerequisite_node_id TEXT REFERENCES skill_nodes(node_id),
  type                 TEXT NOT NULL CHECK (type IN ('hard','soft')),
  PRIMARY KEY (node_id, prerequisite_node_id),
  CHECK (node_id <> prerequisite_node_id)
);
-- Enforced at content build: max 3 hard prerequisites per node; graph acyclic; depth ≤ 40
```

### 2.2 Curriculum Frameworks (per board, versioned, immutable once active)

```sql
CREATE TABLE curriculum_frameworks (
  framework_id     TEXT PRIMARY KEY,          -- country-prefixed: "gh_bece_math_2024", "sl_bece_math_2024"
  framework_type   TEXT NOT NULL DEFAULT 'exam_board'
                   CHECK (framework_type IN ('exam_board','standards_aligned')),
  board            TEXT NOT NULL,
  subject          TEXT NOT NULL,
  version          TEXT NOT NULL,
  effective_from   DATE NOT NULL,
  effective_until  DATE,
  status           TEXT NOT NULL DEFAULT 'draft'
                   CHECK (status IN ('draft','active','superseded')),
  grading_scale    JSONB NOT NULL,            -- [{grade, min_pct, meaning}]
  exam_structure   JSONB,                     -- {papers: [...]}; REQUIRED when framework_type = 'exam_board', optional for 'standards_aligned' (e.g. US Common Core)
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE framework_grade_bands (
  framework_id   TEXT REFERENCES curriculum_frameworks(framework_id),
  band_id        TEXT NOT NULL,               -- "JSS2"
  ordinal        INT NOT NULL,                -- normalised 1..13, cross-board comparable
  typical_age    INT,
  label_local    TEXT NOT NULL,               -- what parents/teachers actually call it
  PRIMARY KEY (framework_id, band_id)
);
```

**GradeBand type (doc 02 §3.2)** — each row in `framework_grade_bands`:
```
GradeBand {
  band_id      : string   -- "JSS2", "Grade 7", "P5"
  ordinal      : int      -- normalised 1..13 for cross-country comparison
  typical_age  : int
  label_local  : string   -- what parents and teachers actually call it
}
```

`ordinal` is the **only cross-country comparable**. Ghana JSS2 = Nigeria JSS2 = Sierra Leone JSS2 = ordinal 8. Use ordinals for analytics; use `label_local` for every user-facing string.

**ExamStructure type (doc 02 §3.3)** — shape of `curriculum_frameworks.exam_structure` JSONB:
```
ExamStructure {
  papers: [{
    paper_id, name,
    item_types   : [ItemType],     -- doc 05 §3
    duration_min : int,
    marks        : int,
    calculator   : "allowed" | "prohibited"
  }],
  grading_scale : [{ grade, min_pct, meaning }]
}
```

```sql
CREATE TABLE syllabus_objectives (
  objective_id     TEXT PRIMARY KEY,
  framework_id     TEXT REFERENCES curriculum_frameworks(framework_id),
  code             TEXT NOT NULL,             -- "JSS2.NUM.3.2"
  text             TEXT NOT NULL,             -- VERBATIM from official syllabus
  grade_band       TEXT NOT NULL,
  term             INT,
  exam_weight      FLOAT,
  coverage_status  TEXT NOT NULL DEFAULT 'unmapped'
                   CHECK (coverage_status IN ('full','partial','unmapped')),
  UNIQUE (framework_id, code)
);

CREATE TABLE objective_node_map (              -- many-to-many
  objective_id  TEXT REFERENCES syllabus_objectives(objective_id),
  node_id       TEXT REFERENCES skill_nodes(node_id),
  PRIMARY KEY (objective_id, node_id)
);

-- A learner is pinned to a framework version at enrolment
CREATE TABLE learner_framework_pins (
  learner_id    UUID REFERENCES users(id),
  framework_id  TEXT REFERENCES curriculum_frameworks(framework_id),
  pinned_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (learner_id, framework_id)
);

-- Version diff reports (auto-generated on new framework import)
CREATE TABLE framework_version_diffs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_framework     TEXT REFERENCES curriculum_frameworks(framework_id),
  to_framework       TEXT REFERENCES curriculum_frameworks(framework_id),
  objectives_added   JSONB,
  objectives_removed JSONB,
  objectives_remapped JSONB,
  coverage_delta     JSONB,
  created_at         TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.3 Academic Calendar

```sql
CREATE TABLE academic_calendars (
  calendar_id        TEXT PRIMARY KEY,
  year_label         TEXT NOT NULL,
  terms              JSONB NOT NULL,          -- [{term_number, start_date, end_date, name}]
  holidays           JSONB NOT NULL,          -- [{start, end, name}]
  exam_windows       JSONB NOT NULL,          -- [{framework_id, start, end, name}]
  year_rollover_date DATE NOT NULL
);
```

### 2.4 Skill Node Content (the "lesson")

```sql
CREATE TABLE skill_node_content (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id         TEXT REFERENCES skill_nodes(node_id),
  version         INT NOT NULL DEFAULT 1,
  summary         TEXT,
  learning_objectives JSONB,
  sections        JSONB NOT NULL,             -- Block[] — 17-block model (doc 05 §1)
  worked_examples JSONB NOT NULL,
  key_formulas    JSONB,
  analogies       JSONB,
  common_mistakes JSONB,
  estimated_minutes INT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft','review','published','archived')),
  generated_by    TEXT,                       -- 'gemini-2.5-pro' | 'human'
  reviewed_by     UUID REFERENCES users(id),
  reviewed_at     TIMESTAMPTZ,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (node_id, version)
);

CREATE TABLE skill_node_content_revisions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id      UUID REFERENCES skill_node_content(id),
  node_id         TEXT REFERENCES skill_nodes(node_id),
  version         INT NOT NULL,
  snapshot        JSONB NOT NULL,             -- full content at that version
  changed_by      UUID REFERENCES users(id),
  change_reason   TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### 2.5 Items (Assessment Contract)

```sql
CREATE TABLE items (
  item_id              UUID PRIMARY KEY,
  node_id              TEXT REFERENCES skill_nodes(node_id) NOT NULL,
  type                 TEXT NOT NULL,         -- one of 18 types (doc 05 §3)
  difficulty_tier      INT NOT NULL CHECK (difficulty_tier IN (1,2,3)),
  difficulty_elo       INT NOT NULL DEFAULT 1200,   -- engine-maintained
  stem                 JSONB NOT NULL,        -- Block[]
  payload              JSONB NOT NULL,        -- type-specific
  scoring              JSONB NOT NULL,
  hints                JSONB NOT NULL,        -- EXACTLY 3, levels 1-3
  worked_solution      JSONB NOT NULL,        -- Block[]
  -- (v2) no locale_variants and no country on items: localization is an overlay keyed by
  -- framework_id in item_localizations (§2.10); see doc 05 §1, doc 02 L-1/L-2
  hint_variants        JSONB,                 -- optional misconception-targeted hints (doc 05 §5)
  offline_capable      BOOLEAN NOT NULL,
  printable            BOOLEAN NOT NULL DEFAULT FALSE,   -- (v2) doc 05 A-9
  media_bytes          INT NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'draft',
  -- statuses: draft | generated | tagged | reviewed | piloted | live
  --           | calibrating | calibrated | revision | retired
  a11y                 JSONB NOT NULL,
  p_value              NUMERIC(4,3),
  discrimination       NUMERIC(4,3),
  n_responses          INT NOT NULL DEFAULT 0,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE item_misconceptions (
  item_id          UUID REFERENCES items(item_id),
  misconception_id TEXT NOT NULL,
  pattern          JSONB NOT NULL,            -- {selected: [...], ...}
  PRIMARY KEY (item_id, misconception_id)
);

CREATE TABLE item_lifecycle_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id      UUID REFERENCES items(item_id),
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  reason       TEXT,
  actor_id     UUID REFERENCES users(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE misconceptions (
  misconception_id      TEXT PRIMARY KEY,     -- "FRAC.ADD_NUM_DEN"
  domain                TEXT NOT NULL,
  description           TEXT NOT NULL,
  learner_facing_name   TEXT NOT NULL,
  prevalence            NUMERIC(5,4),         -- MEASURED, not assumed
  remediation_id        TEXT,
  typical_origin        TEXT
);

CREATE TABLE misconception_nodes (
  misconception_id  TEXT REFERENCES misconceptions(misconception_id),
  node_id           TEXT REFERENCES skill_nodes(node_id),
  PRIMARY KEY (misconception_id, node_id)
);
```

### 2.6 Learner State (engine-owned)

```sql
-- Per-learner-per-node state. Mirrors engine NodeState shape exactly (doc 04 §2.2).
CREATE TABLE learner_node_state (
  learner_id          UUID REFERENCES users(id),
  node_id             TEXT REFERENCES skill_nodes(node_id),
  status              TEXT NOT NULL DEFAULT 'locked'
                      CHECK (status IN ('locked','available','in_progress',
                                        'mastered','needs_review','relearning')),
  ability_elo         INT NOT NULL DEFAULT 1200,
  attempts_total      INT NOT NULL DEFAULT 0,
  recent_window       JSONB NOT NULL DEFAULT '[]',  -- last 5 qualifying Attempts
  distinct_days       JSONB NOT NULL DEFAULT '[]',  -- descriptive only
  max_tier_correct    INT NOT NULL DEFAULT 0,
  mastered_at         TIMESTAMPTZ,
  stability           NUMERIC(6,2) NOT NULL DEFAULT 3.0,   -- FSRS
  difficulty_fsrs     NUMERIC(4,2) NOT NULL DEFAULT 5.0,
  due_at              TIMESTAMPTZ,
  lapses              INT NOT NULL DEFAULT 0,
  PRIMARY KEY (learner_id, node_id)
);

-- Append-only attempt log (source of truth; state is derived)
CREATE TABLE attempts (
  attempt_id       UUID PRIMARY KEY,
  learner_id       UUID REFERENCES users(id),
  node_id          TEXT REFERENCES skill_nodes(node_id),
  item_id          UUID REFERENCES items(item_id),
  difficulty_tier  INT NOT NULL,
  correct          BOOLEAN NOT NULL,
  partial_credit   NUMERIC(3,2),
  selected_option  TEXT,
  misconception_id TEXT,
  latency_ms       INT,
  hints_used       INT NOT NULL CHECK (hints_used BETWEEN 0 AND 3),
  session_id       UUID,
  occurred_at      TIMESTAMPTZ NOT NULL,      -- client clock, UTC
  is_review        BOOLEAN NOT NULL DEFAULT FALSE,
  is_placement     BOOLEAN NOT NULL DEFAULT FALSE,
  is_exam          BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX idx_attempts_learner_node ON attempts (learner_id, node_id, occurred_at DESC);
```

### 2.7 Generation Jobs

```sql
CREATE TABLE generation_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,      -- 'node' | 'content' | 'items' | 'expand' | 'embed'
  target_id TEXT,              -- node_id, unit_slug, or framework_id
  params JSONB,
  status TEXT DEFAULT 'queued'
         CHECK (status IN ('queued','running','done','failed')),
  attempts INT DEFAULT 0,
  error TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ
);
```

### 2.8 Weaviate Vector Schema

Collections:

- **`SkillNodeContentChunk`** — properties: `node_id`, `chunk_index`, `content`, `content_type` (`body|example|formula|concept|misconception`)
- **`ItemChunk`** — properties: `item_id`, `node_id`, `stem_text`, `type`, `tier`
- **`FrameworkObjectiveChunk`** — properties: `objective_id`, `framework_id`, `text`, `grade_band`

Use cases: RAG for AI tutor, semantic node search, related-node recommendations, item dedup, question generation grounding.

---

### 2.9 Country Registry
sql
-- Countries the platform serves. Data-only; no code path branches on this.
CREATE TABLE countries (
  country_code     TEXT PRIMARY KEY,          -- ISO-3166 alpha-2
  name             TEXT NOT NULL,
  default_locale   TEXT NOT NULL,             -- 'en-GH', 'en-NG', 'en-SL'
  default_currency TEXT NOT NULL,             -- ISO-4217
  status           TEXT NOT NULL DEFAULT 'active'
                   CHECK (status IN ('planned','active','paused','sunset'))
);

-- Every framework is anchored to exactly one country
ALTER TABLE curriculum_frameworks
  ADD COLUMN country_code TEXT NOT NULL REFERENCES countries(country_code),
  ADD COLUMN locale       TEXT NOT NULL,
  ADD COLUMN currency     TEXT NOT NULL;
Rule: country_code exists on curriculum_frameworks and nowhere else in the content layer. It never appears on skill_nodes, items, skill_node_content, or misconceptions.

### 2.10 Localization Overlay (items and content)
Localization is an overlay, not a fork. An item exists once; each framework that uses it may have a localized variant.

sql
-- Item localizations: a per-framework overlay on a base item
CREATE TABLE item_localizations (
  item_id        UUID REFERENCES items(item_id),
  framework_id   TEXT REFERENCES curriculum_frameworks(framework_id),
  stem_override  JSONB,                       -- Block[]; null means use base
  payload_override JSONB,                     -- e.g. currency in a word problem
  solution_override JSONB,
  rationale      TEXT,                        -- why localized
  created_by     UUID REFERENCES users(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (item_id, framework_id)
);

-- Content localizations: same pattern, for skill_node_content sections
CREATE TABLE content_localizations (
  content_id       UUID REFERENCES skill_node_content(id),
  framework_id     TEXT REFERENCES curriculum_frameworks(framework_id),
  section_overrides JSONB,                    -- sparse map: section_index -> Block[]
  rationale        TEXT,
  created_by       UUID REFERENCES users(id),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (content_id, framework_id)
);

-- Reference-data used by word problems, keyed by framework
CREATE TABLE localization_tokens (
  framework_id   TEXT REFERENCES curriculum_frameworks(framework_id),
  token_key      TEXT NOT NULL,               -- 'currency', 'common_name', 'city'
  token_value    TEXT NOT NULL,               -- '₵', 'Ama', 'Accra'
  PRIMARY KEY (framework_id, token_key)
);
Rule: when the resolver assembles an item for a learner, it looks up (item_id, framework_id). If a localization row exists, its overrides are applied on top of the base item. If not, the base item is served unchanged. The base item is always valid — localization is enrichment, never a requirement.

### 2.11 Framework Lifecycle Per Country
sql
-- Each country's framework progression is explicit and auditable
CREATE TABLE framework_rollouts (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code       TEXT NOT NULL REFERENCES countries(country_code),
  framework_id       TEXT REFERENCES curriculum_frameworks(framework_id),
  phase              TEXT NOT NULL
                     CHECK (phase IN ('planned','importing','mapping',
                                       'authoring','reviewing','piloting',
                                       'active','superseded')),
  coverage_pct       NUMERIC(5,2),            -- % objectives with ≥15 published items
  blockers           JSONB,                   -- list of {type, detail} the lead must clear
  started_at         TIMESTAMPTZ DEFAULT NOW(),
  activated_at       TIMESTAMPTZ,
  superseded_at      TIMESTAMPTZ,
  notes              TEXT
);

-- Localization briefs: the country-specific authoring guide
CREATE TABLE localization_briefs (
  framework_id       TEXT PRIMARY KEY REFERENCES curriculum_frameworks(framework_id),
  currency           TEXT NOT NULL,
  common_names       TEXT[] NOT NULL,
  cities             TEXT[] NOT NULL,
  foods              TEXT[] NOT NULL,
  units_preferred    JSONB NOT NULL,          -- {'length': 'cm', 'mass': 'kg'}
  avoid              TEXT[] NOT NULL,          -- e.g. ['snow', 'subway', 'Thanksgiving']
  scenario_bank      JSONB NOT NULL,           -- pre-approved contexts for word problems
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);
### 2.12 Cross-Framework Analytics
sql
-- Compare cohorts across countries without joining country into content tables
CREATE TABLE framework_cohort_stats (
  framework_id       TEXT REFERENCES curriculum_frameworks(framework_id),
  snapshot_date      DATE NOT NULL,
  active_learners    INT NOT NULL,
  mean_mastery_rate  NUMERIC(4,3) NOT NULL,   -- nodes mastered per week
  mean_retention_30d NUMERIC(4,3) NOT NULL,
  mean_success_band  NUMERIC(4,3) NOT NULL,
  item_error_rate    NUMERIC(4,3) NOT NULL,
  PRIMARY KEY (framework_id, snapshot_date)
);
Rule: analytics that compare countries read from this table. No join in the query path touches skill_nodes or items — those are country-agnostic.

### 2.13 Learner Pin Migration
When a learner changes country, changes board, or a framework is superseded, they get a new pin — but their mastery does not move.

sql
CREATE TABLE learner_pin_migrations (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id         UUID REFERENCES users(id),
  from_framework     TEXT REFERENCES curriculum_frameworks(framework_id),
  to_framework       TEXT REFERENCES curriculum_frameworks(framework_id),
  reason             TEXT NOT NULL,           -- 'country_change' | 'board_change' | 'superseded'
  mastery_preserved  BOOLEAN NOT NULL DEFAULT TRUE,
  migrated_at        TIMESTAMPTZ DEFAULT NOW()
);
Invariant I-11: a pin migration never mutates learner_node_state. Mastery is on nodes; pins are on frameworks; the two must never be coupled.




## 3. 🤖 AI Generation Pipelines

Three pipelines, all async-job-based. Generation is **downstream of the schema**, not upstream — every pipeline emits `Block[]` JSON that renders via the shared renderer.

### 3.1 Pipeline A1 — Skill Authoring (`Subject + Topic → SkillNodes`)

**Trigger:** Curriculum lead, on governance approval (doc 02 §9).

```
Input:  Subject + Topic + optional learning objectives
Step 1: Gemini proposes candidate SkillNodes:
        { node_id, title, learner_title, description, est_minutes,
          topic, subtopic, grade_band_hint, representations[], misconceptions[] }
Step 2: Reject nodes failing atomicity test (doc 02 §2.1):
        - must be teachable in 8–15 min
        - single statable mastery criterion
        - ≥2 named misconceptions
        - can support ≥20 distinct items
Step 3: Store with status='draft' → human review queue
Step 4: Curriculum lead approves → status='review' → 'live'
Step 5: Embed into SkillNodeContentChunk
```

**This is human-gated, not auto-published.** Node IDs are never reused, never renamed.

### 3.2 Pipeline A2 — Content Authoring (`SkillNode → lesson content`)

**Trigger:** SkillNode status = 'live'. Batched.

```
Input:  SkillNode + prerequisites + misconceptions
Step 1: Gemini generates content in STRICT JSON (Block[] format, doc 05 §1)
        - summary, learning_objectives, sections[], worked_examples[],
          key_formulas[], analogies[], common_mistakes[]
Step 2: Validate:
        - All math in KaTeX
        - Reading level ≥ 2 years below grade band (doc 05 A-3)
        - ≥ 3 worked examples
        - Flesch-Kincaid check
Step 3: Store as skill_node_content status='draft', version=1
Step 4: Chunk → embed → Weaviate SkillNodeContentChunk
Step 5: Notify reviewers


Mode 1 (canonical):
  Input:  SkillNode
  Output: skill_node_content (base)

Mode 2 (localized):
  Input:  SkillNode + base content + localization_brief for framework_id
  Step 1: Gemini generates sparse section_overrides for the target framework
          — only sections that reference a localized context
  Step 2: Validate: overrides must not change the mathematical content
  Step 3: Store in content_localizations
  Step 4: Re-embed → LocalizedContentChunk
```

### 3.3 Pipeline B — Item Generation (`SkillNode + content → Items`)

**Trigger:** `skill_node_content` status → 'published'. Target: 20+ items.

```
Input:  SkillNode + published content + misconceptions
Target: ≥15 items with ≥5 at Tier 3 (publish bar, doc 10 §5)

Step 1: Load content + chunks from Weaviate
Step 2: Gemini generates items in STRICT JSON per doc 05 §1 Item contract
        Mix: MCQ 45%, numeric 20%, cloze/table 12%, matching/ordering 8%,
             number line 6%, short response 6%, other 3%
        Tier mix: 8-12 Tier1, 8-12 Tier2, 5-8 Tier3
Step 3: SymPy validates every numeric answer
        → Reject if SymPy disagrees
Step 4: Enforce A-2 hard gate:
        → Every distractor MUST carry misconception_id
        → Reject if any distractor untagged
Step 5: Enforce A-3: reading level ≥ 2 years below grade
Step 6: Gemini self-evaluates each item (0-1 score)
        → Reject if < 0.7
Step 7: Dedup via Weaviate (cosine < 0.15 → drop)
Step 8: Store status='generated' → 'tagged' → 'reviewed' → review queue
Step 9: Embed stems → Weaviate ItemChunk

Step 10: For each active framework in the item's node's frameworks:
  If the item contains a localization token (currency, name, city):
    - Look up framework-specific token value
    - Generate item_localizations.stem_override
    - Re-validate with SymPy that the answer is unchanged
Step 11: Store localization rows; leave the base item untouched
```

### 3.4 Pipeline C — Framework Expansion (`Framework → mapped objectives`)

**Trigger:** Curriculum lead imports a new syllabus PDF.

```
Input:  Country + board + syllabus PDF + localization brief
Step 1: CurriculumExtractor — AI extraction of objectives (verbatim)
Step 2: HUMAN CORRECTION — curriculum lead corrects the objective list
Step 3: CurriculumMapper — AI proposes objective→node mappings with confidence
Step 4: HUMAN MAPPING REVIEW — every mapping confirmed or corrected
        (bulk approve is PROHIBITED)
Step 5: Gap identification — unmapped objectives flagged
Step 6: Node authoring for the residual (Pipeline A1)
Step 7: Localization pass — Pipeline A2 Mode 2 for every affected node
Step 8: Item localization pass — Pipeline B step 10
Step 9: Coverage report — % objectives with ≥15 published items
Step 10: If coverage ≥ 80%, request activation
Step 11: Publish → framework.status = 'active'
```

### 3.7 Pipeline D — Localization Refresh

Input:  framework_id
Step 1: Load all items/content with localization rows for this framework
Step 2: Regenerate each override against the updated brief
Step 3: SymPy-validate every math-bearing override
Step 4: Stage as drafts; notify reviewers
Step 5: On approval, replace; on rejection, keep current

**Stage 4 is a hard gate.** AI confidence is not sufficient — a wrong mapping silently teaches the wrong thing to an exam candidate.

### 3.5 Orchestrator (Celery)

```python
# backend/app/workers/tasks.py
from celery import Celery

celery = Celery("questcademy", broker="redis://localhost:6379/1")

@celery.task(bind=True, max_retries=3)
def task_author_nodes(self, subject: str, topic: str):
    from app.ai.pipelines.node_pipeline import author_nodes
    author_nodes(subject, topic)

@celery.task(bind=True, max_retries=3)
def task_generate_content(self, node_id: str):
    from app.ai.pipelines.content_pipeline import generate_content
    generate_content(node_id)

@celery.task(bind=True, max_retries=3)
def task_generate_items(self, node_id: str, n: int = 20):
    from app.ai.pipelines.item_pipeline import generate_items
    generate_items(node_id, n)
```

**Queue priorities:**

| Job | Priority | Rate limit |
|---|---|---|
| Node authoring | High | 1/min |
| Content generation | High | 1/min |
| Item generation | High | 5/min |
| Re-embedding | Low | 20/min |
| Framework expansion | Medium | 1/5min |

### 3.6 Cost & Quota (Gemini)

| Operation | Model | Tokens | Cost |
|---|---|---|---|
| Author 1 node | gemini-2.5-pro | ~4K in, 2K out | $0.008 |
| Generate 1 content | gemini-2.5-pro | ~6K in, 4K out | $0.010 |
| Generate 20 items | gemini-2.5-flash | ~8K in, 6K out | $0.002 |
| Full framework expansion | mixed | — | ~$92 one-time |

**Strategy:** cache aggressively; batch during low-traffic; Flash for bulk, Pro for review-critical content.


Collection: LocalizedContentChunk
Properties:
  - chunk_id       (text, primary)
  - node_id        (text)
  - framework_id   (text)
  - content_type   (text)   # 'stem' | 'example' | 'formula' | 'objective'
  - text           (text)
  - tokens         (object) # localization tokens resolved at index time

Filter behavior: retrieval always filters by framework_id when serving a
specific learner. Cross-framework retrieval (for authoring tools) omits the filter.

---

## 4. 📚 Student-Facing Flow

```
┌────────────────────────────────────────────────┐
│ 1. ONBOARDING                                  │
│    Pick framework → grade band                 │
│    Placement test (15–20 items, doc 04 §7)     │
└──────────────────┬─────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────┐
│ 2. LEARNING PATH (engine-computed)             │
│    Available nodes = prerequisites secured     │
│    Framed as "your starting point", never grade│
└──────────────────┬─────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────┐
│ 3. NODE VIEW                                   │
│    - Read content (KaTeX via Block[] renderer) │
│    - Interactive worked examples               │
│    - Tutor opens INLINE from hints (§13)       │
│    - Every block sequence ends in practice     │
└──────────────────┬─────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────┐
│ 4. PRACTICE (engine-served, doc 04 §6)         │
│    Every 4th item from review queue (interleave)│
│    Remediation override on 2-hit misconception │
│    Target success band 0.75–0.85               │
│    Tier 3 locked until 2 correct at Tier 2     │
└──────────────────┬─────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────┐
│ 5. MASTERY GATE (doc 04 §4)                    │
│    ≥4 of last 5 correct, unhinted              │
│    ≥1 correct at Tier 3                        │
│    ≥2 distinct correct days, non-consecutive   │
│    (span ≥2 days)                              │
└──────────────────┬─────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────┐
│ 6. FSRS REVIEW (doc 04 §8)                     │
│    Daily cap: 8 items (hard)                   │
│    Exam-aware interval compression             │
│    relearning > overdue > exam-critical > due  │
└──────────────────┬─────────────────────────────┘
                   ▼
┌────────────────────────────────────────────────┐
│ 7. DASHBOARD                                   │
│    Node mastery + FSRS scheduling              │
│    Exam forecast as a BAND (doc 04 §15)        │
│    NO grade level shown. NO percentile.        │
└────────────────────────────────────────────────┘
```

### 4.1 The Mastery Predicate (doc 04 §4, verbatim)

```
is_mastered(s) =
   |s.recent_window| ≥ 4
   AND count(a in s.recent_window
             where a.correct AND a.hints_used == 0) ≥ 4
   AND s.max_tier_correct ≥ 3
   AND |distinct_dates(a in s.recent_window
                       where a.correct AND a.hints_used == 0)| ≥ 2
   AND (max(days) - min(days)).days ≥ 2   // non-consecutive
```

**Qualifying attempt:** `is_placement = false AND is_exam = false`. Hinted attempts enter the window but count as incorrect for the tally.

**This is the whole spacing-effect gate.** Do not relax for engagement reasons (doc 03 §3).

### 4.2 Dignity Constraint (doc 03 §2)

Below-grade placement is not failure. The UI MUST NOT display:

- ❌ Grade level
- ❌ Percentile or rank
- ❌ Comparison to peers
- ❌ "behind" / "ahead" language

Copy is forward-looking: "your starting point," "next up."

### 4.3 FSRS Scheduling (doc 04 §8)

On mastery:
```
stability       = 3.0 days
difficulty_fsrs = clamp(5.0 - 0.8 * (ability_elo - 1200)/200, 1.0, 10.0)
due_at          = now + stability
```

On each review:
```
retrievability = exp(ln(0.9) * elapsed_days / stability)

if correct:
    stability *= 1 + exp(w1) * (11 - difficulty_fsrs)
               * stability^(-w2) * (exp(w3*(1-retrievability)) - 1)
    difficulty_fsrs -= 0.1
else:
    lapses += 1
    stability = max(1.0, stability * 0.3)
    difficulty_fsrs += 0.6
    status = 'relearning'

due_at = now + stability * exam_compression(now)
```

`exam_compression` compresses intervals as the exam approaches (`>90d: 1.0`, `>30d: 0.75`, `>14d: 0.5`, `else: 0.35`).

---

## 5. 🎨 UI Screens

### 5.1 Learning Path (no grade shown)

```
┌──────────────────────────────────────┐
│ Your Path                            │
│ ──────────────────────────────────── │
│ Topic: Fractions                     │
│  ✅ Equivalent fractions             │
│  ✅ Comparing fractions              │
│  🔵 Adding unlike denominators       │
│  ⚪ Subtracting unlike denominators  │
│                                      │
│ Topic: Decimals                      │
│  🔒 (unlock after Fractions)         │
└──────────────────────────────────────┘
```

### 5.2 Node Reader (was "Lesson Reader")

```
┌──────────────────────────────────────┐
│ ← Adding Unlike Denominators    ⋮    │
│ ──────────────────────────────────── │
│ Est. 12 min · 4 sections             │
│ ▓▓▓▓▓▓▓░░░░░░░░░░░░░ 35%             │
├──────────────────────────────────────┤
│ ## Why denominators must match       │
│ When fractions have different...     │
│                                      │
│ $$ 1/4 + 1/3 $$                      │
│                                      │
│ ## Worked Example                    │
│ Step 1: Find the LCD...              │
│ [ Show next step ▾ ]                 │
│                                      │
│ 💡 Tip: Always write down the LCD    │
├──────────────────────────────────────┤
│ [ 🤖 Ask AI ]   [ Start practice → ] │
└──────────────────────────────────────┘
```

### 5.3 Practice Screen (18 types, MCQ shown)

```
┌──────────────────────────────────────┐
│ ← Practice          ⏱ 00:42    ⚙    │
│ ──────────────────────────────────── │
│ Q 3 of 8                             │
│                                      │
│ What is 1/4 + 1/3?                   │
│                                      │
│  ○  A)  2/7                           │
│  ●  B)  7/12   ← selected            │
│  ○  C)  1/12                          │
│  ○  D)  2/12                          │
│                                      │
├──────────────────────────────────────┤
│  [ 💡 Hint (1/3) ]  [ Submit ✓ ]     │
└──────────────────────────────────────┘
```

### 5.4 Content Studio (Admin)

```
┌──────────────────────────────────────┐
│ Content Studio                       │
│ ──────────────────────────────────── │
│ Framework: gh_bece_math_2024  [▾]    │
│                                      │
│ Coverage: 78% ⚠ (< 80% gate)         │
│                                      │
│ Review queue:                        │
│  ● 12 content drafts                 │
│  ● 340 items pending                 │
│  ● 3 framework mappings to confirm   │
│                                      │
│ Coverage gaps (unmapped objectives): │
│  ▸ JSS3.GEO.4.1  (0 nodes)           │
│  ▸ JSS3.STAT.2.3 (1 partial)         │
│                                      │
│ [ + Author nodes ]                   │
│ [ + Generate content ]               │
│ [ + Generate items ]                 │
└──────────────────────────────────────┘
```


### 5.5 Localization Context

LOCALIZATION_CONTEXT = """
Country: {country_name}
Currency: {currency}
Common names: {common_names}
Preferred cities: {cities}
Foods: {foods}
Units: {units_preferred}
AVOID: {avoid}

RULES:
- Replace any placeholder context with values from the lists above.
- Never change the mathematical content, answer, or skill being assessed.
- If a section contains no localizable context, do not override it.
"""

---

## 6. 🔄 Human-in-the-Loop Review (Governance)

Per doc 02 §9, some changes are gated more strictly than code:

| Change | Requires |
|---|---|
| New canonical node | Curriculum lead approval |
| Change to prerequisites | Curriculum lead + engine test-vector review |
| Deprecate a node | Curriculum lead + migration plan |
| New framework version | Curriculum lead + diff review + coverage ≥ 80% |
| Objective → node mapping | Curriculum lead, **per mapping, no bulk approve** |
| Grade band definition | Curriculum lead + reviewer |
| Calendar | Ops, no approval |

### 6.1 Content approval pipeline

```
draft → review → published → archived
```

Auto-reject conditions:

- SymPy disagrees with stated answer
- Content < 300 words
- Weaviate cosine < 0.15 vs existing
- KaTeX parse failure

### 6.2 Item lifecycle automation (doc 05 §7)

At `n ≥ 50`:
- Point-biserial discrimination < 0.15 → `revision`
- Discrimination < 0.05 or negative → `retired` immediately
- p-value outside tier band by > 0.20 → `revision` (re-tier)
- Distractor chosen by < 3% → flag non-functional distractor

### 6.3 Which statuses count toward publish gate

**Reviewed and beyond:** `reviewed`, `piloted`, `live`, `calibrating`, `calibrated` count.
**Excluded:** `draft`, `generated`, `tagged`, `revision`, `retired`.

Floor is `reviewed`, not `piloted` — `piloted` requires delivery, delivery requires bundle, bundle requires `piloted`. Circular. `reviewed` is the human-approval bar the gate exists to enforce.

---

## 7. 🧪 The Learning Engine (`/engine`)

**This is not Python. This is pure TypeScript, zero dependencies, shared client/server.**

Repo structure (doc 10 §2):

```
/engine
  /src
    state.ts            # NodeState, Attempt, Decision types (doc 04 §2)
    statemachine.ts     # transitions, I-1 through I-12 (doc 04 §3)
    mastery.ts          # is_mastered() — HAND-VERIFIED (doc 04 §4)
    elo.ts              # ability/difficulty updates — HAND-VERIFIED (doc 04 §5)
    selection.ts        # select_next_item() — HAND-VERIFIED (doc 04 §6)
    placement.ts        # place() — HAND-VERIFIED (doc 04 §7)
    srs.ts              # FSRS scheduler (doc 04 §8)
    escalation.ts       # should_escalate() (doc 04 §9)
    invariants.ts       # I-1 through I-12 (doc 04 §11)
  /testdata             # golden vectors, JSON (doc 04 §12)
  /test
    conformance.test.ts # MUST pass on client AND server
    simulation.test.ts  # 10k synthetic learners, 12 weeks
```

**Purity rules (doc 10 §3):**

- No I/O
- No clock reads — `now` is a parameter
- No randomness except via injected seeded PRNG
- No model calls — the engine decides *when* to escalate; the model responds

**Determinism is required (doc 04 intro).** Same inputs → byte-identical outputs on every platform. Round Elo to 4 decimals immediately after each update (V8/Hermes transcendental divergence hazard).

**Stack (v2 correction, decided DD-11-1).** The engine is TypeScript compiled to JavaScript. The server runs it in a Node/V8 sidecar (`engine-bridge/`), the web client in the browser engines, and the mobile client in an embedded JavaScript runtime (DD-01-7). Doc 04 §5.2's cross-runtime hazard applies to all of them and is covered by baked constants, 4-decimal rounding and the parity gate (docs/sync-contract.md §9). The earlier "Python calls into it via WASM" line described a FastAPI backend; if any part of the system is not TypeScript it must use a parallel implementation that passes the same golden vectors (E-3). Doc 11 (tech stack) governs where this plan's examples differ.

### 7.0 API Surface (frameworks)
    GET  /api/countries                          # list countries + status
GET  /api/frameworks                         # list all frameworks (admin)
GET  /api/frameworks?country=GH              # list by country
GET  /api/frameworks/:id                     # full framework detail
GET  /api/frameworks/:id/coverage            # coverage report
GET  /api/frameworks/:id/localization-brief  # brief
POST /api/frameworks/import                  # new framework (admin)
POST /api/frameworks/:id/activate            # gated on ≥80% coverage
POST /api/frameworks/:id/supersede           # with reason; generates diff report
POST /api/learners/:id/change-framework      # creates a pin migration
GET  /api/learners/:id/framework-history     # audit of pins
GET  /api/analytics/frameworks/compare       # cross-country stats (admin)
```

### 7.1 Elo (doc 04 §5)

- `node.difficulty_elo = 1200 + 25 * topological_level(node)` — derived from graph position, not authored
- Tier offsets: `T1 = −285, T2 = −115, T3 = +20` — **baked as constants**, not computed (V8/Hermes `Math.pow` divergence)
- Item Elo = `node.difficulty_elo + tier_offset`
- Ability Elo seeds from **I-1's secured set** (mastered/needs_review/relearning), not the literal string 'mastered' (doc 04 §5.1, corrected 2026-08-14)
- K-factors: learner K = 40/24/16 by attempt count; item K = 32/16/8 by response count
- Clamp to [400, 2800]

### 7.2 Selection (doc 04 §6)

1. Every 4th item from review queue (interleaving)
2. Remediation override: 2 hits of same misconception in last 5 → serve remediation
3. Target `ability_elo − 200` (≈0.76 success probability — item *easier* than ability)
4. Weighted sample with σ=150, not argmin

Pool exhaustion ladder: relax recall window → widen σ → serve least-recently-seen → emit `content_gap` telemetry.

### 7.3 Placement (doc 04 §7)

Binary search over prerequisite DAG. Budget 15–20 items, hard cap 25.

- **Resumable step API:** `initPlacementState`, `nextProbeDepth`, `recordProbeResult`, `finalizePlacement` — the pseudocode's one-shot `place()` is a convenience wrapper; the step API is the real contract
- Seed at hinted grade band ± 10 depth levels
- Probe Tier 2 items, 3 per depth. (v2) Prefer numeric or expression entry for probes: a pure guesser passes a 3-probe round on a 4-option MCQ with probability 0.156 (doc 05 §3.1)
- `lo` advanced only on ≥2/3 correct; frontier = last *confirmed* successful depth
- Backfill: verify prerequisites of identified frontier, Tier 1
- Provisional mastery carries `mastered_at = null`, re-verified within 14 days
- Placement attempts: `is_placement = true`, never count toward mastery window
- Learner MUST NOT see score, grade level, or comparison. Copy: "We're finding your starting point."
- MUST be resumable — dropped connection mid-placement does not restart
- **(v2) Placement needs nodes at and below the frontier.** `PlacementResult.at_graph_floor` is true when the search ends at the graph's minimum depth with the frontier unconfirmed (doc 04 §7.1). A pilot graph with no nodes below JSS2 would put every below-level learner at the floor, which defeats the product's central claim. See the prerequisite spine in §17.1.
- **(v2) `propagate_mastery_down` is not yet implemented in `/engine`** (doc 04 §5.1 note). Without it placement unlocks only the probed nodes. Pilot-blocking.

### 7.4 Escalation (doc 04 §9)

The engine decides *when*; it never talks to a model.

```
should_escalate(node) =
    recent_window.len() ≥ 4
    AND last 4 attempts all !correct
    AND any of those with hints_used == 3
    AND !escalated_within(node, hours=24)
```

Emits `Decision::escalate_to_tutor` with `node_id` and `misconception_id`. Optional, earlier tutor offers are a separate decision, `offer_tutor` (doc 04 §9.1, §13.2). Target escalation rate < 10% of node attempts — higher means Tier 1 hint content is weak (a content problem, not an engine problem).

### 7.5 Invariants (doc 04 §11)

| ID | Invariant |
|---|---|
| I-1 | No node `available` unless all hard prerequisites are `mastered`+ |
| I-2 | `mastered_at` set once, never cleared |
| I-3 | Mastery monotonic within a session |
| I-4 | `select_next_item` always returns a Decision |
| I-5 | Elo ratings always within [400, 2800] |
| I-6 | Review queue never exceeds 8 items/day |
| I-7 | Skill graph is acyclic (validated at content build, re-asserted at load) |
| I-8 | An attempt is never counted twice — `attempt_id` idempotency |
| I-9 | Engine output is a pure function of (state, event, now, seed) |
| I-10 | Hinted attempts never satisfy the mastery predicate |
| I-11 | A pin migration never mutates `learner_node_state` (mastery lives on nodes; pins on frameworks) |

### 7.6 Conformance Test Vectors (doc 04 §12)

`/engine/testdata/` — golden files, JSON. Both client and server implementations MUST pass all.

| Vector | Asserts |
|---|---|
| `mastery_same_day_grind.json` | 8 correct in one session ⇒ NOT mastered |
| `mastery_two_day_clean.json` | 4/5 correct across 2 non-consecutive days + Tier 3 ⇒ mastered |
| `mastery_hint_farm.json` | 10 correct all with hints ⇒ NOT mastered |
| `mastery_boundary_consecutive.json` | Correct Mon + Tue ⇒ NOT mastered |
| `mastery_hinted_day_bridge.json` | 4 clean + 1 hinted correct days later ⇒ NOT mastered |
| `elo_convergence.json` | 200 simulated attempts ⇒ ability within ±60 of true |
| `elo_cold_start.json` | First 10 attempts move ability ≥ 150 points |
| `selection_band.json` | 1000 selections ⇒ mean expected success in [0.75, 0.85] |
| `selection_no_repeat.json` | No item repeats within 21 simulated days |
| `selection_pool_exhaustion.json` | 6-item node ⇒ ladder engages, never errors |
| `item_difficulty_node_relative.json` | Same tier, shallow vs deep node ⇒ different seeds |
| `node_difficulty_topological.json` | Node Elo derived from prerequisite depth |
| `ability_seed_from_prerequisites.json` | New node seeds from mastered prerequisites |
| `ability_seed_secured_by_i1.json` | I-1 secured set (mastered/needs_review/relearning), not literal 'mastered' |
| `availability_hard_prerequisite_gates.json` | Unsecured hard prerequisite gates |
| `availability_chain_unlocks.json` | 4-chain: mastering one unlocks exactly one more |
| `availability_soft_never_gates.json` | Soft prerequisite never gates |
| `availability_review_states_satisfy.json` | `needs_review` and `relearning` satisfy prerequisites |
| `availability_provisional_mastery.json` | Provisional mastery unlocks dependants |
| `interleave_cadence.json` | Review item at every 4th position from the first interleavable item; none before the node has 2 correct attempts (doc 04 §6, v2 proposal) |
| `remediation_override.json` | 2 hits in 5 → serve remediation; dedup suppresses |
| `review_queue_daily_cap.json` | 20 due ⇒ exactly 8 queued (I-6) |
| `review_queue_priority.json` | relearning > overdue > exam-critical > due today |
| `review_queue_overdue_decay.json` | 10 nodes >60d overdue ⇒ at most 3 admitted |
| `review_queue_relearning_not_due.json` | Relearning nodes not yet due excluded |
| `placement_low_ability.json` | P4 learner in JSS2 ⇒ frontier at P4, ≤ 20 items |
| `placement_high_ability.json` | Above-grade learner ⇒ frontier above entry hint |
| `placement_resume.json` | Interrupt at item 9, resume ⇒ identical outcome |
| `fsrs_lapse_recovery.json` | Lapse ⇒ stability drop, relearning, 2-correct recovery |
| `fsrs_exam_compression.json` | 10 days to exam ⇒ intervals × 0.35 |
| `escalation_trigger.json` | 4 fails with hints exhausted ⇒ escalate exactly once per 24h |
| `determinism_cross_platform.json` | Same seed + input ⇒ byte-identical output |
| `idempotency_replay.json` | Replaying full attempt log ⇒ identical final state |
| `mastery_hinted_tier3.json` | Hinted Tier-3 correct does not set `max_tier_correct` |
| `mastery_blockers.json` | Unmet mastery clauses reported; spacing-only ⇒ {spacing} |
| `elo_review_no_ability_update.json` | Review attempt leaves `ability_elo` unchanged |
| `exam_proximity_none.json` | No exam date ⇒ compression 1.0, no error |
| `review_backlog_exam_window_telemetry.json` | Due count above cap in the exam window ⇒ telemetry emitted |
| `placement_propagates_prerequisites.json` | Probed mastery provisionally masters unverified prerequisites |
| `placement_graph_floor.json` | Learner below minimum graph depth ⇒ `at_graph_floor = true` |
| `tutor_offer_triggers.json` | Each `offer_tutor` reason fires once at its scope; state unchanged |
| `pin_migration_preserves_state.json` | I-11: pin migration leaves every `NodeState` identical |
| `forecast_band_not_point.json` | Exam forecast returns a band, deterministically |

**Rule:** a change to §4, §5, §6, §7 or §8 of doc 04 requires an updated or added vector in the same commit. Enforced in CI.

### 7.7 Performance Budget (doc 04 §13)

| Operation | P50 | P99 | Device |
|---|---|---|---|
| `select_next_item` | 4ms | 15ms | 2GB Android |
| `evaluate_attempt` | 1ms | 5ms | 2GB Android |
| `build_review_queue` | 15ms | 60ms | 2GB Android |
| `place` (full run) | — | 400ms | 2GB Android |
| Full state rehydrate (400 nodes) | 80ms | 250ms | 2GB Android |

Item pools loaded lazily per node. The whole graph MUST NOT be resident in memory.

### 7.8 Telemetry (doc 04 §14)

Not for analytics dashboards — for debugging the engine itself.

`decision_reason` on every decision · `expected_vs_actual_success` per selection · `pool_exhaustion_level` · `escalation_rate` per node · `content_gap` when a node has < 8 usable items · `provisional_mastery_failure_rate` · `invariant_violation` (page on non-zero)

---

### 7.8.1 Engine Context (multi-country impact)

interface EngineContext {
  now: Date;
  rng: () => number;
  daysUntilExam?: number; // resolved by the CALLER from the learner's pin and the calendar
                          // (doc 02 §4); undefined = no exam known (compression 1.0). doc 04 §2.4
  frameworkId?: string;   // for telemetry tagging only; engine behavior
                          // MUST NOT depend on this field
}



### 7.9 Multi-Country UI Additions

#### 7.9.1 Onboarding (framework picker)
text
┌──────────────────────────────────────┐
│ Where are you studying?              │
│ ──────────────────────────────────── │
│  ○  Ghana · BECE                     │
│  ●  Nigeria · JSS Certificate (NECO) │
│  ○  Sierra Leone · BECE (WAEC)       │
│                                      │
│  I don't see my country →            │
└──────────────────────────────────────┘
Rule: the picker lists active frameworks only. A learner may not choose a framework in planned, importing, mapping, or authoring state.

#### 7.9.2 Progress Dashboard (framework-switch banner)
When a framework is superseded, and the learner is pinned to the old version:

text
┌──────────────────────────────────────┐
│ ℹ️  A new syllabus is available      │
│    Your progress is safe. Switch     │
│    when you're ready.                │
│    [ Review changes ]  [ Switch ]    │
└──────────────────────────────────────┘
The switch creates a pin migration. Mastery carries over.

#### 7.9.3 Content Studio — Country Tab
text
┌──────────────────────────────────────┐
│ Content Studio                       │
│ Country: Ghana · BECE 2024  [▾]      │
│ ──────────────────────────────────── │
│ Coverage: 78% ⚠ (<80% gate)          │
│                                      │
│ Localization:                        │
│  ● Brief: complete                   │
│  ● Overrides: 142 / 340 items        │
│  ● Pending review: 47                │
│                                      │
│ Coverage gaps:                       │
│  ▸ JSS3.GEO.4.1  (0 nodes)           │
│  ▸ JSS3.STAT.2.3 (1 partial)         │
│                                      │
│ [ Generate missing nodes ]           │
│ [ Refresh localization ]             │
│ [ Re-run coverage report ]           │
└──────────────────────────────────────┘
#### 7.9.4 Admin — Cross-Country View
text
┌──────────────────────────────────────┐
│ Countries                            │
│ ──────────────────────────────────── │
│ Ghana      · BECE 2024  · active     │
│ Nigeria    · BECE 2025  · piloting   │
│ Sierra Leone · BECE 2024 · mapping   │
│                                      │
│ Cross-country comparison             │
│                                      │
│ Retention (30d)                      │
│  GH ▓▓▓▓▓▓▓▓░░ 78%                   │
│  NG ▓▓▓▓▓▓░░░░ 62%                   │
│  SL —                                │
└──────────────────────────────────────┘




## 8. 🧩 Assessment & Item Specification (doc 05)

### 8.1 Item Anatomy

Every item carries:

```
Item {
  item_id           : string
  node_id           : string
  type              : ItemType
  difficulty_tier   : 1 | 2 | 3
  difficulty_elo    : int              # live, engine-maintained
  stem              : Block[]          # 17-block content model
  payload           : TypePayload
  scoring           : ScoringRule
  hints             : [Hint; 3]        # progressive, see §8.5
  worked_solution   : Block[]
  hint_variants     : [Hint]           # (v2) optional, doc 05 §5
  # locale_variants removed (v2): overlay keyed by framework_id, §2.10
  offline_capable   : bool
  printable         : bool             # (v2) doc 05 A-9
  media_bytes       : int
  status            : ItemStatus
  stats             : ItemStats
  a11y              : A11yMetadata
}
```

### 8.2 The 17-Block Content Model

```
Block = TextBlock | HeadingBlock | MathBlock | ImageBlock | CalloutBlock
      | DefinitionBlock | WorkedExampleBlock | MisconceptionAlertBlock
      | TableBlock | ListBlock | DesmosBlock | GeoGebraBlock
      | NumberLineBlock | HotspotBlock | AudioBlock | VideoBlock
      | CheckBlock

TextBlock             { type: "text", content: string }
HeadingBlock          { type: "heading", level: 1|2|3, content: string }
MathBlock             { type: "math", katex: string, display: "inline"|"block" }
ImageBlock            { type: "image", src: string, alt: string }        # alt REQUIRED
CalloutBlock          { type: "callout", style: "info"|"tip"|"warning", content: Block[] }
DefinitionBlock       { type: "definition", term: string, definition: string }
WorkedExampleBlock    { type: "worked_example", steps: Block[][] }
MisconceptionAlertBlock { type: "misconception_alert", misconception_id, content: Block[] }
TableBlock            { type: "table", headers: string[], rows: string[][] }
ListBlock             { type: "list", ordered: bool, items: string[] }
DesmosBlock           { type: "desmos", expression: string, bounds?: object }
GeoGebraBlock         { type: "geogebra", ggb_ref: string }
NumberLineBlock       { type: "number_line", range: [number,number], marks?: number[] }
HotspotBlock          { type: "hotspot", image: string, zones: Zone[] }
AudioBlock            { type: "audio", src: string, transcript: string }  # transcript REQUIRED
VideoBlock            { type: "video", src: string, poster: string }      # never default path
CheckBlock            { type: "check", question, options, correct_index } # ungated
```

### 8.3 Item Type Catalogue

**Off** = works fully offline · **Marking** = auto / AI · **Dx** = diagnostic power

| # | Type | Off | Marking | Dx | Phase |
|---|---|---|---|---|---|
| 1 | MCQ single-answer | ✅ | auto | ★★★ | 1 |
| 2 | Multi-select | ✅ | auto | ★★★ | 1 |
| 3 | Numeric entry | ✅ | auto | ★★☆ | 1 |
| 4 | Expression entry | ✅ | auto | ★★☆ | 1 |
| 5 | Cloze / fill-in-blank | ✅ | auto | ★★☆ | 1 |
| 6 | Ordering | ✅ | auto | ★★☆ | 1 |
| 7 | Matching | ✅ | auto | ★★★ | 1 |
| 8 | Table completion | ✅ | auto | ★★☆ | 1 |
| 9 | Number line placement | ✅ | auto | ★★★ | 2 |
| 10 | Diagram labelling / drag-drop | ✅ | auto | ★★★ | 2 |
| 11 | Short constructed response | ⚠️ deferred | AI | ★★☆ | 3 |
| 12 | Structured multi-part | ⚠️ deferred | AI | ★★★ | 3 |
| 13 | Graph interaction (Desmos) | ✅ | auto | ★★☆ | 3 |
| 14 | Geometry construction (GeoGebra) | ✅ | auto | ★★☆ | 4 |
| 15 | Working-shown photo | ❌ | AI | ★★★ | 4 |
| 16 | Audio response (oral fluency) | ⚠️ deferred | AI | ★★★ | 4 |
| 17 | Hotspot | ✅ | auto | ★★★ | 2 |
| 18 | Categorization | ✅ | auto | ★★☆ | 2 |

### 8.4 Difficulty Tiers (doc 05 §2)

| Tier | Definition | Target p-value |
|---|---|---|
| 1 — Recognition | Single-step, familiar, easy numbers | 0.75–0.90 |
| 2 — Fluency | Single skill, unfamiliar surface | 0.55–0.75 |
| 3 — Transfer | Skill in novel context or multi-step | 0.35–0.60 |

**Tier 3 is not "harder arithmetic."** It is the *same* skill in an unfamiliar wrapper.

### 8.5 Hints (doc 05 §5)

Exactly 3 levels per item, precomputed, shipped in bundle.

```
Hint {
  level             : 1 | 2 | 3
  content           : Block[]
  misconception_id  : string?     # null for generic; set for targeted
}
```

| Level | Purpose | Rule |
|---|---|---|
| 1 — Orient | Points at what to notice | MUST NOT restate the method |
| 2 — Method | Names the procedure | MUST NOT do the arithmetic |
| 3 — Partial work | Does the first step | MUST leave final step to learner |

**Level 3 MUST NOT give the answer.** If exhausted and still failing, the engine escalates (doc 04 §9).

### 8.6 Universal Item Rules

| ID | Rule |
|---|---|
| A-1 | One item maps to exactly one node |
| A-2 | Every selectable wrong answer MUST carry a `misconception_id`. **Hard CI gate.** |
| A-3 | Stem reading level ≥ 2 years below target grade (maths and science; not ELA, where reading level is the construct) |
| A-4 | Answerable in ≤ 90s at Tier 1–2, ≤ 180s at Tier 3 |
| A-5 | Media SVG or WebP. No item > 40KB media |
| A-6 | `offline_capable = false` items MUST NOT appear in mastery path |
| A-7 | No item depends on colour alone |
| A-8 | No negatively-worded stems below JSS3 |

### 8.7 Item Lifecycle (doc 05 §7)

```
draft → generated → tagged → reviewed → piloted → live
                                        ↓
                              calibrating → calibrated
                                        ↓
                              revision → retired
```

**Statuses counting toward publish gate:** `reviewed`, `piloted`, `live`, `calibrating`, `calibrated`.
**Excluded:** `draft`, `generated`, `tagged`, `revision`, `retired`.

### 8.8 Quality Thresholds (evaluated at n ≥ 50)

| Condition | Action |
|---|---|
| Point-biserial discrimination < 0.15 | → `revision` |
| Discrimination < 0.05 or negative | → `retired` immediately |
| p-value outside tier band by > 0.20 | → `revision` (re-tier) |
| Distractor chosen by < 3% | flag: non-functional distractor |
| Median latency > 3× node median | flag: reading-load problem |
| `\|difficulty_elo - item_seed\| > 400` | → `revision` (mis-authored). `item_seed = node.difficulty_elo + tier_offset` (doc 04 §5.1), not an absolute 1200/1500/1800 |

### 8.9 Bank Composition (doc 05 §8)

Per node, when it is first published to learners (pilot content):

| Tier | Count | Types |
|---|---|---|
| 1 | 8–12 | MCQ, numeric, cloze |
| 2 | 8–12 | MCQ, numeric, matching, table, number line |
| 3 | 5–8 | MCQ, expression, short response, structured |

**Serve floor:** 8 items with ≥ 2 at Tier 3. Below this the engine emits `content_gap`.
**Publish bar:** 15 published items with ≥ 5 at Tier 3 (doc 10 §5).

Type mix, target: MCQ 45% · numeric 20% · cloze/table 12% · matching/ordering 8% · number line 6% · short response 6% · other 3%

### 8.10 Misconception Taxonomy (doc 05 §9)

ID scheme: `DOMAIN.SPECIFIC_BELIEF`, screaming snake, stable forever.

```
FRAC.ADD_NUM_DEN          # adds numerators and denominators
FRAC.LCD_MULTIPLY         # multiplies denominators instead of finding LCD
FRAC.NUM_AS_POSITION      # treats numerator as position on number line
DEC.LONGER_IS_BIGGER      # 0.125 > 0.5 because more digits
ALG.SLOPE_SIGN            # sign error reading gradient
INT.NEG_TIMES_NEG_NEG     # believes (−)(−) = (−)
```

```
Misconception {
  id, domain, description,
  learner_facing_name : string
  prevalence          : float         # MEASURED, not assumed
  affected_nodes      : [node_id]
  remediation_id      : string
  typical_origin      : string
}
```

**Pilot target: ~150 named misconceptions for JSS maths.**

### 8.11 Authoring Anti-Patterns (doc 05 §10)

| Anti-pattern | Why it fails |
|---|---|
| Filler distractors ("banana") | Wastes the only diagnostic slot |
| Two skills in one item | Cannot attribute failure to a node |
| Reading level above target grade | Assesses English, not mathematics |
| "All of the above" | Defeats diagnosis |
| Key noticeably longer than distractors | Learners pattern-match |
| Trick questions | Punishes careful readers |
| Culturally alien context | Adds construct-irrelevant load |
| Tier 3 = uglier numbers | Produces Tier 1 with more slips |
| Negative stems below JSS3 | Tests parsing, not the skill |
| Short response with no exemplars | AI marking unstable without anchors |

---

## 9. 🧪 Engineering Standards (doc 10)

### 9.1 Working with Coding Agents

**Rules:**

1. One document per task — give the agent the doc that owns the contract plus its "Contracts consumed" list
2. Specify the contract, not the implementation
3. Tests before implementation for anything in the engine
4. Generated code is reviewed as code
5. Never generate the engine's core predicates without verification

**Trust tiers:**

| Tier | Scope | Review depth |
|---|---|---|
| **Hand-verified** | Engine: mastery, Elo, selection, scheduler | Line by line vs doc 04 §12 vectors |
| **Reviewed** | Sync, content pipeline, payments, auth, RBAC | Full read, tests checked |
| **Generated + tested** | CRUD, dashboards, forms, admin screens | Behaviour verified, code skimmed |

### 9.2 Repository Structure

> **Stack note (v2).** The tree below was written for a FastAPI/Flutter layout, which is the real stack; doc 11 (tech stack) governs, and its §3 records why the doc 04 runtime wording was amended. Read this tree as *logical components and CI gates*; re-map the paths to the real monorepo before handing it to a coding agent.

```
questcademy/
├── engine/                            # Pure TypeScript, zero deps, shared client/server
│   ├── src/
│   │   ├── state.ts                   # NodeState, Attempt, Decision types
│   │   ├── statemachine.ts            # Transitions, I-1 through I-12
│   │   ├── mastery.ts                 # is_mastered() — HAND-VERIFIED
│   │   ├── elo.ts                     # Elo update — HAND-VERIFIED
│   │   ├── selection.ts               # select_next_item() — HAND-VERIFIED
│   │   ├── placement.ts               # place() — HAND-VERIFIED
│   │   ├── srs.ts                     # FSRS scheduler
│   │   ├── escalation.ts              # should_escalate()
│   │   └── invariants.ts              # I-1 through I-12
│   ├── testdata/                      # Golden vectors, JSON
│   ├── test/
│   │   ├── conformance.test.ts        # MUST pass client + server
│   │   └── simulation.test.ts         # 10k learners, 12 weeks
│   ├── package.json
│   └── tsconfig.json
│
├── backend/                           # FastAPI (Python) — illustrative, see stack note
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   ├── redis.py
│   │   │   ├── logging.py
│   │   │   └── rate_limit.py
│   │   ├── db/
│   │   │   ├── session.py
│   │   │   ├── base.py
│   │   │   ├── models/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── user.py
│   │   │   │   ├── skill_graph.py     # SkillNode, SkillNodePrerequisite
│   │   │   │   ├── framework.py       # CurriculumFramework, GradeBand,
│   │   │   │   │                      # SyllabusObjective, ObjectiveNodeMap
│   │   │   │   ├── calendar.py        # AcademicCalendar
│   │   │   │   ├── content.py         # SkillNodeContent, ContentRevision
│   │   │   │   ├── item.py            # Item, ItemMisconception, LifecycleEvent
│   │   │   │   ├── misconception.py   # Misconception, MisconceptionNode
│   │   │   │   ├── learner_state.py   # LearnerNodeState, Attempt
│   │   │   │   ├── ai_session.py
│   │   │   │   └── job.py             # GenerationJob
│   │   │   └── migrations/
│   │   ├── schemas/
│   │   │   ├── auth.py
│   │   │   ├── skill_graph.py
│   │   │   ├── framework.py
│   │   │   ├── content.py
│   │   │   ├── item.py
│   │   │   ├── tutor.py
│   │   │   ├── quiz.py
│   │   │   ├── progress.py
│   │   │   └── review.py
│   │   ├── engine_bridge/             # WASM or parallel impl verification
│   │   │   ├── __init__.py
│   │   │   └── engine.py              # Calls into /engine
│   │   ├── vector/
│   │   │   ├── client.py
│   │   │   ├── content_index.py       # SkillNodeContentChunk
│   │   │   ├── item_index.py          # ItemChunk
│   │   │   ├── objective_index.py     # FrameworkObjectiveChunk
│   │   │   └── embeddings.py
│   │   ├── ai/
│   │   │   ├── gemini.py
│   │   │   ├── prompts/
│   │   │   │   ├── tutor.py
│   │   │   │   ├── node_authoring.py
│   │   │   │   ├── content.py
│   │   │   │   ├── items.py
│   │   │   │   ├── expand.py
│   │   │   │   └── review.py
│   │   │   ├── tools/
│   │   │   │   ├── sympy_solver.py
│   │   │   │   ├── validator.py
│   │   │   │   ├── ocr.py
│   │   │   │   └── dedup.py
│   │   │   ├── pipelines/
│   │   │   │   ├── node_pipeline.py       # A1
│   │   │   │   ├── content_pipeline.py    # A2
│   │   │   │   ├── item_pipeline.py       # B
│   │   │   │   ├── expand_pipeline.py     # C
│   │   │   │   ├── embed_pipeline.py
│   │   │   │   └── chunker.py
│   │   │   ├── router.py
│   │   │   └── rag.py
│   │   ├── workers/
│   │   │   ├── celery_app.py
│   │   │   ├── tasks/
│   │   │   │   ├── node_tasks.py
│   │   │   │   ├── content_tasks.py
│   │   │   │   ├── item_tasks.py
│   │   │   │   ├── expand_tasks.py
│   │   │   │   ├── embed_tasks.py
│   │   │   │   └── srs_tasks.py
│   │   │   └── scheduler.py
│   │   ├── api/
│   │   │   ├── deps.py
│   │   │   ├── auth.py
│   │   │   ├── skill_graph.py
│   │   │   ├── framework.py
│   │   │   ├── calendar.py
│   │   │   ├── nodes.py
│   │   │   ├── tutor.py
│   │   │   ├── practice.py
│   │   │   ├── tests.py
│   │   │   ├── progress.py
│   │   │   ├── srs.py
│   │   │   ├── review.py
│   │   │   └── admin/
│   │   │       ├── content.py
│   │   │       ├── jobs.py
│   │   │       └── analytics.py
│   │   └── services/
│   │       ├── content_service.py
│   │       ├── learning_path.py       # Thin wrapper on engine
│   │       ├── mastery_telemetry.py
│   │       ├── review_queue_service.py
│   │       ├── exam_prediction.py
│   │       ├── escalation_handler.py
│   │       └── scoring.py
│   ├── scripts/
│   │   ├── seed_skill_graph.py
│   │   ├── seed_framework.py
│   │   ├── seed_pilot.py
│   │   ├── backfill_embeddings.py
│   │   └── generate_framework.py
│   ├── tests/
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── Dockerfile
│   └── pyproject.toml
│
├── content-tools/                     # Authoring, bundle build, CI gates
│   ├── authoring/                     # 18-type item authoring UI
│   ├── reading_level/                 # Flesch-Kincaid checker
│   ├── media_optimizer/               # SVG/WebP enforcement
│   ├── bundle_build/                  # Node slice selection, ≤2MB bundle
│   └── ci_gates/                      # Content CI gates
│
├── web/                               # TypeScript (Next.js 14 App Router)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (student)/
│   │   │   │   ├── layout.tsx
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── learn/
│   │   │   │   │   ├── page.tsx                 # Learning path
│   │   │   │   │   └── node/[node_id]/page.tsx  # Node reader
│   │   │   │   ├── practice/page.tsx
│   │   │   │   ├── tutor/page.tsx
│   │   │   │   ├── tests/page.tsx
│   │   │   │   ├── progress/page.tsx
│   │   │   │   └── profile/page.tsx
│   │   │   ├── (admin)/
│   │   │   │   ├── layout.tsx
│   │   │   │   └── studio/
│   │   │   │       ├── page.tsx
│   │   │   │       ├── skill-graph/page.tsx
│   │   │   │       ├── frameworks/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   └── [id]/
│   │   │   │       │       ├── page.tsx
│   │   │   │       │       └── coverage/page.tsx
│   │   │   │       ├── content/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   ├── [id]/page.tsx
│   │   │   │       │   └── new/page.tsx
│   │   │   │       ├── items/page.tsx
│   │   │   │       ├── review/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   └── [id]/page.tsx
│   │   │   │       └── jobs/page.tsx
│   │   │   └── layout.tsx
│   │   └── api/
│   │       └── auth/[...nextauth]/route.ts
│   ├── components/
│   │   ├── content/
│   │   │   ├── BlockRenderer.tsx       # 17-block dispatcher
│   │   │   ├── blocks/
│   │   │   │   ├── TextBlock.tsx
│   │   │   │   ├── MathBlock.tsx
│   │   │   │   ├── ImageBlock.tsx
│   │   │   │   ├── CalloutBlock.tsx
│   │   │   │   ├── WorkedExampleBlock.tsx
│   │   │   │   ├── MisconceptionAlertBlock.tsx
│   │   │   │   ├── CheckBlock.tsx
│   │   │   │   └── ... (all 17)
│   │   │   ├── NodeReader.tsx
│   │   │   ├── AskAISidebar.tsx
│   │   │   └── NodeProgressBar.tsx
│   │   ├── learning/
│   │   │   ├── LearningPath.tsx
│   │   │   ├── TopicGroup.tsx
│   │   │   └── NodeCard.tsx
│   │   ├── math/
│   │   │   ├── Katex.tsx
│   │   │   ├── RichMath.tsx
│   │   │   └── KatexBlock.tsx
│   │   ├── practice/
│   │   │   ├── MCQSingle.tsx
│   │   │   ├── MultiSelect.tsx
│   │   │   ├── NumericEntry.tsx        # Custom keypad
│   │   │   ├── ExpressionEntry.tsx     # MathLive + offline CAS
│   │   │   ├── Cloze.tsx
│   │   │   ├── Ordering.tsx
│   │   │   ├── Matching.tsx
│   │   │   ├── TableCompletion.tsx
│   │   │   ├── NumberLine.tsx
│   │   │   ├── DiagramLabelling.tsx
│   │   │   ├── Hotspot.tsx
│   │   │   ├── Categorization.tsx
│   │   │   ├── ExplanationPanel.tsx
│   │   │   └── HintPanel.tsx
│   │   ├── tutor/
│   │   │   ├── TutorChat.tsx
│   │   │   ├── ChatBubble.tsx
│   │   │   └── StepList.tsx
│   │   ├── admin/
│   │   │   ├── NodeEditor.tsx
│   │   │   ├── FrameworkImporter.tsx
│   │   │   ├── CoverageDashboard.tsx
│   │   │   ├── ReviewToolbar.tsx
│   │   │   ├── QualityCheckPanel.tsx
│   │   │   ├── JobStatusBadge.tsx
│   │   │   └── SkillGraphTree.tsx
│   │   ├── progress/
│   │   │   ├── MasteryHeatmap.tsx
│   │   │   ├── ScorePredictor.tsx
│   │   │   └── ActivityChart.tsx
│   │   └── ui/
│   ├── lib/
│   │   ├── api/
│   │   ├── hooks/
│   │   ├── stores/
│   │   ├── utils/
│   │   └── types/
│   ├── package.json
│   └── Dockerfile
│
├── mobile/                            # Flutter — illustrative, see stack note
│   ├── lib/
│   │   ├── main.dart
│   │   ├── app.dart
│   │   ├── core/
│   │   │   ├── theme.dart
│   │   │   ├── constants.dart
│   │   │   └── router.dart
│   │   ├── models/
│   │   ├── services/
│   │   ├── providers/
│   │   ├── screens/
│   │   │   ├── onboarding/
│   │   │   ├── home/
│   │   │   ├── learn/
│   │   │   │   ├── learning_path_screen.dart
│   │   │   │   └── node_reader_screen.dart
│   │   │   ├── practice/
│   │   │   ├── tutor/
│   │   │   ├── tests/
│   │   │   ├── progress/
│   │   │   └── profile/
│   │   └── widgets/
│   │       ├── block_renderer.dart
│   │       ├── katex_view.dart
│   │       ├── rich_math.dart
│   │       ├── chat_bubble.dart
│   │       ├── mastery_ring.dart
│   │       └── ...
│   ├── assets/katex/
│   ├── pubspec.yaml
│   └── Dockerfile
│
├── shared/
│   ├── schema/openapi.json
│   ├── types/
│   │   ├── block.schema.json          # 17-block content model
│   │   ├── item.schema.json           # 18-type item contract
│   │   ├── skill_node.schema.json
│   │   └── framework.schema.json
│   └── prompts/
│       ├── v1/
│       └── CHANGELOG.md
│
├── simulation/                        # Synthetic learner harness
│   ├── harness.ts
│   ├── assertions.ts
│   └── baseline.json                  # Checked-in baseline
│
├── infra/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   ├── postgres/init.sql
│   ├── weaviate/schema.json
│   ├── nginx/nginx.conf
│   └── k8s/
│
├── docs/
│   ├── plan.md                        # This document
│   ├── 00-overview.md
│   ├── 02-curriculum-framework-spec.md
│   ├── 03-learning-science-spec.md
│   ├── 04-learning-engine-spec.md
│   ├── 05-assessment-item-spec.md
│   ├── 10-engineering-standards.md
│   ├── REJECTED_FEATURES.md
│   ├── bibliography.md
│   └── rct-preregistration.md
│
├── .github/workflows/
│   ├── engine-ci.yml
│   ├── backend-ci.yml
│   ├── web-ci.yml
│   ├── mobile-ci.yml
│   ├── content-ci.yml            - Country isolation gate: no file outside backend/app/db/         models/framework.py, backend/app/schemas/framework.py, and backend/app/api/framework.py may reference country_code in SQL or Python. Enforced by a lint rule that greps for the identifier in db/models/skill_graph.py, db/models/item.py, db/models/misconception.py, and every file under engine/.

Localization math-invariance gate: every item_localizations.payload_override that changes a numeric answer must be SymPy-verified. Fails the build if not.

Coverage gate: a framework cannot transition to active unless its own coverage_pct ≥ 80. Fails the build if a proposed migration violates this.

Pin migration gate: every learner_pin_migrations row must have mastery_preserved = true unless a human sets it false with an explicit reason (audited).
│   └── deploy.yml
│
├── .gitignore
├── .editorconfig
├── README.md
└── LICENSE
```

### 9.3 Code Standards (doc 10 §3)

- TypeScript strict everywhere. No `any` in `/engine`.
- All money in integer minor units.
- All timestamps `timestamptz` UTC; learner-local dates as `date`, separately.
- **No clock reads or randomness inside `/engine`.** Both injected via `EngineContext`.
- Errors typed and handled; no silent catches.
- Feature flags for anything learner-facing.
- Comments explain *why*, never *what*.

### 9.4 Testing (doc 10 §4)

| Layer | Requirement |
|---|---|
| `/engine` | 100% branch coverage. Full matrix in doc 04 §12. Non-negotiable. |
| Sync | Idempotency, out-of-order arrival, duplicate delivery, partial failure |
| Content pipeline | Every CI gate has a failing fixture proving it fails |
| API | Contract tests per endpoint including RBAC scope violations |
| Client | Critical paths: placement, session, offline, sync, profile switch |
| E2E | Placement → practice → mastery → review → sync, on real low-end device |

**Simulation harness** — 10,000 synthetic learners, 12 weeks, assertions per doc 04 §12. Any change to mastery/Elo/selection re-runs and diffs against checked-in baseline. A change that shifts the baseline without explanation does not merge.

**Golden parity test** — fixed attempt log + fixed seed → identical state hash on client and server. Runs every commit.

### 9.5 CI Gates (doc 10 §5)

Fail the build. They do not warn.

**Code:**
- lint
- typecheck
- unit tests
- `/engine` coverage 100%
- no critical dependency vulnerabilities
- `/engine` imports nothing (lint rule)

**Content:**
- bundle ≤ 2MB
- skill graph acyclic
- 100% distractors tagged
- every node ≥ 15 published items and ≥ 5 tier-3
- all media assets exist and are optimised
- every item's node exists in the slice

**Parity:**
- golden state hash matches across client and server builds

**Performance:**
- cold start < 2.5s
- memory < 180MB on the reference device profile

### 9.6 Review (doc 10 §6)

- Every change reviewed by a human, including agent-generated.
- Engine changes require a second reviewer **and** a simulation diff.
- Changes to docs 02, 03 or 04 require curriculum lead sign-off.
- Changes to scope decisions require a decision record.

**Checklist:**
- [ ] Matches the specification section it claims to implement?
- [ ] Tests real, not asserting implementation back at itself?
- [ ] Works offline?
- [ ] Works on reference device?
- [ ] Preserves engine determinism?
- [ ] No new runtime AI dependency on a Tier 0 path?
- [ ] Events instrumented per taxonomy?

### 9.7 Release (doc 10 §7)

`main` always deployable · trunk-based with short-lived branches · server deploys continuous behind flags · client releases fortnightly.

**Staged rollout:** internal → 2 pilot schools → 10% → 100%, with automatic halt on item-error spike or observed success rate leaving the 0.72–0.86 band.

**Backward compatibility: 12 months minimum on API versions.** Force-upgrade is a churn event — and given the dose threshold, that means zero learning for those users.

### 9.8 Reference Device (doc 10 §8)

A real low-end Android handset — 2GB RAM, Android 8 — physically on the desk.

- Weekly manual pass: placement, full session, offline mode, profile switch, sync-after-offline.
- Performance budgets measured on it, not an emulator. Emulator performance is not evidence.
- Any feature that fails here does not ship.

### 9.9 Definition of Done (doc 10 §9)

- [ ] Meets the specification section it implements
- [ ] Tests written and passing; engine changes have a simulation diff
- [ ] Works offline where the degradation ladder requires it
- [ ] Verified on the reference device
- [ ] Events instrumented per analytics event taxonomy
- [ ] RBAC scope enforced server-side
- [ ] Behind a feature flag if learner-facing
- [ ] Documentation updated if a contract changed
- [ ] No new Tier 0 dependency on a model call

--


## 10. 🎨 Brand & Design System

### 10.1 Foundations

| Trait | Meaning in UI |
|---|---|
| Calm confidence | Deep, low-saturation base — never loud |
| Sharp intelligence | High-contrast accents, mathematical precision |
| Encouraging | Warm secondary colors for streaks, wins |
| Trustworthy | Serious, restrained, non-gamified at core |
| Modern learner | Soft shadows, rounded corners, subtle motion |

### 10.2 Color System

**Core palette:**

| Role | Hex | Usage |
|---|---|---|
| Primary | `#4F46E5` | CTA, active nav, links |
| Primary hover | `#6366F1` | Hover states |
| Primary deep | `#4338CA` | Pressed, gradient ends |
| Accent | `#8B5CF6` | Secondary CTAs, AI marks |
| Accent glow | `#A78BFA` | AI thinking, gradient head |

**Semantic:**

| Role | Hex | Usage |
|---|---|---|
| Success | `#10B981` | Correct, mastery, streaks |
| Warning | `#F59E0B` | Weak topics, hints |
| Error | `#EF4444` | Wrong answers, warnings |
| Info | `#0EA5E9` | Tips, tooltips |

**Subject accents:**

| Subject | Hex |
|---|---|
| Mathematics | `#4F46E5` |
| Physics | `#8B5CF6` |
| Chemistry | `#10B981` |
| Biology | `#22C55E` |
| English | `#F59E0B` |
| Computer Science | `#0EA5E9` |

**Neutrals — dark mode (default):**

| Token | Hex |
|---|---|
| `bg-canvas` | `#0A0A0F` |
| `bg-surface` | `#0F0F18` |
| `bg-elevated` | `#14141F` |
| `bg-hover` | `#1A1A24` |
| `bg-input` | `#1F1F2E` |
| `border-subtle` | `#2A2A3A` |
| `border-strong` | `#3F3F52` |
| `text-primary` | `#F8FAFC` |
| `text-secondary` | `#CBD5E1` |
| `text-muted` | `#94A3B8` |
| `text-disabled` | `#64748B` |

**Neutrals — light mode:**

| Token | Hex |
|---|---|
| `bg-canvas` | `#FFFFFF` |
| `bg-surface` | `#F8FAFC` |
| `bg-elevated` | `#FFFFFF` |
| `border-subtle` | `#E2E8F0` |
| `text-primary` | `#0F172A` |
| `text-secondary` | `#334155` |
| `text-muted` | `#64748B` |

**Gradients:**

```css
--grad-primary: linear-gradient(135deg, #4F46E5 0%, #8B5CF6 100%);
--grad-ai:      linear-gradient(135deg, #6366F1 0%, #A78BFA 100%);
--grad-streak:  linear-gradient(135deg, #F59E0B 0%, #EF4444 100%);
```

**Accessibility:** WCAG AA minimum. Never use color alone to convey meaning — always pair with icon or text.

### 10.3 Typography

| Role | Family |
|---|---|
| UI / body | Inter |
| Display | Inter Display |
| Math | KaTeX_Main (bundled) |
| Code | JetBrains Mono |

**Type scale** (ratio 1.25, base 16px):

| Token | Size | Line | Weight | Usage |
|---|---|---|---|---|
| `display-2xl` | 60px | 68px | 800 | Landing hero |
| `display-xl` | 48px | 56px | 800 | Marketing H1 |
| `display-lg` | 40px | 48px | 700 | Section hero |
| `heading-xl` | 32px | 40px | 700 | Page titles |
| `heading-lg` | 24px | 32px | 700 | Screen titles |
| `heading-md` | 20px | 28px | 600 | Card titles |
| `heading-sm` | 18px | 26px | 600 | Subheads |
| `body-lg` | 17px | 26px | 400 | Lesson body |
| `body-md` | 15px | 24px | 400 | Default UI |
| `body-sm` | 13px | 20px | 400 | Captions |
| `label-md` | 14px | 20px | 500 | Buttons, chips |
| `label-sm` | 12px | 16px | 600 | Tags (uppercase) |
| `mono-md` | 14px | 22px | 400 | Formulas, code |

**Rules:** tabular numerals everywhere data appears. Fractions in KaTeX, never body text.

### 10.4 Spacing, Radius, Elevation

**Spacing (8pt grid):** 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96

**Radius:**

| Token | Value | Usage |
|---|---|---|
| `xs` | 4px | Chips |
| `sm` | 8px | Small buttons, inputs |
| `md` | 12px | Cards, buttons |
| `lg` | 16px | Panels, modals |
| `xl` | 24px | Hero cards |
| `full` | 9999px | Pills, avatars |

**Elevation:**

```css
--shadow-sm: 0 1px 2px rgba(0,0,0,0.35);
--shadow-md: 0 4px 12px rgba(0,0,0,0.40);
--shadow-lg: 0 12px 32px rgba(0,0,0,0.55);
--shadow-glow-primary: 0 0 24px rgba(99,102,241,0.45);
--shadow-glow-success: 0 0 20px rgba(16,185,129,0.35);
```

### 10.5 Motion

| Token | Duration | Easing | Usage |
|---|---|---|---|
| `instant` | 100ms | linear | Hover, ripple |
| `fast` | 180ms | `cubic-bezier(.2,.8,.2,1)` | Buttons, chips |
| `base` | 240ms | `cubic-bezier(.2,.8,.2,1)` | Screen transitions |
| `slow` | 400ms | `cubic-bezier(.4,0,.2,1)` | Modals, drawers |
| `celebrate` | 800ms | spring | Correct answer |

**Signature animations:** AI thinking (pulsing dot), correct answer (checkmark draw + scale + glow), wrong answer (gentle shake + red flash), streak milestone (confetti), lesson complete (ring fill + chime).

**Reduced motion:** all non-essential motion disabled when `prefers-reduced-motion: reduce`.

### 10.6 Component Tokens

**Buttons:**

| Variant | BG | Text | Border |
|---|---|---|---|
| Primary | `--grad-primary` | white | none |
| Secondary | transparent | `#A78BFA` | `#4F46E5` 1px |
| Ghost | transparent | `#CBD5E1` | none |
| Danger | `#EF4444` | white | none |

Sizes: `sm` (32px) · `md` (40px) · `lg` (48px). Radius `md`.

**Mastery indicator:** ring (conic gradient) for node-level; bar (segmented) for concept-level; heatmap (5-step) for topic grids.

Color map: `0–25%` red · `25–50%` amber · `50–75%` indigo · `75–90%` emerald · `90–100%` emerald + glow.

### 10.7 Design Tokens (single source of truth)

`shared/design/tokens.json` — read by Tailwind (web), Dart generator (Flutter), Jinja (backend emails/PDFs).

### 10.8 Do's and Don'ts

**Do:** use subject color to orient, not decorate · keep lesson body 17px / 1.65 line height · reserve gradient for primary CTA + AI marks · pair every color state with icon or label · bump KaTeX color slightly warmer than body.

**Don't:** use pure black `#000` or pure white `#FFF` · animate more than two things at once · gamify with pop colors · mix more than one accent subject color in a single card · put serif fonts anywhere.


### 10.9 Rollout Order
Countries are content projects. Sequence them by curriculum overlap with what already exists.

Expansion	Country	Board	Notes
Pilot	Ghana	WAEC BECE 2024	First market; canonical graph is authored here
E2 (was Phase 2)	Sierra Leone	WAEC BECE	Same administering body as Ghana → high mapping overlap (~90%)
E3 (was Phase 3)	Nigeria	Junior Secondary School Certificate: NECO (federal) + state boards	Different administering body from WAEC; A/B/C/P/F grading, not the 1–9 scale; JSS syllabus tradition shared. Informally called "BECE" — use label_local, not board identity
E4 (was Phase 4)	Nigeria	State boards (Lagos pilot)	Board-specific grade scales; still config, not code
E5+ (was Phase 5+)	Additional WAEC markets	Various	Gambia, Liberia if on WAEC
Later (planned, not scheduled)	United States	Common Core (standards-aligned framework type)	No exam board: uses framework_type = standards_aligned, optional exam_structure, per-school/district calendars. Sequence after Phase 0 exit.
Out of scope	Any other non-WAEC/BECE market	—	Revisit per product trigger
Success criterion for each expansion: the entire project is content authoring, framework mapping, and localization review. Zero engineering changes to /engine, /backend/app/db/models/ (outside the framework models), /web or /mobile. If any expansion requires a schema change, the abstraction has failed and the plan is fixed before proceeding.
---


## 11. 🧭 Competitive Positioning (added v2)

Benchmarked against **MagicSchool** and **Khanmigo** (Nov 2026). Figures are from vendor and third-party pages and should be re-verified before external use.

### 11.1 What each product actually is

| Product | Category | What it does | What it does not do |
|---|---|---|---|
| **MagicSchool** | Teacher productivity | 80+ teacher generators (lesson plans, rubrics, IEPs, quizzes); "Rooms" that restrict which AI tools students can use; LMS integrations (Google Classroom, Canvas, Schoology); reports 7M+ educators, 160 countries, mostly US usage | No learner model, no mastery gating, no misconception diagnosis |
| **Khanmigo** | Socratic AI tutor on a mastery platform | Guides students without giving answers; teacher tools free; learner plan ~$4/month; teacher dashboards and district rostering | Not built for West African boards; no published offline-first design; tutor engagement has been thin in at least one randomised study |
| **Gemini Guided Learning** (Google; Fab AI trial) | Guided-learning mode inside Gemini | In a pre-registered, cluster-randomised trial in Port Loko District, Sierra Leone (1,763 students, 8 weeks), about +0.26 SD intent-to-treat; teacher-led, with a 12-hour usage target. Developer-published initial report; effect not isolated from the teacher-training bundle | Not documented as a board-aligned, spacing-gated mastery engine. Google reportedly added diagnostic-quiz study notebooks in June 2026, so verify before claiming a placement gap. The evidence is for a teacher-led bundle, not AI alone |
| **Questcademy** | Mastery-based exam-prep engine | Placement at true level, spacing-gated mastery, misconception diagnosis, offline-first deterministic engine, board-agnostic graph | (v1) Nothing shipped; no teacher product, classroom layer, safety spec, or evidence yet |

### 11.2 Where Questcademy is stronger (protect these)

1. Placement at the real frontier, never the enrolled grade, with no grade labels in the UI.
2. Mastery predicate with the spacing effect built in (two non-consecutive days, hint-farm resistant).
3. Misconception-level diagnosis with measured prevalence — a data moat neither competitor has for this population.
4. Canonical graph + framework mappings: a new board is content work, not engineering.
5. Deterministic offline-first engine that runs on a 2GB Android phone.
6. A single honest success metric (30-day retrieval retention) and a pre-registered RCT.

### 11.3 Where competitors are stronger (close these gaps)

| Gap | Competitor advantage | Questcademy response | Section |
|---|---|---|---|
| Shipped product + evidence | Both | Narrow pilot + RCT | §17 |
| Teacher-led distribution | MagicSchool | Free teacher tools wedge | §12 |
| Tutor woven into the experience | Khanmigo (redesigned after engagement findings) | Inline tutor | §13 |
| Classroom / roster / dashboards | Both | Teacher dashboard | §14 |
| Trust, safety, compliance | MagicSchool (FERPA/COPPA/SOC 2 posture) | Safety & privacy spec | §16 |
| Engagement without gamification | Both (to varying degrees) | Non-gamified pull | §15 |
| Content breadth | Khan Academy | Prioritise depth on one subject/board first | §17 |

### 11.4 Strategic implication

The best-evidenced AI result in the target region (Sierra Leone, Gemini Guided Learning) was teacher-led, and Bastani et al. show unrestricted AI can lower later unaided performance. Both back the design below. Doc 03 §12A records the tutor evidence and its limits.

The research on AI tutoring is consistent: access to an AI tutor is not the same as learning from one, and the strongest results so far come from AI that supports human teachers and tutors. Questcademy therefore treats **teachers as a first-class user and distribution channel**, and treats the AI tutor as a **component inside the mastery loop**, not a separate chat product.

---

## 12. 🍎 Teacher Product & Go-To-Market Wedge (added v2)

**Problem:** the original plan has no teacher-facing product other than Content Studio (for the internal curriculum team). MagicSchool grew by giving teachers something free that saves them time, then expanding to students.

**Decision:** ship a **free Teacher Toolkit** as the entry product. Teachers bring their classes to the learner app.

### 12.1 Why it is cheap to build

Content Studio, the canonical graph, framework objectives, the item bank and the Block[] renderer already exist in the plan. The Teacher Toolkit is a read-only, teacher-friendly view of that same data, plus generators that reuse Pipelines A2/B.

### 12.2 Toolkit features (MVP)

| Tool | Input | Output | Built on |
|---|---|---|---|
| **Lesson plan** | Framework objective (e.g. `JSS2.NUM.3.2`) + class duration | Board-aligned lesson plan using node content, worked examples, local context | Pipeline A2 + localization overlay |
| **Quiz / worksheet builder** | Objectives or nodes + difficulty mix | Printable and shareable quiz, with answer key and misconception tags | Item bank (reviewed+ and `printable` only, doc 05 A-9) |
| **Exam-practice paper** | Framework + paper structure | Mock paper in the board's `exam_structure` format. Paper 1 (objective) only until structured-response types and a deferred-marking contract ship (doc 05 §3; doc 02 §3.3) | `curriculum_frameworks.exam_structure` |
| **Remediation set** | Misconception ID or node | Targeted practice and a 5-minute reteach script | `misconceptions.remediation_id` |
| **Printable pack** | Any of the above | PDF for classrooms with no devices | Content tools |

**Hard rule:** teacher tools may only draw from items at `reviewed` or beyond. No unreviewed AI output reaches a classroom.

### 12.3 Distribution loop

```
Teacher uses free toolkit  →  creates a class (join code)
        →  learners join, take placement  →  teacher sees class dashboard (§14)
        →  teacher assigns practice  →  learners use app (offline-first)
```

Schools and teacher communities are the channel; no paid acquisition assumed.

### 12.4 Business model (hypothesis — validate in pilot)

| Tier | Who | Price posture |
|---|---|---|
| Free | Individual teachers | Toolkit + small classes |
| School licence | Schools | Per-school or per-learner annual fee; classroom analytics |
| Learner/family | Parents | Low-cost, mobile-money-friendly billing; all money in integer minor units |

Pricing is intentionally unspecified here. Decide after pilot willingness-to-pay interviews.

### 12.5 Metrics

Teacher weekly active users · classes created per teacher · learners joined per class · toolkit-to-class conversion.

---

## 13. 🤖 Embedded Tutor (replaces the "Ask AI" side panel) (added v2)

**Why:** a randomised Khanmigo study found students rarely used the tutor when it was merely available alongside content. A tutor next to the content is a feature people ignore; a tutor inside the loop is a mechanism.

### 13.1 Design rules

1. **Engine decides when; the model only responds.** Unchanged from doc 04 §9. The tutor never decides pacing, mastery, or selection.
2. **Inline, not a side panel.** The tutor surfaces *inside* the practice screen at defined moments:
   - Hint level 3 exhausted and still wrong (existing `escalate_to_tutor`).
   - A misconception fires twice (existing remediation override) → tutor offers a short targeted dialogue.
   - After a correct Tier 3 answer → optional "explain why it works" self-explanation prompt (retrieval and elaboration).
3. **Seeded with structure, not free chat.** Every tutor session starts with `node_id`, `misconception_id`, the item, and the learner's last answer. Free-form questions are allowed but secondary.
4. **Socratic by default; never gives the final answer** to a live item. Worked solutions appear only after the item is closed (doc 05 A-10).
5. **Grounded:** RAG over `SkillNodeContentChunk` and `LocalizedContentChunk`, filtered by `framework_id`.
6. **Math verified:** any numeric claim the tutor makes is checked by SymPy before display; on disagreement, fall back to the precomputed worked solution.
7. **Offline-safe:** the tutor is a **Tier 2** feature (runtime network and model; doc 01 §5.1, DD-01-1) with a **Tier 1** fallback. If offline, the learner gets the precomputed hint ladder and worked solution. **No new runtime AI dependency on a Tier 0 path** (doc 10 §6 checklist).
8. **Short by design:** cap turns per session (initial target: 6) and end with a return to practice.

### 13.2 Engine impact

Engine purity is unchanged. v2 adds an **optional** decision, `offer_tutor`, distinct from the existing `escalate_to_tutor` (doc 04 §9), which means "this learner is struggling" and fires only after 4 failures with a hint ladder exhausted. Doc 04 §9.1 defines the offer rules:

```
Decision::offer_tutor { node_id, misconception_id?, reason: "hint_ladder_exhausted" | "repeat_misconception" | "self_explain" }
```

- `hint_ladder_exhausted`: the last attempt used all 3 hints and was still wrong; once per item.
- `repeat_misconception`: only *after* `serve_remediation` has been shown and the same belief recurs; the micro-lesson always comes first.
- `self_explain`: after an unhinted correct Tier-3 answer; once per node per 24 hours.
- An offer never changes mastery, Elo or the review schedule, and tutor dialogue is not an attempt.

New conformance vector in the same commit: `tutor_offer_triggers.json`. Thresholds are starting values (§13.3 metrics decide).

### 13.3 Tutor metrics

| Metric | Why | Initial target |
|---|---|---|
| Tutor open rate when offered | Is it woven in or ignored? | > 50% (review after pilot) |
| Post-tutor correct rate on next attempt at same node | Did it help? | Above matched no-tutor baseline |
| Escalation rate per node | Content health | < 10% (existing target) |
| Share of tutor turns off-task | Misuse | Track and tune |

---

## 14. 🏫 Classroom Layer (added v2)

Both competitors integrate with classrooms. Evidence also suggests AI works best with humans in the loop.

### 14.1 Schema additions

```sql
CREATE TABLE schools (
  school_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  country_code TEXT NOT NULL REFERENCES countries(country_code),
  calendar_id  UUID,                         -- per-school/district calendar (required for US; optional elsewhere)
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE classes (
  class_id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id      UUID NOT NULL REFERENCES users(id),
  school_id       UUID REFERENCES schools(school_id),
  name            TEXT NOT NULL,
  framework_id    TEXT NOT NULL REFERENCES curriculum_frameworks(framework_id),
  join_code       TEXT UNIQUE NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE class_members (
  class_id    UUID REFERENCES classes(class_id),
  learner_id  UUID REFERENCES users(id),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (class_id, learner_id)
);

CREATE TABLE assignments (
  assignment_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id        UUID REFERENCES classes(class_id),
  node_ids        TEXT[] NOT NULL,
  due_date        DATE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

**Rule:** classes and assignments never alter `learner_node_state` or a learner's framework pin. If a learner's pin differs from the class framework, the dashboard prompts a pin migration (§2.13); the class never changes the pin.

**Rule:** assigning a topic expands into its nodes ordered by prerequisites. Topic and subtopic are navigation only and never become a second dependency system. They only *recommend* and *surface*; the engine still decides availability and mastery.

### 14.2 Teacher dashboard (MVP)

```
┌──────────────────────────────────────────┐
│ JSS2 Maths · Class A                     │
│ ──────────────────────────────────────── │
│ Needs attention this week                │
│  ▸ 7 learners: FRAC.ADD_NUM_DEN          │
│  ▸ 4 learners: stalled on node (≥3 days) │
│                                          │
│ Class progress                           │
│  Nodes mastered this week: 38            │
│  Reviews due: 52                         │
│                                          │
│ [ Assign node ]  [ Print remediation set]│
└──────────────────────────────────────────┘
```

**Dignity constraint extends to teachers:** the dashboard shows *what to teach next* and *which misconception to address*. It does not rank children or show grade-level deficiency labels. Learners' placement frontier is shown as "working on", never "behind".

### 14.3 Roster and integrations

MVP: join codes and CSV import. Later: Google Classroom / other LMS integration where schools use them. Do not build SSO or rostering until a pilot school asks.

### 14.4 Parent view (later)

Weekly summary: what the child worked on, what is next, how to help. Same dignity rules. SMS/WhatsApp-capable.

---

## 15. 🔔 Engagement Without Gamification (added v2)

**Problem:** the two-session mastery gate and the rejection of extrinsic rewards mean the platform will not manufacture engagement by default. Without a plan, retention risk is high, and 30-day retrieval retention only matters if learners come back.

**Principle:** pull learners back with *relevance and scheduling*, not rewards. This remains consistent with the rejected-features list.

### 15.1 Mechanisms

| Mechanism | How | Constraint |
|---|---|---|
| **Due-date nudges** | SMS / WhatsApp / push tied to FSRS `due_at` and the 8/day review cap. To the learner and teacher first; a parent nudge on dose shortfall once a parent contact and consent basis exist (§16, doc 03 §12) | Opt-in; quiet hours; max 1/day |
| **"Next up" clarity** | Learning Path always shows exactly one recommended node | No grade or rank language |
| **Short sessions** | Target 10-minute sessions; every session ends on a win or a clear next step | Respect `est_minutes` 8–15 |
| **Teacher assignments** | Class-level assignments and due dates (§14) | Recommendations only |
| **Exam countdown** | Calendar-aware framing ("exam window opens in 6 weeks; 14 nodes recommended") | Uses `academic_calendars` |
| **Progress visibility** | Mastery ring and a days-practised streak, not score | Streak must have grace days and never be the primary loop (doc 03 §13). No ranking of individual children; class and school aggregates only. Reconciles doc 03 §11 |

### 15.2 Metrics (instrument from pilot day one)

Day-1 / day-7 / day-30 return · sessions per week · review completion rate · placement completion rate · time-to-first-mastery · nudge opt-in and opt-out rates.

### 15.3 Review rule

Any proposed engagement feature must be checked against `REJECTED_FEATURES.md` and justified in a decision record. The mastery predicate is never relaxed to improve these numbers.

---

## 16. 🔒 Safety, Privacy & Child Protection (added v2)

The plan serves minors. MagicSchool publicly states FERPA/COPPA compliance, a SOC 2 report, and no training on student conversations; schools will expect an equivalent posture.

### 16.1 Requirements

| Area | Requirement |
|---|---|
| **Legal basis** | Counsel to confirm obligations per country (Ghana, Sierra Leone, Nigeria data-protection laws) and for any US/EU users **before** pilot |
| **Minor consent** | Parental/school consent flow for under-age learners; school-mediated accounts for class use |
| **Data minimisation** | Collect only what the engine and teacher dashboard need; no precise location; no unnecessary contact data |
| **No model training** | Learner conversations and attempts are never used to train third-party models; contractual with the model provider |
| **Retention and deletion** | Defined retention periods; learner/parent deletion request path; attempt log exports |
| **Tutor guardrails** | Age-appropriate content moderation; refuse off-topic and unsafe requests; escalate safeguarding concerns per policy |
| **Free-text, photo and audio responses** | These are sent to a model for marking (doc 05 §3.11, §3.15, §3.16). Strip EXIF/location, reject images showing faces or names, set a retention limit, no model training, parental consent for voice, deletion on request |
| **Teacher access** | Teachers see only their own classes; RBAC enforced server-side (doc 10 §9) |
| **Security** | Encryption in transit/at rest; audit log for admin and teacher access to learner data; dependency scanning (existing CI gate) |
| **Incident response** | Documented breach process and contacts |
| **Transparency** | Plain-language privacy page for parents, teachers and learners |

### 16.2 CI and release additions

- Privacy review is part of Definition of Done for any feature touching learner data.
- Tutor safety test suite (jailbreak, self-harm, personal-data prompts) must pass before each tutor release.
- Data-protection impact assessment completed before first pilot school.

---

## 17. 🎯 Narrowed Launch Scope & Evidence Plan (added v2)

**Problem:** the v1 scope (~600 nodes, ~12K items, three countries) is large for a solo founder directing coding agents, and nothing is yet proven with real learners.

### 17.1 Phase 0 pilot (the only thing to ship first)

| Dimension | Scope |
|---|---|
| Country / board | Ghana · WAEC BECE |
| Subject / band | JSS2 Mathematics |
| Nodes | ~50 JSS2 nodes hand-seeded + AI-assisted, fully reviewed, **plus a prerequisite spine**: primary-level numeracy and fractions nodes so placement can find a frontier below JSS2. Spine size is set from a diagnostic of pilot learners; the test is that `placement_at_graph_floor` is near zero for them. *(v2: my first version of this scope omitted the spine; without it placement cannot do what the product promises. If you stay at the full JSS1–3 scope the same gap exists below JSS1.)* |
| Items | ≥ 15 per node (≥ 5 Tier 3), `reviewed`+ |
| Platform | Web + Android (offline-capable) |
| Users | 2 pilot schools, teachers onboarded via Teacher Toolkit |
| Features | Placement, practice, mastery gate, FSRS review, inline tutor, teacher dashboard |

Everything else in the plan stays specified but **not built** until Phase 0 exit criteria are met.

### 17.2 Phase 0 exit criteria

1. Placement completes for ≥ 85% of starting learners, without grade/rank display.
2. Observed success rate stays in the 0.72–0.86 band.
3. Day-7 return and review completion rates are measured and above an agreed floor.
4. Tutor open rate and post-tutor improvement measured (§13.3).
5. 30-day retrieval retention measured on mastered nodes, with a comparison group if feasible (per `rct-preregistration.md`).
6. Teacher feedback: toolkit used weekly by ≥ N teachers (set N before pilot).
7. No invariant violations; golden parity test green on the reference device.
8. (v2) `placement_at_graph_floor` below an agreed rate; `propagate_mastery_down` implemented with its vector.
9. (v2) Pilot sample sized in advance for the questions pre-registered in doc 03 §14. Item calibration (K-factor tiers at 50 and 200 responses, doc 04 §5.3) and misconception prevalence need response volume; 2 schools may not provide it, so state the expected responses per item before the pilot.

### 17.3 Cost reality check

The plan's **~$92 per framework** estimate covers model calls only. The dominant cost is **human review** of nodes, content and items and **curriculum-lead mapping review** (bulk approve is prohibited). Before scaling:

- Estimate reviewer-hours per node and per 100 items from Phase 0 actuals.
- Budget reviewer capacity as the constraint on expansion speed.
- Track review throughput in Content Studio (items reviewed per reviewer-hour).

### 17.4 Evidence plan

- Keep `rct-preregistration.md` current; do not change outcome definitions after data collection starts.
- Report negative and null results internally.
- Treat vendor-style efficacy claims as out of bounds until the pilot provides data.

---

## 18. 🚀 Roadmap (revised v2)

Phase 0 is intentionally narrow. Later phases are gated on its exit criteria.

| Month | Milestone | Deliverable |
|---|---|---|
| **M1** | Foundation | `/engine` skeleton + types, DB schema (incl. classes), Weaviate + Celery + Redis, admin scaffolding, **safety/privacy review started (§16)** |
| **M2** | Engine Core | Hand-verified mastery, Elo, selection, placement. Golden vectors. Simulation harness. |
| **M3** | Content Pipelines + Teacher Toolkit alpha | Pipelines A1/A2/B live. 50 nodes for JSS2 maths (Ghana) **plus the primary-level prerequisite spine (§17.1)**. **Toolkit: lesson plan + quiz builder on reviewed content.** |
| **M4** | Student App v1 + Classroom | Mobile + Web node reader (stack per doc 11), Block[] renderer, practice, progress. **Join codes, class dashboard MVP.** |
| **M5** | Adaptive loop + Embedded tutor | FSRS review, escalation, **inline tutor (§13)**, nudges (§15). Reference-device pass. |
| **M6** | **Phase 0 pilot** | 2 pilot schools; instrumented metrics; RCT start; DPIA complete. |
| **M7** | Pilot analysis | Phase 0 exit review. Fix content/engine issues surfaced. Decide: expand or iterate. |
| **M8+** | Expand (gated) | JSS1–JSS3 Maths + Integrated Science (~600 nodes) → Sierra Leone → Nigeria → Primary / English / SS, per §10.9 order. |

---

### 18.1 Label translation (DR-008, decided 2026-11-18)

"Phase" was used in three senses. This table is the reference; the specs use the right-hand terms.

| Old wording | Sense | Now |
|---|---|---|
| Phase 0 pilot, Phase 0 exit | Pilot scope | Unchanged; = M6 (pilot) and M7 (exit review) |
| Phase 2 Sierra Leone, Phase 3 Nigeria, Phase 4 Nigeria state boards, Phase 5+ | Market expansion order (§10.9) | E2, E3, E4, E5+, all inside M8+ |
| "Elo (Phase 1)", "BKT (Phase 3)", "refit at Phase 3" | Algorithm maturity | "v1 algorithm", "future, triggered by data volume", "at >= 500k reviews" |
| "Phase 1 target ~150 misconceptions" | Content maturity | "pilot target" |
| "Phase 4" item types (geometry, reading fluency) | Content scope | "not scheduled" |

---

## 19. 🎯 What This Buys You (revised v2)

| Benefit | How |
|---|---|
| **Expansion is content, not engineering** | Canonical graph + framework config = new board is rows, not code |
| **Consistent quality** | Human review + SymPy verification + dedup + CI gates |
| **Determinism** | Pure engine, byte-identical across client and server |
| **Mastery that means something** | Two-session non-consecutive gate encodes the spacing effect |
| **Diagnostic depth** | ~150-misconception taxonomy with measured prevalence |
| **Teacher distribution** | Free Toolkit as wedge; classroom dashboard keeps humans in the loop |
| **Tutor that gets used** | Inline, engine-triggered, misconception-seeded |
| **Trust** | Safety/privacy spec before pilot |
| **Realistic cost model** | Model cost ~$92/framework **plus** budgeted human-review time |
| **Defensible moat** | Canonical graph + curated item bank + misconception prevalence ≠ ChatGPT wrapper |

---

## 20. ✅ Next Actions (revised v2)

**Immediate (this week):**

1. Create `/engine` skeleton with `state.ts` types
2. Hand-write `mastery.ts` + `elo.ts` + `selection.ts` against doc 04 §4–6
3. Write golden vectors in `/engine/testdata/` (doc 04 §12)
4. Migrate DB to canonical schema (skill_nodes, frameworks, items, attempts)
5. Stand up Weaviate + Celery + Redis
6. **Decide Phase 0 scope in writing (§17.1) and freeze everything else**
7. **Book legal/data-protection advice for Ghana pilot (§16)**

**Sequenced (weeks 2–8):**

8. Simulation harness (10k learners, 12 weeks)
9. Content pipelines A1/A2/B skeleton
10. 15 hand-crafted items across 5 types (validation of item contract)
11. Content Studio scaffolding (review queue + coverage dashboard + reviewer throughput)
12. Mobile + Web node reader with Block[] renderer (stack per doc 11)
13. First framework import (single board, full Pipeline C)
14. **Teacher Toolkit alpha: lesson plan + quiz builder (§12)**
15. **Classes, join codes, teacher dashboard MVP (§14)**
16. **Inline tutor with `offer_tutor` decision and vectors (§13)**
17. **Nudge service tied to FSRS due dates (§15)**
18. **Recruit 2 pilot schools and set success thresholds (§17.2)**
19. **Decide the pilot's content scope: add the prerequisite spine or change the placement promise (§17.1; doc 04 Decisions Needed)**
20. **Implement `propagate_mastery_down` and the new doc 04 v2 vectors before any learner is placed (§7.3, §7.6)**

**Ongoing:**

- Hand-verify every `/engine` predicate against test vectors before trusting agent-generated code
- Reference device on the desk from day one
- CI gates enforced from the first commit, not added later
- Re-benchmark competitors each quarter (MagicSchool, Khanmigo, any new entrants)

---

## 21. 📎 Appendix — v2 Repository & CI Additions

### 21.1 New repository paths

```
backend/app/
├── db/models/classroom.py              # Class, ClassMember, Assignment
├── schemas/classroom.py
├── api/classes.py                      # create class, join, roster, assignments
├── api/teacher_tools.py                # lesson plan, quiz, mock paper, remediation set
├── services/teacher_toolkit.py         # reads reviewed content/items only
├── services/nudges.py                  # FSRS-driven reminders (opt-in)
├── services/tutor_session.py           # seeded, grounded, SymPy-checked tutor
├── ai/prompts/tutor_inline.py
└── ai/prompts/teacher_tools.py

web/src/app/(teacher)/
├── dashboard/page.tsx
├── classes/[class_id]/page.tsx
└── toolkit/page.tsx

web/components/tutor/InlineTutor.tsx    # replaces side-panel as primary tutor surface
mobile/lib/screens/teacher/             # later phase
docs/
├── 12-teacher-product-spec.md
├── 13-safety-and-privacy-spec.md
└── decisions/                          # DR-001 … DR-018
```

### 21.2 New CI / quality gates

- **Toolkit gate:** teacher tools may only read items at `reviewed` or beyond.
- **Tutor safety gate:** tutor safety test suite passes before release.
- **Tutor math gate:** tutor numeric claims verified by SymPy in tests.
- **Classroom isolation gate:** classes/assignments code never writes `learner_node_state`.
- **Privacy gate:** features touching learner data require a completed privacy checklist.
- **Engine vector:** `tutor_offer_triggers.json` added to `/engine/testdata/`.

### 21.3 Updated Definition of Done additions

- [ ] Privacy checklist completed if learner data is touched
- [ ] Dignity constraint verified for any teacher- or parent-facing view
- [ ] Engagement feature checked against `REJECTED_FEATURES.md`
