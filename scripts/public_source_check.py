"""Verify metadata-only provenance against selected identities, never absent code."""
import json
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
    report = {'schemaVersion': 1, 'status': 'passed', 'profile': 'public-source', 'capturedContents': 'absent-not-verified',
              'metadataIdentities': len(actual) + len(walkthrough), 'immutableSnapshotVerification': 'separate-complete-check',
              'deploymentEligible': False, 'omittedPrivateInputs': profile['omittedPrivateInputs']}
    write_json(ROOT / 'receipts/public-source-check.json', report)
    print(json.dumps(report))


if __name__ == '__main__':
    guard()
    check()
