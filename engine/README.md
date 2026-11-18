# engine — Pure Deterministic Learning Engine

Owns the algorithmic core: mastery, Elo, item selection, placement, FSRS review scheduling.

**Spec authority:** `docs/04-learning-engine-spec.md` — where this code and the spec disagree, the spec wins.

---

## Purity Rules (E-1 through E-4)

This module is **pure**. Violations are CI failures, not warnings.

| Rule | What it means |
|---|---|
| No clock reads | `Date.now()` and `new Date()` are forbidden inside `/engine/src`. `now` is always a parameter via `EngineContext`. |
| No randomness | `Math.random()` is forbidden. All randomness enters via `EngineContext.rng` (a seeded PRNG). |
| No network | No `fetch`, `http`, `axios`, or any I/O. |
| No imports from outside `/engine` | Enforced by an ESLint rule. The module imports nothing from the repo. |
| No exceptions for valid input | Every function returns a typed result. `assertInvariants` lists violations; it does not throw in production. |

The lint rule is in `.eslintrc.json` at the repo root. It runs in CI as a build-failing gate.

---

## Injected Context Shape

```typescript
interface EngineContext {
  now: string;       // ISO-8601 UTC — never read inside engine directly
  rng: () => number; // seeded PRNG returning [0, 1); must be reproducible
}
```

Any function that needs the current time or randomness takes `EngineContext` as a parameter. Both are injected by the caller (backend or client). This is what makes byte-identical outputs on every platform possible.

---

## Running the Conformance Suite

```bash
cd engine
npm install
npm run typecheck    # must pass with zero warnings
npm run test         # must pass; 100% branch coverage required
```

The test suite reads golden vectors from `engine/testdata/`. These are the source of truth for what the engine must compute — they are written by hand from `docs/04-learning-engine-spec.md §12` before any implementation, and must be updated in the same commit as any change to §4, §5, §6, §7, or §8. CI enforces this.

---

## Implemented modules (Task 1)

| File | Owns | Status |
|---|---|---|
| `src/state.ts` | `Attempt`, `NodeState`, `Decision`, `EngineContext` types | ✅ Done |
| `src/mastery.ts` | `isMastered(s: NodeState) → bool` | ✅ Done — hand-verified |
| `src/invariants.ts` | I-1 through I-10 | ✅ Done |
| `testdata/mastery_*.json` | 5 mastery conformance vectors | ✅ Done |
| `test/mastery.test.ts` | Tests written from vectors, pre-implementation | ✅ Done |

## Not yet implemented (subsequent tasks)

`elo.ts`, `selection.ts`, `placement.ts`, `srs.ts`, `escalation.ts`, `statemachine.ts`

Do not implement these until `mastery.ts` vectors all pass and Task 1 is confirmed complete.

---

## Hand-verification record

`mastery.ts` — verified branch by branch against doc 04 §4:

- **Gate 1:** `w.length < 4 → false` — matches spec line 1.
- **Gate 2:** `filter(a.correct && a.hints_used === 0).length < 4 → false` — 2026-08-09 correction applied; filter is identical to Gate 4's filter.
- **Gate 3:** `max_tier_correct < 3 → false` — matches spec.
- **Gate 4:** `distinctDates(unhintedCorrect).length < 2 → false` — 2026-08-09 correction applied; filter is `correct && hints_used===0`, not just `correct`.
- **Gate 5:** `span_days < 2 → false` — 2026-07 correction applied; was `max_gap < 1` (wrong); is now `(max - min).days >= 2`. Mon+Tue = span 1 → fails. Mon+Wed = span 2 → passes.
