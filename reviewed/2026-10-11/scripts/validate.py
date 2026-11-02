"""Validate the portable reviewed artifact offline, using only the stdlib."""
from pathlib import Path
import hashlib
import json
import math
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
STATUSES = {"tested_killed", "structural_kill_before_returns", "invalid_experiment", "blocked_before_returns", "stand_down", "active_unresolved", "superseded_before_data", "discovery_map_only", "design_only", "research_infrastructure"}
LEVELS = {"executable_example", "archived_result", "report_transcription", "private_inputs_required"}


def read(path):
    return json.loads((ROOT / path).read_text(), parse_constant=lambda x: (_ for _ in ()).throw(ValueError("Non-standard JSON number: " + x)))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def check_numeric(value):
    if isinstance(value, float): assert math.isfinite(value), "Nonfinite numeric evidence"
    elif isinstance(value, dict):
        for item in value.values(): check_numeric(item)
    elif isinstance(value, list):
        for item in value: check_numeric(item)


def validate():
    checks = []
    allow = read("evidence/allowlist.json")
    allowed = {entry["path"] if isinstance(entry, dict) else entry for entry in allow["files"]}
    files = {str(p.relative_to(ROOT)) for p in ROOT.rglob("*") if p.is_file() and "__pycache__" not in p.parts}
    assert files == allowed, f"Allowlist mismatch: extra={files-allowed}, missing={allowed-files}"
    manifest = read("evidence/manifest.json")
    derivatives = manifest["derivatives"]
    assert {d["path"] for d in derivatives} == allowed - {"evidence/manifest.json"}, "Manifest coverage mismatch"
    source_ids = {s["id"] for s in manifest["sources"]}
    source_map = {s["id"]: s for s in manifest["sources"]}
    assert len(source_map) == len(manifest["sources"]), "Duplicate source IDs"
    for s in manifest["sources"]:
        assert s["id"] == "src-" + hashlib.sha256(s["source_relative_path"].encode()).hexdigest()[:12], "Unstable source ID"
        assert re.fullmatch(r"[0-9a-f]{64}", s["sha256"]), "Invalid source hash"
    for d in derivatives:
        p = ROOT / d["path"]
        assert p.resolve().is_relative_to(ROOT.resolve()), "Unsafe export path"
        assert p.stat().st_size == d["size_bytes"] and digest(p) == d["sha256"], "Derivative hash mismatch: " + d["path"]
        assert set(d["source_artifact_ids"]) <= source_ids, "Unknown derivative source"
        assert d["publication_review"]["decision"] == "include", "Unreviewed derivative"
    checks.append(f"allowlist and actual hashes: {len(files)} files; manifest self hash covered by archive checksum")
    for p in ROOT.rglob("*.json"):
        check_numeric(json.loads(p.read_text(), parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x))))
    catalog = read("content/research.json")
    records = catalog["records"]
    ids = [r["id"] for r in records]
    assert len(ids) == len(set(ids)), "Duplicate research IDs"
    for r in records:
        status = r.get("status", r.get("normalized_status"))
        assert status in STATUSES, f"Invalid status: {r['id']}={status}"
        assert "original_verdict" in r and "sources" in r and r["sources"], "Missing verdict/provenance"
        assert r["reproduction_level"] in LEVELS, "Invalid record reproduction level"
        for ref in r["sources"]:
            assert ref["source_id"] in source_map, "Missing catalog source"
            assert ref["sha256"] == source_map[ref["source_id"]]["sha256"], "Conflicting catalog source hash"
        if r.get("parent_id") is not None: assert r["parent_id"] in ids, "Missing parent record"
    assert sum(r.get("catalog_cohort") == "vantage_archive_2026_08_26" for r in records) == 49, "Archive cohort changed"
    checks.append(f"catalog: {len(records)} unique records; statuses, source attribution, strict JSON and nulls")
    claims = read("evidence/claims.json")["claims"]
    claim_map = {c["id"]: c for c in claims}
    assert len(claim_map) == len(claims), "Duplicate claim IDs"
    for c in claims:
        assert c["reproduction_level"] in LEVELS, "Unknown claim reproduction level"
        assert any(s["source_relative_path"] == c["source_path"] for s in manifest["sources"]), "Uninventoried claim source: " + c["id"]
        assert c["unit"] and c["source_pointer"], "Missing claim units/pointer"
        if c.get("source_artifact_id"):
            assert source_map[c["source_artifact_id"]]["source_relative_path"] == c["source_path"], "Conflicting claim source ID"
    for r in records:
        assert set(r.get("evidence", {}).get("claim_ids", [])) <= set(claim_map), "Missing research claim"
    count = 0
    for p in sorted((ROOT / "charts/specs").glob("*.json")):
        spec = json.loads(p.read_text())
        table = read(spec["input_table"])
        assert digest(ROOT / spec["input_table"]) == spec["input_sha256"], "Chart input changed"
        assert spec["rows"] == table["rows"] and spec["units"] == table["units"] and spec["status"] == table["status"], "Chart/table mismatch"
        assert set(table["claim_ids"]) <= set(claim_map), "Missing chart claim"
        linked = [claim_map[x] for x in table["claim_ids"]]
        for row in table["rows"]:
            v = row.get("value")
            if isinstance(v, (int, float)) and not isinstance(v, bool):
                assert any(isinstance(c["value"], (int, float)) and math.isclose(v, c["value"], rel_tol=1e-12, abs_tol=1e-12) for c in linked), f"Untraced chart value: {table['id']} {row['label']}"
        for output in spec["outputs"]: assert digest(ROOT / output["path"]) == output["sha256"], "Figure bytes changed"
        assert (ROOT / spec["accessible_table"]).is_file(), "Missing accessible table"
        count += 1
    assert count >= 12, "Featured chart coverage missing"
    checks.append(f"evidence: {len(claims)} claims; {count} chart inputs/specs/SVG/PNG/accessibility tables aligned")
    broken = []
    for p in ROOT.rglob("*.md"):
        for target in re.findall(r"\[[^\]]*\]\(([^)]+)\)", p.read_text()):
            target = target.strip("<>").split("#", 1)[0]
            if not target or re.match(r"^[a-zA-Z][a-zA-Z0-9+.-]*:", target): continue
            if not (p.parent / target).resolve().is_file(): broken.append(f"{p.relative_to(ROOT)} -> {target}")
    assert not broken, "Broken portable Markdown links: " + "; ".join(broken)
    checks.append("portable Markdown links resolve to bundled material")
    failures = []
    private_prefixes = ["/" + "Users/", "/" + "private/", "file" + "://"]
    secret_re = re.compile(r"(?:AKIA[A-Z0-9]{16}|gh[pousr]_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_-]?key|access[_-]?token|password)\s*[:=]\s*[\"'][^\"'\s]{12,}[\"'])", re.I)
    for rel in files:
        p = ROOT / rel
        assert not p.is_symlink(), "Symlink in export"
        assert p.suffix not in {".jsonl", ".parquet", ".gz", ".db", ".sqlite", ".csv"}, "Restricted file type in export"
        if p.suffix in {".md", ".json", ".py", ".html", ".txt", ".svg"}:
            text = p.read_text()
            if any(x in text for x in private_prefixes) or secret_re.search(text): failures.append(rel)
    assert not failures, "Privacy scan: " + ", ".join(failures)
    checks.append("export scan: no absolute workstation paths, secret patterns, raw/row files, private ledgers or symlinks")
    for item in checks: print("PASS", item)
    return checks


if __name__ == "__main__":
    try: validate()
    except (AssertionError, KeyError, ValueError) as exc:
        print("FAIL", exc, file=sys.stderr)
        sys.exit(1)
