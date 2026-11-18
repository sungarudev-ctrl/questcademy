## TASK 9 — Content Studio (Country Tab, Review Queue, Coverage Dashboard)

---

**Context:** Tasks 1–8 complete and confirmed. The framework layer is stable. Content pipelines are live and staging every generated artifact behind a review status. Coverage is computed. The engine is stable and never called by the admin UI.

**Your task:** Build the Content Studio — the Next.js admin app that lets a curriculum lead run the entire content lifecycle for a country, review everything the AI generated, and gate framework activation on coverage.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§5** — UI screens, especially §5.4
2. `docs/00-product-plan.md` **§6** — governance rules the UI must enforce
3. `docs/00-product-plan.md` **§11** — task 9 acceptance criteria
4. `docs/02-curriculum-framework-spec.md` **§6** — the ten-stage import pipeline
5. `docs/02-curriculum-framework-spec.md` **§9** — governance, no bulk approve
6. `docs/05-assessment-item-spec.md` **§7** — item lifecycle, which statuses can be approved
7. `docs/10-engineering-standards.md` **§5** — the "reviewed" status is the publish floor
8. `docs/10-engineering-standards.md` **§6** — review checklist

**Deliverables, in order:**

### 9.1 Studio shell

`web/src/app/(admin)/layout.tsx`:

- Requires an admin role (`curriculum_lead`, `reviewer`, `content_admin`).
- RBAC enforced **server-side**; the layout only hides UI for defense in depth.
- Left rail: Country selector (persists to URL), framework selector, then the sections below.
- Top bar: user, role, "framework status" pill (`draft | importing | mapping | authoring | reviewing | piloting | active | superseded`), coverage percentage.

### 9.2 Dashboard — `(admin)/studio/page.tsx`

For the selected framework:

- Coverage gauge with the 80% gate marked.
- Review queue summary: count of pending nodes, contents, items, mappings, localizations.
- Latest generation jobs with status and elapsed time.
- Cost to date for this framework (from `cost_service`), broken down by pipeline.
- Blockers list from `framework_rollouts.blockers` (e.g., "3 mappings awaiting confirmation", "Coverage 78% < 80%").
- Primary CTA: `Activate Framework` — disabled unless `coverage_pct >= 80` and `blockers` is empty; a hover tooltip states the reason when disabled.

### 9.3 Skill Graph — `(admin)/studio/skill-graph/page.tsx`

- Prerequisite graph for the current subject, filtered by topic.
- Search by `node_id`, `title`, or `learner_title`.
- Each node shows status, `est_minutes`, hard/soft prerequisite count, and a `Generate content` action.
- Duplicate detection: highlight pairs with title similarity > 0.8 — the lead can merge or deprecate.
- **Node IDs are never editable in the UI.** A rename is impossible; a deprecation is a separate action with a reason field.

### 9.4 Framework Importer — `(admin)/studio/frameworks/[id]/import/page.tsx`

Five-step wizard, matching doc 02 §6:

1. **Upload** — the syllabus PDF (or paste the text). Records provenance.
2. **Extract** — triggers `task_extract_objectives`. Shows verbatim objectives as they arrive.
3. **Correct** — the lead edits the extracted list. Every objective is editable; the objective code is editable; the grade band is a dropdown populated from `framework_grade_bands`. The lead cannot proceed until every objective has been reviewed.
4. **Map** — for each objective, the lead sees the proposed node(s) with confidence scores from `objective_node_map_proposals`. **Each mapping is confirmed or corrected individually.** There is no "Approve all" button, and the API rejects bulk operations. The lead may accept, replace with a different node, or mark as unmapped.
5. **Coverage** — after mapping, the coverage report renders. Below 80%, the wizard shows the gap list and the CTA to generate missing nodes or items.

The wizard state persists per step; a page refresh does not lose progress.

### 9.5 Content Review — `(admin)/studio/content/page.tsx` and `.../content/[id]/page.tsx`

- List view: filter by node, status, reviewer, framework applicability. Sort by `created_at`, `estimated_minutes`, and content length.
- Detail view:
  - Block[] renderer (shared with the student reader) with a side-by-side JSON view.
  - Quality check panel: reading-level result, SymPy verification of every worked example, dedup result, KaTeX validity, worked-example count.
  - **Side-by-side approval flow:** base content (canonical) on the left; localized overrides for the currently-selected framework on the right, when any exist.
  - Approve / Reject with a mandatory reason on reject.
  - Reject re-queues generation with the reason appended to the prompt's `context` block; the reason is stored in the job row.
- **Per-framework visibility:** an approval of base content does not imply approval of any localization. Each is approved independently.

### 9.6 Item Review — `(admin)/studio/items/page.tsx` and `.../items/[id]/page.tsx`

- List with the same filters, plus: type, tier, discrimination band, distractor-tagging status.
- Detail view:
  - Full item rendered with the production item component (same as the student practice screen).
  - Distractor table: each wrong option, its `misconception_id`, and the misconception's `learner_facing_name`.
  - Hints accordion, all three levels, in order.
  - Worked solution.
  - Quality panel: SymPy verification result per numeric answer, reading level, media sizes, hint count.
  - **Tagging review:** the lead can accept the distractor tags or reassign each one. The UI refuses to approve an item with an untagged distractor.
  - Approve / Reject with mandatory reason on reject.
- Bulk actions are limited to **filtering and sorting only**. Approving in bulk is impossible at the API layer and the UI has no path to attempt it.

### 9.7 Mapping Review — `(admin)/studio/frameworks/[id]/mappings/page.tsx`

- Table of every objective in the framework with its current mapping (or unmapped state) and the coverage status.
- Each row expands to show the mapped nodes, the coverage of each node, and a per-row `Confirm`, `Edit`, or `Mark unmapped` action.
- **No "Confirm all" button. No keyboard shortcut to approve a row without opening it.** Every action records the actor and time.
- Below the table, a live coverage figure and the same gate indicator as the dashboard.

### 9.8 Localization Review — `(admin)/studio/localization/page.tsx`

- Per framework, list every `content_localizations` and `item_localizations` row with `review_status = 'pending'`.
- Detail view shows the base artifact and the proposed override side by side.
- The math-invariance check result is shown prominently. If SymPy found a change to a numeric answer, the override is **blocked from approval** and the reason is displayed.
- Approve / Reject with reason.
- Bulk approve is prohibited at the API layer.

### 9.9 Jobs Monitor — `(admin)/studio/jobs/page.tsx`

- Live view of `generation_jobs` for the selected framework.
- Columns: type, target, status, attempts, elapsed, error (truncated, expandable), cost.
- Retry button per failed job, capped at 3 total attempts.
- Live updates via Server-Sent Events from a `/api/admin/jobs/stream` endpoint.

### 9.10 Coverage Dashboard — `(admin)/studio/frameworks/[id]/coverage/page.tsx`

- Objectives grouped by grade band.
- For each objective: mapped nodes, node coverage, item count, tier-3 count, and a status pill (`full`, `partial`, `unmapped`).
- The overall coverage gauge with the 80% gate.
- A gap list sorted by grade band. Clicking a gap jumps to the node's `Generate content` action.

### 9.11 Cross-country view — `(admin)/studio/countries/page.tsx`

- One row per country with each active framework.
- Coverage, active learners, mean 30-day retention, mean success band, item error rate.
- **Reads only from `framework_cohort_stats`.** No query joins `skill_nodes` or `items`.
- A country card can be expanded to show its framework's rollout phase.

### 9.12 Activation flow

- The `Activate Framework` action is a modal, not a one-click button.
- The modal shows the coverage figure, the blocker list, and the last diff report (if any).
- The lead types the framework ID to confirm, then confirms again with a checkbox accepting the coverage-gate implications.
- The API rejects the call if `coverage_pct < 80` or `blockers` is non-empty. The UI cannot circumvent this — it is enforced server-side.

### 9.13 Component architecture

New components under `web/src/components/admin/`:

- `CoverageGauge.tsx`
- `ReviewQueueTable.tsx`
- `QualityCheckPanel.tsx` (shared across content, items, and localizations)
- `BlockRenderer.tsx` — **already exists in the student app**; the admin reuses it, does not fork it
- `ItemRenderer.tsx` — same; shared with the practice screen
- `DistractorTable.tsx`
- `HintAccordion.tsx`
- `FrameworkStatusPill.tsx`
- `BlockerList.tsx`
- `GenerationJobRow.tsx`
- `SkillGraphTree.tsx` (extension of the existing component, not a fork)
- `MappingReviewRow.tsx`
- `LocalizationDiff.tsx`
- `ActivateFrameworkModal.tsx`

**Rule:** the admin UI renders items and content through the same components the student app uses. There is one `BlockRenderer`, one `ItemRenderer`. Any rendering bug fixed in one is fixed in both.

### 9.14 Hooks

New hooks under `web/src/lib/hooks/admin/`:

- `useFramework(id)`
- `useCoverage(frameworkId)`
- `useReviewQueue(frameworkId, kind)`
- `useJobStream(frameworkId)`
- `useCostReport(frameworkId)`
- `useMappingProposals(frameworkId)`
- `useLocalizationQueue(frameworkId)`

All hooks use the shared Axios client with auth and RBAC headers. Server-Sent Events reconnect on drop with exponential backoff.

### 9.15 API additions on the backend

Add these endpoints, all admin-scoped:

```
GET    /api/admin/frameworks/:id/rollout
PATCH  /api/admin/frameworks/:id/blockers
POST   /api/admin/frameworks/:id/objectives/extract
PATCH  /api/admin/objectives/:id
POST   /api/admin/objectives/:id/mappings       # single objective, single node
DELETE /api/admin/objectives/:id/mappings/:node
POST   /api/admin/mappings/:proposal_id/confirm
POST   /api/admin/mappings/:proposal_id/reject
GET    /api/admin/content/:id/quality
POST   /api/admin/content/:id/approve
POST   /api/admin/content/:id/reject
GET    /api/admin/items/:id/quality
POST   /api/admin/items/:id/approve
POST   /api/admin/items/:id/reject
GET    /api/admin/localizations?framework_id=…
POST   /api/admin/localizations/:id/approve
POST   /api/admin/localizations/:id/reject
POST   /api/admin/jobs/:id/retry
GET    /api/admin/jobs/stream?framework_id=…    # SSE
GET    /api/admin/costs?framework_id=…
GET    /api/admin/coverage/:framework_id
GET    /api/admin/countries/compare
```

**No bulk endpoint exists.** Add a 405 handler on `/api/admin/*/bulk` returning a documentation link, so a future contributor cannot accidentally add one and have clients depend on it.

### 9.16 Tests

`web/src/app/(admin)/**/__tests__/`:

- Component tests for the coverage gauge, quality check panel, item renderer, distractor table.
- Interaction tests for the framework importer wizard, each step persisting correctly.
- An integration test that walks the entire flow against a local backend fixture: import a syllabus → correct objectives → map one at a time → generate content → review content → generate items → review items → generate localizations → review localizations → compute coverage → attempt activation at 79% (fails) → add items to cross 80% → attempt activation (succeeds).

`backend/tests/integration/test_admin_api.py`:

- Every admin endpoint enforces RBAC.
- The bulk approve endpoint returns 405.
- Approve and reject record actor and time.
- A rejected content item's reason appears in the subsequent generation job's `params`.

### 9.17 CI gates (Studio)

- **No bulk approve endpoints** — grep gate on the API routes folder.
- **No admin UI imports `/engine`** — lint rule. The admin UI never runs engine code.
- **Only one `BlockRenderer` and one `ItemRenderer`** — lint rule: these components are imported from a single canonical location.
- **Every review action records an actor** — a test that walks each approve/reject and asserts the audit row.

**Definition of done:**

- The Content Studio runs locally against a backend fixture and can complete an end-to-end framework import, review, and activation cycle.
- Activation is impossible below 80% coverage at the API layer, not just the UI.
- Bulk approve has no path in the UI and no endpoint on the API.
- Every review action is audited.
- The admin UI renders items and content through the shared renderers, verified by an import-check test.
- The SSE jobs stream reconnects after a dropped connection.
- The `BlockRenderer` and `ItemRenderer` are the same files used by the student app.
- `npm run typecheck && npm run test` clean in both `web/` and `backend/`.
- All new CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the exact RBAC scopes on each endpoint, how you verified bulk approve has no path, and any place the spec was ambiguous.
