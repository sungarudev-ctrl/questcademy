# 09 — Authoring Rules

**Owner:** Curriculum lead · **Change control:** strict — these rules restate decisions owned by docs 02, 03 and 05; they never alter them
**Version:** v1 (2026-11-18) — first write of a document cited by docs 02, 03 and 05 and by tasks.md (Task 16 §16.3). Open points are in *Decisions Needed* and marked **PROPOSED**. Individual decisions carry their own status in the Decisions section. Decisions resolved 2026-11-18 (see the Decisions section; DR-019).

> For the people and the prompts that author nodes, content, items and localizations. Each rule names the document that owns it; if this document and an owner document disagree, the owner document wins and this one is wrong.

**Reading order.** doc 02 §2 (nodes), doc 05 §1 to §10 (items), doc 03 §7, §8, §10 (why worked examples, load and misconception teaching are authored this way). Evidence for those rules is in doc 03 §15; read it before authoring begins (doc 03 §15).

**"Enforced by"** columns say what stops a violation today, verified against the code on 2026-11-18. *Human review* means no code checks it. The AI pipelines that apply these rules are specified in doc 08.

---

## 1. Scope, roles and approval

### 1.1 Who authors and who approves

| Role | Authors / reviews | Cannot | Source |
|---|---|---|---|
| Curriculum lead | Skill graph, framework import, mappings, localization briefs (with in-country reviewer), activation | Author items without review; bypass no-bulk-approve | doc 02 §9; tasks.md Task 16 §16.1 |
| Reviewer | Reviews nodes, content, items, localizations, mapping proposals | Activate a framework; change the skill graph | tasks.md Task 16 §16.1 |
| Localizer | Briefs and overrides for one framework | Touch canonical content or base items | tasks.md Task 16 §16.1 |
| Authoring assistant | Hand-written content outside the AI pipeline | Approve own work | tasks.md Task 16 §16.1 |
| Content admin | Jobs, retries, cost reports | Approve anything | tasks.md Task 16 §16.1 |

Until a separate curriculum lead exists, one person may hold several roles. Record each action under the role it was taken in, and keep the in-country reviewer for grade bands and localization briefs separate from the author of the brief (doc 02 §9).

### 1.2 What AI may and may not do

AI-authored nodes, content, items, localizations and mapping proposals enter as drafts. Human approval is per object; bulk approval is prohibited and refused by the API (doc 02 §9; doc 08 §1, AI-8, AI-9). A reviewer applies every rule in this document to AI output exactly as to hand-written output.

---

## 2. Node authoring

### 2.1 Atomicity test (doc 02 §2.1)

A node is correctly sized if **all** hold:

| # | Criterion | Enforced by |
|---|---|---|
| 1 | Taught and practised in 8–15 minutes | `validate_node_atomicity` rejects `est_minutes` outside 8–15 (`backend/app/ai/pipelines/node_pipeline.py`) |
| 2 | A single, statable mastery criterion | Prompt rule 2 (`shared/prompts/v1/node_authoring.md`); human review |
| 3 | A learner can fail it for exactly one reason class | Human review |
| 4 | At least two distinct named misconceptions | `validate_node_atomicity` rejects fewer than 2 |

Rule of thumb (doc 02 §2.1): if you cannot write 20 meaningfully different items, the node is too fine; if you cannot state one mastery criterion, it is too coarse. The pipeline checks the first as `candidate_item_capacity >= 20`, a number the model reports about itself; it is not stored on the node and no code verifies it.

| Too coarse | Correct | Too fine |
|---|---|---|
| "Fractions" | "Add fractions with unlike denominators" | "Add fractions with denominators 3 and 4" |
| "Algebra" | "Solve one-step linear equations by inverse operation" | "Solve x + 5 = 12" |

### 2.2 Identity and naming (doc 02 §2.3)

- `node_id` is `SUBJECT.DOMAIN.SPECIFIC_SKILL`, screaming snake (e.g. `MATH.FRAC.ADD_UNLIKE`).
- Node IDs are **never reused and never renamed**. To retire a node set `status: deprecated` and `superseded_by` (doc 02 §2, §2.3).
- `title` is teacher-facing and precise; `learner_title` is learner-facing and plain (doc 02 §2).
- Enforced by: node pipeline reuses an existing id instead of creating a duplicate; the pattern itself is human review (see Decisions Needed 3).

### 2.3 Grade, topic, prerequisites

- A node never carries a grade level. `grade_band_hint` (e.g. `P5-JSS1`) is a placement seed only and non-authoritative (doc 02 §1, §2). Grade bands live on the framework (doc 02 §3.2).
- `topic` and `subtopic` are navigation, not dependency. Prerequisites decide engine behaviour; if topic order and prerequisite order disagree, prerequisites win (doc 02 §2).
- Prerequisites: hard or soft; at most 3 hard per node (more usually means the node is too coarse); acyclic; depth from the root should not exceed 40 (doc 02 §2.2). A prerequisite change needs curriculum lead approval and engine test-vector review (doc 02 §9).
- Hard prerequisites gate availability (doc 04, I-1); use sparingly.

### 2.4 Status and approval

`draft → review → live → deprecated` (doc 02 §2). A new canonical node needs curriculum lead approval; deprecation needs a migration plan for affected learners (doc 02 §9). AI-authored nodes arrive as `draft` (doc 08 §3.1).

---

## 3. Content authoring

Applies to `skill_node_content` (lesson content), canonical or localized.

| Rule | Detail | Source | Enforced by |
|---|---|---|---|
| C-1 | Content is built from the 17-block model (`Block[]`), the same primitives as items | doc 05 §1 (Universal rules) | Partly. `content_canonical.json` requires only a `type` on each block and uses `text` / `latex` fields where doc 05 §1 defines `content` / `katex` (Decisions Needed 9). `scripts/ci/check_canonical_renderers.py` only keeps a single renderer |
| C-2 | At least 3 worked examples, from foundational to application | plan §3.2; `content_canonical.md` rule 2 | `generate_content_canonical` raises `ContentValidationError` below 3 |
| C-3 | All mathematics in KaTeX; no bare ASCII fractions | plan §3.2; `content_canonical.md` rule 3 | Prompt only; no KaTeX parse check exists (doc 08 §3.2) |
| C-4 | Reading level at least 2 years below the target grade (A-3), mathematics and science | doc 05 A-3 | Flesch-Kincaid on the **summary** only (§4.5) |
| C-5 | `common_mistakes` addresses each named misconception: the incorrect belief and the corrective rationale | `content_canonical.md` rule 4; doc 03 §10 | Prompt; human review |
| C-6 | Canonical content is country-agnostic: no hard-coded currency, local names or alien contexts (snow, subway, Thanksgiving). Local colour belongs in an override | doc 02 L-1, L-5; `content_canonical.md` rule 5; doc 05 §10 | Prompt; human review |
| C-7 | Images carry alt text describing the mathematics; audio blocks carry a transcript; video is never the only way to learn a skill and never in the default delivery path | doc 05 §1 (Block rules), §6 | Schema fields required in doc 05 §1; human review |
| C-8 | A `CheckBlock` is not an item: ungated, no scoring, no Elo, no mastery. Do not use it where an assessment is meant | doc 05 §1 | Human review |
| C-9 | Do not publish teacher-facing text from a source syllabus of unknown licence status | doc 02 §6 | Human (stage 1 provenance record) |

Status flow `draft → review → published → archived` (plan §6.1). Plan §6.1 also lists auto-reject conditions (SymPy disagreement, under 300 words, cosine under 0.15 against existing content, Flesch-Kincaid above grade + 3, KaTeX parse failure); of these only the worked-example count and a reading-level check are in code (doc 08 §3.2). See Decisions Needed 4.

---

## 4. Item authoring

### 4.1 The universal item rules (doc 05 §1)

Restated; doc 05 owns the wording.

| ID | Rule (summary) | Owner | Enforced by |
|---|---|---|---|
| A-1 | One item maps to exactly one node | doc 05 §1 | Schema: `items.node_id`; human review for two-skill items |
| A-2 | Every selectable wrong answer carries a `misconception_id`. **Hard CI gate** | doc 05 §1 | `validate_item` (types `mcq_single`, `mcq` only) in `backend/app/ai/tools/validator.py`; `POST /items/{id}/approve` refuses any payload with an untagged non-correct option (`backend/app/api/admin.py`) |
| A-3 | Stem reading level at least 2 years below target grade; mathematics and science only (ELA exempt) | doc 05 §1 | `validate_item` (§4.5) |
| A-4 | Answerable in at most 90 s at Tier 1–2, 180 s at Tier 3 | doc 05 §1 | Human review; latency flag after launch (doc 05 §7) |
| A-5 | Media is SVG or WebP; at most 40 KB per item | doc 05 §1 | `validate_item` checks `media_bytes <= 40960`; format is human review |
| A-6 | `offline_capable = false` items stay out of the mastery path | doc 05 §1 | Selection (doc 04); not an authoring check |
| A-7 | No meaning carried by colour alone | doc 05 §1, §6 | Human review |
| A-8 | No negatively worded stems ("Which is NOT…") below JSS3 | doc 05 §1 | Human review |
| A-9 | `printable = true` only for types that render and answer on paper; teacher quizzes draw only printable items at `reviewed` or beyond | doc 05 §1 | `validate_rule_a9` exists but no pipeline calls it |
| A-10 | `worked_solution`, and any hint or tutor content that reveals the answer, is not shown while the item is live | doc 05 §1 | Delivery (client); `validate_rule_a10` exists, not called by a pipeline |
| A-11 | Each node has at least 2 Tier-3 items that are auto-marked and offline-capable | doc 05 §1 | `validate_rule_a11` exists, not called by a pipeline |

`printable` is author-set or derived: undecided (DR-013, PROPOSED).

### 4.2 Distractor rules (doc 05 §3.1, §3.3, §10)

*(Cited as "doc 09 §4" by doc 05 §3.1.)* For MCQ and any type with selectable wrong answers.

| ID | Rule | Source | Enforced by |
|---|---|---|---|
| D-1 | Every distractor carries a `misconception_id`. No exceptions, no filler | doc 05 A-2, §3.1 | `validate_item` (`mcq_single`/`mcq`): missing id is an error; **Hard Gate A-2** wording appears in the error text |
| D-2 | The id has the form `DOMAIN.SPECIFIC_BELIEF`: upper-case letters and digits, dot-separated, underscores after the first dot | doc 05 §9 (ID scheme); `validator.py` `MISCONCEPTION_ID_REGEX` | `validate_item`; regex `^[A-Z0-9]+(?:\.[A-Z0-9_]+)+$` |
| D-3 | The id should be one of the node's named misconceptions (the taxonomy) | `item_generation.md` rule 1; doc 05 §9 | Prompt only. The validator checks the pattern, not membership in the taxonomy or the node's list; reviewers must check |
| D-4 | A distractor is the answer a learner **would actually produce** under the named belief. Never filler, never "obviously wrong" ("banana") | doc 05 §3.1, §10 | Self-evaluation prompt scores "diagnostic depth" (`self_evaluation.md`); human review |
| D-5 | Exactly 4 options at JSS level; 3 for lower primary | doc 05 §3.1 | Prompt (`item_generation.md` rule 6, secondary/JSS); not machine-checked |
| D-6 | No "all of the above" or "none of the above" | doc 05 §3.1, §10 | Human review |
| D-7 | Distractors are similar in length and form to the key; learners pattern-match on the longest option | doc 05 §3.1, §10 | Prompt rule 6; human review |
| D-8 | The key's position is shuffled at render (`shuffle: true`), seeded per learner so it is stable on re-render | doc 05 §3.1 | Renderer |
| D-9 | Each distractor's `misconception_id` is kept unchanged in any localized `payload_override` | `item_localization.md` rule 4; doc 02 L-5 | Prompt; reviewer at localization approval |
| D-10 | For numeric items, author `anticipated_errors` (`value` + `misconception_id`) for every item. It recovers diagnostic power without a guessing floor | doc 05 §3.3 | Human review; not checked by `validate_item` |
| D-11 | A distractor chosen by fewer than 3% of learners (n ≥ 50) is flagged non-functional and revised | doc 05 §7 | Post-launch statistics |
| D-12 | A misconception is a belief, not a mistake. "Careless error" is not a valid tag; if you cannot state the incorrect rule being consistently applied it does not belong | doc 05 §9 | Human review (§5) |

Learner-facing names for misconceptions are never shown as "your error" (doc 05 §9). The item pipeline records one `item_misconceptions` row per tagged distractor (`backend/app/ai/pipelines/item_pipeline.py`).

Gap to know about: doc 05 A-2 covers every selectable wrong answer, which includes multi-select (§3.2) and matching/categorization options; today the validator's A-2 check runs for `mcq_single` and `mcq` only, and the approval endpoint checks any payload with an `options` list. See Decisions Needed 5.

### 4.3 Bank composition and the publish bar (doc 05 §8)

*(Cited as "doc 09 §4.3" by doc 05 §8.)*

| Measure | Value | Owner |
|---|---|---|
| Serve floor (runtime) | 8 items, at least 2 at Tier 3, of which at least 2 auto-marked and offline-capable (A-11). Below it the engine emits `content_gap` | doc 05 §8; doc 04 §6.3 |
| **Publish bar** (build) | **15 published items and at least 5 at Tier 3** per node | doc 05 §8; doc 10 §5; `coverage_service.check_node_item_threshold` |
| "Published" | Status `reviewed`, `piloted`, `live`, `calibrating` or `calibrated`. Not `draft`, `generated`, `tagged`, `revision`, `retired` | doc 05 §7 |
| Phase 1 target per node | Tier 1: 8–12; Tier 2: 8–12; Tier 3: 5–8 | doc 05 §8 |
| Type mix across the bank | MCQ 45%, numeric 20%, cloze/table 12%, matching/ordering 8%, number line 6%, short response 6%, other 3% | doc 05 §8; plan §3.3 |

The serve floor and the publish bar are different numbers on purpose (doc 05 §8). Coverage counts an objective only when every node it maps to meets the publish bar (doc 02 §6 stage 9; doc 08 §3.6).

### 4.4 Tiers (doc 05 §2)

| Tier | Definition | Target p-value |
|---|---|---|
| 1 Recognition | Single step, familiar surface, easy numbers | 0.75–0.90 |
| 2 Fluency | Single skill, unfamiliar surface or awkward numbers | 0.55–0.75 |
| 3 Transfer | Same skill in a novel context or multi-step problem. Mastery needs at least one correct Tier-3 | 0.35–0.60 |

Tier 3 is not harder arithmetic: uglier numbers produce Tier 1 with more slips (doc 05 §2, §10). Tier is authored intent; an item whose live Elo ends up more than 400 from its seed (`node.difficulty_elo` + tier offset T1 −285, T2 −115, T3 +20) is mis-authored (doc 05 §2, §7; `check_item_quality_threshold` exists but no pipeline calls it).

### 4.5 Reading level (A-3)

| Aspect | Rule | Source |
|---|---|---|
| Target | At least 2 years below the target grade. We assess the subject, not English | doc 05 A-3 |
| Applies to | Mathematics and science. For ELA, reading level is the construct and A-3 does not apply | doc 05 A-3 |
| Measure | Flesch-Kincaid grade, `0.39·(words/sentences) + 11.8·(syllables/words) − 15.59`; `$…$` maths replaced by the word "math"; a single sentence of 6 words or fewer scores 2.0 | `compute_flesch_kincaid_grade` in `validator.py` |
| Threshold | FK grade of the **stem** must not exceed `target_grade − 2`, with grade-band mapping P4=4, P5=5, P6=6, JSS1=7, JSS2=8, JSS3=9, SSS1=10, SSS2=11, SSS3=12 (default JSS2 = 8) | `GRADE_BAND_TO_GRADE` in `validator.py` |
| Subjects checked | `maths`, `mathematics`, `science`, `integrated_science`, `physics`, `chemistry`, `biology` | `validate_item` |
| What is not checked | Options, hints and worked solutions (the prompt asks that options also meet the rule, `item_generation.md` rule 4); content is checked on the summary only | Human review |

The grade used is the node's `grade_band_hint`, which is non-authoritative (doc 02 §2). Plan §6.1 gives a different content threshold (FK above grade + 3 auto-rejects); see Decisions Needed 4.

### 4.6 Hint rules (doc 05 §5)

Exactly **3** hints, one per level, in order. Precomputed at authoring and shipped in the bundle.

| Level | Purpose | Rule |
|---|---|---|
| 1 Orient | Points at what to notice | Must not restate the method |
| 2 Method | Names the procedure | Must not do the arithmetic |
| 3 Partial work | Does the first step | Must leave the final step to the learner; **must not give the answer** |

- Shape: `Hint { level: 1|2|3, content: Block[], misconception_id?: string }`; `hints` holds exactly the 3 generic hints (null `misconception_id`). Misconception-targeted variants are added in `hint_variants`, additive and not required to ship (doc 05 §1, §5).
- Where the wrong answer is known, a learner who picked a tagged distractor gets a hint targeting that belief (doc 05 §5).
- A hint that reveals the answer is not shown while the item is live (A-10).
- Enforced by: `validate_item` requires `len(hints) == 3` and levels `[1, 2, 3]`; the generation schema fixes `minItems = maxItems = 3`. The content of each level is judged by the self-evaluation prompt ("hint progression") and by human review.
- Level 3 exhausted and still wrong is the designed route to the tutor (doc 05 §5; doc 04 §9.1; doc 08 §4.1).

### 4.7 Type-specific authoring rules (selection)

| Type | Rule | Source |
|---|---|---|
| Numeric entry | State the tolerance explicitly; accept equivalent forms unless the skill is form conversion; decimal separator follows the locale (DR-014, PROPOSED) | doc 05 §3.3 |
| Numeric entry | The final number in `worked_solution` must agree with `payload.answer` within tolerance (SymPy) | `validate_item`; heuristic: it takes the last number in the text |
| Short constructed response | Rubric criteria with marks; at least 3 real exemplars per band (full, partial, zero) or the item must not ship; `misconception_indicators`; spelling, grammar and handwriting never affect a mathematics mark | doc 05 §3.11 |
| Structured multi-part | Each part may map to a different node; error carried forward is required | doc 05 §3.12 |
| Photo / audio | Not on the mastery path / consent and retention rules apply | doc 05 §3.15, §3.16 |
| All types | Alt text, `speech_text` where notation is ambiguous, touch targets, keyboard operation | doc 05 §6 |
| Scoring | No negative marking, ever | doc 05 §4 |

### 4.8 Item lifecycle and who moves it (doc 05 §7)

`draft → generated → tagged → reviewed → piloted → live → calibrating → calibrated`, with `revision` and `retired`. `localized` is not a status. AI-generated items enter as `tagged` (distractors carry misconception IDs) and are never served until a reviewer approves them to `reviewed` (doc 05 §7; `POST /items/{id}/approve`, which also refuses untagged distractors). An item with no named exemplars (short response) does not ship (§4.7).

### 4.9 Item anti-patterns (doc 05 §10)

Filler distractors; two skills in one item; reading level above target; "all of the above"; a key noticeably longer than distractors; trick questions; culturally alien contexts (snow, subway, Thanksgiving); Tier 3 as uglier numbers; negative stems below JSS3; short response without exemplars.

---

## 5. Misconception authoring (doc 05 §9)

| Rule | Detail | Enforced by |
|---|---|---|
| M-ID | `DOMAIN.SPECIFIC_BELIEF`, screaming snake, stable forever (e.g. `FRAC.ADD_NUM_DEN`) | Regex in `validator.py`; creation in `node_pipeline.py` |
| M-Belief | A misconception is a belief with a statable incorrect rule, not a slip | Human review |
| M-Fields | `id`, `domain`, `description`, `learner_facing_name` (never shown as "your error"), `prevalence`, `affected_nodes`, `remediation_id`, `typical_origin` | doc 05 §9. The pipeline creates `description` and `learner_facing_name` only; `prevalence` stays null until response volume exists |
| M-Count | Every node has at least 2 named misconceptions (atomicity criterion 4) | `validate_node_atomicity` |
| M-Reuse | Reuse an existing id for the same belief; the pipeline links an existing misconception instead of creating a duplicate | `node_pipeline.py` |
| M-Scope | The ~150 target is mathematics only; other subjects need their own domains and targets | doc 05 §9 |

---

## 6. Localization rules

Localization is an **overlay on approved content, never a fork** (doc 02 §10).

| ID | Rule | Source | Enforced by |
|---|---|---|---|
| L-1 | An item or content section exists once. A framework may hold an override in `item_localizations` or `content_localizations`; the base is never copied | doc 02 L-1; plan §2.10 | Schema (override tables keyed by `framework_id`) |
| L-2 | `country_code` exists on the framework and nowhere else in the content layer: never on nodes, items, node content or misconceptions | doc 02 L-2; plan §2.9 | `scripts/ci/check_country_isolation.py` |
| L-3 | Any override that changes a numeric answer must be SymPy-verified; the build fails otherwise | doc 02 L-3 | `verify_math_invariance` in the pipelines and again at approval (`admin.py`); `scripts/ci/check_math_invariance.py` |
| L-4 | The localization brief is written **before** localization starts and is refreshed by the localization-refresh pipeline | doc 02 L-4, §6 stage 8 | Process; Pipeline D (doc 08 §3.5) |
| L-5 | Localization changes context (currency, names, settings), never the skill, the difficulty tier or the mastery criterion | doc 02 L-5 | Human review at approval |

### 6.1 Applying the rules

- **Math invariance.** Every number, equation, coefficient, step and answer is unchanged between base and localized form. Numbers are compared in order; `$…$` expressions are compared for algebraic equivalence (`sympy_solver.py`). The comparison is a heuristic (doc 08 Decisions Needed 9): reviewers still read the override.
- **Sparse overrides.** Override only sections that carry local context (money, personal names, geography). Pure derivations and abstract formulas are not overridden. An item with no local context gets no override (`content_localized.md` rule 1; `item_localization.md` rule 2; plan §5.5: "If a section contains no localizable context, do not override it").
- **Brief adherence.** Use only names, foods, cities, currencies and scenarios allowed by the framework's brief; nothing on its `avoid` list (`content_localized.md` rule 3; `localization_refresh.md` rule 2). No code scans for `avoid` terms.
- **Diagnostics survive.** Keep each distractor's `misconception_id` (D-9).
- **Reading level survives.** An override meets A-3 like the base.
- **Review.** Overrides are staged `pending`; learners see only `approved` overrides; a reviewer approves each override, and a math-bearing override is re-verified at approval (doc 02 §9; doc 08 §1, AI-8, AI-11). Bulk approval is prohibited.
- **Base stays valid.** If no override exists, the base item is served unchanged (plan §2.10).
- **Subject scope.** The "mathematics is the same everywhere" claim holds for maths and most science. ELA is a separate graph per language variety (doc 02 §1).
- **Decimal separator and locale.** Locale-driven (doc 05 §3.3; DR-014, PROPOSED). en-GH, en-NG, en-SL and en-US use `.` as the decimal separator and `,` as a thousands separator (doc 05 §3.3).
- **Naming.** Use one verified `label_local` per exam in the UI (doc 02 §8).

---

## 7. Country context guide (localization brief)

*(Cited as "doc 09 §7" by doc 02 §6 stage 8.)*

### 7.1 Purpose and ownership

The brief is the country-specific authoring guide that localization reads. It is written at stage 8 of the import pipeline, ahead of coverage, because it is an input to localization of items (doc 02 §6). It is authored by the curriculum lead and approved by an in-country reviewer who is not its author (doc 02 §9). It is keyed by `framework_id`, one row per framework (`localization_briefs`, plan §2.11; `backend/app/db/models/framework.py`). A change to a brief triggers Pipeline D (doc 02 L-4).

### 7.2 Fields

| Field | `localization_briefs` column | Plan §5.5 `LOCALIZATION_CONTEXT` | Meaning / how to fill it |
|---|---|---|---|
| Framework | `framework_id` (PK, FK) | — | The framework the brief serves, e.g. `gh_bece_math_2024` |
| Country name | not on the brief (`countries.name`) | `{country_name}` | Taken from the country row |
| Currency | `currency` (text, required) | `{currency}` | The currency used in word problems. See Decisions Needed 1 on code vs symbol |
| Common names | `common_names` (list, required) | `{common_names}` | First names allowed in word problems |
| Cities | `cities` (list, required) | `{cities}` | Preferred places for scenarios |
| Foods | `foods` (list, required) | `{foods}` | Foods that may appear in scenarios |
| Units preferred | `units_preferred` (JSON object, required) | `{units_preferred}` | Mapping from quantity to unit, e.g. `{"length": "cm", "mass": "kg"}` |
| Avoid | `avoid` (list, required) | `{avoid}` | Contexts that must not appear (examples in the sources: snow, subway, Thanksgiving) |
| Scenario bank | `scenario_bank` (JSON list, required) | — (pre-approved contexts) | Pre-approved word-problem contexts; content localization is limited to these (`content_localized.md`) |
| Updated | `updated_at` | — | Set on change |
| Rules block | — | The `RULES` list in §5.5 | Replace placeholder context with values from the lists; never change the mathematics, answer or skill; do not override a section with no localizable context |

Related reference data: `localization_tokens` holds per-framework key/value pairs (`currency`, `common_name`, `city`; plan §2.10) that the item pipeline reads, while the content pipeline reads the brief. Keep the two consistent until Decisions Needed 2 is resolved.

### 7.3 Template

```yaml
# localization brief — one per framework (doc 09 §7). All fields required.
framework_id: <framework_id>            # e.g. gh_bece_math_2024
country: <country_name>                 # from the countries row
locale: <locale>                        # e.g. en-GH (countries.default_locale)
currency: <currency>                    # see Decisions Needed 1: code or symbol
common_names: [<name>, ...]
cities: [<city>, ...]
foods: [<food>, ...]
units_preferred: { length: <unit>, mass: <unit> }
avoid: [<context>, ...]                 # contexts that must not appear
scenario_bank:
  - { title: <title>, context: <one-line scenario> }
authored_by: <role + person>            # curriculum lead or localizer
reviewed_by: <in-country reviewer>      # must differ from author (doc 02 §9)
sources: <where each list came from>    # provenance for every list
```

Rules for filling it:

1. Every list value comes from a person or source who knows the country; record the provenance. Do not add a value because it sounds plausible.
2. Include in `avoid` the culturally alien contexts the specs already name (doc 05 §10) plus anything the in-country reviewer adds.
3. Every `scenario_bank` entry must be usable without changing the mathematics.
4. An empty required list is a review failure, not a default.
5. After approval, run Pipeline D to refresh existing overrides (doc 08 §3.5).

### 7.4 Worked example: Ghana (`gh_bece_math_2024`)

Every value below appears in the repository, and only in places that are examples or test fixtures: the plan's token examples (plan §2.9, §2.10), the Ghana worked example in doc 02 §7, `backend/tests/integration/test_pipeline_end_to_end.py` and `backend/tests/unit/pipelines/test_content_localized.py`. **None has been reviewed by an in-country reviewer. All are PROPOSED**; they show the shape of a finished brief and are not an approved Ghana brief.

| Field | Value | Where it appears |
|---|---|---|
| `framework_id` | `gh_bece_math_2024` | doc 02 §7 |
| country / board | Ghana (`GH`), WAEC (Ghana), `exam_board`, mathematics | doc 02 §7 |
| locale | `en-GH` | plan §2.9; doc 05 §3.3 |
| currency | `GHS` (ISO code) in the brief fixtures; `₵` as a token value | `GHS` in `test_pipeline_end_to_end.py`, `countries.default_currency` example in `framework.py`; `₵` in plan §2.10 |
| common_names | Kofi, Ama, Kwame | `test_pipeline_end_to_end.py`; `Ama` also in plan §2.10 |
| cities | Accra, Kumasi (fixture A); Accra, Kumasi, Tamale (fixture B) | `test_pipeline_end_to_end.py`; `test_content_localized.py`. `Accra` also in plan §2.10 |
| foods | kenkey, jollof | `test_pipeline_end_to_end.py` |
| units_preferred | `{length: cm, mass: kg}` | Generic example in plan §2.11 and the fixtures; not Ghana-specific |
| avoid | snow, subway (fixtures); Thanksgiving appears in the plan's `avoid` example and in doc 05 §10 | plan §2.11; doc 05 §10; fixtures |
| scenario_bank | `{ title: "Makola Market", context: "Trading goods in Accra" }` | `test_pipeline_end_to_end.py` |
| grade bands | JSS1 (ordinal 7), JSS2 (8), JSS3 (9) | doc 02 §7, §3.2 |
| decimal separator | `.`; comma is a thousands separator | doc 05 §3.3 |

Worked use (an illustration written for this document, not taken from a source). A base item "A trader buys 1/4 bag of rice and 1/2 bag of rice. How much rice altogether?" has no local context in its numbers. A Ghana override may change only the setting and names (for instance a market scene in Accra with Kofi as the trader) and must keep 1/4, 1/2 and the answer 3/4 unchanged, and keep each distractor's `misconception_id`. The test fixtures use this same pattern ("Kofi has 1/4 of an orange and Ama has 1/2 of an orange…", `test_item_pipeline.py`). The override is stored `pending` and is served only after a reviewer approves it.

### 7.5 Other countries

No other country's brief content is given here. The sources name the next markets (Sierra Leone, then Nigeria; doc 02 §8) and the currencies the prompt examples use, but a brief for any of them is authored through the process above, with an in-country reviewer. `docs/runbooks/framework-expansion.md` contains an illustrative draft brief for Nigeria; it is unreviewed, is not reproduced here, and must not be treated as approved. Nigeria's exam, grading scale and administering body differ from Ghana's (doc 02 §8), so a Ghana brief is never copied.

---

## Decisions (resolved 2026-11-18)

Recorded in [DR-019](decisions/DR-019-documentation-set-decisions.md), accepted on the owner's delegated instruction. `PROPOSED` markers earlier in this document that concern these items are superseded by the table below. Provisional rows are to be tuned from pilot data; OPEN rows need a named owner. Code and schema consequences are listed in [IMPLEMENTATION-FOLLOWUPS.md](decisions/IMPLEMENTATION-FOLLOWUPS.md).

| ID | Decision | Status |
|---|---|---|
| DD-09-1 | **Currency.** The brief stores both the ISO-4217 code and the symbol; the code is authoritative. | ACCEPTED |
| DD-09-2 | **Localization context source.** `localization_briefs` is the source; `localization_tokens` are materialised from it by one function. The item pipeline reads tokens. | ACCEPTED |
| DD-09-3 | **Node ID pattern.** Doc 02 §2.3 governs (`SUBJECT.DOMAIN.SPECIFIC_SKILL`); the node-authoring prompt is aligned to it. | ACCEPTED |
| DD-09-4 | **Reading level and auto-reject.** A-3 is the only reading-level rule; the 'FK above grade + 3' line in plan §6.1 is deleted. The 300-word minimum and the KaTeX parse failure stay as auto-reject conditions and are implemented in the content validator. | ACCEPTED |
| DD-09-5 | **Scope of A-2 check.** The validator checks every selectable wrong answer in every type that has one (multi-select, matching, categorization as well as MCQ). | ACCEPTED |
| DD-09-6 | **Misconception membership.** The validator confirms each `misconception_id` is on the node's misconception list. A hard gate. | ACCEPTED |
| DD-09-7 | **A-3 for options and hints.** The check covers the stem, options and hints. | ACCEPTED |
| DD-09-8 | **ELA and `printable`.** DR-012 and DR-013. | ACCEPTED |
| DD-09-9 | **Generated block shape.** The generation schema and chunker are aligned to doc 05 §1 (`content`, `katex`/`display`) and `type` is restricted to the 17 block types. | ACCEPTED |
| DD-09-10 | **Shared items.** As DD-08-5 and DD-08-9. | ACCEPTED |

---

## Change Log

**v1 — 2026-11-18**

- First version. Restates node, content and item rules with owner references and enforcement status; adds distractor rules (§4.2), the publish bar and composition (§4.3), reading-level and hint rules (§4.5, §4.6), misconception authoring (§5), localization rules (§6) and the localization brief template with a Ghana example (§7).
- Resolves the dangling citations to doc 09 in doc 02 §6 stage 8 (§7), doc 03 §15 (§1 to §7), and doc 05 §3.1 (§4.2) and §8 (§4.3), and the `docs/decisions/FINDINGS.md` dangling-references audit, item 3.

**Decision records:** DR-012, DR-013, DR-014 (all PROPOSED, related). New records are needed for Decisions Needed 1 to 7 and 9.
