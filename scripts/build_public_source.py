"""Standalone public-source engineering build, explicitly excluding private checks.

This retains immutable-snapshot, material, authored-content, type, search and
complete output gates. It does not claim original-capture/supplement validation,
human acceptance or deployment permission. Those remain in build.py/release:check.
"""
import sys
from pipeline_common import ROOT, guard, runtime, now, run, read_json, write_json
from publication_policy import source_digest
from source_profile import public_profile


def main():
    guard()
    if not public_profile(ROOT):
        raise ValueError('Requires the explicit metadata-only public-source profile')
    receipt = {'schemaVersion': 1, 'startedAt': now(), 'mode': 'public-source-engineering-no-deployment',
               'runtime': runtime(), 'sourceDigest': source_digest(), 'status': 'running', 'steps': [],
               'excludedVerification': ['absent original captures', 'absent local-only supplement and its private approval',
                                        'private release authorization', 'scientific/human/manual/performance acceptance']}
    commands = [
        [sys.executable, 'scripts/public_source_check.py'],
        [sys.executable, 'scripts/evidence_check.py'],
        [sys.executable, 'scripts/material_check.py'],
        ['node', '--import', 'tsx', 'scripts/content_check.ts'],
        ['node', '--import', 'tsx', 'scripts/publication_check.ts'],
        ['node', '--import', 'tsx', 'scripts/entry_check.ts'],
        [sys.executable, 'scripts/publication_policy.py', '--engineering'],
        [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'public_source_test.py', '-v'],
        [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_static_preview.py', '-v'],
        [sys.executable, '-m', 'unittest', 'discover', '-s', 'tests', '-p', 'test_pagefind_wasm.py', '-v'],
        ['node', '--import', 'tsx', '--test', 'tests/evidence.test.ts', 'tests/search.test.ts',
         'tests/evidence-crosswalk.test.ts', 'tests/authoring.test.ts',
         'tests/experiences/bridge.test.ts', 'tests/experiences/engineering.test.ts'],
        ['node', '--test', 'tests/prose-extraction.test.mjs'],
        [sys.executable, 'scripts/assets_prepare.py'],
        [sys.executable, 'scripts/dependency_notices.py'],
        ['pnpm', 'exec', 'astro', 'check'],
        ['pnpm', 'exec', 'astro', 'build'],
        [sys.executable, 'scripts/public_metadata.py'],
        ['node', '--import', 'tsx', 'scripts/search_index.ts'],
        [sys.executable, 'scripts/output_audit.py', '--clean-local-metadata'],
        [sys.executable, 'scripts/public_source_check.py'],
        [sys.executable, 'scripts/evidence_check.py'],
    ]
    try:
        for command in commands:
            receipt['steps'].append(run(command))
            write_json(ROOT / 'receipts/clean-build.json', receipt)
        if receipt['sourceDigest'] != source_digest():
            raise ValueError('Public source changed during build')
        receipt.update(status='passed', artifactIdentity=read_json(ROOT / 'receipts/output-audit.json')['artifactIdentity'])
    except Exception as error:
        receipt.update(status='failed', failure=str(error))
        print(error, file=sys.stderr)
    receipt['finishedAt'] = now()
    write_json(ROOT / 'receipts/clean-build.json', receipt)
    return receipt['status'] != 'passed'


if __name__ == '__main__':
    raise SystemExit(main())
