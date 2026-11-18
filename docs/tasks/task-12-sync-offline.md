## TASK 12 — Sync, Offline, and Reconciliation (Shared Contract)

---

**Context:** Tasks 1–11 complete and confirmed. Web and mobile clients exist with feature parity. Both capture attempts locally. Neither is yet reconciled against the server under adversarial conditions (duplicate delivery, out-of-order arrival, partial failure, clock skew, profile switch mid-session).

**Your task:** Design and implement the sync contract that keeps the local engine state and the server's canonical state consistent, and integrate it into both clients.

**Read first, in this order:**

1. `docs/04-learning-engine-spec.md` **§2** — Attempt shape, idempotency
2. `docs/04-learning-engine-spec.md` **§5.4** — latency guard, half-K review/exam attempts
3. `docs/04-learning-engine-spec.md` **§11** — I-8 (attempt idempotency), I-9 (engine purity)
4. `docs/10-engineering-standards.md` **§4** — sync test requirements
5. `docs/10-engineering-standards.md` **§5** — parity CI gate

**Deliverables, in order:**

### 12.1 The sync contract

Formalise the contract in `docs/sync-contract.md`:

**Client owns:**

- Attempt capture with client clock
- Local engine state derived from the local attempt log
- Optimistic UI updates

**Server owns:**

- The canonical attempt log
- The canonical learner state (derived server-side by the same engine)
- Framework pins, item pools, content

**Reconciliation rule:**

- The server's state is authoritative on reconnect.
- Every attempt has a client-generated `attempt_id` (UUID v4). The server accepts an attempt only if the `attempt_id` is new; duplicates are idempotently ignored (I-8).
- Attempts are ordered by `(occurred_at, attempt_id)` on both sides. On conflict, the server's ordering wins.
- After the server replays the client's offline attempts, the client replaces its local state with the server's returned state. If the local prediction and the server state disagree, the disagreement is logged as a sync anomaly and reported for investigation — the client does **not** try to force its prediction.

### 12.2 Sync API

Add these endpoints:

```
POST /api/sync/attempts
  Body: { attempts: Attempt[] }
  Returns: { applied: string[], duplicates: string[], state: LearnerStateSnapshot }

POST /api/sync/state
  Body: { since: timestamp }
  Returns: { state: LearnerStateSnapshot, latest_attempt_at: timestamp }

GET  /api/sync/cursor
  Returns: { server_time: timestamp, cursor_version: int }
```

`LearnerStateSnapshot` is the same shape the engine consumes. The server computes it by replaying the canonical attempt log through the engine. **The snapshot is byte-identical to what the client would compute** if it had the same log — this is the parity contract.

### 12.3 Clock skew handling

Client clocks drift. The server records `received_at` separately from `occurred_at`.

- Attempts are ordered server-side by `occurred_at`, but a monotonic `server_sequence` is assigned on receipt.
- If `occurred_at` is more than 5 minutes in the future relative to `server_time`, the server rewrites `occurred_at` to `server_time - 5s` and logs the anomaly. The rewrite is reflected in the returned snapshot so the client can correct its local state.
- If `occurred_at` is more than 30 days in the past, the attempt is stored as `flagged: true` and **excluded from mastery evaluation** unless a curriculum lead explicitly includes it.

### 12.4 Duplicate and out-of-order delivery

- `attempt_id` idempotency is enforced at the DB level with a unique index.
- The server accepts attempts in any order within a sync batch; it reorders by `(occurred_at, attempt_id)` before replaying through the engine.
- If a batch contains an attempt that references an item no longer in the item pool (retired), the attempt is stored but excluded from Elo and mastery updates; a `content_gap` telemetry event fires.

### 12.5 Profile switch mid-session

A learner may switch profiles (e.g., a sibling's device) mid-session. The sync contract must handle this:

- Every attempt carries the `learner_id` under which it was captured.
- A batch may contain attempts from multiple learners; the server groups and processes each learner's attempts separately.
- The local DB is partitioned per `learner_id`. No cross-contamination is possible at the storage layer.

### 12.6 Partial failure

- The sync endpoint returns per-attempt status: `applied`, `duplicate`, or `rejected` (with reason).
- The client removes `applied` and `duplicate` attempts from the local queue and re-queues only `rejected` attempts with a manual-retry flag. Rejected attempts surface in a diagnostic screen for the learner ("3 attempts need review — tap to retry").
- If the batch itself fails (network, auth), no attempts are removed from the queue.

### 12.7 Conflict between local and server state

If, after reconciliation, the local state's `(status, ability_elo, mastery)` disagrees with the server's for any node:

- The server state is written to the local DB.
- A sync anomaly is logged with both states and the attempt IDs involved.
- The anomaly is visible in an admin diagnostic view; the learner never sees it unless it changes their visible path (rare).
- If the anomaly recurs for the same learner and node in 3 consecutive syncs, the platform raises an incident — this is always a bug, never normal.

### 12.8 Framework pin reconciliation

- The learner's framework pin is server-authoritative. A pin migration performed on another device is picked up on the next sync.
- Content resolved under an old pin is invalidated locally on pin change; the client re-fetches the active node's content.
- Attempts captured under an old pin are **not** discarded — they are stored against the learner's account and re-evaluated under the new pin's framework. If an item is not present in the new framework's scope, the attempt still counts toward Elo and mastery because mastery lives on nodes, not on frameworks (doc 02 §5.1, V-4).

### 12.9 The parity test

The single most important CI gate in the whole project.

- A fixed attempt log (1000 attempts, spanning placement, practice, reviews, lapses) is stored at `shared/testdata/attempt_log.json`.
- The server replays it through the engine and hashes the resulting state.
- The web client replays it through the WASM engine and hashes the resulting state.
- The Flutter client replays it through the engine binding and hashes the resulting state.
- All three hashes must match. Fail hard on mismatch.
- This gate runs on every commit to `/engine`, `backend/`, `web/`, or `mobile/`.

### 12.10 Tests

Backend:

- `test_sync_idempotency.py` — sending the same batch twice produces the same state.
- `test_sync_out_of_order.py` — a batch in shuffled order produces the same state as an ordered batch.
- `test_sync_clock_skew.py` — an attempt dated 1 hour in the future is rewritten; dated 60 days in the past is flagged.
- `test_sync_partial_failure.py` — a batch with 3 valid and 1 rejected attempt removes only the valid ones from the queue.
- `test_sync_retired_item.py` — an attempt against a retired item is stored but does not affect mastery.
- `test_sync_profile_switch.py` — a mixed batch is processed per learner without cross-contamination.
- `test_sync_pin_migration.py` — an attempt captured under an old pin is re-evaluated under the new pin without changing mastery.

Web and mobile:

- Equivalent test suites on each client, using the same fixtures.
- Offline capture → reconnect → reconcile → state matches server, per platform.

### 12.11 Diagnostics

Add an admin view: `(admin)/studio/sync-anomalies`.

- Lists anomalies with learner, node, both states, and the attempt IDs.
- Filters by recency, learner, node.
- Actions: mark as resolved (with reason), mark as false-positive, escalate to engineering (opens an issue with the payload attached).

### 12.12 CI gates

- Parity test (the hashed state match) — **fail hard**, blocks merge.
- Sync idempotency test — fail hard.
- Out-of-order test — fail hard.
- Clock skew test — fail hard.
- No client may implement engine predicates in Dart or TypeScript directly — grep gate across `web/` and `mobile/`.

**Definition of done:**

- The sync contract is formalised in `docs/sync-contract.md`.
- All sync endpoints implemented and tested.
- All client-side sync logic implemented on both web and mobile, using the same contract and the same fixtures.
- The parity test passes across server, web, and mobile.
- Clock skew, duplicate delivery, out-of-order arrival, partial failure, profile switch, and pin migration all have passing tests.
- Sync anomalies are visible to admins and never surfaced to learners except as a rare and clearly-explained retry prompt.
- All CI gates fail when deliberately violated.

**Report at the end:** which sections you read, the exact ordering algorithm, how the parity test hashes state, and any place the spec was ambiguous.
