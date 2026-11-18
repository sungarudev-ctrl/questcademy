## TASK 10 — Student App: Web (Next.js 14, App Router)

---

**Context:** Tasks 1–9 complete and confirmed. The engine is stable and shipped as a WASM build of `/engine` for the web bundle. The framework layer is live. Content pipelines have published approved content. The Content Studio exists and shares rendering components with the student app — specifically `BlockRenderer` and `ItemRenderer`, which are the **only** sanctioned renderers.

**Your task:** Build the student-facing web application — onboarding, placement, learning path, node reader, practice, tutor, mock tests, progress, profile — and make it fully functional offline-capable with the sync contract from Task 12.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§4** — student-facing flow
2. `docs/00-product-plan.md` **§5** — UI screens
3. `docs/00-product-plan.md` **§7** — engine API surface the web client consumes
4. `docs/00-product-plan.md` **§10** — brand and design system
5. `docs/03-learning-science-spec.md` **§2** — dignity constraint (no grade shown, no comparison)
6. `docs/03-learning-science-spec.md` **§6** — desirable difficulty band
7. `docs/04-learning-engine-spec.md` **§2** — `NodeState`, `Attempt`, `Decision` types the client mirrors
8. `docs/04-learning-engine-spec.md` **§7.2** — placement presentation constraints
9. `docs/05-assessment-item-spec.md` **§3** — item types the client must render
10. `docs/05-assessment-item-spec.md` **§5** — hints, three levels
11. `docs/05-assessment-item-spec.md` **§6** — accessibility
12. `docs/10-engineering-standards.md` **§8** — reference device profile

**Deliverables, in order:**

### 10.1 Client foundation

- Next.js 14 App Router, TypeScript strict.
- Zustand stores for `auth`, `learner`, `nodeState`, `session`, `sync`.
- The engine is loaded from `@examgpt/engine` (WASM build). **The web client never re-implements engine logic.** If a predicate is needed, it is called through the engine package.
- HTTP client with auth interceptor, retry policy, and offline detection.
- A **service worker** (`next-pwa` or a hand-written SW) that caches:
  - The app shell
  - The active node's content (Block[])
  - The active node's item pool (all items ≤ 40 KB media)
  - The engine WASM binary
  - KaTeX fonts
- **Bundle budget:** app shell ≤ 2 MB gzipped excluding media. CI gate.

### 10.2 Onboarding

Route: `/onboarding`.

Three steps, matching doc 02 §3.2 framework selection and doc 04 §7 placement:

1. **Pick framework.** Country → board → framework list, filtered by `status = 'active'`. A learner may not select a framework in any other state.
2. **Placement.** Resumable (doc 04 §7.2). Full-screen, one item at a time, no progress percentage (only "we're finding your starting point"). Abandonment and resumption preserve state.
3. **Confirm target.** Optional exam date → sets the exam window for FSRS compression.

**Hard rule:** no score, no grade, no comparison shown to the learner at any point in onboarding. Copy is forward-looking.

### 10.3 Learning Path

Route: `/learn`.

- Lists nodes grouped by **topic** (navigation only, not dependency).
- Each node shows: `learner_title`, state pill (locked/available/in_progress/mastered/needs_review/relearning), estimated minutes.
- Locked nodes are dimmed and non-clickable; a hover or tap explains "complete X first" using `learner_title` of the blocking prerequisite — never the raw `node_id`.
- No grade band is shown anywhere.
- Available nodes sort by: review-due first, then prerequisite depth ascending, then FSRS urgency.

### 10.4 Node Reader

Route: `/learn/node/[node_id]`.

- Renders `skill_node_content` via the **shared** `BlockRenderer` — the same component the Content Studio uses.
- Uses `content_localizations` overrides resolved server-side by the content resolver. The client receives the resolved view and never sees localization logic.
- KaTeX rendering for every `MathBlock`, inline and block.
- Worked examples render as `WorkedExampleBlock` with progressive step reveal.
- The "Ask AI" side panel is docked right on desktop, bottom sheet on mobile-width viewports.
- A floating "Start practice" button always visible; scroll position is tracked for resumption.
- **No "Mark Complete" button.** Progression is a function of the mastery predicate, not user assertion.

### 10.5 Practice

Route: `/practice/[node_id]`.

- The client calls `selectNextItem` through the engine WASM package on each turn.
- Renders the item via the **shared** `ItemRenderer` — same as Content Studio.
- Implements **all 18 item types** (see doc 05 §3). Phase gating:
  - Phase 1 types (MCQ, multi-select, numeric, expression, cloze, ordering, matching, table) — full implementation.
  - Phase 2 types (number line, diagram labelling, hotspot, categorization) — full implementation.
  - Phase 3–4 types (short response, structured multi-part, graph, geometry, working-photo, audio) — stubs behind a feature flag that renders "coming soon" and disables selection. The engine is instructed not to serve these types until the flag is on.
- Hints: a three-level progressive disclosure. Level 3 **never** reveals the final answer.
- Feedback: immediate, misconception-specific, worded per doc 03 §9. Copy comes from `misconceptions.learner_facing_name`.
- No negative marking. Ever. Partial credit renders as a "partly right" badge but does not count toward the mastery gate.
- Interleaving: every 4th item comes from the review queue (the engine decides this; the client just renders what it receives).
- Latency: the client records `latency_ms` per item, from first paint to answer submission.

### 10.6 Tutor

Route: `/tutor`.

- Standard chat UI. Input supports text and image upload (OCR runs server-side).
- Every response is rendered through `BlockRenderer`, so math renders as KaTeX.
- The engine decides when to escalate — the client only sees a tutor entry point when the engine returns `Decision::escalate_to_tutor`.
- The tutor's RAG is scoped server-side to the learner's currently-pinned framework and the affected node. The client never passes a framework ID explicitly; the server uses the learner's pin.
- Suggested prompts render when the conversation is empty, drawn from the current node's `key_formulas` and `common_mistakes`.

### 10.7 Mock Tests

Route: `/tests`.

- The mock exam reads from `ExamStructure` in the learner's framework, so papers, durations, item types, and mark schemes match the real exam.
- Timer is client-side but validated server-side on submission.
- Mock exam attempts set `is_exam = true` and never count toward the mastery window (doc 04 §4).
- Error carried forward (doc 05 §3.12) is implemented for structured multi-part papers.
- On submission, the client shows a paper-by-paper breakdown, per-node performance, and a comparison to the learner's predicted score band — never a rank or percentile.

### 10.8 Progress

Route: `/progress`.

- Node-level mastery heatmap by topic.
- FSRS schedule preview: upcoming reviews in the next 7 days.
- Predicted exam score band (not a single number — a band, per doc 03 §11).
- Weekly minutes vs the ≥ 80 min dose goal, expressed as "your goal" not "target".
- **No grade level. No rank. No percentile. No comparison to peers.**

### 10.9 Profile

Route: `/profile`.

- Learner details, framework pin (with a "change framework" flow that creates a pin migration and shows mastery is preserved).
- Exam date setting.
- Notification preferences (parent/teacher digest opt-in).
- Accessibility settings: dyslexia-friendly font, reduced motion override, text size.
- Sign out, delete account (with confirmation).

### 10.10 Accessibility (doc 05 §6)

- All images carry alt text; KaTeX emits MathML for screen readers.
- A "read aloud" button on every stem; TTS reads `speech_text` when present, else the sanitized stem.
- Touch targets ≥ 44 dp.
- Keyboard operability on every interactive element.
- Colour is never the sole carrier of meaning — always paired with icon or text.
- `prefers-reduced-motion` respected globally; overridable per-learner in Profile.

### 10.11 Offline behaviour

The web app must function offline for the active node and its review queue. On reconnect:

- `attempts` records that were captured offline are replayed to the server **in order**.
- The client re-runs `apply_attempt` locally through the WASM engine to maintain a consistent local state, then reconciles against the server's authoritative state on reconnect.
- Reconciliation follows the sync contract in Task 12.

### 10.12 Tests

- Unit tests for every store, hook, and shared component.
- Interaction tests for onboarding, learning path, node reader, practice (one per item type), tutor, mock tests, progress.
- A golden-path end-to-end test: onboard → placement → first node → practice → mastery → review.
- An offline test: go offline after placement, complete a practice session, reconnect, verify attempts are replayed and server state matches the local prediction.
- Accessibility audit: axe-core on every route; zero serious violations.

### 10.13 CI gates

- Bundle budget ≤ 2 MB gzipped (excluding media). Fail hard.
- No direct import of `/engine` types — the client imports from `@examgpt/engine` only.
- Every route renders with a stubbed API returning empty state without crashing.
- Accessibility gate: axe-core on the CI build, fail on serious violations.
- No `dangerouslySetInnerHTML` outside the shared `Katex.tsx` component.

**Definition of done:**

- All routes implemented, tested, and accessible.
- All 18 item types implemented at their phase-appropriate depth.
- The shared `BlockRenderer` and `ItemRenderer` are the same files used by Content Studio — verified by a build test that asserts the import path.
- Offline capture, replay, and reconciliation match the Task 12 sync contract.
- The bundle stays within budget on the reference device profile.
- Every screen passes the dignity constraint check: no grade level, no rank, no comparison.
- All CI gates fail when deliberately violated.

**Report at the end:** which sections you read, how the WASM engine is loaded and cached, the exact offline-replay algorithm, and any place the spec was ambiguous.

**Do not proceed to Task 11 until the web client is confirmed.**
