"""Python side of the engine sidecar.

The backend never re-implements engine logic: it hands attempt logs to the Node
sidecar (engine-bridge/cli.mjs), which runs the real /engine build. One engine,
one parity contract (docs/sync-contract.md §9).
"""

import json
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, List, Optional, Sequence

_REPO_ROOT = Path(__file__).resolve().parents[3]
_DEFAULT_CLI = _REPO_ROOT / "engine-bridge" / "cli.mjs"
_TIMEOUT_SECONDS = 60


class EngineBridgeError(RuntimeError):
    """The sidecar failed. Callers must fail the request, never fall back to guessing state."""


def replay(
    attempts: Sequence[Dict[str, Any]],
    excluded_attempt_ids: Optional[Sequence[str]] = None,
) -> Dict[str, Any]:
    cli = Path(os.environ.get("ENGINE_BRIDGE_CLI", str(_DEFAULT_CLI)))
    node = os.environ.get("NODE_BIN", "node")
    payload = json.dumps(
        {"attempts": list(attempts), "excluded_attempt_ids": list(excluded_attempt_ids or [])}
    )
    try:
        proc = subprocess.run(
            [node, str(cli)],
            input=payload,
            capture_output=True,
            text=True,
            timeout=_TIMEOUT_SECONDS,
            check=False,
        )
    except (OSError, subprocess.TimeoutExpired) as exc:
        raise EngineBridgeError(f"engine sidecar could not run: {exc}") from exc
    if proc.returncode != 0:
        raise EngineBridgeError(f"engine sidecar exited {proc.returncode}: {proc.stderr.strip()}")
    return json.loads(proc.stdout)
