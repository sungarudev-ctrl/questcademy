# 10 — Engineering Standards

Code, testing, review, CI. Written for a small team working substantially through AI coding agents.

**Owner:** Engineering.

---

## 1. Working with coding agents

The build is driven largely by directing agents. That changes what standards are for: **the specification is the primary artefact, and the code is downstream of it.**

**Rules**

1. **One document per task.** Give an agent the document that owns the contract plus its "Contracts consumed" list. Do not paste the whole doc set — precision degrades with irrelevant context.
2. **Specify the contract, not the implementation.** "Implement the mastery predicate per 04 §4, all conditions, with the §12 test vectors" beats a prose description of the logic.
3. **Tests before implementation** for anything in the engine. Hand the agent the test matrix; let it write tests first, then satisfy them.
4. **Generated code is reviewed as code.** Approval is a human act.
5. **Never generate the engine's core predicates without verification.** 04 §4, §5, §6 are hand-verified against worked examples. Everything else can be trusted to review + tests.

**Trust tiers**

| Tier | Scope | Review depth |
|---|---|---|
| **Hand-verified** | Engine: mastery, Elo, selection, scheduler | Line by line, against test vectors in 04 §12 |
| **Reviewed** | Sync, content pipeline, payments, auth, RBAC | Full read, tests checked |
| **Generated + tested** | CRUD, dashboards, forms, admin screens | Behaviour verified, code skimmed |

---

## 2. Repository

```
/engine            pure TypeScript, zero deps, shared client/server
/engine-bridge     Node sidecar: runs the real /engine build for the Python backend (docs/sync-contract.md)
/backend           FastAPI, Celery workers, Alembic migrations, AI pipelines (doc 08)
/web               Next.js: student app and Content Studio
/mobile            Flutter student app
/shared            prompts, JSON schemas, design tokens, renderer fixtures, parity test data
/scripts/ci        CI gate scripts (country isolation, math invariance, client engine predicates, ...)
/simulation        synthetic learner harness (04 §12)
/docs              this documentation set, versioned with the code
```

*(2026-11-18: replaced the earlier layout, which named `/client-android`, `/client-web` and `/server/*`; those directories never existed. Directory roles are unchanged.)*

`/engine` may not import from anywhere else. Enforced by lint rule, not by convention.

---

## 3. Code standards

- TypeScript strict everywhere it applies. No `any` in `/engine`, no exceptions.
- All money in integer minor units.
- All timestamps `timestamptz` UTC; learner-local dates as `date`, separately (spacing logic depends on the distinction — 04 §4).
- **No clock reads or randomness inside `/engine`.** Both are injected via `EngineContext`. This is what makes replay determinism possible.
- Errors are typed and handled; no silent catches.
- Feature flags for anything learner-facing.
- Comments explain *why*, never *what*. If the what needs explaining, rewrite it.

---

## 4. Testing

| Layer | Requirement |
|---|---|
| `/engine` | 100% branch coverage. Full matrix in 04 §12. Non-negotiable. |
| Sync | Idempotency, out-of-order arrival, duplicate delivery, partial failure |
| Content pipeline | Every CI gate has a failing fixture proving it fails |
| API | Contract tests per endpoint including RBAC scope violations |
| Client | Critical paths: placement, session, offline, sync, profile switch |
| E2E | Placement → practice → mastery → review → sync, on a real low-end device |

**The simulation harness is the real safety net.** 10,000 synthetic learners, 12 weeks, assertions per 04 §12. Any change to mastery, Elo or selection re-runs it and diffs against the checked-in baseline. **A change that shifts the baseline without an explanation does not merge.**

**Golden parity test:** fixed attempt log + fixed seed → identical state hash on client and server builds. Runs on every commit. This is the tripwire for the highest-severity class of bug in the system.

---

## 5. CI gates

Fail the build. They do not warn.

**Code:** lint · typecheck · unit tests · `/engine` coverage 100% · no critical dependency vulnerabilities · `/engine` imports nothing

**Content:** bundle ≤ 2MB · skill graph acyclic · 100% distractors tagged · every node ≥ 15 published items and ≥ 5 tier-3 · all media assets exist and are optimised · every item's node exists in the slice

**Parity:** golden state hash matches across client and server builds (`shared/testdata/attempt_log.hash`; docs/sync-contract.md §9). No engine predicate may be re-implemented in `web/` or `mobile/` (`scripts/ci/check_no_client_engine_predicates.py`)

**Performance:** cold start < 2.5s and memory < 180MB on the reference device profile

---

## 6. Review

- Every change reviewed by a human, including agent-generated.
- Engine changes require a second reviewer **and** a simulation diff.
- Changes to 02, 03 or 04 require curriculum lead sign-off — they encode learning decisions, not implementation preferences.
- Changes to the Phase 0 scope (Plan §17), or to anything listed in `docs/decisions/`, require a decision record, not a PR description.

**Review checklist**
- [ ] Does it match the specification section it claims to implement?
- [ ] Are the tests real, or do they assert the implementation back at itself?
- [ ] Does it work offline?
- [ ] Does it work on the reference device?
- [ ] Does it preserve engine determinism?
- [ ] Does it add a runtime AI dependency to a Tier 0 path? (If yes: reject.)
- [ ] Are new events instrumented per the analytics event taxonomy (doc 11 §5)?

---

## 7. Release

`main` always deployable · trunk-based with short-lived branches · server deploys continuous behind flags · client releases fortnightly.

**Staged rollout for content and client:** internal → 2 pilot schools → 10% → 100%, with automatic halt on a spike in item error reports or observed success rate leaving the 0.72–0.86 band.

**Backward compatibility: 12 months minimum on API versions.** Learners in low-connectivity areas update rarely, and force-upgrade is a churn event — which, given the dose threshold, means zero learning for those users, not reduced learning.

---

## 8. The reference device

A real low-end Android handset — 2GB RAM, Android 8 — kept physically on the desk.

- Weekly manual pass: placement, a full session, offline mode, profile switch, sync-after-offline.
- Performance budgets measured on it, not on an emulator. Emulator performance is not evidence.
- Any feature that fails here does not ship, regardless of how well it runs elsewhere.

This is the single most effective quality practice available on this project. Most edtech that fails in these markets fails because nobody on the team ever used it on the device their users actually own.

---

## 9. Definition of done

- [ ] Meets the specification section it implements
- [ ] Tests written and passing; engine changes have a simulation diff
- [ ] Works offline where the degradation ladder (06 §6) requires it
- [ ] Verified on the reference device
- [ ] Events instrumented per the analytics event taxonomy (doc 11 §5)
- [ ] RBAC scope enforced server-side
- [ ] Behind a feature flag if learner-facing
- [ ] Documentation updated if a contract changed
- [ ] No new Tier 0 dependency on a model call
