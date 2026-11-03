"""Verify metadata-only provenance against selected identities, never absent code."""
import json
import os
from pipeline_common import ROOT, guard, read_json, write_json
from source_profile import public_profile


def check():
    profile = public_profile(ROOT)
    if not profile:
        raise ValueError('Explicit public-source profile required')
    provenance = read_json(ROOT / 'src/content/public-provenance.json')
    selection = read_json(ROOT / 'config/experience-sources.json')
    actual = []
    for path in selection['manifests']:
        for item in provenance['manifests'][path]['excerpts']:
            if 'text' in item or 'code' in item or item.get('contentOmitted') is not True:
                raise ValueError('Source metadata must not contain captured text')
            actual.append({key: item[key] for key in ('id', 'path', 'lineStart', 'lineEnd', 'sha256', 'excerptSha256')})
    if actual != selection['excerpts']:
        raise ValueError('Public provenance differs from selected source identities')
    walkthrough = provenance['walkthrough']['excerpts']
    if len(walkthrough) != 5 or any('code' in item or 'text' in item or item.get('contentOmitted') is not True for item in walkthrough):
        raise ValueError('Walkthrough must retain exactly five metadata-only identities')
    for item in walkthrough:
        for key in ('fileSha256', 'excerptSha256'):
            if len(item[key]) != 64:
                raise ValueError('Invalid walkthrough provenance hash')
    for path in (ROOT / 'src/content/entries').glob('*/entry.json'):
        if read_json(path).get('status') != 'published':
            raise ValueError('Draft or archived authored source belongs outside public Git')
    for relative in ('scripts/content_manage.ts', '.env', '.local', 'ardorlite-local'):
        path = ROOT / relative
        if path.exists() or path.is_symlink():
            raise ValueError('Unexpected private/owner input in public source: ' + relative)
    for path in ROOT.glob('.env*'):
        raise ValueError('Environment files are not public build inputs: ' + path.name)
    for name in ('src','config','scripts','tests','docs','receipts','reviewed','snapshots','vendor','public'):
        for base, directories, files in os.walk(ROOT/name, followlinks=False):
            for item in directories+files:
                path = __import__('pathlib').Path(base)/item
                if path.is_symlink():
                    raise ValueError('Symlink in public source/output inputs: '+str(path.relative_to(ROOT)))
                if path.name.endswith(('.pem','.key','.p12','.pfx')):
                    raise ValueError('Unexpected credential file in public source')
    report = {'schemaVersion': 2, 'status': 'passed', 'profile': 'public-site', 'capturedContents': 'absent-not-verified',
              'metadataIdentities': len(actual) + len(walkthrough), 'immutableSnapshotVerification': 'separate-complete-check',
              'releaseAuthority': 'separate-exact-candidate-gate', 'omittedPrivateInputs': profile['omittedPrivateInputs']}
    write_json(ROOT / 'receipts/public-source-check.json', report)
    print(json.dumps(report))


if __name__ == '__main__':
    guard()
    check()
