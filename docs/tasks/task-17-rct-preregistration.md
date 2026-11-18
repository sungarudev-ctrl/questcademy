## TASK 17 — RCT Pre-Registration and Instrumentation

---

**Context:** Tasks 1–16 complete and confirmed. The first country's framework is live. The platform is producing learning outcomes. The Phase 3 RCT from doc 03 §14 has been deferred until now because it required a live platform, real learners, and enough data to answer its questions.

This task **pre-registers** the RCT and builds the instrumentation that makes its five questions answerable. It does not run the trial — it makes the trial runnable. Analyzing the questions post hoc against a moving product yields nothing publishable and nothing trustworthy; this task is the discipline that makes the eventual analysis credible.

**Your task:** Pre-register the five questions from doc 03 §14, build the instrumentation that captures every variable each question requires, and stand up the shadow-mode infrastructure that lets the platform collect data without changing learner experience.

**Read first, in this order:**

1. `docs/03-learning-science-spec.md` **§1–§12** — every commitment the RCT exists to test
2. `docs/03-learning-science-spec.md` **§14** — the five open questions
3. `docs/03-learning-science-spec.md` **§15** — bibliography (background)
4. `docs/04-learning-engine-spec.md` **§10** — BKT, which is Phase 3 and shadow-mode
5. `docs/04-learning-engine-spec.md` **§14** — telemetry the engine emits
6. `docs/10-engineering-standards.md` **§7** — staged rollout, which the RCT operates inside

**Deliverables, in order:**

### 17.1 Pre-registration document

`docs/rct/preregistration.md`:

A formal pre-registration, in the shape accepted by Open Science Framework or an equivalent registry. Contents:

- **Title:** the platform's internal working title for the trial.
- **Principal investigator:** the curriculum lead, with the engineering owner named.
- **Background:** a summary of the commitments the trial tests, each cited to the relevant doc 03 section.
- **The five questions**, each stated as a falsifiable hypothesis with a primary outcome and a minimum detectable effect:

  **H1 — The two-session mastery gate.** Learners under a two-session non-consecutive gate achieve higher 30-day retrieval retention than learners under a single-session gate, at a margin of ≥ 5 percentage points.
  - Primary outcome: 30-day retrieval retention, measured as the proportion of mastered nodes still correct on first review after ≥ 30 days.
  - Design: within-subject randomization at the node level, with a coin flip per (learner, node) determining which gate applies.
  - Analysis: mixed-effects logistic regression, learner and node as random effects.
  - Minimum detectable effect: 5 pp at 80% power, α = 0.05.
  - Sample size: computed and stated.

  **H2 — The 0.75–0.85 success band.** The desirable-difficulty band as specified yields higher 30-day retention than a higher band (0.85–0.92) in this population.
  - Primary outcome: same as H1.
  - Design: between-learner randomization, stratified by placement frontier.
  - Analysis: as H1.

  **H3 — Misconception-specific remediation.** Remediation that targets a named misconception outperforms generic re-explanation on subsequent-item success rate.
  - Primary outcome: success rate on the next 3 items on the same node after remediation.
  - Design: within-subject randomization at the remediation event level.
  - Analysis: paired comparison with cluster-robust standard errors.

  **H4 — The dose threshold.** The 12-hour threshold over 8 weeks produces detectable gains; below it, gains are not detectable.
  - Primary outcome: end-of-unit mastery rate as a function of accumulated dose.
  - Design: observational, with dose as the independent variable and covariate adjustment for baseline ability.
  - Analysis: dose–response curve fit, pre-registered functional form.

  **H5 — The parent WhatsApp nudge.** The parent nudge increases weekly dose relative to no nudge, and the effect size relative to teacher assignment is measured.
  - Primary outcome: weekly minutes.
  - Design: 3-arm between-learner randomization (no nudge, parent nudge, teacher assignment).
  - Analysis: intention-to-treat with per-protocol secondary.

- **Analysis plan:** the exact models, the exact primary outcomes, the exact transformations. No exploratory analyses in the primary results.
- **Stopping rules:** when the trial stops early (futility, harm, or clear benefit on the primary outcome).
- **Data sharing:** what will be published, what will be retained internally, and what will never leave the platform (learner PII, per the platform's privacy policy).
- **Ethics statement:** consent, withdrawal, and minor-specific considerations.

Every one of the five questions is registered with the same discipline. None are left vague.

### 17.2 Instrumentation

Every variable the pre-registration requires must be captured. The instrumentation is added as **passive telemetry** — it never changes learner experience.

**New event types added to `/engine/src/telemetry.ts` and to the backend analytics pipeline:**

- `mastery_gate_variant` — which gate the node was under (single-session or two-session), and whether the learner crossed it.
- `success_band_assignment` — the band the learner is in for the current trial window.
- `remediation_served` — remediation event, with `misconception_id`, `variant` (specific vs generic), and the outcome of the next 3 items.
- `dose_accumulated` — weekly minutes, with the exact timestamp window.
- `nudge_variant` — which arm the learner is in for H5, and whether the nudge was delivered, opened, and acted upon.

Every event carries: `learner_id` (hashed for storage per the privacy policy), `framework_id`, `node_id` (where relevant), `occurred_at`, and the arm assignment.

**Cohort assignment:**

- Assignment happens once per (learner, node) or per (learner, window), depending on the hypothesis.
- Assignment is persisted in a `rct_assignments` table:

```sql
CREATE TABLE rct_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trial_id        TEXT NOT NULL,             -- 'h1_mastery_gate' | 'h2_success_band' | ...
  learner_id      UUID REFERENCES users(id),
  node_id         TEXT REFERENCES skill_nodes(node_id),
  arm             TEXT NOT NULL,             -- trial-specific
  assigned_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (trial_id, learner_id, node_id)
);
```

**Consent:**

- Every learner in the trial has consented via the standard onboarding flow.
- Consent can be withdrawn at any time; withdrawal excludes the learner's data from the primary analysis and from the published dataset.
- The consent wording states what the learner is agreeing to at an appropriate reading level for the youngest enrolled grade.

**Blinding:**

- The learner is never told which arm they are in.
- The curriculum lead is never told which learners are in which arm during the trial.
- Analysis is performed by the engineering owner, not by the curriculum lead, to avoid accidental bias.

### 17.3 Shadow mode

Three of the five hypotheses require comparing behaviour the platform does not currently run in production. These are prepared in **shadow mode**:

- **H1 (single-session gate).** A shadow evaluation runs the alternative gate in the background for every mastery event, and records what *would have happened* without changing the learner's path. The comparison group in the primary analysis uses this shadow data; the treatment group uses the live gate.

- **H2 (higher success band).** A shadow selection runs the higher band in parallel, records what item *would have been served*, and the analysis compares the predicted success rate under the two bands against the actual retention.

- **H3 (generic remediation).** The generic-remediation variant is generated for every remediation event, and served only when the trial is active in a cohort that has consented.

Shadow mode has no learner-visible effect. It runs server-side, produces telemetry only, and is disabled by a flag on a per-trial basis.

### 17.4 The RCT dashboard

An admin-only view: `(admin)/studio/rct`.

- Trial status per hypothesis: enrolled, arm counts, days elapsed, sample size progress toward pre-registered target.
- Per-arm summary statistics (no primary analyses — those are pre-registered and analysed at the end).
- A prominent banner: **"Primary analyses are pre-registered and not to be run before trial close."**
- A secondary view, restricted to the engineering owner, allows running the pre-registered analyses on synthetic data for pipeline verification only.

### 17.5 The trial-close process

`docs/rct/trial-close.md`:

- The exact sequence: freeze the data, export, run the pre-registered analyses, write the results.
- The template for the results document, with slots for each hypothesis.
- The commitment: results are published whether they confirm or contradict the pre-registered hypotheses.
- The mechanism for reporting unexpected findings — as secondary analyses, clearly labelled as such, in a separate section, after the primary results.

### 17.6 Tests

- `test_rct_assignment.py` — assignment is deterministic, unique per (trial, learner, node), and reproducible.
- `test_rct_shadow_mode.py` — shadow evaluation produces telemetry without affecting the learner's served item or mastery state.
- `test_rct_consent.py` — withdrawal excludes the learner from the primary analysis dataset.
- `test_rct_dashboard_restriction.py` — the primary analyses are not visible to the curriculum lead; only the engineering owner can access the synthetic-data analysis view.
- `test_rct_telemetry_completeness.py` — every variable the pre-registration requires is present in the telemetry for a sample of learners.

### 17.7 CI gates

- **No primary analysis in the dashboard** — a test that asserts the analyses endpoints are not reachable by non-engineering roles.
- **Shadow mode has no learner-visible effect** — an integration test that asserts served items and mastery states are identical with and without shadow mode enabled.
- **Every RCT event has a consent check** — a lint rule that the event producers call the consent service before emitting.
- **Assignment determinism** — running the assignment twice with the same seed produces identical arms.
- **PII in RCT data is hashed** — a lint rule that `learner_id` in the RCT tables is a hash, not the raw UUID.

### 17.8 The report

`docs/rct/preregistration-report.md`:

- The pre-registration as submitted to the registry, with a link to the registry entry.
- The date the registry entry went live.
- The date the trial opens for enrollment.
- The expected trial-close date.
- The names of the investigator, the engineering owner, and the independent reviewer (a person not on the curriculum team).
- Confirmation that every variable required by the pre-registration is instrumented and reachable.

**Definition of done:**

- The pre-registration is written and registered.
- Every hypothesis has a stated primary outcome, design, analysis plan, and minimum detectable effect.
- Instrumentation is complete and tested.
- Shadow mode is implemented and asserted to have no learner-visible effect.
- The RCT dashboard exists, restricted correctly, and the primary analyses are gated to the engineering owner.
- Consent flows are complete, including withdrawal.
- The trial-close process is documented.
- All CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the registry where the pre-registration was filed, the primary outcome for each hypothesis in one sentence each, the sample size computed for H1, and any place the spec was ambiguous.
