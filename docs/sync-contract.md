# Sync Contract

Status: implemented on the server and in the engine sidecar. Web and mobile clients are **not yet wired** (see "Open work").
Sources: `docs/04-learning-engine-spec.md` §2, §5.4, §11 (I-8, I-9); `docs/tasks.md` Task 12.

## 1. Ownership

| Client owns | Server owns |
|---|---|
| Attempt capture with the client clock | The canonical attempt log |
| Local engine state derived from the local log | Canonical learner state, derived by the same engine |
| Optimistic UI | Framework pins, item pools, content |

The server never computes engine logic itself. It hands the log to the Node sidecar (`engine-bridge/`), which runs the real `/engine` build. There is one engine implementation, so the parity gate means something.

## 2. Reconciliation

- The server's state is authoritative on reconnect. After a sync the client **replaces** its local state with the returned snapshot.
- Every attempt has a client-generated `attempt_id` (UUID v4). `attempts.attempt_id` is the primary key, so duplicates are ignored by the database itself (I-8).
- Ordering is `(occurred_at, attempt_id)` — timestamp first, then plain code-unit comparison of the id. Never locale-aware. The server also stamps a monotonic `server_sequence` on receipt.
- A client may send `local_states` (its own prediction per learner/node). If `(status, ability_elo)` differs from the server's, the server logs a `state_mismatch` anomaly with both states and the attempt ids. The client does not try to force its prediction.

## 3. Endpoints

```
POST /api/sync/attempts  { attempts: Attempt[<=500], local_states? }
  -> { applied: [id], duplicates: [id], rejected: [{attempt_id, reason}], state: {learner_id: {nodes, hash}}, telemetry: [] }
POST /api/sync/state     { learner_id, since? }  -> { state, latest_attempt_at }   (snapshots are whole; `since` is reserved)
GET  /api/sync/cursor    -> { server_time, cursor_version }
```

Rejection reasons: a validation message (`missing fields: ...`, `hints_used must be 0..3`, ...), `learner_not_authorized`, `unknown_item`, `item_node_mismatch`. A batch that fails as a whole (`503` engine sidecar down, auth) removes nothing from the client queue.

## 4. Clock skew

- `occurred_at` more than 5 minutes after server time: rewritten to `server_time - 5s`, original kept in `occurred_at_client`, `clock_future` anomaly logged. The returned snapshot already reflects the rewrite.
- `occurred_at` more than 30 days before server time: stored with `flagged = true` and excluded from mastery unless a curriculum lead sets `included_by_lead`. `clock_past` anomaly logged.

## 5. Retired items

An attempt on a `retired` item is stored with `excluded_reason = 'retired_item'`, never reaches Elo or mastery, and emits a `content_gap` telemetry event.

## 6. Profile switch

A batch may mix learners. The authenticated principal carries the set of `learner_ids` it may act for; anything else is rejected. State is derived per learner and the engine sidecar keys on `(learner_id, node_id)`, so there is no cross-contamination. The client's local store must be partitioned per `learner_id`.

## 7. Anomalies and incidents

`sync_anomalies` records `state_mismatch`, `clock_future`, `clock_past`, `retired_item`. A `state_mismatch` for the same learner and node in **3 consecutive syncs** sets `incident = true` — that is always a bug, never normal. Learners never see anomalies, except a clearly worded retry prompt for rejected attempts.

## 8. Pin reconciliation

Pins are server-authoritative. Attempts captured under an old pin stay on the learner's account and still count: mastery lives on nodes, not frameworks (doc 02 §5.1; I-11). `migrate_learner_pin` never touches `learner_node_state` (tested by checksum).

## 9. Parity

`shared/testdata/attempt_log.json` holds 1000 attempts (placement, practice, reviews, lapses, two learners). Its golden hash is `shared/testdata/attempt_log.hash`.

Hash algorithm: replay, then SHA-256 over canonical JSON (keys sorted recursively, no whitespace) of `{learner_id: {node_id: NodeState}}`-derived structure — see `engine-bridge/canonical.mjs`. Engine Elo is already rounded to 4 decimals, so number formatting is stable.

Participants: server (via the sidecar; `backend/tests/unit/test_sync_parity.py`), the sidecar itself (`engine-bridge/test/replay.test.mjs`), web, and mobile.

## Open work (not done)

- Web client: `useSyncStore` still simulates the replay with a timer and `Math.random`/`Date.now`; it must call these endpoints, partition storage by learner, and run the parity test with the engine build.
- Mobile client: `engine_binding.dart` re-implements mastery/Elo in Dart, which violates the "no engine predicates in clients" rule. It needs a real binding to the engine build, then a Dart parity test.
- Admin view `(admin)/studio/sync-anomalies` and its API (list/filter, resolve, false-positive, escalate).
- Real auth: `get_principal` is a dependency awaiting Task 13.
