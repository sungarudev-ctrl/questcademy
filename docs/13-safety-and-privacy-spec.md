# 13 — Safety and Privacy Specification

**Owner:** Product + Engineering, with external counsel for legal basis · **Change control:** strict; any change needs a decision record
**Version:** v1 (2026-11-18), DRAFT. See Change Log and Decisions Needed at the end. Decisions resolved 2026-11-18 (see the Decisions section; DR-019).

> Normative requirements for protecting child learners and their data. Turns Product Plan §16 into numbered, testable requirements. **This document is not legal advice.** Every legal-basis, age-of-consent and retention-period question is left to qualified counsel in each jurisdiction (§11, Decisions Needed). Nothing here asserts compliance with any law.

**Status vocabulary.** *Normative* = taken from a cited source. **PROPOSED** = source silent or conflicting; listed in Decisions Needed. Individual decisions carry their own status in the Decisions section. The plan states that schools will expect a posture equivalent to MagicSchool's published FERPA/COPPA statement, SOC 2 report and no-training stance (plan §16); this spec does not claim Questcademy has any of these.

**Owner column.** The sources assign no per-requirement owners (doc 10 names Engineering as owner of engineering standards only). Owners below are **PROPOSED** role assignments for confirmation.

---

## 1. Scope

Applies to every feature that collects, stores, transmits or displays learner data, and to every teacher-, parent- and tutor-facing surface (plan §16; plan §21.3). The Phase 0 pilot is Ghana, WAEC BECE, JSS2 Mathematics, 2 schools (plan §17.1); the DPIA and legal confirmation gate that pilot (S-1, S-23).

Doc 12 holds product behaviour (dashboard, tutor behaviour, engagement). This document holds the safety and privacy rules that bind it.

---

## 2. Requirements

Verification key: **CI** = automated test or gate that fails the build (doc 10 §5; each gate needs a failing fixture, doc 10 §4) · **Contract** = API contract test including RBAC scope violations (doc 10 §4) · **Review** = documented human review · **Artefact** = a named document exists and is approved.

| ID | Requirement | Source | Owner (PROPOSED) | Verification |
|---|---|---|---|---|
| S-1 | Counsel confirms obligations per country (Ghana, Sierra Leone, Nigeria data-protection laws) and for any US/EU users **before** the pilot. | plan §16.1 (Legal basis); plan §20 item 7 | Product + counsel | Artefact: written counsel confirmation per country, recorded before pilot start |
| S-2 | A parental or school consent flow exists for under-age learners. | plan §16.1 (Minor consent) | Product + Engineering | CI: onboarding test that an under-age learner cannot reach data-collecting features without a consent record; Review of wording |
| S-3 | School-mediated accounts are supported for class use. | plan §16.1 | Product + Engineering | Contract + Review (see D-2, D-3) |
| S-4 | No parent digest or nudge is delivered before the parent confirms by one-tap link. Parent contact and consent basis must exist first. Consent can be withdrawn in-app; withdrawal stops the affected notification type immediately. Digest text comes from a fixed template with slots. | tasks.md §14.6, §14.4; plan §15.1; doc 03 §12 | Engineering | CI: consent gate test (digest trigger before consent asserts no delivery); withdrawal test; template-and-slot test |
| S-5 | Voice capture requires explicit written parent or guardian consent, with the exact wording stored alongside the timestamp. | tasks.md §14.6; doc 05 §3.16; plan §16.1 | Engineering | CI: voice item cannot record without a consent record; stored wording and timestamp present |
| S-6 | Collect only what the engine and teacher dashboard need. No precise location. No unnecessary contact data. | plan §16.1 (Data minimisation) | Engineering + Product | Review: data inventory (§4) approved; CI: schema-diff check against inventory is **PROPOSED** |
| S-7 | Every response field carrying learner PII is marked `x-pii: true` in the OpenAPI document; no PII field appears in an unauthenticated endpoint. | tasks.md §13.7 | Engineering | CI: grep gate on the OpenAPI document |
| S-8 | PII is never logged. In RCT data the learner identifier is a hash, not the raw UUID. | tasks.md Task 15 logging rule (structured logs, PII lint); tasks.md Task 17 | Engineering | CI: PII-logging lint fails if a log statement includes an `x-pii` field; lint on RCT tables |
| S-9 | Retention periods are defined for every learner-data class. | plan §16.1 (Retention and deletion) | Product + counsel | Artefact: retention schedule. **Periods not defined in any source (D-4)** |
| S-10 | A learner or parent deletion-request path exists. `DELETE /api/v1/me` soft-deletes by default and hard-deletes after a 30-day grace period; the audit trail of the deletion is kept, the learner data is not. | plan §16.1; tasks.md §13.7 | Engineering | Contract + CI: after hard delete, no learner rows remain; deletion audit row remains |
| S-11 | Attempt-log export is available. | plan §16.1 | Engineering | Contract: export contains the requesting learner's attempts only |
| S-12 | The tutor safety test suite (jailbreak, self-harm, personal-data prompts) passes before each tutor release. | plan §16.2; plan §21.2 | Engineering + Product | CI: release gate (§7.3) |
| S-13 | Tutor guardrails: age-appropriate content moderation; refuse off-topic and unsafe requests; escalate safeguarding concerns per policy. | plan §16.1 (Tutor guardrails) | Product + Engineering | CI: S-12 suite; Artefact: safeguarding policy (D-6) |
| S-14 | Learner conversations and attempts are never used to train third-party models; this is contractual with the model provider. | plan §16.1 (No model training) | Product + counsel | Artefact: executed provider terms or DPA reviewed by counsel; Review at each provider change |
| S-15 | Free-text, photo and audio responses sent for marking: strip EXIF and location; reject images showing faces or names; set a retention limit; no model training; parental consent for voice; deletion on request. | plan §16.1; doc 05 §3.15, §3.16 | Engineering | CI: EXIF-strip test, face and name rejection test fixtures (method D-7); S-5, S-9, S-10, S-14 apply |
| S-16 | A teacher sees only their own classes. RBAC is enforced server-side; the UI hiding controls is defence in depth only. | plan §16.1; doc 10 §9; tasks.md Task 9 (admin layout note) | Engineering | Contract: RBAC scope-violation test per endpoint |
| S-17 | Learner endpoints are self-scoped. Access to another learner's data returns 403 with a stable error code, not 404. | tasks.md §13.3 | Engineering | Contract |
| S-18 | An audit log records admin and teacher access to learner data. | plan §16.1 (Security) | Engineering | CI: test that each teacher or admin read of learner data writes an audit row (what is audited: D-8) |
| S-19 | Encryption in transit and at rest. | plan §16.1 (Security) | Engineering | Review: infrastructure checklist (doc 06 / deployment); no automated check specified |
| S-20 | Dependency scanning: no critical dependency vulnerabilities. | plan §16.1; doc 10 §5 | Engineering | CI gate (existing in spec; see §14 for implementation status) |
| S-21 | A documented breach process and contacts exist (§10). | plan §16.1 (Incident response) | Product + Engineering | Artefact: runbook; Review: exercised before pilot (**PROPOSED**) |
| S-22 | A plain-language privacy page for parents, teachers and learners. | plan §16.1 (Transparency) | Product | Artefact + Review at each reading-level check (D-9) |
| S-23 | A data-protection impact assessment is completed before the first pilot school. | plan §16.2; plan §18 (M6) | Product + counsel | Artefact: signed DPIA on file |
| S-24 | Privacy review is part of Definition of Done for any feature touching learner data. | plan §16.2; plan §21.3; doc 10 §9 | Engineering | CI/Review: completed checklist (§12) attached to the change |
| S-25 | RCT participants consent through the standard onboarding flow; withdrawal excludes their data from analysis and the published dataset; consent wording is at a reading level suitable for the youngest enrolled learner; every RCT event producer checks consent before emitting. | tasks.md Task 17 | Engineering + research lead | CI: withdrawal-exclusion test; lint on event producers |
| S-26 | Crash reporting (Sentry or similar) runs only if the privacy policy permits it; otherwise only a local error log the learner may choose to share. | tasks.md Task 11 (mobile) | Engineering | Review: feature flag state matches policy |

---

## 3. Consent

### 3.1 Minor consent (S-2, S-3)

The plan requires "parental/school consent flow for under-age learners; school-mediated accounts for class use" (plan §16.1). The sources do not define the age threshold, who may consent, what the consent text says, how a school attests, or the flow for a teacher who creates a class without a school record. These are Decisions D-2 and D-3. Counsel confirms (S-1).

### 3.2 Parent contact and notifications (S-4)

Source: tasks.md §14.6 and `parent_contacts` (`consent_given_at`, `consent_withdrawn_at`, `locale`).
- Opt-in only; no digest until one-tap confirmation.
- Withdrawal at any time, effective immediately for the affected type.
- Parent nudge on dose shortfall requires a parent contact and a consent basis; until then nudges go to the learner and the teacher (doc 03 §12).
- `consent_reminder` fires once if voice recording is enabled and consent is unconfirmed after 7 days (tasks.md §14.1).
- Parent-facing content obeys the dignity constraint (doc 12 §5.4).

### 3.3 Voice (S-5)

Explicit written consent from a parent or guardian before any voice capture, wording stored with timestamp (tasks.md §14.6). Voice is an audio-response item type (doc 05 §3.16), Phase 4 (doc 05 §3 catalogue).

### 3.4 Research (S-25)

RCT consent per tasks.md Task 17; the platform uses the same onboarding flow. Outcome definitions do not change after data collection starts (plan §17.4).

---

## 4. Data minimisation (S-6)

Rule: collect only what the engine and the teacher dashboard need (plan §16.1). No precise location. No unnecessary contact data.

**Data inventory (to be completed; what follows is derived from sources, not from code):**

| Data class | Collected for | Source of the need |
|---|---|---|
| Attempts (item, correctness, hints, timestamps) | Engine state and sync | doc 04 §2; sync-contract §2 |
| `learner_node_state` | Engine | sync-contract §1 |
| Framework pin | Content selection | sync-contract §8 |
| Class membership, assignments | Classroom layer | doc 12 §4 |
| Parent contact (kind, value, locale), consent timestamps | Digest delivery, consent record | tasks.md §14 |
| Tutor session messages | Tutor | tasks.md Task 13 tutor endpoints |
| Free-text, photo, audio responses | Marking | doc 05 §3.11, §3.15, §3.16 |
| Voice recordings | Oral fluency item | doc 05 §3.16 |
| Notification records | Delivery and suppression log | tasks.md §14 |
| Local-only error log | Debugging, shared at learner's choice | tasks.md Task 11 |

Prohibited by decision: learner personality or learning-profile typing, described as a privacy liability on minors (doc 03 §13; REJECTED_FEATURES R-6). Learning styles are never recorded (R-1).

Which identity fields (name, school, date of birth, phone, email) are required is not specified (D-5).

---

## 5. Retention and deletion (S-9, S-10, S-11)

| Item | Normative content | Source |
|---|---|---|
| Retention periods | "Defined retention periods" are required. **No period is stated in any source. Do not invent one. Decision needed (D-4).** | plan §16.1 |
| Deletion path | Learner or parent can request deletion. `DELETE /api/v1/me`: soft delete by default; hard delete after a 30-day grace period; deletion audit trail preserved, learner data not. Counsel must confirm the 30-day grace figure is acceptable per jurisdiction. | plan §16.1; tasks.md §13.7 |
| Export | Attempt-log export. | plan §16.1 |
| Media (photo, audio) | Retention limit required, period undecided; deletion on request. | plan §16.1; doc 05 §3.15, §3.16 |
| Tutor conversations | Retention not stated (D-4). | |
| Parent contact on withdrawal | Not stated (D-4). | |

Acceptance criteria:
- AC-R1: a retention schedule exists listing every data class in §4 with a period before the pilot (S-9, D-4).
- AC-R2: after the hard-delete window, no learner row remains in the primary store, backups or the RCT tables beyond what the schedule allows. Backup handling is not specified (D-4).
- AC-R3: attempts excluded from a deleted learner's data still leave aggregates that contain no learner identifier (**PROPOSED**; the sources are silent on aggregate handling).

---

## 6. No model training (S-14)

Requirements:
- Learner conversations and attempts are never used to train third-party models; it is contractual with the model provider (plan §16.1).
- Applies to tutor messages, free-text answers, photos and voice (plan §16.1; doc 05 §3.15, §3.16).
- The model provider today is Gemini (`backend/app/ai/gemini.py`; tasks.md Task 13 tutor endpoint description: "calls Gemini"). The contract terms, data-processing agreement and region are not in the repository and are not verified here (D-10).

Verification: counsel-reviewed provider terms on file; re-reviewed on any provider or model change.

---

## 7. Tutor guardrails and safety test suite

Behavioural rules (what the tutor does when) are in doc 12 §6. Safety rules:

### 7.1 Guardrails (S-13)

| ID | Rule | Source |
|---|---|---|
| G-1 | Age-appropriate content moderation of tutor output. | plan §16.1 |
| G-2 | Refuse off-topic and unsafe requests. | plan §16.1 |
| G-3 | Escalate safeguarding concerns per policy. The policy itself is not written (D-6). | plan §16.1 |
| G-4 | The tutor never gives the final answer to a live item. | plan §13.1; doc 05 A-10 |
| G-5 | No unrestricted general-purpose chat for learners. | doc 03 §12A; R-10 |
| G-6 | Tutor retrieval is scoped server-side to the learner's pin and affected node. | tasks.md Task 13 |
| G-7 | Rate limit of 10 tutor messages per minute per learner. | tasks.md §13.3 |
| G-8 | Short sessions with a turn cap (initial target 6). | plan §13.1 |
| G-9 | Personal-data prompts: the suite tests them (S-12). What the tutor does with a learner who volunteers personal data (redact, refuse, warn) is not specified (D-6). | plan §16.2 |

### 7.2 Safety test suite (S-12)

Source: plan §16.2, §21.2. Categories named in the sources: jailbreak, self-harm, personal-data prompts. The suite's cases, pass threshold, languages and how often cases are refreshed are not specified (D-7). Minimum structure (**PROPOSED**):
1. Fixed case file per category, versioned in the repository.
2. Each case has an expected behaviour (refuse, redirect, escalate) and an assertion.
3. Suite runs against the release candidate's prompt, model identifier and moderation settings; a prompt, model or settings change re-runs it.
4. Failing fixture proves the gate can fail (doc 10 §4).

### 7.3 Release gate

The tutor safety gate fails the build when the suite fails (plan §21.2). Tutor math gate: numeric claims SymPy-checked in tests (plan §21.2).

### 7.4 Acceptance criteria

- AC-G1: every release candidate that touches tutor prompts, model, retrieval or moderation has a recorded passing S-12 run.
- AC-G2: a self-harm test case produces the escalation behaviour defined in the safeguarding policy (after D-6).
- AC-G3: a jailbreak case asking for the final answer to a live item receives no answer (G-4).
- AC-G4: offline, no tutor call is made (doc 12 AC-TU5).

---

## 8. Free-text, photo and audio handling (S-15)

Data flow: the response is captured on the device, queued if offline, uploaded, and sent to a model for marking (doc 05 §3.11, §3.15, §3.16; plan §16.1).

| Type | Constraints | Source |
|---|---|---|
| Short constructed response | Marked criterion by criterion; low-confidence marks route to the teacher review queue, not to the learner. A teacher may therefore see a learner's text (RBAC S-16, audit S-18). | doc 05 §3.11 |
| Working-shown photo | Online only; compress to 200 KB or less; strip EXIF and location; reject images showing faces or names; retention limit; no model training; deletion on request. | doc 05 §3.15; plan §16.1 |
| Audio (oral fluency) | Opus, recorded locally, uploaded on sync; explicit parent consent for voice capture; retention limit; no model training; deletion on request. | doc 05 §3.16; plan §16.1; tasks.md §14.6 |
| Tutor image input (OCR) | `POST /api/v1/tutor/sessions/{id}/image` is specified. The same photo rules are applied here. | tasks.md Task 13 |

Acceptance criteria:
- AC-M1: an uploaded photo with GPS EXIF stored or sent onward has none (fixture with known EXIF).
- AC-M2: a fixture image with a face is rejected and not stored; a fixture with a name or handwriting of a name is rejected. The detection method and its error rates are undecided (D-7).
- AC-M3: no media is stored past the retention limit (after D-4).
- AC-M4: deleting a learner deletes their media (S-10).

---

## 9. Access control and audit (S-16, S-17, S-18)

| Requirement | Detail | Source |
|---|---|---|
| Server-side RBAC | JWT bearer; refresh tokens with rotation; scope checked on every endpoint. | tasks.md §13.3; doc 10 §9 |
| Teacher scope | Own classes only. | plan §16.1; doc 12 T-R1, C-7 |
| Learner scope | Self-scoped; 403 with a stable error code for other learners. | tasks.md §13.3 |
| Principal's learner set | A principal may act only for its `learner_ids`; other ids are rejected. | sync-contract §6 |
| Curriculum roles | Curriculum Lead, Reviewer, Localizer, Authoring Assistant, Content Admin. None is a catch-all admin. They do not receive learner PII access by default (**PROPOSED**; sources silent). | tasks.md §16.1 |
| Audit log | Admin and teacher access to learner data is recorded. | plan §16.1 |

What the audit log records, who may read it, and its retention are undecided (D-8). Existing audit tables (`learner_pin_migrations`, `item_lifecycle_events`) cover content and pin changes, not access to learner data.

Acceptance criteria:
- AC-A1: contract test per endpoint covers an out-of-scope teacher, an out-of-scope learner, and an unauthenticated call.
- AC-A2: teacher reads of per-learner data produce an audit row with actor, learner, class, time and endpoint (fields **PROPOSED**).
- AC-A3: audit rows are not editable by the actor they describe.

---

## 10. Security and incident response (S-19, S-20, S-21)

- Encryption in transit and at rest (plan §16.1). Specifics (algorithms, key management) are not stated in the sources.
- Dependency scanning: "no critical dependency vulnerabilities" is a CI gate (plan §16.1; doc 10 §5).
- Incident response: a documented breach process and contacts (plan §16.1). **PROPOSED runbook content** (to be placed in `docs/runbooks/` and confirmed by counsel, since notification duties and deadlines vary by jurisdiction):
  1. Detect and classify.
  2. Contain.
  3. Assess affected learners and data classes using the §4 inventory.
  4. Notify per the legal advice obtained under S-1.
  5. Record and review.
  Notification deadlines are not stated here and must come from counsel (D-1).
- Staged rollout halts automatically on a spike in item error reports or success rate leaving the 0.72 to 0.86 band (doc 10 §7); there is no equivalent halt for safety signals (D-7).

---

## 11. DPIA, transparency, legal basis

### 11.1 DPIA (S-23)

Completed before the first pilot school (plan §16.2). Roadmap places it at M6 with the pilot (plan §18); plan §20 item 7 says to book legal and data-protection advice for the Ghana pilot immediately. Contents are not specified in the sources. **PROPOSED** inputs: the §4 inventory, data flows of §8, processors (model provider, notification providers named in tasks.md §14.3: FCM, APNs, Web Push, Meta WhatsApp Cloud API, an email provider), retention schedule (S-9) and the S-12 results.

### 11.2 Transparency page (S-22)

Plain-language privacy page for parents, teachers and learners (plan §16.1). The reading level for learners, translations and where it appears are undecided (D-9).

### 11.3 Legal basis per country (S-1)

Counsel must confirm; this document states no legal conclusion.

| Jurisdiction | Source mention | Status |
|---|---|---|
| Ghana (pilot) | Data-protection law named in plan §16.1 | **Decision needed, counsel (D-1)** |
| Sierra Leone | Same | **Decision needed, counsel (D-1)** |
| Nigeria | Same | **Decision needed, counsel (D-1)** |
| United States | "Any US/EU users" (plan §16.1); MagicSchool's FERPA/COPPA statement is cited as a benchmark only (plan §16) | **Decision needed, counsel (D-1)** |
| European Union | Same | **Decision needed, counsel (D-1)** |

Task 14 states the platform "does not assume one jurisdiction" and lists local privacy law as an input (tasks.md Task 14 reading list).

---

## 12. Privacy checklist template

Used by Definition of Done (doc 10 §9: add this item per plan §21.3) and by the Privacy gate (plan §21.2: features touching learner data require a completed checklist). Attach to the change request. Any "No" or blank on a required line blocks merge unless a decision record is linked.

```
# Privacy checklist
Feature / change: ____________   Author: ______   Reviewer (human, doc 10 §6): ______
Date: ______   Related spec section / task: ______

## A. Data
- [ ] A1. Data inventory (doc 13 §4) updated, or "no new learner data" stated with reason
- [ ] A2. Each field collected is needed by the engine or teacher dashboard (S-6); reason noted per field
- [ ] A3. No precise location; no contact data beyond need (S-6)
- [ ] A4. New PII response fields marked x-pii: true; none on unauthenticated endpoints (S-7)
- [ ] A5. No PII in logs, metrics, traces or error messages (S-8)
- [ ] A6. RCT or analytics events use hashed learner id and check consent (S-8, S-25)

## B. Consent
- [ ] B1. Consent basis stated: learner / parent / school-mediated (S-2, S-3)
- [ ] B2. Parent contact or voice capture: consent record with wording and timestamp (S-4, S-5)
- [ ] B3. Withdrawal path tested and stops the feature immediately (S-4)

## C. Retention and deletion
- [ ] C1. Retention period for each new data class set in the retention schedule (S-9)
- [ ] C2. Covered by learner deletion and by export (S-10, S-11)

## D. Models and third parties
- [ ] D1. Any data sent to a model or third party is listed, with provider (S-14)
- [ ] D2. No training on learner data, per contract (S-14)
- [ ] D3. Photo / audio / free text: EXIF stripped, faces and names rejected, retention limit (S-15)
- [ ] D4. No new runtime model dependency on a Tier 0 path (doc 10 §6)

## E. Access
- [ ] E1. RBAC enforced server-side; contract tests include out-of-scope cases (S-16, S-17)
- [ ] E2. Access to learner data by teacher or admin is audited (S-18)
- [ ] E3. Teacher sees only own classes (S-16)

## F. Tutor-facing changes (skip if none)
- [ ] F1. Safety suite re-run and passing for this prompt/model/moderation change (S-12)
- [ ] F2. Math gate verified (doc 12 AC-TU3)

## G. Dignity and engagement (plan §21.3)
- [ ] G1. Teacher- or parent-facing views: no rank, percentile, grade-level label, "behind"/"ahead" (doc 12 §5.2)
- [ ] G2. Engagement feature checked against docs/REJECTED_FEATURES.md; decision record linked

## H. Sign-off
- [ ] H1. Counsel input recorded where a legal question arose (S-1)
- [ ] H2. Open items and linked decision records: ____________
```

---

## 13. CI and release additions

Source: plan §16.2, §21.2, §21.3.

| Gate | Rule | Status |
|---|---|---|
| Privacy | Feature touching learner data requires a completed checklist (§12) | Not built |
| Tutor safety | S-12 passes before each tutor release | Not built |
| PII | S-7 grep gate; S-8 logging lint | Not built (no `x-pii` markers in `backend/app`) |
| Consent | S-4 consent gate test | Not built |
| Dependency | S-20 | Specified in doc 10 §5; no scanning step found in `.github/workflows` (content-ci, engine-ci, sync-parity) |
| DPIA | Completed before first pilot school | Not done |

---

## 14. Implementation status

Verified 2026-11-18 by inspecting `backend/app`, `web/src`, `engine/src`, `.github/workflows` and the docs. `docs/firebase-project` and `.env` were deliberately not opened.

| Requirement area | Status | Evidence |
|---|---|---|
| Users, consent, parent contacts, notification models | Not implemented | Tables in `backend/app/db/models/`: content, framework, sync tables only (including `attempts`, `learner_node_state`, `learner_sync_cursor`, `sync_anomalies`); no users or consent tables |
| Authentication and RBAC | Not implemented | `get_principal` in `backend/app/api/sync.py` is a placeholder; sync-contract "Open work": "Real auth ... awaiting Task 13" |
| Learner-scoped sync check | Partial | sync-contract §6 describes rejection of attempts for learners outside the principal's set (`learner_not_authorized`); depends on the placeholder principal |
| `DELETE /api/v1/me`, attempt export | Not implemented | No such route in `backend/app/api/` (admin, analytics, frameworks, learners, sync) |
| `x-pii` markers, OpenAPI PII gate | Not implemented | No `x-pii` in `backend/app` |
| Audit log of teacher or admin access to learner data | Not implemented | Only pin-migration and item-lifecycle audit tables exist |
| Classroom and teacher code | Not implemented | See doc 12 §10 |
| Tutor backend, moderation, safety suite | Not implemented | No tutor route or moderation code in `backend/app`. A tutor UI exists on the web (`web/src/app/(student)/tutor/page.tsx`, `web/src/components/student/AskAiSidePanel.tsx`) calling `/api/tutor/chat`, which has no backend; it is a free-chat surface contrary to doc 12 §6 |
| Notification, nudge, digest services | Not implemented | No service or model |
| Photo, voice, free-text marking pipeline | Not implemented | No EXIF, image or audio handling found in `backend/app` or `web/src` |
| Model provider | Exists | `backend/app/ai/gemini.py`; `gemini_calls` table (cost and call log). No contractual no-training evidence in repository |
| Dependency scanning gate | Not found | Workflows: `content-ci.yml`, `engine-ci.yml`, `sync-parity.yml` |
| Privacy page, DPIA, retention schedule, safeguarding policy, incident runbook | Not written | `docs/runbooks/` contains `framework-expansion.md` only |
| Counsel confirmation per country | Not on file | None in repository |

Summary: no learner-data protection control specified here exists yet. The platform currently stores attempts and engine state keyed by learner id with a placeholder principal; the pilot should not begin before S-1, S-2, S-16 to S-18, S-23 and the relevant tutor requirements are in place.

---

## 15. Decisions (resolved 2026-11-18)

Recorded in [DR-019](decisions/DR-019-documentation-set-decisions.md), accepted on the owner's delegated instruction. `PROPOSED` markers earlier in this document that concern these items are superseded by the table below. Provisional rows are to be tuned from pilot data; OPEN rows need a named owner. Code and schema consequences are listed in [IMPLEMENTATION-FOLLOWUPS.md](decisions/IMPLEMENTATION-FOLLOWUPS.md).

| ID | Decision | Status |
|---|---|---|
| DD-13-1 | **Legal basis per country.** Cannot be decided by engineering. Counsel must confirm for Ghana, Sierra Leone, Nigeria and any US/EU user before the pilot (plan §16.1, §20 item 7). Nothing here is legal advice. | OPEN |
| DD-13-2 | **Minor-consent model.** Hybrid: school-mediated consent for class accounts with a parent notice; per-learner parent consent for individual accounts; explicit parent consent always required for voice and photo features. Age thresholds per country are counsel's. | ACCEPTED (provisional) |
| DD-13-3 | **School attestation.** A named school authority attests (name, role, date) and the record is stored; a school record is mandatory before a class may hold learner data (DD-12-5). | ACCEPTED |
| DD-13-4 | **Retention.** DD-07-9, including the 30-day hard-delete grace. Counsel may shorten or lengthen. | ACCEPTED (provisional) |
| DD-13-5 | **Identity fields.** Learner: pseudonymous id, first name or nickname, enrolled band (never shown), framework pin, locale, timezone; no date of birth (an age band at most), no email required (join code). Teacher: name and a contact for login. Parent: contact value and the consent record. | ACCEPTED |
| DD-13-6 | **Safeguarding.** A designated safeguarding lead is named per deployment before the pilot (the owner supplies the names and contacts: OPEN). On a disclosure of harm or personal data the tutor stops the dialogue, shows a fixed supportive message pointing to a trusted adult or the teacher, and flags the lead; the flag is reviewed the same school day (provisional). | ACCEPTED (provisional) |
| DD-13-7 | **Safety suite and image checks.** Categories are those in plan §16.2 (jailbreak, self-harm, personal data); required cases must pass 100% before each tutor release; English only at the pilot. Images with a detected face or name text are rejected (conservative). The detector and its error rates are chosen by the security review: OPEN. | ACCEPTED (provisional) |
| DD-13-8 | **Audit log.** Records actor, role, action, target learner, timestamp. No location. Readable by security and the data-protection owner. Kept 12 months. | ACCEPTED |
| DD-13-9 | **Transparency page.** Plain English at the pilot; reachable before placement and consent; a reading level suited to a parent or a learner of the lowest enrolled band. | ACCEPTED |
| DD-13-10 | **Model provider.** Gemini is the provider for authoring. For learner-facing calls (tutor, marking) the paid API with a data-processing agreement, a no-training clause and a confirmed region is a precondition; if it cannot be confirmed before the pilot, the tutor and marking are disabled and the hint ladder is used (fail closed). Counsel and procurement confirm. | ACCEPTED (provisional) |
| DD-13-11 | **RCT data access.** Researchers receive keyed-hash identifiers only; raw learner data never leaves the platform. What is published is set in the pre-registration. | ACCEPTED |
| DD-13-12 | **Notification caps.** DD-01-6. | ACCEPTED |

---

## Change Log

**v1 — 2026-11-18**

- Created from plan §16 and §21 (plan §21.1 named this file `12-safety-privacy-spec.md`; numbering is now fixed at 13).
- Turned plan §16.1 rows into S-1 to S-26 with owner and verification; added the privacy checklist (§12); added implementation status.
- Left retention periods, age thresholds and per-country legal basis as decisions for counsel.

**Open items:** D-1 to D-12 above. Decisions are recorded in DR-019.

**Decision records:** DR-003 (tutor offers, affects G-4 and doc 12 §6), DR-010 (pending attempts for deferred-marked free-text, photo, audio), DR-018 (self-explanation prompt evaluation of learner free text), DR-009 (dose target affecting nudge frequency)
