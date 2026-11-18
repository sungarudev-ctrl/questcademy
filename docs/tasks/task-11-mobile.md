## TASK 11 — Student App: Mobile (Flutter, iOS + Android)

---

**Context:** Tasks 1–10 complete and confirmed. The web client is stable. The Flutter app ships both **Android and iOS from a single codebase**. Any divergence between platforms is a bug, not a design choice, except where the OS itself requires it (e.g., permissions, background behaviour).

**Your task:** Build the Flutter student app — feature parity with the web client, offline-first, and honouring the same engine contract via a Dart binding to the shared `/engine` build.

**Read first, in this order:**

1. `docs/00-product-plan.md` **§4** — student-facing flow
2. `docs/00-product-plan.md` **§5** — UI screens
3. `docs/00-product-plan.md` **§10** — brand and design system (design tokens are the single source of truth for both web and mobile)
4. `docs/03-learning-science-spec.md` **§2** — dignity constraint
5. `docs/04-learning-engine-spec.md` **§2** — `NodeState`, `Attempt`, `Decision` types the Dart binding mirrors
6. `docs/04-learning-engine-spec.md` **§7.2** — placement presentation
7. `docs/05-assessment-item-spec.md` **§3** — item types
8. `docs/05-assessment-item-spec.md` **§5** — hints
9. `docs/05-assessment-item-spec.md` **§6** — accessibility
10. `docs/10-engineering-standards.md` **§8** — reference device: 2GB RAM Android, Android 8

**Deliverables, in order:**

### 11.1 Flutter foundation

- Single Flutter codebase targeting `android` and `ios` (also `web` if trivial, but not required).
- State management: **Riverpod** (consistent, testable, no InheritedWidget surprises).
- Navigation: `go_router` with deep-link support for `examgpt://node/{node_id}` and universal links on iOS.
- HTTP client: `dio`, with auth interceptor, retry policy, and offline detection via `connectivity_plus`.
- Secure storage: `flutter_secure_storage` for tokens; `isar` or `drift` for local state.
- The engine is bound via `flutter_rust_bridge` or a Dart **FFI** to the shared engine — whichever path the team selects, **there is exactly one binding and it is the same engine source**. No parallel Dart implementation of engine predicates. If a predicate is needed, it is called through the binding.
- Bundle size: cold start < 2.5 s and memory < 180 MB on the reference device (2 GB RAM, Android 8). CI gate.

### 11.2 Platform parity rules

- **One Flutter codebase.** No `android/` and `ios/` diverging beyond permission manifests, launch screens, and signing.
- Every screen renders identically unless an OS convention requires otherwise (e.g., iOS swipe-back, Android predictive back).
- The same `BlockRenderer` and `ItemRenderer` design is implemented once in Flutter, **not** ported from the React versions. The two implementations are conformance-checked against a shared renderer fixture (see §11.9).
- Design tokens come from `shared/design/tokens.json` via a generator (`dart run design_tokens`) — no hardcoded colors or sizes.

### 11.3 Onboarding

Same flow as web. Placement is resumable; state is stored in the local DB and synced on reconnect. Copy and dignity constraints are identical.

### 11.4 Learning Path

Same structure. Uses `SliverList` for smooth scrolling on low-end devices. Locked nodes are dimmed. No grade band rendered.

### 11.5 Node Reader

- Renders `Block[]` via the Flutter `BlockRenderer` (see §11.9).
- KaTeX rendering via `flutter_katex` with an **offline bundle** shipped in assets. No network fetch for math fonts.
- Worked examples reveal one step at a time.
- Ask AI panel opens as a bottom sheet on phone, docked right panel on tablet (≥ 768 px width).
- Scroll position is persisted per node.

### 11.6 Practice

- Same as web: the client calls `selectNextItem` through the engine binding each turn.
- All 18 item types implemented at their phase-appropriate depth (matching web).
- **Custom numeric keypad** — never the system keyboard for numeric entry. The system keyboard on Android Go devices is unusable for fractions and scientific notation.
- Expression entry uses a MathLive-equivalent Flutter widget, or a native math input that produces the same normalized LaTeX the web client produces. If no equivalent exists, expression entry is deferred to a later phase — it is **not** replaced with a text input.
- Hints and feedback as web.
- Latency recorded the same way.

### 11.7 Tutor

- Chat UI with text and image input. Image capture uses the OS-native camera permission flow.
- Responses render through the Flutter `BlockRenderer`.
- The engine's `escalate_to_tutor` decision surfaces the same entry point as web.

### 11.8 Mock Tests, Progress, Profile

Same as web. Progress renders the mastery heatmap using the Flutter chart library already in the app; no third-party analytics SDK.

### 11.9 Shared renderer fixtures

The single biggest risk is web and mobile renderers drifting. Mitigate with a fixture-driven conformance suite:

- `shared/renderer-fixtures/` contains ~40 JSON fixtures, each a `Block[]` or `Item` payload covering every block type and every item type.
- The web renderer tests render each fixture to a snapshot.
- The Flutter renderer tests render each fixture and produce a semantic-tree description.
- A CI job diffs the two semantic descriptions for known-equivalent output (e.g., text order, math presence, ordering of steps). Visual styling may differ; **structure must not**.

### 11.10 Offline

- The active node's content, its item pool, the engine binding, and the KaTeX bundle are all available offline.
- The local DB is the source of truth for the client's offline state; the server is the source of truth for the learner's canonical state.
- Attempts are captured with the local clock and queued for replay.
- Reconnect reconciliation follows Task 12's sync contract. The Flutter client and the web client use **the same** sync algorithm; only the transport differs.

### 11.11 Accessibility

- Flutter `Semantics` on every interactive widget.
- TalkBack (Android) and VoiceOver (iOS) verified on the reference device.
- Reduced motion override respected per OS setting and per learner setting.
- Dynamic type / font scale supported; layouts must not break at 200%.

### 11.12 Platform-specific

- **Android:** `minSdkVersion 26` (Android 8). Target the latest stable. Use `android:requestLegacyExternalStorage` never. App Bundle shipping, Play Store internal testing tracks for staged rollout.
- **iOS:** `iOS 14` minimum. Universal links for deep linking. App Store Connect TestFlight for staged rollout.
- Both platforms: crash reporting via a self-hosted Sentry **only** if the privacy policy permits; otherwise no crash reporting, and instead a local-only error log that the learner can opt to share.

### 11.13 Tests

- Widget tests for every screen and every item type.
- Golden tests for the shared renderer fixtures.
- A full offline test: airplane mode → practice session → reconnect → attempts replayed, server state matches.
- Conformance test against `shared/renderer-fixtures/` — semantic-tree diff against the web client.
- Accessibility audit on both platforms with the OS's screen reader.

### 11.14 CI gates

- Bundle size gate on the reference device profile.
- Golden test gate — renderer output must match the committed goldens.
- Conformance gate — semantic diff against web must pass.
- No `dart:io` usage outside the storage and network layers.
- No hardcoded colors or sizes outside the generated tokens file.

**Definition of done:**

- Feature parity with the web client across every screen and every item type.
- All 18 item types render and score identically to web (verified via the conformance suite).
- Cold start < 2.5 s and memory < 180 MB on the reference device.
- Offline capture, replay, and reconciliation match Task 12.
- Both platforms pass accessibility audit with the OS screen reader.
- The engine binding is the **only** engine implementation used on mobile.
- All CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the exact engine binding approach, how the renderer conformance suite works, and any place the spec was ambiguous.

**Do not proceed to Task 12 until the Flutter client is confirmed.**
