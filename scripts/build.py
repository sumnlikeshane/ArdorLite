"""Single public-site build for reviewer clones, CI and the provider."""
import sys
from pipeline_common import ROOT, guard, runtime, now, run, read_json, write_json
from publication_policy import source_digest
from source_profile import public_profile

def commands():
    py=sys.executable
    return [
        [py,'scripts/public_source_check.py'], [py,'scripts/evidence_check.py'],
        [py,'scripts/material_check.py'],
        ['node','--import','tsx','scripts/content_check.ts'],
        ['node','--import','tsx','scripts/publication_check.ts'],
        ['node','--import','tsx','scripts/entry_check.ts'],
        [py,'scripts/publication_policy.py','--engineering'],
        [py,'-B','-m','unittest','discover','-s','tests','-p','test_*.py','-v'],
        [py,'-B','-m','unittest','discover','-s','tests','-p','public_source_test.py','-v'],
        ['node','--import','tsx','--test','tests/evidence.test.ts','tests/search.test.ts',
         'tests/evidence-crosswalk.test.ts','tests/authoring.test.ts',
         'tests/experiences/bridge.test.ts','tests/experiences/engineering.test.ts'],
        ['node','--test','tests/prose-extraction.test.mjs','tests/search-receipt.test.mjs'],
        [py,'scripts/assets_prepare.py'], [py,'scripts/dependency_notices.py'],
        ['pnpm','exec','astro','check'], ['pnpm','exec','astro','build'],
        [py,'scripts/public_metadata.py'],
        ['node','--import','tsx','scripts/search_index.ts'],
        [py,'scripts/output_audit.py','--clean-local-metadata'],
        [py,'-B','-m','unittest','discover','-s','tests','-p','output*.py','-v'],
        [py,'scripts/public_source_check.py'], [py,'scripts/evidence_check.py'],
    ]

def main():
    guard(); public_profile(ROOT)
    receipt={'schemaVersion':2,'startedAt':now(),'mode':'public-site-build',
             'runtime':runtime(),'sourceDigest':source_digest(),'status':'running','steps':[],
             'originalInputVerification':'absent-not-verified','deploymentAuthority':False}
    try:
        for command in commands():
            receipt['steps'].append(run(command)); write_json(ROOT/'receipts/clean-build.json',receipt)
        if source_digest()!=receipt['sourceDigest']: raise ValueError('Source changed during build')
        receipt.update(status='passed',artifactIdentity=read_json(ROOT/'receipts/output-audit.json')['artifactIdentity'])
    except Exception as error:
        receipt.update(status='failed',failure=str(error)); print(error,file=sys.stderr)
    receipt['finishedAt']=now(); write_json(ROOT/'receipts/clean-build.json',receipt)
    return receipt['status']!='passed'

if __name__=='__main__':raise SystemExit(main())
