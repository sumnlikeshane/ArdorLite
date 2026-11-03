"""Verify full current build/output/browser/search bindings without approving release."""
from pipeline_common import ROOT, guard, read_json, write_json, now
from output_audit import audit
from publication_policy import source_digest
from release_evidence import browser_errors, search_errors

def check():
    output=audit(write_receipt=False);source=source_digest(ROOT);identity=output['artifactIdentity']
    errors=list(output['errors'])
    build=read_json(ROOT/'receipts/clean-build.json')
    if build.get('status')!='passed' or build.get('artifactIdentity')!=identity or build.get('sourceDigest')!=source:errors.append('Current complete build required')
    errors+=browser_errors(ROOT,read_json(ROOT/'receipts/browser-results.json'),source,identity)
    errors+=search_errors(ROOT,read_json(ROOT/'receipts/search-acceptance.json'),identity)
    result={'schemaVersion':1,'checkedAt':now(),'status':'failed' if errors else 'passed','sourceDigest':source,'artifactIdentity':identity,'errors':errors,'deploymentAuthority':False,'independentAcceptance':'pending/stale'}
    write_json(ROOT/'receipts/technical-check.json',result)
    return result

if __name__=='__main__':
    guard();result=check();print(result);raise SystemExit(result['status']!='passed')
