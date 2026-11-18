"""The Python backend reaches the same state hash as every other client (docs/sync-contract.md §9)."""
import json
from pathlib import Path

from backend.app.services import engine_bridge

SHARED = Path(__file__).resolve().parents[3] / "shared" / "testdata"


def test_server_hash_matches_golden():
    attempts = json.loads((SHARED / "attempt_log.json").read_text(encoding="utf8"))["attempts"]
    golden = (SHARED / "attempt_log.hash").read_text(encoding="utf8").strip()
    assert len(attempts) == 1000
    assert engine_bridge.replay(attempts)["hash"] == golden
