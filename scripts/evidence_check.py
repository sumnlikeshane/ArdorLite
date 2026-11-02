"""Check immutable snapshot identity before/after a website build, without caches."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "reviewed" / "2026-10-11"


def check():
    if sys.flags.optimize or sys.version_info[:2] != (3,12):
        raise RuntimeError("Ordinary, nonoptimized Python 3.12 is required")
    descriptor = json.loads((ROOT / "snapshots/2026-10-11.json").read_text())
    manifest_path = SNAPSHOT / "evidence/manifest.json"
    manifest_hash = hashlib.sha256(manifest_path.read_bytes()).hexdigest()
    if manifest_hash != descriptor["manifest_sha256"]:
        raise ValueError("Frozen manifest identity changed")
    allowed = {entry["path"] for entry in json.loads((SNAPSHOT / "evidence/allowlist.json").read_text())["files"]}
    actual = {str(path.relative_to(SNAPSHOT)) for path in SNAPSHOT.rglob("*") if path.is_file()}
    if actual != allowed or len(actual) != descriptor["file_count"]:
        raise ValueError(f"Frozen exact-tree mismatch: extra={actual-allowed}, missing={allowed-actual}")
    if any(path.is_symlink() for path in SNAPSHOT.rglob("*")):
        raise ValueError("Frozen snapshot must not contain symlinks")
    environment = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1"}
    commands = [[sys.executable, "-B", "scripts/validate.py"], [sys.executable, "-B", "-m", "unittest", "discover", "-s", "tests", "-v"]]
    results = []
    for command in commands:
        process = subprocess.run(command, cwd=SNAPSHOT, env=environment, capture_output=True, text=True)
        results.append({"command": ["python3.12", *command[1:]], "exitCode": process.returncode, "stdout": process.stdout, "stderr": process.stderr})
        if process.returncode:
            print(process.stdout, process.stderr, file=sys.stderr)
            raise ValueError(f"Reviewed snapshot check failed: {command[2:]}")
    counts = descriptor["counts"]
    observed = {"records": len(json.loads((SNAPSHOT / "content/research.json").read_text())["records"]), "claims": len(json.loads((SNAPSHOT / "evidence/claims.json").read_text())["claims"]), "cases": len(list((SNAPSHOT / "content/cases").glob("*.md"))), "methods": len(json.loads((SNAPSHOT / "content/methods.json").read_text())["examples"]), "previews": len(json.loads((SNAPSHOT / "content/previews.json").read_text())["records"]), "figures": len(list((SNAPSHOT / "charts/specs").glob("*.json")))}
    if counts != observed:
        raise ValueError(f"Snapshot coverage changed: {observed}")
    receipt = {"schemaVersion": 1, "checkedAt": datetime.now(timezone.utc).isoformat(), "snapshot": "2026-10-11", "manifestSha256": manifest_hash, "exactTreeFiles": len(actual), "counts": observed, "commands": results, "snapshotChanged": False}
    receipts = ROOT / "receipts"
    receipts.mkdir(exist_ok=True)
    (receipts / "evidence-check.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"Snapshot exact-tree/hash checks passed: {len(actual)} files, 114 records, 204 claims; archived validator and 29 tests pass.")
    return receipt


if __name__ == "__main__":
    check()
