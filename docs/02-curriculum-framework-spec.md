# 02 — Curriculum Framework Specification

**Owner:** Curriculum lead · **Change control:** strict — encodes the expansion architecture
**Version:** v2 (2026-11-18) — see §11 Change Log. Each change needs a decision record (Product Plan §9.6).

> Get this wrong and every new country is a fork rather than a config. This document defines the separation between what is universal (mathematics) and what is local (syllabi, calendars, grading, context).

---

## 1. The Three-Layer Model

```
┌──────────────────────────────────────────────────────┐
│  CANONICAL SKILL GRAPH        (per subject, global)  │
│  Atomic skills + prerequisites. Authored once.       │
└──────────────────────┬───────────────────────────────┘
                       │  objective_node_map  (many-to-many)
┌──────────────────────┴───────────────────────────────┐
│  CURRICULUM FRAMEWORK         (per board, versioned) │
│  BECE 2024 · WAEC 2025 · SL BECE                     │
│  Syllabus objectives, grade bands, weightings        │
└──────────────────────┬───────────────────────────────┘
                       │  scheduling
┌──────────────────────┴───────────────────────────────┐
│  ACADEMIC CALENDAR            (per country/school)   │
│  Terms, holidays, exam windows, year boundaries      │
└──────────────────────────────────────────────────────┘
```

**The load-bearing claim:** mathematics is the same everywhere. *(Scope, v2: this holds for mathematics and most of science. It does not hold for English language arts, which depends on English phonology and dialect. The canonical graph is therefore scoped per subject and, where needed, per language variety — e.g. `ELA.en-US` and `ELA.en-GH` are separate graphs. Never share an ELA node across language varieties unless a curriculum lead has confirmed the skill is invariant.)* "Add fractions with unlike denominators" is one node in Accra, Lagos, Freetown and Ohio. What differs is *when* a syllabus expects it, *how* it is assessed, and *what context* it is dressed in.

### What each layer owns

| Layer | Owns | Never owns |
|---|---|---|
| Canonical graph | Skills, prerequisites, difficulty, item bank | Grade levels, exam boards, dates |
| Framework | Objectives, mapping, grade bands, exam weighting, grading scale | Skill definitions, prerequisites |
| Calendar | Terms, holidays, exam dates, year rollover | Anything pedagogical |

**Violation to watch for:** a `grade_level` column appearing on `skill_nodes`. That is the fork beginning. Nodes carry a `grade_band_hint` for placement seeding only, and it is explicitly non-authoritative.

---

## 2. Canonical Skill Node

```
SkillNode {
  node_id          : string        # e.g. "MATH.FRAC.ADD_UNLIKE" — stable forever
  subject          : string
  title            : string        # teacher-facing, precise
  learner_title    : string        # learner-facing, plain
  description      : string
  grade_band_hint  : string        # "P5-JSS1" — placement seed ONLY
  prerequisites    : [{ node_id, type: hard | soft }]
  est_minutes      : int           # 8-15
  difficulty_elo   : int           # initial estimate, engine-maintained
  representations  : [string]      # area model, number line, symbolic...
  misconceptions   : [misconception_id]
  status           : draft | review | live | deprecated
  superseded_by    : node_id?      # set when status = deprecated
}
```

**Added 2026-07-30 — a real authoring gap, not originally specified:** `subject` alone is too broad to browse or author against (400+ nodes under "mathematics" with nothing between them and individual nodes). Two more fields, purely organizational:

```
SkillNode {
  ...
  topic            : string        # "Fractions" — author-facing grouping
  subtopic         : string?       # "Adding Unlike Denominators" — optional finer grouping
}
```

**These are navigation, not pedagogy — deliberately not wired into the engine or the mastery graph.** A node's *prerequisites* are the real dependency structure or mastery gating (doc 04); *topic/subtopic* is how a human author browses and sequences their own work, and the two can legitimately disagree — a node can prerequisite something from a different topic entirely. Don't let topic/subtopic silently become a second, competing dependency system. If topic ordering and prerequisite ordering conflict for a given node, prerequisites win for anything engine-facing; topic is purely a work-organization view.

**Assignments by topic (v2):** a teacher assigning a topic or subtopic (Product Plan §14) expands it into its member nodes, ordered by prerequisites. Topic is never an engine-facing dependency.

### 2.1 Atomicity test

A node is correctly sized if **all** hold:

1. It can be taught and practised in 8–15 minutes.
2. It has a single, statable mastery criterion.
3. A learner can fail it for exactly one reason class.
4. It has at least two distinct named misconceptions.

| Too coarse | Correct | Too fine |
|---|---|---|
| "Fractions" | "Add fractions with unlike denominators" | "Add fractions with denominators 3 and 4" |
| "Algebra" | "Solve one-step linear equations by inverse operation" | "Solve x + 5 = 12" |

**Rule of thumb:** if you cannot write 20 meaningfully different items for it, it is too fine. If you cannot state one mastery criterion, it is too coarse.

### 2.2 Prerequisite semantics

- **Hard** — cannot be attempted meaningfully without it. Gates availability (doc 04, I-1). A learner who cannot find an LCD cannot add unlike fractions. Use sparingly; every hard prerequisite is a potential blocker.
- **Soft** — helps, but not blocking. Used for ordering recommendations and placement propagation only.

**Rules:**
- Maximum 3 hard prerequisites per node. More usually means the node is too coarse.
- The graph MUST be acyclic. Validated at content build; asserted again at client load (I-7).
- Prerequisite depth from graph root SHOULD NOT exceed 40 for a K–12 subject. Deeper graphs make placement search expensive and gates brittle.

### 2.3 Naming

`SUBJECT.DOMAIN.SPECIFIC_SKILL`, screaming snake, stable forever.

```
MATH.FRAC.ADD_UNLIKE
MATH.FRAC.COMPARE_MAGNITUDE
MATH.ALG.SOLVE_ONE_STEP
MATH.GEO.ANGLE_SUM_TRIANGLE
```

**Node IDs are never reused, never renamed.** They appear in learner mastery history, item mappings and framework mappings. To retire a node, set `status: deprecated` and add a `superseded_by` pointer. Deleting a node orphans learner history.

---

## 3. Curriculum Framework Object

```
CurriculumFramework {
  framework_id     : string        # "gh_bece_math_2024"
  country          : ISO-3166
  board            : string        # WAEC, NaSCO, state, district
  subject          : string
  version          : string
  effective_from   : date
  effective_until  : date?
  status           : draft | active | superseded
  framework_type   : exam_board | standards_aligned     # v2
  grade_bands      : [GradeBand]
  objectives       : [SyllabusObjective]
  grading_scale    : GradingScale?     # owned here only; required for exam_board
  exam_structure   : ExamStructure?    # required for exam_board; optional for standards_aligned
}

SyllabusObjective {
  objective_id     : string        # official syllabus reference where one exists
  code             : string        # e.g. "JSS2.NUM.3.2"
  text             : string        # verbatim from the official syllabus
  grade_band       : string
  term             : int?
  exam_weight      : float?        # share of marks, where published
  mapped_nodes     : [node_id]     # many-to-many
  coverage_status  : full | partial | unmapped
}
```

### 3.1 Mapping rules

| ID | Rule |
|---|---|
| M-1 | One objective MAY map to many nodes. Syllabus objectives are typically coarser than our nodes. |
| M-2 | One node MAY serve many objectives, across frameworks and within one. |
| M-3 | An objective with zero mapped nodes is `unmapped` and MUST appear in the coverage report. It is a content backlog item, never silently ignored. |
| M-4 | A node with no objective in any active framework is **enrichment** — reachable, but never on an exam-critical path. |
| M-5 | Mapping MUST record `coverage_status`. `partial` means some sub-skill of the objective has no node yet. |
| M-6 | (v2) In a `standards_aligned` framework there is no exam-critical path. M-4's "never on an exam-critical path" applies to `exam_board` frameworks only. Objectives in a standards-aligned framework are weighted by grade-band expectation, not `exam_weight`. |

### 3.2 Grade bands

Grade band structures differ by country and MUST live in the framework, never on the node.

```
GradeBand {
  band_id      : string   # "JSS2", "Grade 7", "P5"
  ordinal      : int      # normalised 1..13 for cross-country comparison
  typical_age  : int
  label_local  : string   # what parents and teachers actually call it
}
```

The `ordinal` is the only cross-country comparable. Ghana JSS2 = Nigeria JSS2 = Sierra Leone JSS2 = ordinal 8. Use ordinals for analytics; use `label_local` for every user-facing string.

**Normative ordinal table (v2 — proposed, curriculum lead to confirm):** the original "normalised 1..13" range left Pre-K and Kindergarten without a slot and defined no 13th value. Replace it with:

| Ordinal | Meaning | Examples |
|---|---|---|
| -1 | Pre-K | US Pre-K |
| 0 | Kindergarten | US K |
| 1–6 | Years 1–6 of primary | Ghana/Nigeria/SL P1–P6; US Grades 1–6 |
| 7–9 | Junior secondary | JSS1–JSS3; US Grades 7–9 |
| 10–12 | Senior secondary | SS1–SS3; US Grades 10–12 |

Existing ordinals (JSS1 = 7, JSS2 = 8, JSS3 = 9) are unchanged. The range is -1..12; ordinal 13 is not defined.

### 3.3 Exam structure

```
ExamStructure {
  papers: [{
    paper_id, name,
    item_types  : [ItemType],     # doc 05 §3
    duration_min: int,
    marks       : int,
    calculator  : allowed | prohibited
  }]
}
```

`grading_scale` lives on the framework object only (v2: it was previously duplicated here). `exam_structure` is required for `exam_board` frameworks and optional for `standards_aligned` ones.

Drives mock exam generation (doc 01 §3.8) and predicted grades. **BECE and WAEC are heavily structured-response** — the exam structure is what forces item types 3.11 and 3.12 into the roadmap rather than leaving the bank MCQ-only.

**Mock papers (v2):** until structured-response item types ship (Product Plan expansion E3, M8+), generated mock papers can cover Paper 1 (objective) only. Teacher-facing mock papers must say so and must not be presented as a full BECE paper.

---

## 4. Academic Calendar

```
AcademicCalendar {
  calendar_id, country, year_label,
  terms: [{ term_number, start_date, end_date, name }],
  holidays: [{ start, end, name }],
  exam_windows: [{ framework_id, start, end, name }],
  year_rollover_date: date
}
```

**Calendars are keyed per country by default, and per school or district where the education system has no single calendar (the US).** `AcademicCalendar` therefore needs an optional `school_id`/`district_id`; a school-level calendar overrides the country calendar. (Product Plan §14 adds the `schools` table.)

Ghana's three-term year is a calendar row, not a code path — a future two-semester calendar for a non-WAEC market (Product Plan §10.9, §18) is the same schema, just different rows.

**Consumed by:**
- Exam-aware review compression (doc 04 §8.3) reads `exam_windows`.
- Parent digests suppress during holidays.
- Dose targets adjust for term breaks — do not report a learner as failing dose in week 2 of a holiday.
- Year rollover promotes class enrolments.
- (v2) Nudges and reminders respect holidays and quiet periods.
- (v2) The exam countdown ("exam window opens in N weeks") reads `exam_windows`.
- (v2) Teacher-generated mock papers use the framework's `exam_structure`, not a calendar default.

---

## 5. Versioning & Cohort Pinning

Syllabi change. Handle it as data, never as a migration.

### 5.1 Rules

| ID | Rule |
|---|---|
| V-1 | Frameworks are immutable once `active`. Changes create a new version. |
| V-2 | A learner is **pinned** to a framework version at enrolment and stays pinned, except by a recorded pin migration (V-6). |
| V-3 | A candidate sitting BECE 2027 studies `gh_bece_math_2027` even if a 2028 framework goes live mid-year. |
| V-4 | Mastery state lives on **canonical nodes**, so a framework change never destroys progress. |
| V-5 | Both versions may be active simultaneously. Different cohorts, different pins. |
| V-6 | (v2) A pin may change only through a recorded **pin migration** (country change, board change, or framework superseded). A migration never mutates learner mastery state (engine invariant I-11). A class never changes a learner's pin; if a learner's pin differs from their class framework, the teacher dashboard prompts a migration instead. |

**V-4 is the whole point of the abstraction.** A syllabus revision reshuffles which nodes are exam-relevant; it does not invalidate the fact that a child can add fractions.

### 5.2 Version diff report

On import of a new framework version, generate automatically:

- Objectives added → nodes needed? content gap?
- Objectives removed → nodes now enrichment-only
- Objectives remapped → grade band moved
- Weighting changes → exam-critical path shifts
- Coverage delta: % of objectives with ≥ 15 items at `reviewed` or beyond, before vs after

Review is mandatory before a new version reaches `active`.

---

## 6. Curriculum Import Pipeline

| # | Stage | Owner | Output |
|---|---|---|---|
| 1 | Acquire official syllabus | Curriculum lead | Source PDF, provenance **and licensing/reuse status** recorded |
| 2 | AI-assisted extraction | `CurriculumExtractor` (doc 08) | Structured objectives, verbatim text |
| 3 | Human correction | Curriculum lead | Corrected objective list |
| 4 | Auto-map to canonical nodes | `CurriculumMapper` (doc 08) | Draft mapping + confidence |
| 5 | Human mapping review | Curriculum lead | **Every mapping confirmed or corrected** |
| 6 | Gap identification | Automated | List of unmapped objectives |
| 7 | Node authoring | Curriculum lead | New canonical nodes |
| 8 | Localization brief | Curriculum lead | Country context guide (doc 09 §7). Moved ahead of coverage in v2: it is an input to localization of items. |
| 9 | Coverage report | Automated | % objectives with ≥ 15 items at `reviewed` or beyond |
| 10 | Publish | Content admin | `status: active` |

**Stage 5 is a hard gate.** AI mapping confidence is not sufficient — a wrong mapping silently teaches the wrong thing to an exam candidate. Every mapping is human-confirmed.

**Coverage counts items at `reviewed` or beyond (v2).** The original wording required calibrated items, which need 50 or more live responses and so could never exist before launch, making the 80% gate unreachable.

**Licensing (v2):** objectives are stored verbatim and now appear in teacher-facing lesson plans. Record the licence or reuse basis for each source syllabus in stage 1; do not publish teacher-facing text from a source whose status is unknown.

**Never publish a framework below 80% coverage.** A partially-covered framework promises exam preparation it cannot deliver.

---

## 7. Worked Example — BECE Mathematics (Ghana)

```yaml
framework_id: gh_bece_math_2024
country: GH
board: WAEC (Ghana)
framework_type: exam_board
subject: mathematics
grading_scale:
  - { grade: 1, min_pct: 80, meaning: "Excellent" }
  - { grade: 6, min_pct: 45, meaning: "Credit (pass)" }
grade_bands:
  - { band_id: JSS1, ordinal: 7, label_local: "JSS 1" }
  - { band_id: JSS2, ordinal: 8, label_local: "JSS 2" }
  - { band_id: JSS3, ordinal: 9, label_local: "JSS 3" }

objectives:
  - code: JSS1.NUM.2.3
    text: "Perform operations on fractions"
    grade_band: JSS1
    term: 1
    exam_weight: 0.06
    mapped_nodes:
      - MATH.FRAC.ADD_LIKE
      - MATH.FRAC.ADD_UNLIKE
      - MATH.FRAC.SUB_UNLIKE
      - MATH.FRAC.MULT
      - MATH.FRAC.DIV
      - MATH.FRAC.MIXED_CONVERT
    coverage_status: full

exam_structure:
  papers:
    - { paper_id: "1", name: "Objective", item_types: [mcq_single],
        duration_min: 60, marks: 40, calculator: prohibited }
    - { paper_id: "2", name: "Essay", item_types: [structured_multipart],
        duration_min: 90, marks: 60, calculator: prohibited }
```

*Illustrative standards-aligned framework (v2). No US content work is scheduled; this shows only that the model fits:*

```yaml
framework_id: us_ccss_math_2010      # illustrative
country: US
board: Common Core State Standards
framework_type: standards_aligned
subject: mathematics
# no exam_structure; no grading_scale required
# calendar: per school/district (§4)
```

**Note the ratio:** one syllabus objective → six canonical nodes. That ratio is typical and is exactly why teach-to-objective fails where teach-to-node succeeds. A learner failing "operations on fractions" has failed one of six distinct things, and knowing which one is the entire product.

---

## 8. Expansion Playbook

**Order (v2, aligned with Product Plan §10.9):** Ghana (pilot) → Sierra Leone (E2) → Nigeria (E3) → Nigeria state boards (E4) → further WAEC markets → United States (planned, not scheduled).

**Estimates are conditional (v2).** The week counts below cover mapping and authoring effort. They exclude human review time and assume Phase 0 exit criteria (Product Plan §17.2) have been met. Re-estimate from Phase 0 reviewer-hours per node before committing to a date.

### Sierra Leone (E2) — ~3 weeks of mapping effort

**Confirmed 2026-07-30, not just assumed** — verified directly against WAEC's own description of its member-country exams: Sierra Leone's BECE genuinely is WAEC-administered, the same body as Ghana's, not a different national board wearing the same name (unlike Nigeria, below). The original assumption here held up on checking; Nigeria's didn't.

WAEC-aligned, so mapping overlap with Ghana should exceed 90%. **One thing still unverified, not assumed identical:** Sierra Leone's exact grading-scale bands haven't been independently confirmed against Ghana's 1–9 scale — likely close, given the shared administering body, but "likely" isn't "confirmed," and shouldn't be treated as the latter when the framework's actual `grading_scale` gets populated. **Confirm the bands before the Sierra Leone import (v2).**

Process: import syllabus → map → author residual nodes → localization pass (leone, local names and contexts) → calendar and exam windows → no new item authoring for mapped nodes.

### Nigeria (E3) — ~4 weeks of mapping effort

**Corrected 2026-07-30 — verified, not the assumption this section originally shipped with.** Nigeria's JSS-exit exam is colloquially called "BECE"/"Junior WAEC" — same informal name as Ghana and Sierra Leone's — but per WAEC's own organizational description, it is NOT the same administered exam. Nigeria's junior-level national exam is the **Junior Secondary School Certificate**, administered by **NECO** (Federal Unity Colleges) or **State Ministry of Education boards** (e.g., Lagos State's own board) — WAEC runs Nigeria's *senior*-level WASSCE, not this one. Grading is A/B/C/P/F (5-level), not Ghana's 1–9 WAEC scale — `board` and `grading_scale` in the framework object must reflect this for real, not inherit Ghana's.

**Naming (v2):** in the UI use one verified `label_local` for this exam (Product Plan §7.9.1 now reads "JSS Certificate (NECO)"). Do not label it "BECE (NECO)".

1. Import the actual NECO/State-board syllabus (not WAEC's, which doesn't cover this level for Nigeria) — sourced separately from Ghana's.
2. Map objectives to the existing canonical graph. **Expect 85–95% to map directly** — content overlap is real (a real NECO BECE math syllabus covers Number & Numeration, Geometry & Measurement, Algebraic Processes, Statistics — the same broad West African JSS math tradition Ghana's WAEC syllabus shares), even though the administering body and grading scale don't.
3. Author nodes for the residual.
4. Localization pass: naira, Nigerian names and settings, local commerce contexts.
5. Configure calendar and exam windows (NECO/State-board dates, not WAEC's).
6. **No new item authoring for mapped nodes.** Localization is a transformation of approved items, not a new authoring track.

### United States (planned, not scheduled)

Brought back into the plan on 2026-07-30. No US content, mapping or framework work is scheduled; sequence it after the Phase 0 exit and a decision record. What the model must handle, and does as rows rather than code:

- A `standards_aligned` framework type (e.g. Common Core) with no exam board, optional `exam_structure`, and no exam-critical path (rule M-6).
- Pre-K and Kindergarten via the ordinal table in §3.2.
- Per-school or per-district calendars (§4).
- ELA as a separate graph per language variety (§1). Mathematics can reuse the existing canonical graph.

**The success criterion for this document:** each expansion above is a content project, not an engineering project. If any requires a schema change beyond the framework-type and calendar additions made in v2, the abstraction has failed and should be fixed before proceeding.

**Out of scope for now:** any other non-WAEC/BECE market (Product Plan §10.9, §18). Revisit per the product trigger named in §10.9.

---

## 9. Governance

| Change | Requires |
|---|---|
| New canonical node | Curriculum lead approval |
| Change to prerequisites | Curriculum lead + engine test-vector review (affects gating) |
| Deprecate a node | Curriculum lead + migration plan for affected learners |
| New framework version | Curriculum lead + diff review + coverage ≥ 80% |
| Objective→node mapping | Curriculum lead, per mapping, no bulk approve |
| Grade band definition | Curriculum lead + in-country reviewer |
| Calendar | Ops, no approval needed |
| Localization brief (v2) | Curriculum lead + in-country reviewer |
| Localization override on an item or content section (v2) | Reviewer per override; math-bearing overrides SymPy-verified |
| Pin migration with `mastery_preserved = false` (v2) | Explicit written reason, audited; I-11 normally forbids it |
| New framework type or ordinal-table change (v2) | Curriculum lead + decision record |

**Roles while one person fills them (v2).** Until a separate curriculum lead is hired, one person may be both author and approver. Record each action under the hat it was taken in (author, reviewer, approver) so the audit trail still shows who did what, and keep the in-country reviewer for grade bands and localization briefs: that one should not be the same person.

**Bulk-approving mappings is prohibited.** It is the single easiest way to silently misalign an exam cohort.

---

## 10. Localization (v2)

Localization is an overlay on approved content, never a fork.

| ID | Rule |
|---|---|
| L-1 | An item or content section exists once. A framework may hold a localized override (`item_localizations`, `content_localizations`); the base is never copied. |
| L-2 | `country_code` exists on the framework and nowhere else in the content layer. It never appears on skill nodes, items, node content or misconceptions. CI enforces this. |
| L-3 | Any override that changes a numeric answer must be SymPy-verified (math-invariance gate). The build fails otherwise. |
| L-4 | The localization brief (stage 8 of §6) is written before localization starts and is refreshed by the localization-refresh pipeline (Product Plan §3.7). |
| L-5 | Localization changes context (currency, names, settings), never the skill, the difficulty tier or the mastery criterion. |

---

## 11. Change Log

**v2 — 2026-11-18**

- Coverage counts `reviewed`+ items, not calibrated ones (§5.2, §6).
- Expansion order aligned with the Product Plan: Sierra Leone then Nigeria (§8).
- Added V-6 pin migrations, referencing I-11 (§5.1). I-11 must also be added to doc 04's invariant table.
- Removed the duplicate `grading_scale` (§3, §3.3, §7).
- Added `framework_type`, rule M-6 and a standards-aligned example for the US (§3, §3.1, §7).
- Normative ordinal table including Pre-K and Kindergarten (§3.2) — proposed, confirm.
- ELA scoped per language variety (§1). Calendars per school or district (§4).
- Added `superseded_by`, the topic-assignment rule, mock-paper limits, calendar consumers, licensing, localization rules (§10), governance rows and a roles note.
- Nigeria exam named as the Junior Secondary School Certificate in the UI (§8).
- Expansion estimates made conditional on reviewer time and Phase 0 exit (§8).

**Open items:** confirm the ordinal table ([DR-016](decisions/DR-016-ordinal-table.md)); confirm Sierra Leone grading bands ([DR-017](decisions/DR-017-sierra-leone-grading.md)); `framework_type` ([DR-015](decisions/DR-015-framework-type.md)); add I-11 to doc 04; cross-references to doc 01 §3.8, doc 08 and doc 09 §7 now resolve (docs written 2026-11-18); Product Plan §13.7 re-pointed to §10.9 and §18.

**Decision records:** DR-015, DR-016, DR-017
