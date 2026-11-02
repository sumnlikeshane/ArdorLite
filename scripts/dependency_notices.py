"""Collect installed package licence metadata and original licence/notice files."""
from __future__ import annotations

import re
import shutil
import sys
sys.dont_write_bytecode = True
from pipeline_common import ROOT, guard, read_json, sha256, write_json


def locked_packages(lockfile) -> set[tuple[str, str]]:
    """Read exact package identities from pnpm v9's flat packages mapping.

    Deliberately reject another schema instead of treating historical store
    directories as current dependencies. Peer-qualified graph nodes live in
    snapshots, while packages contains the original name/version identities.
    """
    lines = lockfile.read_text(encoding="utf-8").splitlines()
    if not lines or lines[0] not in {"lockfileVersion: '9.0'", 'lockfileVersion: "9.0"'}:
        raise ValueError("Dependency notices require the reviewed pnpm v9 lockfile schema.")
    active, identities = False, set()
    for line in lines[1:]:
        if line and not line.startswith(" "):
            active = line == "packages:"
            continue
        if not active or not re.match(r"^  \S", line):
            continue
        if not line.endswith(":"):
            raise ValueError(f"Unsupported pnpm package key: {line}")
        key = line[2:-1]
        if key[:1] in {"'", '"'}:
            if key[-1:] != key[:1]:
                raise ValueError("Unbalanced lockfile package key")
            key = key[1:-1]
        if not re.fullmatch(r"(?:@[^/\s]+/)?[^@\s]+@[^:\s]+", key):
            raise ValueError(f"Unsupported pnpm package identity: {key}")
        name, version = key.rsplit("@", 1)
        identities.add((name, version))
    if not identities:
        raise ValueError("No package identities found in pnpm lockfile")
    return identities


def prepare() -> dict:
    packages = {}
    locked = locked_packages(ROOT / "pnpm-lock.yaml")
    store = ROOT / "node_modules" / ".pnpm"
    if not store.is_dir():
        raise SystemExit("Install the locked dependencies before generating notices.")
    for package_json in sorted(store.glob("*/node_modules/*/package.json")) + sorted(store.glob("*/node_modules/@*/*/package.json")):
        data = read_json(package_json)
        name, version = data.get("name"), data.get("version")
        if name and version and (name, version) in locked:
            packages.setdefault((name, version), (package_json.parent, data))
    target = ROOT / "public" / "notices" / "packages"
    if target.exists():
        shutil.rmtree(target)
    target.mkdir(parents=True)
    entries, exports = [], []
    for (name, version), (directory, data) in sorted(packages.items()):
        key = re.sub(r"[^a-zA-Z0-9._-]", "_", f"{name}@{version}")
        urls = []
        for source in sorted(directory.iterdir()):
            if source.is_file() and re.match(r"^(licen[cs]e|copying|notice)([._-].*)?$", source.name, re.I):
                output = target / key / source.name
                output.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, output)
                url = "/" + output.relative_to(ROOT / "public").as_posix()
                urls.append(url)
                exports.append({"outputUrl": url, "outputSha256": sha256(output), "sizeBytes": output.stat().st_size, "role": "dependency-original-notice"})
        repository = data.get("repository")
        entries.append({"name": name, "version": version, "declaredLicense": data.get("license"),
                        "repository": repository, "notices": urls,
                        "noticeAvailability": "original files retained" if urls else "no top-level notice file present in installed package"})
    output = ROOT / "public" / "notices" / "dependencies.json"
    write_json(output, {"schemaVersion": 1, "scope": "Installed locked package tree, including build and test tools; not all packages are shipped JavaScript.", "packages": entries})
    exports.append({"outputUrl": "/notices/dependencies.json", "outputSha256": sha256(output), "sizeBytes": output.stat().st_size, "role": "dependency-notice-inventory"})
    manifest = {"schemaVersion": 1, "packages": len(entries), "assets": exports}
    write_json(ROOT / "generated" / "dependency-notices.json", manifest)
    print(f"Dependency notices: {len(entries)} packages, {len(exports)} public files.")
    return manifest


if __name__ == "__main__":
    guard()
    prepare()
