# 12 — Teacher Product Specification

**Owner:** Product + Curriculum lead · **Change control:** strict for §5, §7, §8 (encode dignity and learning-science rules); append-mostly elsewhere
**Version:** v1 (2026-11-18), DRAFT. See Change Log and Decisions Needed at the end. Decisions resolved 2026-11-18 (see the Decisions section; DR-019).

> Normative spec for the Teacher Toolkit, the classroom layer, the teacher dashboard, the inline tutor and the engagement mechanisms. It turns Product Plan §11 to §15 into testable requirements and does not add scope. Safety, privacy and consent requirements live in doc 13; this document points to them rather than repeating them.

**Status vocabulary.** *Normative* = taken from a cited source. **PROPOSED** = source silent or conflicting; listed in Decisions Needed. Individual decisions carry their own status in the Decisions section. Each requirement cites its source inline.

---

## 1. Scope and non-scope

**In scope:** Teacher Toolkit (plan §12), classroom layer (plan §14), teacher dashboard (plan §14.2), inline tutor (plan §13; doc 03 §12A), engagement mechanisms (plan §15), teacher-facing notifications (tasks.md Task 14).

**Out of scope:**
- SSO and rostering integrations until a pilot school asks (plan §14.3).
- Parent view (plan §14.4, "later"). Only the constraints that bind it are noted in §5.4.
- Pricing (plan §12.4: decided after pilot willingness-to-pay interviews).
- Mobile teacher screens (plan §21.1: "later phase").
- Phase 0 scope: Ghana, WAEC BECE, JSS2 Mathematics, 2 pilot schools, teachers onboarded via the Toolkit (plan §17.1).

---

## 2. Users and roles

| Role | Who | Defined in | Access (normative) |
|---|---|---|---|
| **Teacher** | Individual teacher using the free Toolkit and running classes | plan §12, §14.1 (`classes.teacher_id`) | Own classes only; RBAC enforced server-side (plan §16.1; doc 10 §9) |
| **School admin** | Person administering a school record | plan §14.1 defines `schools` but no admin role | **PROPOSED, undefined.** No source defines this role's scope (Decision D-1) |
| **Learner** | Child using the app | plan §14.1 (`class_members.learner_id`) | Self-scoped (tasks.md §13.3) |
| **Parent** | Guardian | plan §14.4; tasks.md Task 14 (`parent_contacts`) | Digest recipient only; no account role defined (Decision D-1) |
| Curriculum team roles (Curriculum Lead, Reviewer, Localizer, Authoring Assistant, Content Admin) | Internal | tasks.md §16.1 | Not teacher roles. A teacher MUST NOT hold any of these scopes by virtue of being a teacher. |

Requirement T-R1: a teacher can read only data for learners who are members of a class that teacher owns (plan §16.1). Cross-class access returns 403, not 404 (tasks.md §13.3, applied by analogy; the source states it for `/me/*`).

---

## 3. Teacher Toolkit

### 3.1 Tools

Source: plan §12.2. The Toolkit is a read-only, teacher-friendly view of existing content plus generators that reuse Pipelines A2/B (plan §12.1).

| Tool | Input | Output | Source tables / built on |
|---|---|---|---|
| **Lesson plan** | Framework objective (e.g. `JSS2.NUM.3.2`) + class duration | Board-aligned lesson plan from node content, worked examples, local context | Pipeline A2 + localization overlay (`LocalizedContentChunk`, plan §13.1) |
| **Quiz / worksheet builder** | Objectives or nodes + difficulty mix | Printable and shareable quiz with answer key and misconception tags | `items` (reviewed or later and `printable`), `misconceptions`, `item_misconceptions` |
| **Exam-practice paper** | Framework + paper structure | Mock paper in the board's `exam_structure` | `curriculum_frameworks.exam_structure` (doc 02 §3.3) |
| **Remediation set** | Misconception ID or node | Targeted practice and a 5-minute reteach script | `misconceptions.remediation_id` |
| **Printable pack** | Any of the above | PDF for classrooms with no devices | Content tools |

Table names `items`, `misconceptions`, `item_misconceptions`, `skill_nodes` and `curriculum_frameworks` exist in `backend/app/db/models/` (verified 2026-11-18). `exam_structure` is specified in doc 02 §3.3.

### 3.2 Hard rules

| ID | Rule | Source |
|---|---|---|
| T-1 | Teacher tools draw only from items at `reviewed` or beyond. No unreviewed AI output reaches a classroom. | plan §12.2; plan §21.2 (Toolkit gate) |
| T-2 | Quizzes, worksheets and mock papers include only items with `printable = true`. Non-printable types (number line, drag-and-drop, hotspot, Desmos, GeoGebra, photo, audio) are excluded unless a `print_variant` is authored. | doc 05 A-9; plan §12.2 |
| T-3 | A teacher-facing mock paper covers Paper 1 (objective) only until structured-response types and a deferred-marking contract ship. It states this on its face and MUST NOT be presented as a full BECE paper. | doc 02 §3.3; doc 05 §3 (deferred marking note); plan §12.2 |
| T-4 | A paper uses the framework's `exam_structure`, not a calendar default. | doc 02 §3.3 (teacher-generated mock papers) |
| T-5 | A worked solution is not shown on any live-item surface. In a teacher answer key it appears only in the teacher's own printed or downloaded material, never in a learner-facing surface before the item closes. | doc 05 A-10 |
| T-6 | Generator text (lesson plan, reteach script) is model-generated and uses the AI services owned by doc 08. Any numeric claim is SymPy-verified. **PROPOSED:** whether teacher-tool prose needs human review before display is not stated in the sources (Decision D-6). | plan §12.1; plan §13.1 rule 6 (SymPy, stated for the tutor) |
| T-7 | The Toolkit adds no Tier 0 runtime dependency on a model call. | doc 10 §6; REJECTED_FEATURES R-17 |

**Status values.** Items statuses are `draft, generated, tagged, reviewed, piloting, live, calibrating, calibrated, revision, retired` (`backend/app/db/models/content.py`). "Reviewed or beyond" is not defined for `revision` and `retired` (Decision D-2).

### 3.3 Acceptance criteria (Toolkit)

- AC-T1: a generated quiz, paper or remediation set contains zero items whose status is below `reviewed`. Verified by the Toolkit gate (plan §21.2): a failing fixture with an unreviewed item must fail the build (doc 10 §4: every CI gate has a failing fixture).
- AC-T2: a generated quiz contains zero items with `printable = false`.
- AC-T3: a mock paper generated for a framework whose `exam_structure` includes a structured-response paper is labelled Paper 1 only.
- AC-T4: every quiz has an answer key and misconception tags (plan §12.2).
- AC-T5: a printable pack renders without a device or network at the point of use (plan §12.2).

---

## 4. Classroom layer

### 4.1 Schema

Source: plan §14.1. Reproduced as the normative target.

```sql
CREATE TABLE schools (
  school_id    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name         TEXT NOT NULL,
  country_code TEXT NOT NULL REFERENCES countries(country_code),
  calendar_id  UUID,   -- required for US; optional elsewhere
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE classes (
  class_id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id   UUID NOT NULL REFERENCES users(id),
  school_id    UUID REFERENCES schools(school_id),
  name         TEXT NOT NULL,
  framework_id TEXT NOT NULL REFERENCES curriculum_frameworks(framework_id),
  join_code    TEXT UNIQUE NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE class_members (
  class_id    UUID REFERENCES classes(class_id),
  learner_id  UUID REFERENCES users(id),
  joined_at   TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (class_id, learner_id)
);
CREATE TABLE assignments (
  assignment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id      UUID REFERENCES classes(class_id),
  node_ids      TEXT[] NOT NULL,
  due_date      DATE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

The schema lives in doc 07 (data model) once written; this section states the product rules that bind it. Task 14 sketches a different pair of tables (`teacher_classrooms`, `teacher_classroom_members`) for the same concept. See Decision D-3.

### 4.2 Rules

| ID | Rule | Source |
|---|---|---|
| C-1 | Classes and assignments never alter `learner_node_state` or a learner's framework pin. | plan §14.1 |
| C-2 | If a learner's pin differs from the class framework, the dashboard prompts a pin migration; the class never changes the pin. | plan §14.1 (refers to plan §2.13); sync-contract §8 |
| C-3 | Assigning a topic expands into its nodes ordered by prerequisites. Topic and subtopic are navigation only and never become a second dependency system. | plan §14.1; doc 02 §2 (assignments by topic) |
| C-4 | An assignment recommends and surfaces. The engine still decides availability and mastery (prerequisite DAG, mastery predicate). | plan §14.1; plan §15.1 ("Recommendations only") |
| C-5 | Classroom code never writes `learner_node_state`. CI gate: classroom isolation. | plan §21.2 |
| C-6 | Roster entry is by join code and CSV import in MVP. No SSO or rostering until a pilot school asks. | plan §14.3 |
| C-7 | A teacher sees only their own classes. | plan §16.1 |
| C-8 | An assignment never relaxes the mastery predicate or availability gate. | plan §15.3; doc 04 §4 |

Silent in the sources: join-code format, length, expiry, rotation and revocation; maximum class size; learner leaving a class; a learner in several classes; who consents when a learner joins by code (the consent flow is in doc 13 S-4). See Decisions D-4, D-5.

### 4.3 Acceptance criteria (classroom)

- AC-C1: creating a class, joining by code, assigning a topic and removing a member leave every `learner_node_state` row byte-identical (checksum test, same method as `migrate_learner_pin`, sync-contract §8).
- AC-C2: assigning a topic produces `node_ids` in an order consistent with the prerequisite DAG.
- AC-C3: a learner assigned a node whose prerequisites are unmet is still gated by the engine.
- AC-C4: a teacher requesting another teacher's class gets an authorization error (contract test per endpoint, doc 10 §4).
- AC-C5: grep or static gate shows no write to `learner_node_state` in classroom modules.

---

## 5. Teacher dashboard (MVP)

### 5.1 Contents

Source: plan §14.2 mock and tasks.md §14.5.

| Section | Content |
|---|---|
| Header | Class name and framework, e.g. "JSS2 Maths · Class A" |
| Needs attention this week | Count of learners per misconception (e.g. 7 learners: `FRAC.ADD_NUM_DEN`); count of learners stalled on a node for 3 or more days |
| Class progress | Nodes mastered this week; reviews due |
| Actions | Assign node; print remediation set |

Teacher weekly report (tasks.md §14.5), if built: one page per class; minutes this week, nodes mastered, nodes in review, a one-word status; "needs attention" only on a persistent gap (no mastery in 3 weeks despite 60 or more minutes a week), never a single bad week.

### 5.2 Dignity constraint, extended to teachers

| ID | Rule | Source |
|---|---|---|
| D-R1 | The dashboard shows what to teach next and which misconception to address. | plan §14.2 |
| D-R2 | It does not rank children and does not show grade-level deficiency labels. | plan §14.2; doc 03 §13 (public leaderboards row: "also applies to any teacher-facing ranking of children"); REJECTED_FEATURES R-7, R-14 |
| D-R3 | A learner's placement frontier is shown as "working on", never "behind". | plan §14.2 |
| D-R4 | No grade level, percentile, rank, or "behind / ahead" language to learners or teachers. | REJECTED_FEATURES R-14 |
| D-R5 | Class and school aggregates are allowed; individual ranking is not. | doc 03 §13; plan §15.1 |
| D-R6 | The dignity constraint is checked for every teacher- or parent-facing view before merge. | plan §21.3 |

### 5.3 Known conflict with Task 14

tasks.md §14.5 specifies a per-learner row with a "moving forward / stuck / needs attention" word, a per-learner strip "teachers can sort privately", and a `teacher_gap_report` triggered by a mastery gap between top and bottom quartiles (§14.1). Sorting individual children and comparing quartiles may contravene D-R2. The sources do not resolve this. Until resolved, this spec treats D-R2 as binding and the Task 14 items as PROPOSED (Decision D-7).

### 5.4 Parent view (later)

Weekly summary of what the child worked on, what is next, how to help; same dignity rules; SMS or WhatsApp capable (plan §14.4). Digest content rules (tasks.md §14.4): first name, weekly minutes against goal, nodes mastered (count, no names), one forward-looking sentence; never a rank, percentile, comparison, grade level or diagnostic label. Digest text comes from a fixed template with slots, no free-form model text (tasks.md §14.4). Consent gate: doc 13 S-4.

### 5.5 Acceptance criteria (dashboard)

- AC-D1: no dashboard or report payload or rendered string contains a rank, percentile, grade-level label, or the words "behind" or "ahead" (automated string and schema check; plan §21.3).
- AC-D2: the placement frontier is labelled "working on".
- AC-D3: no endpoint returns learners ordered by a performance metric by default. **PROPOSED**, pending D-7.
- AC-D4: "stalled" and "needs attention" fire only on persistent conditions (3 or more days on a node; 3 weeks without mastery at 60 or more minutes a week), not on a single session (plan §14.2; tasks.md §14.5).

---

## 6. Inline tutor

Source: plan §13; doc 03 §12A; doc 04 §9, §9.1; doc 05 A-10; tasks.md §13.3 and the Task 13 tutor endpoints.

### 6.1 Behaviour requirements

| ID | Requirement | Source |
|---|---|---|
| TU-1 | The engine decides when the tutor appears. The model only responds. The tutor never decides pacing, mastery or selection. | plan §13.1 rule 1; doc 04 §9; doc 03 §12A |
| TU-2 | Inline in the practice screen, not a side panel. It is never an open chat on a live item. | plan §13.1 rule 2; doc 03 §12A; R-11 |
| TU-3 | Triggers: hint level 3 exhausted and still wrong (`escalate_to_tutor`); a misconception fires twice (remediation override); after a correct Tier 3 answer, an optional self-explanation prompt. | plan §13.1 rule 2 |
| TU-4 | A session starts seeded with `node_id`, `misconception_id`, the item and the learner's last answer. Free-form questions are allowed but secondary. | plan §13.1 rule 3 |
| TU-5 | Socratic by default. Never gives the final answer to a live item. Worked solutions and any answer-revealing hint or tutor content appear only after the item closes. | plan §13.1 rule 4; doc 05 A-10 |
| TU-6 | Grounded: retrieval over `SkillNodeContentChunk` and `LocalizedContentChunk`, filtered by `framework_id`. Retrieval is scoped server-side to the learner's pinned framework and the affected node; the client never passes a framework ID. | plan §13.1 rule 5; tasks.md Task 13 tutor endpoints |
| TU-7 | Every numeric claim is SymPy-checked before display. On disagreement, fall back to the precomputed worked solution. | plan §13.1 rule 6; doc 03 §12A |
| TU-8 | Offline: the learner gets the precomputed hint ladder and worked solution. The tutor is a Tier 1 enhancement. No new runtime AI dependency on a Tier 0 path. | plan §13.1 rule 7; doc 10 §6 |
| TU-9 | Turn cap per session, initial target 6, ending with a return to practice. | plan §13.1 rule 8 |
| TU-10 | No unrestricted learner access to a general-purpose chatbot inside the product. | doc 03 §12A; R-10 |
| TU-11 | Tutor dialogue and the learner's explanation are not attempts and are not graded. A tutor offer never changes mastery, Elo or the review schedule. | doc 04 §9.1; plan §13.2 |
| TU-12 | Rate limit: 10 tutor messages per minute per learner. | tasks.md §13.3 |
| TU-13 | Safety and privacy behaviour (moderation, refusal, safeguarding, no training on conversations): doc 13 §7. | plan §16.1 |

### 6.2 Decisions emitted by the engine

| Decision | Meaning | Status |
|---|---|---|
| `escalate_to_tutor` | The learner is struggling. Fires after 4 consecutive failures with a hint ladder exhausted, once per 24 hours per node. | Specified in doc 04 §9; implemented in `engine/src/escalation.ts` |
| `offer_tutor` `{node_id, misconception_id?, reason}` | Optional help the learner can decline. Reasons: `hint_ladder_exhausted` (once per item), `repeat_misconception` (only after `serve_remediation` was shown, once per misconception per 3 days), `self_explain` (after an unhinted correct Tier 3 answer, once per node per 24 hours). | **PROPOSED** pending DR-003. Not in `DecisionAction`. Vector `tutor_offer_triggers.json` is skip-annotated until DR-003 is accepted (decisions/FINDINGS.md, finding 8) |

Constraints on `offer_tutor` (doc 04 §9.1; plan §13.2): pure function of state and `now`; never mutates `NodeState`; not an `Attempt`; thresholds are starting values, adjusted after the pilot. Until DR-003 is decided, only `escalate_to_tutor` may trigger a tutor session, and the self-explanation prompt (DR-018 is PROPOSED) is not built.

### 6.3 Tutor metrics

Source: plan §13.3; doc 03 §12A.

| Metric | Initial target |
|---|---|
| Tutor open rate when offered | > 50% (review after pilot) |
| Post-tutor correct rate on next attempt at same node | Above matched no-tutor baseline |
| Escalation rate per node | < 10% (doc 04 §9) |
| Share of tutor turns off-task | Track and tune |

### 6.4 Acceptance criteria (tutor)

- AC-TU1: with a fixed seeded attempt log, each trigger fires at its stated scope and not otherwise (vector `tutor_offer_triggers.json`, once DR-003 is accepted).
- AC-TU2: tutor sessions never emit an `Attempt` and golden state hash is unchanged by any tutor interaction (doc 10 §4 parity test).
- AC-TU3: tutor math gate: numeric claims in tutor output are verified by SymPy in tests (plan §21.2).
- AC-TU4: tutor safety suite passes before each release (doc 13 S-12).
- AC-TU5: with no network, a session shows the hint ladder and worked solution, with no model call.
- AC-TU6: a live item never has its final answer, `worked_solution` or an answer-revealing hint displayed through the tutor (doc 05 A-10).
- AC-TU7: a session ends at or before the turn cap and returns to practice.

---

## 7. Engagement mechanisms

Principle: pull learners back with relevance and scheduling, not rewards (plan §15). Any proposed feature is checked against `docs/REJECTED_FEATURES.md` and justified in a decision record; the mastery predicate is never relaxed to improve these numbers (plan §15.3; R-13).

| Mechanism | How | Constraint | Source |
|---|---|---|---|
| Due-date nudges | SMS / WhatsApp / push tied to FSRS `due_at` and the 8/day review cap. To the learner and teacher first; a parent nudge on dose shortfall only once a parent contact and consent basis exist | Opt-in; quiet hours; max 1 per day | plan §15.1; doc 03 §12 |
| "Next up" | Learning Path shows exactly one recommended node | No grade or rank language | plan §15.1 |
| Short sessions | Target 10-minute sessions; end on a win or a clear next step | Respect `est_minutes` 8 to 15 | plan §15.1 |
| Teacher assignments | Class-level assignments and due dates | Recommendations only (C-4) | plan §15.1 |
| Exam countdown | Calendar-aware framing | Uses `academic_calendars` | plan §15.1 |
| Progress visibility | Mastery ring and a days-practised streak, not score | Streak has grace days and is never the primary loop; no ranking of individual children; class and school aggregates only | plan §15.1; doc 03 §13; R-9 |

Notification detail (tasks.md Task 14): typed taxonomy, no generic send API; quiet hours 21:00 to 07:00 local; no push in the 24 hours before a registered mock or exam except an overdue `review_due`; suppression during holidays from `academic_calendars.holidays`; automatic opt-out after 4 ignored weeks; consent gate on the parent digest (doc 13 S-4).

Conflicts (Decision D-8): plan §15.1 caps nudges at 1 per day; tasks.md §14.2 caps push at 3 per day and 10 per week. tasks.md §14.1 specifies `dose_shortfall` at below 80% of an 80-minute goal, while the weekly target itself is open (DR-009). `streak_at_risk` is in the Task 14 taxonomy; plan §15.1 and doc 03 §13 permit streaks only with grace days and not as the primary loop.

### 7.1 Metrics (instrument from pilot day one)

Day-1, day-7 and day-30 return; sessions per week; review completion rate; placement completion rate; time-to-first-mastery; nudge opt-in and opt-out rates (plan §15.2). Any review of these pairs a minutes figure with a mastery figure (R-12).

### 7.2 Acceptance criteria (engagement)

- AC-E1: no nudge is sent without opt-in, and none inside quiet hours.
- AC-E2: no engagement feature without a decision record and a REJECTED_FEATURES check.
- AC-E3: any streak shown has grace days and shows days practised, not score.
- AC-E4: no parent nudge or digest is delivered before a consent record exists (doc 13 S-4).

---

## 8. Success metrics

| Area | Metric | Source |
|---|---|---|
| Toolkit | Teacher weekly active users; classes created per teacher; learners joined per class; toolkit-to-class conversion | plan §12.5 |
| Pilot gate | Toolkit used weekly by at least N teachers (N set before the pilot) | plan §17.2 item 6 |
| Tutor | See §6.3 | plan §13.3 |
| Engagement | See §7.1 | plan §15.2 |
| Learning | Success rate in the 0.72 to 0.86 band; 30-day retrieval retention; placement completion at least 85% without grade or rank display | plan §17.2 |

Targets for N, day-7 return floor and expected responses per item are not set in the sources (Decision D-9).

---

## 9. CI gates

Source: plan §21.2; doc 10 §5 (gates fail the build) and §4 (each gate has a failing fixture).

| Gate | Rule | Status |
|---|---|---|
| Toolkit | Teacher tools read only items at `reviewed` or beyond | Not built |
| Tutor safety | Safety suite passes before release (doc 13 S-12) | Not built |
| Tutor math | Tutor numeric claims verified by SymPy in tests | Not built |
| Classroom isolation | Classes and assignments code never writes `learner_node_state` | Not built |
| Privacy | Features touching learner data need a completed privacy checklist (doc 13 §12) | Not built |
| Engine vector | `tutor_offer_triggers.json` in `/engine/testdata/` | Exists, skip-annotated pending DR-003 (decisions/FINDINGS.md) |

Definition of Done additions (plan §21.3): privacy checklist; dignity check on teacher- or parent-facing views; engagement feature checked against REJECTED_FEATURES. Doc 10 §9 applies in full (RBAC enforced server-side; feature flag if learner-facing; no new Tier 0 model dependency).

---

## 10. Implementation status

Verified 2026-11-18 by inspecting `backend/app`, `web/src`, `engine/src` and `.github/workflows`.

| Capability | Status | Evidence |
|---|---|---|
| Items table with status and `printable` | Exists | `backend/app/db/models/content.py` (`status` check constraint; `printable` default `True`) |
| Rule A-9 check function | Exists, not wired to a teacher tool | `backend/app/ai/tools/validator.py` `validate_rule_a9`; no caller found; treats a missing `printable` as printable |
| `exam_structure` on frameworks | Specified in doc 02; framework models exist | `backend/app/db/models/framework.py` (`exam_structure` column, nullable) |
| `escalate_to_tutor` | Exists in engine | `engine/src/escalation.ts` |
| `offer_tutor` | Not implemented | Deferred, DR-003 (decisions/FINDINGS.md, finding 8) |
| Classroom models (schools, classes, members, assignments) | Not implemented | No `classroom.py`; `db/models/` has `content`, `framework`, `sync` only |
| Class and teacher API (`classes.py`, `teacher_tools.py`) | Not implemented | `backend/app/api/` has `admin`, `analytics`, `frameworks`, `learners`, `sync` |
| Teacher Toolkit service and prompts | Not implemented | No `teacher_toolkit.py`; no `ai/prompts/` directory |
| Teacher web routes `(teacher)/` | Not implemented | `web/src/app/` has `(admin)` and `(student)` only |
| Teacher role or RBAC scope | Not implemented | `get_principal` in `backend/app/api/sync.py` is a placeholder awaiting Task 13 (sync-contract "Open work") |
| Tutor backend (`tutor_session.py`, `/api/v1/tutor/*`) | Not implemented | No tutor route in `backend/app` |
| Tutor web UI | Exists, **diverges from this spec** | `web/src/app/(student)/tutor/page.tsx` is a free-chat page and `web/src/components/student/AskAiSidePanel.tsx` is a side panel, both calling `/api/tutor/chat`, which has no backend. This is the surface rejected by R-10 and R-11; `InlineTutor.tsx` does not exist. Treat as a placeholder to be replaced |
| Nudges, digests, notifications | Not implemented | No `nudges.py` or notification model |
| Classroom isolation, tutor safety and tutor math CI gates | Not implemented | `.github/workflows/` has `content-ci`, `engine-ci`, `sync-parity` only |
| Teacher-facing documentation set | This document | |

---

## 11. Decisions (resolved 2026-11-18)

Recorded in [DR-019](decisions/DR-019-documentation-set-decisions.md), accepted on the owner's delegated instruction. `PROPOSED` markers earlier in this document that concern these items are superseded by the table below. Provisional rows are to be tuned from pilot data; OPEN rows need a named owner. Code and schema consequences are listed in [IMPLEMENTATION-FOLLOWUPS.md](decisions/IMPLEMENTATION-FOLLOWUPS.md).

| ID | Decision | Status |
|---|---|---|
| DD-12-1 | **Roles.** Phase 0: teacher and learner only. A parent is a contact record without a login. School admin is deferred. | ACCEPTED |
| DD-12-2 | **'Reviewed or beyond'.** `reviewed`, `piloted`, `live`, `calibrating`, `calibrated`. Not `revision` or `retired` (doc 05 §6.3). | ACCEPTED |
| DD-12-3 | **Classroom tables.** DD-07-6. | ACCEPTED |
| DD-12-4 | **Join codes.** 8 characters from an unambiguous alphabet (no 0/O, 1/I/L), unique; the teacher can rotate or revoke a code at any time; no automatic expiry in Phase 0; a learner may belong to several classes; a learner leaves by teacher removal or by self-leave, and leaving never changes learner state. The length is provisional. | ACCEPTED (provisional) |
| DD-12-5 | **Consent for teacher-created classes.** In Phase 0 every class that holds learner data must be linked to a school record, created with the school's attestation (doc 13 DD-13-3). Self-serve teacher classes without a school record wait until counsel has cleared them. The free toolkit itself holds no learner data and needs no school. | ACCEPTED |
| DD-12-6 | **Generated teacher prose.** Inputs are `reviewed`+ content only. Generated lesson-plan and reteach prose is shown with an 'AI-drafted, check before use' label and is editable by the teacher. | ACCEPTED |
| DD-12-7 | **Dignity in Task 14 reports.** Remove the individual sort, the top-versus-bottom-quartile gap trigger and per-learner status words. Keep the persistent-gap rule and misconception counts. A per-learner view shows 'working on' and next node only. | ACCEPTED |
| DD-12-8 | **Nudges.** DD-01-6. `streak_at_risk` is removed (loss-framed pressure; streaks are constrained, doc 03 §13). `dose_shortfall` fires below 80% of the learner's weekly goal (DR-009). | ACCEPTED |
| DD-12-9 | **Pilot numeric floors.** Set in the pre-registration document before enrolment and frozen: at least 2 weekly-active teachers per pilot school (provisional); `placement_at_graph_floor` at most 5% (DR-001); expected responses per item stated in advance. The day-7 return floor is OPEN: it needs a baseline the owner must choose; do not set it after data collection starts. | ACCEPTED (provisional) |
| DD-12-10 | **`offer_tutor` and self-explanation.** DR-003 and DR-018. | ACCEPTED |
| DD-12-11 | **`printable`.** DR-013. | ACCEPTED |
| DD-12-12 | **Paper 2 mocks.** DR-010: blocked until pending attempts are built. | ACCEPTED |

---

## Change Log

**v1 — 2026-11-18**

- Created from plan §11 to §17 and §21 (plan §21.1 named this file `11-teacher-product-spec.md`; numbering is now fixed at 12 because doc 11 is tech stack and analytics).
- Added requirement IDs, acceptance criteria, implementation status and decisions needed.
- Flagged conflicts between plan §14.2/§15.1 and tasks.md Task 14 (D-3, D-7, D-8).

**Open items:** D-1 to D-12 above. Counsel input needed for D-5 (see doc 13).

**Decision records:** DR-003, DR-009, DR-010, DR-013, DR-018
