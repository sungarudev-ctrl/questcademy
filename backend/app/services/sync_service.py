"""Server side of the sync contract.

Source of truth: docs/sync-contract.md (§ numbers below refer to it).

The server stores attempts, then derives learner state by replaying the learner's
whole canonical log through the real engine (engine-bridge). Nothing here computes
mastery, Elo or scheduling.
"""

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from typing import Any, Callable, Dict, List, Optional, Sequence, Set

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from backend.app.db.models.content import Item
from backend.app.db.models.sync import (
    AttemptRecord,
    LearnerNodeStateRecord,
    LearnerSyncCursor,
    SyncAnomaly,
)
from backend.app.services import engine_bridge

FUTURE_TOLERANCE = timedelta(minutes=5)
FUTURE_REWRITE_OFFSET = timedelta(seconds=5)
STALE_AFTER = timedelta(days=30)
INCIDENT_CONSECUTIVE_SYNCS = 3

_REQUIRED = (
    "attempt_id", "learner_id", "node_id", "item_id", "difficulty_tier", "correct",
    "hints_used", "occurred_at", "is_review", "is_placement", "is_exam",
)

ReplayFn = Callable[..., Dict[str, Any]]


class SyncError(ValueError):
    pass


@dataclass
class SyncResult:
    applied: List[str] = field(default_factory=list)
    duplicates: List[str] = field(default_factory=list)
    rejected: List[Dict[str, str]] = field(default_factory=list)
    states: Dict[str, Dict[str, Any]] = field(default_factory=dict)  # learner_id -> {nodes, hash}
    telemetry: List[Dict[str, Any]] = field(default_factory=list)
    anomalies: List[str] = field(default_factory=list)


def _parse_utc(value: Any) -> datetime:
    if not isinstance(value, str):
        raise SyncError("occurred_at must be an ISO-8601 string")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise SyncError("occurred_at is not ISO-8601") from exc
    if parsed.tzinfo is None:
        raise SyncError("occurred_at must carry a UTC offset")
    return parsed.astimezone(timezone.utc)


def _fmt(dt: datetime) -> str:
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _validate(a: Dict[str, Any]) -> None:
    missing = [k for k in _REQUIRED if k not in a or a[k] is None]
    if missing:
        raise SyncError(f"missing fields: {', '.join(missing)}")
    try:
        uuid.UUID(str(a["attempt_id"]))
    except ValueError as exc:
        raise SyncError("attempt_id must be a UUID") from exc
    if a["difficulty_tier"] not in (1, 2, 3):
        raise SyncError("difficulty_tier must be 1, 2 or 3")
    if a["hints_used"] not in (0, 1, 2, 3):
        raise SyncError("hints_used must be 0..3")
    for flag in ("correct", "is_review", "is_placement", "is_exam"):
        if not isinstance(a[flag], bool):
            raise SyncError(f"{flag} must be boolean")
    _parse_utc(a["occurred_at"])


def _next_sequence(db: Session) -> int:
    return (db.execute(select(func.max(AttemptRecord.server_sequence))).scalar() or 0) + 1


def _to_engine_attempt(r: AttemptRecord) -> Dict[str, Any]:
    return {
        "attempt_id": r.attempt_id,
        "learner_id": r.learner_id,
        "node_id": r.node_id,
        "item_id": r.item_id,
        "difficulty_tier": r.difficulty_tier,
        "correct": r.correct,
        "partial_credit": float(r.partial_credit) if r.partial_credit is not None else (1.0 if r.correct else 0.0),
        "selected_option": r.selected_option,
        "misconception_id": r.misconception_id,
        "latency_ms": r.latency_ms if r.latency_ms is not None else 0,
        "hints_used": r.hints_used,
        "session_id": r.session_id or "",
        "occurred_at": r.occurred_at,
        "is_review": r.is_review,
        "is_placement": r.is_placement,
        "is_exam": r.is_exam,
    }


def _is_excluded(r: AttemptRecord) -> bool:
    if r.excluded_reason is not None:
        return True
    return r.flagged and not r.included_by_lead


def derive_learner_state(
    db: Session, learner_id: str, replay_fn: Optional[ReplayFn] = None
) -> Dict[str, Any]:
    """Replay the learner's whole canonical log through the engine; persist; return snapshot."""
    replay_fn = replay_fn or engine_bridge.replay
    rows = db.execute(
        select(AttemptRecord).where(AttemptRecord.learner_id == learner_id)
    ).scalars().all()
    excluded = [r.attempt_id for r in rows if _is_excluded(r)]
    response = replay_fn([_to_engine_attempt(r) for r in rows], excluded)
    snapshot = response["learners"].get(learner_id, {"nodes": {}, "hash": response["hash"]})
    for node_id, state in snapshot["nodes"].items():
        record = db.get(LearnerNodeStateRecord, (learner_id, node_id))
        if record is None:
            db.add(LearnerNodeStateRecord(
                learner_id=learner_id, node_id=node_id, status=state["status"],
                ability_elo=state["ability_elo"], state=state,
            ))
        else:
            record.status = state["status"]
            record.ability_elo = state["ability_elo"]
            record.state = state
    return snapshot


def _bump_cursor(db: Session, learner_id: str, latest: Optional[str]) -> LearnerSyncCursor:
    cursor = db.get(LearnerSyncCursor, learner_id)
    if cursor is None:
        cursor = LearnerSyncCursor(learner_id=learner_id, sync_count=0)
        db.add(cursor)
    cursor.sync_count = (cursor.sync_count or 0) + 1
    if latest and (cursor.latest_attempt_at is None or latest > cursor.latest_attempt_at):
        cursor.latest_attempt_at = latest
    return cursor


def _record_anomaly(
    db: Session, learner_id: str, node_id: Optional[str], kind: str, sync_no: int,
    attempt_ids: Sequence[str], local_state: Any = None, server_state: Any = None,
) -> SyncAnomaly:
    consecutive = 1
    incident = False
    if kind == "state_mismatch":
        prior = db.execute(
            select(SyncAnomaly)
            .where(SyncAnomaly.learner_id == learner_id, SyncAnomaly.node_id == node_id,
                   SyncAnomaly.kind == "state_mismatch")
            .order_by(SyncAnomaly.sync_no.desc())
        ).scalars().first()
        if prior is not None and prior.sync_no == sync_no - 1:
            consecutive = prior.consecutive_count + 1
        incident = consecutive >= INCIDENT_CONSECUTIVE_SYNCS
    anomaly = SyncAnomaly(
        id=str(uuid.uuid4()), learner_id=learner_id, node_id=node_id, kind=kind,
        local_state=local_state, server_state=server_state, attempt_ids=list(attempt_ids),
        sync_no=sync_no, consecutive_count=consecutive, incident=incident,
    )
    db.add(anomaly)
    return anomaly


def sync_attempts(
    db: Session,
    attempts: Sequence[Dict[str, Any]],
    *,
    server_time: datetime,
    authorized_learner_ids: Optional[Set[str]] = None,
    local_states: Optional[Dict[str, Dict[str, Dict[str, Any]]]] = None,
    replay_fn: Optional[ReplayFn] = None,
) -> SyncResult:
    """Accept a batch (any order, any mix of learners), store it, return server-derived state.

    local_states: optional {learner_id: {node_id: {status, ability_elo}}} — the client's
    prediction, compared after replay (§7). The client never forces its prediction.
    """
    result = SyncResult()
    server_time = server_time.astimezone(timezone.utc)
    seen_in_batch: Set[str] = set()
    touched: Dict[str, List[str]] = {}
    pending: List[tuple] = []  # (record, anomaly kind or None)

    # §4: process in (occurred_at, attempt_id) order so server_sequence reflects the canonical order too.
    def sort_key(a: Dict[str, Any]) -> tuple:
        try:
            return (_parse_utc(a.get("occurred_at")), str(a.get("attempt_id")))
        except SyncError:
            return (datetime.max.replace(tzinfo=timezone.utc), str(a.get("attempt_id")))

    for a in sorted(attempts, key=sort_key):
        aid = str(a.get("attempt_id"))
        try:
            _validate(a)
        except SyncError as exc:
            result.rejected.append({"attempt_id": aid, "reason": str(exc)})
            continue
        if authorized_learner_ids is not None and a["learner_id"] not in authorized_learner_ids:
            result.rejected.append({"attempt_id": aid, "reason": "learner_not_authorized"})
            continue
        if aid in seen_in_batch or db.get(AttemptRecord, aid) is not None:
            result.duplicates.append(aid)
            continue
        item = db.get(Item, a["item_id"])
        if item is None:
            result.rejected.append({"attempt_id": aid, "reason": "unknown_item"})
            continue
        if item.node_id != a["node_id"]:
            result.rejected.append({"attempt_id": aid, "reason": "item_node_mismatch"})
            continue
        seen_in_batch.add(aid)

        occurred = _parse_utc(a["occurred_at"])
        occurred_client = _fmt(occurred)
        kind: Optional[str] = None
        flagged = False
        if occurred > server_time + FUTURE_TOLERANCE:  # §3 rewrite
            occurred = server_time - FUTURE_REWRITE_OFFSET
            kind = "clock_future"
        elif occurred < server_time - STALE_AFTER:  # §3 flag, excluded from mastery
            flagged = True
            kind = "clock_past"
        excluded_reason = "retired_item" if item.status == "retired" else None  # §4

        record = AttemptRecord(
            attempt_id=aid, learner_id=a["learner_id"], node_id=a["node_id"], item_id=a["item_id"],
            difficulty_tier=a["difficulty_tier"], correct=a["correct"],
            partial_credit=str(a["partial_credit"]) if a.get("partial_credit") is not None else None,
            selected_option=a.get("selected_option"), misconception_id=a.get("misconception_id"),
            latency_ms=a.get("latency_ms"), hints_used=a["hints_used"], session_id=a.get("session_id"),
            occurred_at=_fmt(occurred), occurred_at_client=occurred_client,
            server_sequence=_next_sequence(db) + len(pending),
            is_review=a["is_review"], is_placement=a["is_placement"], is_exam=a["is_exam"],
            flagged=flagged, excluded_reason=excluded_reason,
        )
        pending.append((record, kind))

    for record, kind in pending:
        try:
            with db.begin_nested():
                db.add(record)
                db.flush()
        except IntegrityError:
            if db.get(AttemptRecord, record.attempt_id) is None:
                raise  # not an idempotent duplicate (e.g. a server_sequence collision): fail loudly
            result.duplicates.append(record.attempt_id)  # lost a race with a concurrent sync (§4)
            continue
        result.applied.append(record.attempt_id)
        touched.setdefault(record.learner_id, []).append(record.attempt_id)
        if record.excluded_reason == "retired_item":
            result.telemetry.append({
                "event_type": "content_gap", "node_id": record.node_id, "item_id": record.item_id,
                "reason": "attempt_on_retired_item",
            })

    for learner_id, attempt_ids in touched.items():
        rows = {r.attempt_id: r for r, _ in pending if r.learner_id == learner_id}
        latest = max((r.occurred_at for r in rows.values()), default=None)
        cursor = _bump_cursor(db, learner_id, latest)
        for record, kind in pending:
            if record.learner_id == learner_id and record.attempt_id in attempt_ids:
                if kind is not None:
                    _record_anomaly(db, learner_id, record.node_id, kind, cursor.sync_count, [record.attempt_id])
                if record.excluded_reason == "retired_item":
                    _record_anomaly(db, learner_id, record.node_id, "retired_item", cursor.sync_count, [record.attempt_id])
        snapshot = derive_learner_state(db, learner_id, replay_fn)
        result.states[learner_id] = snapshot
        predicted = (local_states or {}).get(learner_id, {})
        for node_id, local in predicted.items():
            server = snapshot["nodes"].get(node_id)
            if server is None:
                continue
            if (local.get("status"), local.get("ability_elo")) != (server["status"], server["ability_elo"]):
                anomaly = _record_anomaly(
                    db, learner_id, node_id, "state_mismatch", cursor.sync_count,
                    attempt_ids, local_state=local,
                    server_state={"status": server["status"], "ability_elo": server["ability_elo"]},
                )
                result.anomalies.append(anomaly.id)
    db.flush()
    return result


def state_since(db: Session, learner_id: str, since: Optional[str]) -> Dict[str, Any]:
    """Snapshot of server-derived state. `since` filters nothing yet: snapshots are whole, so a
    client can always replace local state wholesale (§2 — server authoritative)."""
    rows = db.execute(
        select(LearnerNodeStateRecord).where(LearnerNodeStateRecord.learner_id == learner_id)
    ).scalars().all()
    nodes = {r.node_id: r.state for r in rows}
    cursor = db.get(LearnerSyncCursor, learner_id)
    return {"nodes": nodes, "latest_attempt_at": cursor.latest_attempt_at if cursor else None}
