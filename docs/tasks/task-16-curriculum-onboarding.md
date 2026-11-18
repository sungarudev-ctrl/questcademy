## TASK 16 — Curriculum Team Onboarding and the First Country Import

---

**Context:** Tasks 1–15 complete and confirmed. The platform is production-ready. The engine is stable, the content pipelines are live, the Content Studio is live, and the infrastructure is deployed to `staging` and `prod` with the reference device wired into CI.

What does not yet exist is a **curriculum team** with a defined workflow — and, critically, one proven case of a **first country import** performed end-to-end by that team, on real syllabus content, with a real framework going active in `prod`.

This task is not a coding task. It is a **handover task**: produce the documentation, tooling, and rehearsal that turns "the platform can support multi-country curriculum" from a claim into a demonstrated fact.

**Your task:** Write the curriculum-team runbooks, prepare the authoring workspace, and execute the first country import — from blank database to `framework.status = 'active'` in staging — as a rehearsal that the curriculum lead then repeats in production. Document every friction point found. Fix any friction that requires code. **If a code change is required to complete this task, the abstraction has failed; document it as a finding and fix the root cause before proceeding.**

**Read first, in this order:**

1. `docs/00-product-plan.md` **§1** — the three-layer model, in full
2. `docs/00-product-plan.md` **§2** — schema, especially the country layer (§2.9–§2.13)
3. `docs/00-product-plan.md` **§3** — the four pipelines and their framework-aware modes
4. `docs/00-product-plan.md` **§6** — governance, especially the no-bulk-approve rule and the 80% coverage gate
5. `docs/00-product-plan.md` **§11** — Task 7's framework layer reference
6. `docs/02-curriculum-framework-spec.md` — the full framework spec
7. `docs/02-curriculum-framework-spec.md` **§6** — the ten-stage import pipeline
8. `docs/02-curriculum-framework-spec.md` **§9** — governance
9. `docs/05-assessment-item-spec.md` **§8** — bank composition targets
10. `docs/09-authoring-rules.md` **if it exists** — authoring rules (if not yet written, this task includes a first draft)

**Deliverables, in order:**

### 16.1 Curriculum team roles and scopes

Formalise the roles that exist in the system (some already exist as RBAC scopes from Tasks 7, 9, and 13; this task publishes them):

| Role | Owns | Cannot |
|---|---|---|
| Curriculum Lead | Skill graph authoring, framework import, objective mapping, coverage decisions, activation | Author items without review; bypass the no-bulk-approve rule |
| Reviewer | Review nodes, content, items, localizations, mapping proposals | Activate a framework; change the skill graph |
| Localizer | Localization briefs, overrides for a specific framework | Touch canonical content or base items |
| Authoring Assistant | Author hand-written content outside the AI pipeline | Approve their own work |
| Content Admin | Operational tasks: jobs, retries, cost reports | Approve anything |

Every role is documented with its RBAC scope. No role has "admin" as a catch-all.

### 16.2 Onboarding pack for the curriculum team

`docs/curriculum-team/`:

- `00-start-here.md` — what the platform is, what it is not, and the reading order (links to docs 02, 03, 05).
- `01-roles-and-scopes.md` — the table above.
- `02-skill-graph-authoring.md` — how to author a node: the atomicity test, the naming convention, the misconception requirement, the atomicity checklist.
- `03-framework-import.md` — the ten-stage pipeline as a step-by-step operational runbook with screenshots of the Content Studio.
- `04-objective-mapping.md` — how to map an objective to nodes, how to handle ambiguous objectives, why bulk approve is prohibited, what to do when an objective has no good node.
- `05-content-review.md` — how to review AI-generated content against the quality panel, when to reject, how to write a rejection reason that improves the next generation.
- `06-item-review.md` — how to review an item, distractor tagging, when a distractor's misconception is wrong, when to retire an item.
- `07-localization.md` — how to build a localization brief, how to review a localization override, why math-invariance matters.
- `08-coverage-and-activation.md` — how coverage is computed, what the 80% gate means, what to do when coverage stalls.
- `09-governance.md` — the change-approval matrix, with a note that some changes require sign-off from more than one role.
- `10-faq.md` — the questions that come up in practice, with answers that link to the specs.

Every document is written for a **non-engineer** — no code, no schema, no SQL. The Content Studio is the only interface the curriculum team uses.

### 16.3 The first country import — rehearsal

Execute, on `staging`, a full end-to-end import of one country's framework. This is not a hypothetical — it is the real syllabus, real objectives, real review.

**Prepare:** pull the official syllabus PDF for the target framework. If a public syllabus is not available, use a genuine internal draft and record its provenance.

**Execute, in order, following the ten-stage pipeline from doc 02 §6:**

1. Create the country row (if not already present).
2. Create the framework row in `draft`.
3. Add the grade bands and their ordinals.
4. Import the syllabus:
   - Upload the PDF.
   - Run extraction.
   - Correct every objective (this is not a spot check — every objective is read).
   - Record the time spent.
5. Propose mappings:
   - Run the mapper.
   - Review every proposal — accept, replace, or mark unmapped.
   - Record every objective that required human replacement, with the reason.
6. Author missing nodes:
   - Run Pipeline A1 for the residuals.
   - Review and approve each node.
   - If any node fails the atomicity test, note the pattern — this is a signal the extractor or the atomicity heuristic may need revision.
7. Generate content:
   - Run Pipeline A2 for every newly authored node.
   - Review and approve.
8. Generate items:
   - Run Pipeline B.
   - Review every item.
   - Record the rejection rate — if > 30%, the item prompt needs revision.
9. Localize:
   - Write the localization brief.
   - Run Pipeline D over the framework's items and content.
   - Review and approve.
10. Compute coverage:
    - Run the coverage service.
    - If < 80%, generate the residuals and iterate.
    - Activate only when ≥ 80%.

**Record, at each stage:**

- Wall-clock time spent.
- Where the pipeline produced unusable output.
- Where the Content Studio UI was confusing.
- Where the process required a workaround.
- Any place the spec and reality disagreed.

### 16.4 The findings document

`docs/curriculum-team/first-import-findings.md`:

- Every friction point, in the order encountered.
- For each: was the root cause content, UX, pipeline, or spec?
- For content: no code change; document the pattern for the next import.
- For UX: a GitHub issue with a screenshot; the fix is scheduled.
- For pipeline: a prompt version bump or a validator change; documented and versioned.
- For spec: a written finding. If the spec was wrong, the spec is amended with a dated correction note (matching the style of the corrections already present in docs 02 and 04). **Do not silently change the spec.**

### 16.5 The second country's dry-run

Before declaring the abstraction sound, dry-run a **second** country's import using the process from the first, without touching code. The second country is deliberately chosen to be similar enough that overlap is meaningful (a shared administering body or a shared curriculum tradition) but different enough that the abstraction is tested (different grading scale, different grade-band naming, different localization context).

The dry-run does **not** complete the second country's import — it verifies only that the process transfers. Every step that required re-explanation is a documentation failure.

If any step required a code change, the abstraction has failed. **Document the failure, fix the root cause, and repeat the dry-run before proceeding.**

### 16.6 The curriculum team's workspace

Verify the Content Studio is fully usable by the curriculum team without engineer support:

- Every role's default landing page is correct.
- Every action the curriculum lead needs is reachable from the dashboard.
- The review queue shows the right things in the right order.
- The coverage dashboard shows gaps in a form that leads to the next action.
- The localization brief is editable from the UI, not from a database console.
- The generation job monitor is usable without reading logs.

If any of the above is not true, it is a UX finding and a fix is scheduled before this task is closed.

### 16.7 The curriculum team's training

Run a two-session training with the curriculum lead:

- **Session 1 — 90 min.** Walk through the skill graph, the framework import, and the mapping review. End with a live exercise: import a small supplementary syllabus fragment and map three objectives.
- **Session 2 — 60 min.** Walk through content review, item review, localization, and coverage. End with a live exercise: review and approve five items from the first country's import.

Record the sessions. Publish the recordings to `docs/curriculum-team/recordings.md` with timestamps for each topic.

### 16.8 Acceptance criteria for the abstraction

The task is complete only when all of the following are true:

- The first country's framework is `active` on `staging`, at ≥ 80% coverage, with every mapping human-confirmed.
- The second country's dry-run completed with **zero code changes** required.
- Every finding from the first import is documented, classified, and either resolved or scheduled.
- The curriculum team can operate the platform without engineer assistance for the entire import flow, verified by observation during training.
- No finding resulted in a schema change, a new endpoint, or a new admin UI screen.
- Any finding that *did* require a code change is treated as an abstraction failure and the root cause is fixed before the task is closed.

### 16.9 The report

`docs/curriculum-team/first-import-report.md`:

- Which country, which framework, which syllabus version.
- The coverage figure at activation.
- The total wall-clock hours spent by the curriculum team.
- The total AI cost of the import (from the cost service).
- The rejection rate at each review stage.
- The dry-run result for the second country.
- The list of findings, with links to their resolutions.
- A one-paragraph verdict on whether the abstraction held.

**Definition of done:**

- The curriculum team onboarding pack is published.
- The first country's framework is active on staging.
- The second country's dry-run completed with zero code changes.
- The findings document exists, with every finding classified and every code-required finding resolved.
- Training was delivered and recorded.
- The curriculum team can operate the platform without engineer assistance.
- The abstraction verdict is written down and honest. If it failed, that is documented, not papered over.

**Report at the end:** which sections you read, the coverage figure at activation, the number of mappings corrected by the human reviewer, the second country's dry-run result, and the abstraction verdict.

**Do not proceed to Task 17 until the abstraction verdict is "held" or until any failure has been resolved and a re-run has been performed.**
