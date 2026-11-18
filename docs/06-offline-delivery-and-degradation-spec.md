# 06 — Offline Delivery and Degradation Specification

**Owner:** Engineering · **Change control:** changes to §6 and §11 need a decision record
**Version:** v0.1 DRAFT (2026-11-18) — first writing. Every normative statement is sourced inline; anything not sourced is marked **PROPOSED**. Individual decisions carry their own status in the Decisions section. Decisions resolved 2026-11-18 (see the Decisions section; DR-019).

> How content and state reach a learner's device, what must keep working when connectivity or a model is unavailable, and what each client does about it. It elaborates doc 01 §5 (delivery tiers) and does not restate the sync contract (`docs/sync-contract.md`) or the engine (doc 04).

**Why this document exists.** Doc 05 cites doc 06 §4.1 (the bundle), §4.3 (rollout ladder) and §11 (lesson blocks, `CheckBlock`, `VideoBlock` delivery); doc 10 §6 and §9 cite §6 (the degradation ladder) as the test for "works offline". Where a citation is the only source for a section's content, the section says exactly what the citation implies and no more.

**Fixed numbering:** 00 plan · 01 product and delivery · 02 framework · 03 learning science · 04 engine · 05 assessment · 06 this document · 07 data model · 08 AI services · 09 authoring rules · 10 engineering standards · 11 tech stack and analytics · 12 teacher product · 13 safety and privacy.

---

## 1. Scope

In scope: what is delivered to the device (§4), local state and capture (§5), the degradation ladder (§6), sync as seen from the client (§7), deferred marking (§8), item types with connectivity limits (§9), model-dependent features (§10), lesson blocks (§11), per-platform delivery (§12), release (§13), gates (§14).

Out of scope: engine algorithms (doc 04), item and block schemas (doc 05), reconciliation rules (`sync-contract.md`), notifications (doc 13; tasks.md Task 14), infrastructure (tasks.md Task 15).

## 2. Principles

1. **Offline-first.** Every engine decision is computable from local state alone (doc 04 E-4). The engine makes no network call and reads no clock (doc 04 E-1).
2. **No model call on a Tier 0 path.** (doc 01 §5.1; doc 10 §6, §9.) A reviewer rejects a change that adds one.
3. **Server state is authoritative on reconnect; the local database is the source of truth for the client's offline state.** (sync-contract.md §2; tasks.md Task 11.10.)
4. **One engine, one binding per client.** No client reimplements a predicate (doc 04 E-3; tasks.md Task 12.12).
5. **Degrade, never block mastery work.** A missing Tier 2 capability falls back to Tier 1 content, not to an error (doc 00 §13.1 rule 7; doc 03 §12A). *(The rule is sourced for the tutor; generalising it to all Tier 2 capabilities is PROPOSED.)*
6. **Learners never see sync anomalies**, except a clearly worded retry prompt for rejected attempts (sync-contract.md §7).

## 3. Reference device and budgets

| Budget | Value | Source |
|---|---|---|
| Device | 2 GB RAM, Android 8, physically available; weekly manual pass (placement, full session, offline mode, profile switch, sync-after-offline) | doc 10 §8 |
| Cold start | < 2.5 s | doc 10 §5, §8 |
| Memory | < 180 MB | doc 10 §5 |
| Bundle | ≤ 2 MB (what this measures is open, §16 item 1) | doc 10 §5; tasks.md Tasks 10.1, 10.13 |
| Media per item | SVG or WebP, ≤ 40 KB | doc 05 A-5 |
| Compressed photo upload | ≤ 200 KB | doc 05 §3.15 |
| Audio upload | Opus, about 8 KB/s | doc 05 §3.16 |
| WebView items | about 30 MB extra RAM; not in the standard practice loop on Android Go | doc 05 §3.13 |
| Engine operations | `select_next_item` P99 15 ms; `build_review_queue` P99 60 ms; rehydrate 400 nodes P99 250 ms; item pools loaded lazily per node, never the whole graph resident | doc 04 §13; doc 00 §7.7 |

Emulator performance is not evidence (doc 10 §8). The reference device is to be wired into CI (tasks.md Task 15.9); that is not built (§15).

## 4. Content bundle

### 4.1 What the bundle is, and its gate

Doc 05 §7 states: "delivery is the bundle (doc 06 §4.1)". Implied by that citation and by doc 10 §2 (`/content-tools`: "authoring, bundle build, CI gates"): the **bundle** is the built, gated set of node content and items that is delivered to clients, produced by the content tooling, and the only way items reach a learner. Beyond that the sources are silent on format and granularity (§16 item 2).

**Entry gate (the "publish bar").** A node enters a bundle only if it has **≥ 15 published items with ≥ 5 at Tier 3**, where "published" means status `reviewed` or later — `reviewed`, `piloted`, `live`, `calibrating`, `calibrated`. `draft`, `generated`, `tagged`, `revision` and `retired` do not count (doc 10 §5; doc 05 §7, §8, "as corrected 2026-08-10"; doc 00 §6.3).

- The floor is `reviewed`, not `piloted`: `piloted` requires delivery and delivery requires the bundle, so requiring `piloted` made the first bundle impossible (doc 05 §7).
- The **serve floor** (8 items, ≥ 2 Tier 3; at least 2 Tier-3 items auto-marked and offline-capable) is a different, runtime number. Below it the engine emits `content_gap` and serves the node poorly rather than not at all. Nothing fails CI because of it (doc 05 §8, A-11).
- Other bundle gates: skill graph acyclic; 100% of distractors tagged; all media assets exist and are optimised; every item's node exists in the slice (doc 10 §5).
- Items with `offline_capable = false` are never in the mastery path (doc 05 A-6). `media_bytes` is "enforced against bundle budget" (doc 05 §1).

### 4.2 What a client holds offline

| Item | Web | Mobile | Source |
|---|---|---|---|
| App shell | cached by service worker | installed app | tasks.md Task 10.1, 11 |
| Active node content (`Block[]`) | cached | available offline | tasks.md Tasks 10.1, 11.10 |
| Active node item pool | cached (items ≤ 40 KB media) | available offline | tasks.md Tasks 10.1, 11.10 |
| Review queue | offline for the review queue | same | tasks.md Task 10.11 |
| Engine | engine binary | engine binding | tasks.md Tasks 10.1, 11.10 |
| KaTeX fonts | cached | shipped in assets; no network fetch for math fonts | tasks.md Tasks 10.1, 11.5 |
| Hints and worked solutions | in the bundle (Tier 1) | same | doc 05 §5 |

Task 10.11 requires offline function "for the active node and its review queue". Whether more than the active node is held (for example the next available nodes, or a whole framework slice) is not specified (§16 item 2). Localization is resolved server-side and "the client receives the resolved view and never sees localization logic" (tasks.md Task 10.4), so a bundle for a learner is already resolved for the learner's framework pin. *(That the bundle is built per pin is an implication of Task 10.4, not stated.)*

### 4.3 Rollout ladder

Content and client changes move through: **internal → 2 pilot schools → 10% → 100%**, with automatic halt on a spike in item error reports or an observed success rate leaving the 0.72–0.86 band (doc 10 §7). A content deploy is a promotion of an approved framework version through the same canary logic (tasks.md Task 15.6).

Items acquire the statuses `piloted` and `live` by moving through this ladder; those states are **not prerequisites** for entering it (doc 05 §7, citing this section). `piloted` is defined as "served to one class for sanity check"; `live` as serving with `n < 50` (doc 05 §7). The sources do not map each rung to a status beyond that; a precise mapping is **PROPOSED** and open (§16 item 3).

### 4.4 Pin changes and invalidation

The framework pin is server-authoritative. Content resolved under an old pin is invalidated locally on pin change and the client re-fetches the active node's content. Attempts captured under the old pin are kept and still count, because mastery lives on nodes (sync-contract.md §8; tasks.md Task 12.8; doc 04 I-11).

## 5. Local state and capture

- Attempts are captured on the client with the client clock and a client-generated UUID v4 `attempt_id`, and queued (sync-contract.md §1–§2; tasks.md Task 11.10).
- Local engine state is derived from the local attempt log (sync-contract.md §1).
- The local store is partitioned per `learner_id` so a profile switch cannot cross-contaminate state (sync-contract.md §6).
- Dates used for spacing are learner-local `date`s, stored separately from `timestamptz` UTC (doc 10 §3).
- Placement is resumable; a dropped connection mid-placement does not restart it (doc 00 §7.3; tasks.md Task 11.3).

## 6. Degradation ladder

The ladder states, rung by rung, which capabilities must still work. It is the test behind "works offline where the degradation ladder (06 §6) requires it" (doc 10 §9, §6). Each row's behaviour is sourced; **the rung boundaries and names are PROPOSED** (no source defines them).

| Rung | Condition | Must work | Falls back or is unavailable | Sources |
|---|---|---|---|---|
| **R0** | Online, model available | All tiers (doc 01 §5.1): live tutor, AI marking, OCR, online-only item types, sync | — | doc 01 §5.1 |
| **R1** | Online, model unavailable or over budget | All of Tier 0 and Tier 1; sync | Tutor → precomputed hint ladder and worked solution; a tutor numeric claim that SymPy disagrees with → precomputed worked solution; AI marking of deferred responses waits | doc 00 §13.1 rules 6–7; doc 03 §12A |
| **R2** | Offline, active content cached | Tier 0 and Tier 1 for the active node and its review queue: engine decisions, placement (resumable), practice on auto-marked offline-capable items, hints, worked solutions after the item closes, mastery evaluation including the Tier-3 clause (via A-11 items), FSRS review, attempt capture and local queue | Tutor dialogue (hint ladder instead); deferred-marked items are answered and queued; `offline_capable = false` items not served on the mastery path; Desmos/GeoGebra items unavailable (DR-011); photo and audio uploads wait; no sync, no server state refresh | doc 04 E-4; doc 05 §3, A-6, A-11; tasks.md Task 10.11 |
| **R3** | Offline, content for the wanted node not cached | What the engine can still decide from local state, plus the pool-exhaustion ladder when a cached node has too few usable items: relax recall window → widen σ → serve least-recently-seen → emit `content_gap` and never error | Selecting an uncached node (behaviour **PROPOSED**, not specified: §16 item 4) | doc 04 §6 (`selection_pool_exhaustion`); doc 05 §8 |
| **R4** | Reconnect, sync partially or wholly failing | Local work continues. A batch that fails as a whole removes nothing from the queue; `rejected` attempts are re-queued with a manual-retry flag; `applied` and `duplicate` are removed; the server snapshot replaces local state | Server-authoritative corrections (clock-skew rewrite, retired-item exclusion) appear only when the snapshot returns | sync-contract.md §2–§5; tasks.md Task 12.6 |

**Invariants across all rungs**

- Nothing in R1–R4 may make a mastery decision depend on a model response or a network round trip (doc 01 §5.1, C-6).
- A capability that cannot be offered is **absent or labelled**, never replaced by a weaker version that still counts toward mastery: an unmarked deferred item "does not count toward mastery until marked" (doc 05 §3).
- Low-memory devices: WebView-based items fall back to a static image where the device reports low memory (doc 05 §3.13).

**Not specified, and therefore not decided here:** what the learner sees when R3 applies; whether the app shows a connectivity indicator; the maximum offline duration before queued attempts are at risk of the 30-day "flagged" rule (sync-contract.md §4) — see §16 item 4.

## 7. Sync, as seen by the client

Normative text is `docs/sync-contract.md`. Facts this document relies on:

- Endpoints: `POST /api/sync/attempts` (batch ≤ 500), `POST /api/sync/state`, `GET /api/sync/cursor`. Rejection reasons include `learner_not_authorized`, `unknown_item`, `item_node_mismatch` (sync-contract.md §3).
- Ordering is `(occurred_at, attempt_id)` with a server `server_sequence` (sync-contract.md §2).
- `occurred_at` more than 5 minutes in the future is rewritten to `server_time - 5s`; more than 30 days in the past is stored `flagged` and excluded from mastery unless a curriculum lead includes it (sync-contract.md §4).
- An attempt on a retired item is stored, excluded from Elo and mastery, and emits `content_gap` (sync-contract.md §5).
- Reconciliation replaces local state with the server snapshot; a local/server mismatch logs a `state_mismatch` anomaly, and three consecutive mismatches for the same learner and node is an incident (sync-contract.md §2, §7).
- Replay order and parity: the golden attempt log hash must match across server, web and mobile (sync-contract.md §9; tasks.md Task 12.9).

## 8. Deferred marking

Types marked ⚠️ deferred (short constructed response, structured multi-part, audio response) are answered offline, queued, and marked on sync. A pending attempt "does not block progression, but does not count toward mastery until marked" (doc 05 §3). Low-confidence AI marks route to a teacher review queue, not to the learner (doc 05 §3.11).

The engine has **no pending-attempt state yet**. Doc 05 proposes `marking_status: marked | pending`, exclusion of pending attempts from `recent_window`, Elo and FSRS, replay in `occurred_at` order when marked, and no mastery evaluation while a Tier-3 attempt is pending. This is **PROPOSED**, tracked as DR-010 (storage, timeout, expiry, reconciliation; options A separate queue, B provisional neutral attempt). **No deferred-marked type may ship, and so Paper 2 of a mock exam may not ship, until DR-010 is decided** (doc 05 §3; doc 02 §3.3).

A-11 keeps the Tier-3 mastery clause satisfiable offline without deferred types (doc 05 A-11).

## 9. Item types with connectivity limits

| Type | Offline behaviour | Source |
|---|---|---|
| MCQ, multi-select, numeric, expression, cloze, ordering, matching, table, number line, diagram labelling, hotspot, categorization (§3.1–3.10, 3.17–3.18) | Fully offline, auto-marked | doc 05 §3 |
| Expression entry | Marking must run offline: MathLive input, lightweight CAS for equivalence, no server round trip | doc 05 §3.4 |
| Short response, structured multi-part | Offline capture, queued, marked on sync (§8) | doc 05 §3.11–3.12 |
| Graph interaction (Desmos) | Treated as **online-only** until DR-011 confirms offline terms; A-6 keeps it out of the mastery path | doc 05 §3.13; DR-011 |
| Geometry construction (GeoGebra) | Needs the same offline-terms check; Phase 4, senior secondary | doc 05 §3.14; DR-011 |
| Working-shown photo | Online-only; ≤ 200 KB; never on the mastery path | doc 05 §3.15 |
| Audio response | Records locally, uploads on sync; parental consent for voice | doc 05 §3.16; doc 01 §8 |

DR-011 options: A, offline-embeddable open-source GeoGebra/Mafs engines with no licensing dependency; B, secure OEM offline redistribution rights for Desmos. Neither is chosen.

## 10. Model-dependent features offline

| Feature | Offline behaviour | Source |
|---|---|---|
| Inline tutor | "A Tier 1 enhancement"; offline the learner gets the precomputed hint ladder and worked solution. Naming conflict with doc 05 §5 is open (doc 01 §16 item 1) | doc 00 §13.1 rule 7; doc 03 §12A |
| Tutor image upload / OCR | OCR runs server-side; online only | tasks.md Task 10.6 |
| AI marking | Deferred (§8) | doc 05 §3.11 |
| Escalation and offer decisions | Decided by the engine locally; they only open the tutor entry point | doc 04 §9; tasks.md Task 10.6 |
| Content and item generation, SymPy validation | Server-side authoring pipelines; never run on a client | doc 00 §3 |
| Nudges and digests | Server-sent; not required for any learning path | tasks.md Task 14 |

The tutor's RAG is scoped server-side to the learner's pin; the client never sends a framework id (tasks.md Task 10.6).

## 11. Lesson blocks and delivery

Items and lessons render the **same 17 block types**, so an author works in one content model (doc 05 §1, Universal rules). The block union and field rules are doc 05's; this section covers delivery and offline behaviour only.

### 11.1 Default delivery

Every block type **except `VideoBlock`** is bundled by default (doc 05 §1, citing this section). Lesson content is `Block[]` rendered by the single shared `BlockRenderer` (tasks.md Task 10.4). `ImageBlock` requires `alt`; `AudioBlock` requires `transcript` (doc 05 §1).

### 11.2 `VideoBlock`

- The type exists but is **never in the default delivery path** (doc 01 §1, C-1).
- It is **opt-in or wifi-gated**, not bundled by default (doc 05 §1, citing this section).
- A lesson containing a video block must have a genuinely equivalent non-video path; the block is additive and never the only way to learn the skill (doc 05 §1).
- Consequently a lesson must render and pass its own gates with the video block absent. What "equivalent" is tested by, how a wifi-gated fetch is detected, and where video is hosted are not specified (§16 item 5).

### 11.3 `CheckBlock`

`CheckBlock { question, options[], correct_index }` is a lightweight, embedded, **ungated** comprehension check inside a lesson (doc 05 §1; citing this section). The sources state:

- It is **not an `Item`**.
- It has no `misconception_id` requirement, no scoring, **no Elo impact, and no mastery contribution** — it does not feed mastery or Elo.
- Confusing it with an assessment item would weaken doc 04's mastery story; the boundary is to be kept sharp.

What follows from those statements:

- It carries its own `correct_index`, so it is evaluated locally with no network and no model call, and is compatible with Tier 0 (doc 01 §5.1). *(Implication of the schema, not stated.)*
- It is not an `Attempt`: attempts reference an item and feed the engine (doc 00 §2.6; doc 04 §2.1), and a `CheckBlock` has no item. It must therefore never be enqueued for sync as an attempt, never reach `recent_window`, and never gate progression. *(Implication.)* The learner's interaction with it may be recorded as telemetry only if doc 11 defines such an event; none exists (§16 item 5).

### 11.4 Other interactive blocks

`DesmosBlock`, `GeoGebraBlock`, `NumberLineBlock` and `HotspotBlock` are in the block union (doc 05 §1). Doc 05 gives offline status only for the Desmos and GeoGebra item types (§9). Applying DR-011's online-only treatment to the matching blocks is **PROPOSED**; until decided a lesson must not depend on them as the only path (§16 item 5).

### 11.5 Authoring limits

A-5 limits media to SVG or WebP and 40 KB per **item**. No stated limit exists for lesson media; whether the 40 KB rule or the bundle budget governs it is open (§16 item 1).

## 12. Per-platform delivery

| Concern | Web (Next.js, PWA) | Mobile (Flutter, Android and iOS) | Source |
|---|---|---|---|
| Engine | `@questcademy/engine` package (the task text says WASM build) | A single binding "to the shared `/engine` build" | tasks.md Tasks 10.1, 11.1 |
| Offline cache | Service worker: app shell, active node content, item pool, engine binary, KaTeX fonts | Local DB plus assets | tasks.md Tasks 10.1, 11.10 |
| Connectivity detection | Browser online/offline events | `connectivity_plus` | tasks.md Task 11.1 |
| Local store | Partitioned per learner | Local DB (`isar` or `drift` named); partitioned per learner | tasks.md Task 11.1; sync-contract.md §6 |
| Renderers | Shared `BlockRenderer` / `ItemRenderer`, also used by Content Studio | Implemented once in Flutter, conformance-checked against `shared/renderer-fixtures` by semantic-tree diff | tasks.md Tasks 10, 11.9 |
| Numeric entry | — | Custom keypad, never the system keyboard | tasks.md Task 11.6 |
| Floor | — | Android `minSdkVersion` 26; iOS 14 | tasks.md Task 11.12 |
| Crash reporting | — | Only if the privacy policy permits; otherwise a local-only opt-in error log | tasks.md Task 11.12 |

Parity: any divergence between platforms is a bug unless the OS requires it (tasks.md Task 11).

## 13. Release and compatibility

- Server deploys continuously behind flags; client releases fortnightly (doc 10 §7).
- Engine changes: second reviewer, simulation diff, parity run; deploy server → web → mobile, verifying parity after each step (tasks.md Task 15.6).
- API versions are kept backward compatible for **12 months minimum**, because learners in low-connectivity areas update rarely and a forced upgrade means zero learning for them (doc 10 §7).
- Staged rollout and automatic halt: §4.3.

## 14. Gates

| Gate | Source |
|---|---|
| Bundle ≤ 2 MB; graph acyclic; 100% distractors tagged; ≥ 15 items and ≥ 5 Tier 3 per node; media exist and are optimised; node in slice | doc 10 §5 |
| Cold start < 2.5 s; memory < 180 MB on the reference device profile | doc 10 §5; tasks.md Task 15.9 |
| Golden state hash matches across server, web, mobile — fail hard | doc 10 §4–§5; sync-contract.md §9 |
| Sync idempotency, out-of-order, clock-skew, partial failure, retired item, profile switch, pin migration tests | doc 10 §4; tasks.md Task 12.10 |
| No client implements engine predicates (grep gate over `web/` and `mobile/`) | tasks.md Task 12.12 |
| Offline test per client: go offline after placement, practise, reconnect, attempts replayed, server state matches | tasks.md Tasks 10.12, 11.13 |
| Shared renderer used by web student app and Content Studio | tasks.md Task 10 DoD |
| Definition of done: "works offline where the degradation ladder (06 §6) requires it"; "no new Tier 0 dependency on a model call" | doc 10 §9 |

## 15. Build status (verified against the repository, 2026-11-18)

| Area | Specified | Built |
|---|---|---|
| Engine | Offline-capable, deterministic | Implemented, with golden vectors and a CI workflow (`engine-ci.yml`) |
| Sync, server | `sync-contract.md` | Implemented: endpoints, engine sidecar, clock-skew and retired-item handling, parity test workflow (`sync-parity.yml`) |
| Sync, web | Task 12 | **Not wired.** `useSyncStore` simulates replay with a timer and generates ids with `Date.now`/`Math.random` |
| Sync, mobile | Task 12 | **Not wired.** Attempts are queued in `shared_preferences`; no real sync |
| Service worker (web) | §4.2, Task 10.1 | Exists, minimal: pre-caches seven route shells; network-first for `/api/` with cache fallback; stale-while-revalidate for other GETs. No explicit pre-cache of node content, item pool, engine binary or KaTeX fonts; no content-aware cache invalidation on pin change |
| Mobile engine | §2 principle 4 | **Dart re-implementation of mastery and Elo (`engine_binding.dart`)**, contrary to the sync contract and Task 11.1. No parity test in Dart |
| Math rendering | KaTeX with offline fonts | Neither renderer uses KaTeX; both print raw LaTeX text. No KaTeX dependency in `web/package.json` or `mobile/pubspec.yaml` |
| Block rendering | 17 block types; shared renderer | Web renders heading, text, math, callout, warning, worked example, definition, list, divider, plus a default; mobile renders fewer. No `CheckBlock`, `VideoBlock`, `AudioBlock` or `ImageBlock` handling |
| Bundle | §4 | **Not built.** No `content-tools/`, no bundle build, no bundle-size gate in `.github/workflows` |
| Reference device in CI, cold-start and memory gates | Task 15.9 | Not built |
| Student-facing API (`/api/v1/...`: progress, tests, tutor, dose) | Task 13 | Not built. The web client calls `/api/learners/attempts` and `/api/tutor/chat`, which the backend does not serve |
| Deferred marking, pending attempts | §8 | Not built; spec open (DR-010) |
| Degradation ladder | §6 | No client implements rung-aware behaviour; only an online/offline flag exists on web |

## 16. Decisions (resolved 2026-11-18)

Recorded in [DR-019](decisions/DR-019-documentation-set-decisions.md), accepted on the owner's delegated instruction. `PROPOSED` markers earlier in this document that concern these items are superseded by the table below. Provisional rows are to be tuned from pilot data; OPEN rows need a named owner. Code and schema consequences are listed in [IMPLEMENTATION-FOLLOWUPS.md](decisions/IMPLEMENTATION-FOLLOWUPS.md).

| ID | Decision | Status |
|---|---|---|
| DD-06-1 | **2 MB budget.** DD-01-3. | ACCEPTED |
| DD-06-2 | **Bundle format.** One bundle per framework version (content is immutable per version, doc 02 §5), sliced per learner pin. A client holds the active node, the nodes in its review queue, and its next recommended nodes, up to the content-bundle limit. No fixed node count. | ACCEPTED |
| DD-06-3 | **Rollout ladder vs item status.** Internal rung: items `reviewed`. Pilot-schools rung: items `piloted` (served to a class, doc 05 §7). 10% and 100% rungs: items `live`. Calibration statuses follow response counts as in doc 05 §7. 'Two pilot schools' is the pilot rung of the Phase 0 pilot. | ACCEPTED |
| DD-06-4 | **Uncached content and rung names.** An uncached node is shown as needing a connection and queued for download; it is never hidden. Offline, the engine selects only among cached nodes and returns `queue_empty` when none qualify. The rung names in §6 are adopted as written. The client warns the learner to connect when the oldest unsynced attempt reaches 21 days (provisional), well before the 30-day `flagged` rule (docs/sync-contract.md §4). | ACCEPTED (provisional) |
| DD-06-5 | **Lesson blocks.** (a) A `VideoBlock` is valid only if the same node has text and worked-example sections covering the same objectives; a content validator checks this. (b) Video hosting and wifi gating are out of Phase 0 (no video in the default path). (c) Desmos and GeoGebra blocks are online-only (DR-011). (d) `CheckBlock` answers are recorded locally as a non-attempt event `check_answered`; they never feed mastery or Elo. (e) Audio is not in the default bundle. | ACCEPTED |
| DD-06-6 | **Tutor tier.** DD-01-1: Tier 2 with Tier 1 fallback; at rungs R1 and R2 the tutor is listed unavailable and the hint ladder remains. | ACCEPTED |
| DD-06-7 | **Pending attempts.** DR-010. | ACCEPTED (provisional) |
| DD-06-8 | **Desmos and GeoGebra.** DR-011. | ACCEPTED |
| DD-06-9 | **Mobile binding and local database.** DD-01-7 for the binding. The offline queue moves from `shared_preferences` to an on-device SQLite database partitioned by `learner_id` (docs/sync-contract.md §6). | ACCEPTED |

## Change Log

- v0.1 (2026-11-18): first writing. Created to resolve doc 05's citations of §4.1, §4.3 and §11 and doc 10's citations of §6. Build status verified against `engine/`, `backend/`, `web/`, `mobile/` and `.github/workflows`.

**Decision records:** DR-010, DR-011 (see also DR-001, DR-009 via doc 01)
