"""Shared local-only publication tooling. Never imported by the frozen snapshot."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "reviewed" / "2026-10-11"


def guard() -> None:
    if sys.flags.optimize:
        raise SystemExit("Optimized Python is prohibited: evidence assertions must execute.")
    sys.dont_write_bytecode = True
    os.environ["PYTHONDONTWRITEBYTECODE"] = "1"
    if sys.version_info[:2] != (3, 12):
        raise SystemExit("Use ordinary Python 3.12 for publication validation.")
    os.chdir(ROOT)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_json(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def now() -> str:
    return datetime.now(timezone.utc).isoformat()


def run(command: list[str]) -> dict:
    print("→ " + " ".join(command), flush=True)
    started = now()
    result = subprocess.run(command, cwd=ROOT, env=os.environ.copy(), check=False)
    record = {"command": command, "startedAt": started, "finishedAt": now(), "exitCode": result.returncode}
    if result.returncode:
        raise subprocess.CalledProcessError(result.returncode, command)
    return record


def runtime() -> dict:
    node = subprocess.check_output(["node", "--version"], text=True).strip()
    pnpm = subprocess.check_output(["pnpm", "--version"], text=True).strip()
    if node != "v24.21.0" or pnpm != "10.14.0":
        raise SystemExit(f"Pinned runtime required: Node v24.21.0 / pnpm 10.14.0; got {node} / {pnpm}.")
    return {"node": node, "pnpm": pnpm, "python": sys.version.split()[0]}


def inventory(directory: Path) -> list[dict]:
    return [{"path": p.relative_to(directory).as_posix(), "sha256": sha256(p), "sizeBytes": p.stat().st_size}
            for p in sorted(directory.rglob("*")) if p.is_file()]


def artifact_identity(files: list[dict]) -> str:
    return hashlib.sha256(json.dumps(files, sort_keys=True, separators=(",", ":")).encode()).hexdigest()
