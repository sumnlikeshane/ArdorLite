"""Rehearse an exact retained-byte restore in temporary storage; no live actions."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path, PurePosixPath
import sys
import tarfile
import tempfile

sys.dont_write_bytecode = True
from pipeline_common import ROOT, artifact_identity, guard, now, read_json, sha256, write_json
from output_audit import audit


def verify_tree(directory: Path, files: list[dict]) -> None:
    actual = {p.relative_to(directory).as_posix() for p in directory.rglob('*') if p.is_file()}
    expected = {item['path'] for item in files}
    if actual != expected:
        raise ValueError('Restored file set differs from the retained inventory')
    for item in files:
        path = directory / item['path']
        if path.is_symlink() or path.stat().st_size != item['sizeBytes'] or sha256(path) != item['sha256']:
            raise ValueError(f'Restored bytes differ: {item["path"]}')


def restore(archive_path: Path, receipt: dict, destination: Path) -> None:
    if archive_path.is_symlink() or sha256(archive_path) != receipt['artifact']['sha256']:
        raise ValueError('Retained archive checksum mismatch')
    files = receipt['files']
    if artifact_identity(files) != receipt['artifact']['inventoryIdentity']:
        raise ValueError('Retained inventory identity mismatch')
    expected = {item['path']: item for item in files}
    if len(expected) != len(files):
        raise ValueError('Duplicate retained inventory paths')
    if destination.is_symlink() or not destination.is_dir() or any(destination.iterdir()):
        raise ValueError('Restore requires a fresh empty temporary directory')
    with tarfile.open(archive_path, 'r:gz') as archive:
        members = archive.getmembers()
        if len(members) != len(expected) or {m.name for m in members} != set(expected):
            raise ValueError('Archive member set differs from the retained inventory')
        # Validate the entire archive before the first write. Never use extractall.
        for member in members:
            path = PurePosixPath(member.name)
            if path.is_absolute() or '..' in path.parts or '\\' in member.name or path.as_posix() != member.name or not member.isfile() or member.size != expected[member.name]['sizeBytes']:
                raise ValueError(f'Unsafe archive member: {member.name}')
        for member in members:
            stream = archive.extractfile(member)
            if stream is None:
                raise ValueError('Unreadable archive member')
            data = stream.read()
            if hashlib.sha256(data).hexdigest() != expected[member.name]['sha256']:
                raise ValueError(f'Archive member checksum mismatch: {member.name}')
            target = destination / member.name
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(data)
    verify_tree(destination, files)


def main() -> int:
    guard()
    receipt = read_json(ROOT / 'receipts/release-candidate.json')
    rel = Path(receipt['artifact']['path'])
    if rel.is_absolute() or '..' in rel.parts or not rel.parts or rel.parts[0] != 'artifacts':
        raise ValueError('Only a retained local artifact is a rehearsal target')
    archive = ROOT / rel
    active_before = audit(write_receipt=False)
    if active_before['status'] != 'passed':
        raise ValueError('Rehearsal requires a currently audited local candidate')
    identity = receipt['artifact']['inventoryIdentity']
    if active_before['artifactIdentity'] != identity:
        raise ValueError('Rehearsal target differs from active candidate; select/package current bytes first')
    with tempfile.TemporaryDirectory(prefix='ardor-rollback-') as scratch:
        target = Path(scratch).resolve() / 'restored'
        target.mkdir()
        restore(archive, receipt, target)
        before = audit(target, write_receipt=False)
        if before['status'] != 'passed' or before['artifactIdentity'] != identity:
            raise ValueError('Restored candidate failed the full output audit')
        (target / 'index.html').write_text('SIMULATED CORRUPT LOCAL HOMEPAGE')
        detected = False
        try:
            verify_tree(target, receipt['files'])
        except ValueError:
            detected = True
        if not detected:
            raise ValueError('Simulated regression escaped inventory verification')
        # Start the restoration in another empty directory, as for an immutable deployment.
        restored = Path(scratch).resolve() / 'rollback'
        restored.mkdir()
        restore(archive, receipt, restored)
        after = audit(restored, write_receipt=False)
        if after['status'] != 'passed' or after['artifactIdentity'] != identity:
            raise ValueError('Rollback output failed the full output audit')
    active_after = audit(write_receipt=False)
    if active_after['artifactIdentity'] != active_before['artifactIdentity']:
        raise ValueError('Active output changed during the local exercise')
    result = {'schemaVersion': 1, 'exercisedAt': now(), 'status': 'passed', 'scope': 'local-retained-byte-restore-only',
              'artifactIdentity': identity, 'archiveSha256': sha256(archive), 'filesVerified': len(receipt['files']),
              'corruptionDetected': detected, 'restoredOutputAudit': after['status'], 'activeOutputUnchanged': True,
              'deployed': False, 'liveRollback': 'unperformed; no hosting/release authorized',
              'firstReleaseWithdrawal': 'unperformed; must later verify all live aliases and direct assets'}
    write_json(ROOT / 'receipts/rollback-exercise.json', result)
    print(json.dumps(result, indent=2))
    return 0


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except (ValueError, OSError, KeyError, tarfile.TarError) as error:
        print(f'Rollback rehearsal failed: {error}', file=sys.stderr)
        raise SystemExit(1)
