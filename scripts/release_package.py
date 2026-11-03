"""Package audited deployable bytes outside dist, with honest readiness gaps."""
from __future__ import annotations

import gzip
import io
import subprocess
import sys
import tarfile
sys.dont_write_bytecode = True
from pipeline_common import ROOT, guard, now, read_json, runtime, sha256, write_json
from output_audit import audit
from release_check import readiness
from publication_policy import source_digest


def main() -> int:
    guard()
    output = audit()
    if output["status"] != "passed":
        print("Packaging blocked: output audit failed. Repair the output first.", file=sys.stderr)
        return 1
    identity = output["artifactIdentity"]
    build_path = ROOT / "receipts" / "clean-build.json"
    build = read_json(build_path) if build_path.is_file() else {}
    if build.get("status") != "passed" or build.get("artifactIdentity") != identity:
        print("Packaging blocked: a successful complete build receipt for the current output is required.", file=sys.stderr)
        return 1
    if build.get('sourceDigest') != source_digest(ROOT):
        print('Packaging blocked: source/evidence/configuration changed since the successful build.', file=sys.stderr)
        return 1
    readiness_result = readiness()
    write_json(ROOT / "receipts" / "release-readiness.json", readiness_result)
    destination = ROOT / "artifacts" / f"ardor-lite-local-{identity[:16]}.tar.gz"
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("wb") as stream:
        with gzip.GzipFile(filename="", mode="wb", fileobj=stream, mtime=0) as zipped:
            with tarfile.open(fileobj=zipped, mode="w") as archive:
                for item in output["files"]:
                    source = ROOT / "dist" / item["path"]
                    info = tarfile.TarInfo(item["path"])
                    info.size = source.stat().st_size
                    info.mode, info.uid, info.gid, info.mtime = 0o644, 0, 0, 0
                    archive.addfile(info, io.BytesIO(source.read_bytes()))
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True)
    receipt = {"schemaVersion": 1, "packagedAt": now(), "kind": "local-review-candidate", "deployed": False,
               "snapshot": "2026-10-11", "websiteCommit": commit.stdout.strip() if commit.returncode == 0 else None,
               "runtime": runtime(), "lockfileSha256": sha256(ROOT / "pnpm-lock.yaml"),
               "sourceDigest": build['sourceDigest'],
               "artifact": {"path": destination.relative_to(ROOT).as_posix(), "sha256": sha256(destination), "sizeBytes": destination.stat().st_size, "inventoryIdentity": identity},
               "files": output["files"], "readiness": readiness_result,
               "scope": "Only audited dist files are in the archive. Source, reviewed snapshot, receipts and account facts are outside deployable output."}
    write_json(ROOT / "receipts" / "release-candidate.json", receipt)
    write_json(destination.with_suffix("").with_suffix(".json"), receipt)
    print(f"Packaged {destination.relative_to(ROOT)} ({destination.stat().st_size:,} bytes). Public readiness: {readiness_result['publicRelease']['status']}.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
