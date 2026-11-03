"""Read-only release assessment. Builds and technical summaries grant no authority."""
import os, sys
from pipeline_common import ROOT, guard, now, read_json, write_json
from publication_policy import source_digest, publication_readiness
from launch_policy import launch_policy
from output_audit import audit
from material_permissions import material_permissions
from release_evidence import evidence_errors, browser_errors
from acceptance_freshness import binding_errors
MANUAL_CHECKS={'keyboard','screen_reader','touch','reflow_320','zoom_400','focus','reduced_motion','print','real_safari','real_edge','real_mobile'}

def readiness():
    output=audit(write_receipt=False); identity=output['artifactIdentity']; source=source_digest(ROOT)
    local=[]; blockers=[]; deferred=[]
    if output['status']!='passed':local+=output['errors']
    build=read_json(ROOT/'receipts/clean-build.json') if (ROOT/'receipts/clean-build.json').is_file() else {}
    if build.get('status')!='passed' or build.get('sourceDigest')!=source or build.get('artifactIdentity')!=identity:local.append('Complete current source/output-bound build required')
    try:local+=browser_errors(ROOT,read_json(ROOT/'receipts/browser-results.json'),source,identity)
    except (OSError,ValueError):local.append('Complete current browser evidence absent')
    policy=launch_policy(ROOT); publication=publication_readiness(ROOT); permissions=material_permissions(ROOT)
    blockers+=policy['errors']+publication['publicBlockers']+permissions['errors']+permissions['selectedPublicBlockers']
    deferred+=publication.get('deferredReviews',[])
    # Retain original manual/performance freshness rules; bounded deferral changes
    # release eligibility only. Missing evidence is never relabelled a pass.
    manual_ids=MANUAL_CHECKS
    for kind,name in [('manual','browser-manual-matrix'),('performance','performance')]:
        path=ROOT/f'receipts/{name}.json'; record=read_json(path) if path.is_file() else {}
        reuse=ROOT/f'receipts/acceptance-reuse/{kind}.json'
        errors=binding_errors(record,output,kind,read_json(reuse) if reuse.is_file() else None,ROOT,path.relative_to(ROOT).as_posix())
        if kind=='manual':
            done={c.get('id') for c in record.get('checks',[]) if c.get('status')=='passed' and c.get('evidence')}
            errors+=['Unresolved manual review: '+v for v in sorted(manual_ids-done)]
        elif record.get('status')!='passed' or not record.get('conditions'):errors.append('Full current performance acceptance unresolved')
        (deferred if policy['active'] else blockers).extend(errors)
    blockers+=evidence_errors(ROOT,provider=os.environ.get('RENDER')=='true')
    return {'schemaVersion':4,'checkedAt':now(),'sourceDigest':source,'artifactIdentity':identity,
            'structuralReadiness':{'status':'passed' if output['status']=='passed' and not publication['errors'] and not permissions['errors'] else 'failed'},
            'localCandidate':{'status':'reviewable' if not local else 'checks-incomplete','blockers':local},
            'publicRelease':{'status':'ready-for-authorized-release' if not local+blockers else 'not-ready','blockers':local+blockers},
            'deferredAcceptance':deferred,'publicationAcceptance':publication,'launchPolicy':policy,'materials':permissions,'outputErrors':output['errors'],'deployed':False}

if __name__=='__main__':
    guard(); result=readiness(); write_json(ROOT/'receipts/release-readiness.json',result)
    print('Public release:',result['publicRelease']['status'])
    for error in result['publicRelease']['blockers']:print('  '+error)
    raise SystemExit(result['publicRelease']['status']!='ready-for-authorized-release')
