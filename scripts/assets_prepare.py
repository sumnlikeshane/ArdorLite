"""Export only the publication map; snapshot bytes and original figures stay intact."""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT = ROOT / "reviewed" / "2026-10-11"
CONFIG = ROOT / "config" / "publication-assets.json"


def read(path: Path):
    return json.loads(path.read_text(), parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def safe_path(base: Path, value: str) -> Path:
    """Require an exact portable path and reject symlink ancestors, including outputs."""
    relative = PurePosixPath(value)
    if not value or relative.is_absolute() or str(relative) != value or any(part in (".", "..") for part in relative.parts) or "\\" in value or any(char in value for char in "%?#"):
        raise ValueError(f"Unsafe publication path: {value}")
    target = base.joinpath(*relative.parts)
    # Ancestors above the approved root can be OS aliases (macOS /var).
    # Reject symlinks in the root and every component *within* its boundary.
    for candidate in [base, *(base.joinpath(*relative.parts[:index]) for index in range(1, len(relative.parts) + 1))]:
        if candidate.is_symlink():
            raise ValueError(f"Symlink in publication path: {value}")
    if not target.resolve().is_relative_to(base.resolve()):
        raise ValueError(f"Publication path escape: {value}")
    return target


def validated_assets(config=None, snapshot=SNAPSHOT, public=None):
    config = config if config is not None else read(CONFIG)
    public = public if public is not None else ROOT / "public"
    if config["schemaVersion"] != 1 or config["snapshot"] != "2026-10-11" or config["baseUrl"] != "/downloads/reviewed/2026-10-11/":
        raise ValueError("Unknown publication snapshot or destination boundary")
    allowed = {entry["path"] for entry in read(snapshot / "evidence/allowlist.json")["files"]}
    manifest = read(snapshot / "evidence/manifest.json")
    derivatives = {entry["path"]: entry for entry in manifest["derivatives"]}
    sources = {entry["id"] for entry in manifest["sources"]}
    outputs, paths, result = set(), set(), []
    for entry in config["assets"]:
        path = entry["sourcePath"]
        if path not in allowed or path not in derivatives:
            raise ValueError(f"Source is not a reviewed derivative: {path}")
        source = safe_path(snapshot, path)
        derivative = derivatives[path]
        if derivative["publication_review"]["decision"] != "include" or digest(source) != entry["sourceSha256"] or entry["sourceSha256"] != derivative["sha256"]:
            raise ValueError(f"Changed or unreviewed publication source: {path}")
        if entry["sourceIds"] != derivative["source_artifact_ids"] or not set(entry["sourceIds"]) <= sources:
            raise ValueError(f"Incorrect publication provenance: {path}")
        url = entry["outputUrl"]
        if url != config["baseUrl"] + path:
            raise ValueError(f"Unintended publication destination: {url}")
        output = safe_path(public, url.removeprefix("/"))
        if path in paths or url in outputs:
            raise ValueError(f"Duplicate publication mapping: {path}")
        if not entry["notices"] or not entry["role"] or entry["transformation"] != "byte-preserving reviewed file export":
            raise ValueError(f"Missing notices or unapproved transformation: {path}")
        paths.add(path)
        outputs.add(url)
        result.append((entry, source, output))
    for entry, _, _ in result:
        if not set(entry["notices"]) <= outputs:
            raise ValueError(f"Notice is not an approved asset: {entry['sourcePath']}")
    return result


def prepare():
    if sys.flags.optimize or sys.version_info[:2] != (3,12):
        raise RuntimeError("Ordinary, nonoptimized Python 3.12 is required")
    assets = validated_assets()
    export_root = safe_path(ROOT / "public", "downloads/reviewed/2026-10-11")
    expected = {output for _, _, output in assets}
    # Fail on stale exports instead of deleting files that might be user work.
    if export_root.exists():
        unexpected = {path for path in export_root.rglob("*") if path.is_file()} - expected
        if unexpected:
            raise ValueError(f"Unmapped existing evidence exports: {sorted(str(path) for path in unexpected)}")
    entries = []
    for entry, source, output in assets:
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, output)
        if digest(output) != entry["sourceSha256"]:
            raise ValueError(f"Export bytes changed: {entry['sourcePath']}")
        entries.append({**entry, "outputSha256": digest(output), "sizeBytes": output.stat().st_size})
    generated = ROOT / "generated"
    generated.mkdir(exist_ok=True)
    environment = {**os.environ, "PYTHONDONTWRITEBYTECODE": "1", "PYTHONPATH": str(SNAPSHOT)}
    demo = subprocess.run([sys.executable, "-B", "-m", "methods.demo"], cwd=SNAPSHOT, env=environment, check=True, capture_output=True, text=True)
    parsed = json.loads(demo.stdout)
    if parsed.get("reproduction_level") != "executable_example" or "NOT MARKET EVIDENCE" not in parsed.get("label", ""):
        raise ValueError("Synthetic output lost its teaching label")
    demo_path = generated / "synthetic-demo.json"
    demo_path.write_text(demo.stdout)
    generated_record = {"path": "generated/synthetic-demo.json", "sha256": digest(demo_path), "role": "synthetic_software_demonstration_not_market_evidence", "sourceFiles": [{"path": entry["sourcePath"], "sha256": entry["sourceSha256"]} for entry, _, _ in assets if entry["sourcePath"].startswith("methods/") and entry["sourcePath"].endswith(".py")], "transformation": "Python standard-library methods.demo execution; no historical inputs", "public": False}
    receipt = {"schemaVersion": 1, "snapshot": "2026-10-11", "publicationMapSha256": digest(CONFIG), "assetCount": len(entries), "assets": entries, "generated": [generated_record], "rights": "Reserved rights; material-specific notices retained. Original source files remain excluded."}
    (generated / "publication-assets.json").write_text(json.dumps(receipt, indent=2) + "\n")
    (ROOT / "receipts" / "publication-assets.json").write_text(json.dumps(receipt, indent=2) + "\n")
    print(f"Exported {len(entries)} exact reviewed assets; generated labelled synthetic demonstrations.")
    return receipt


if __name__ == "__main__":
    prepare()
