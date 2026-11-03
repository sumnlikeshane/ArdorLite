"""Public bounded-policy projection; actual retained authority is audited locally."""
from pathlib import Path
from pipeline_common import ROOT, read_json

POLICY_ID='bounded-initial-launch-2026-11-02'
DEFERRED={'scientific','human','manual','performance'}
MANDATORY={'material-rights','complete-build','source-output-binding','three-engine-browser-journeys','output-integrity','public-metadata','exact-release-authorization'}

def launch_policy(root:Path=ROOT)->dict:
    errors=[]
    try:
        selected=read_json(root/'config/release.json').get('launchPolicy')
        if not selected:return {'active':False,'errors':[],'deferred':[]}
        policy=read_json(root/'config/launch-policy.json')
        if selected!=POLICY_ID or policy.get('id')!=POLICY_ID or policy.get('schemaVersion')!=2 or policy.get('status')!='retained-bounded-policy-projection':
            errors.append('Invalid bounded-policy projection')
        if policy.get('scope')!='existing-six-case-static-publication' or policy.get('preservePendingStates') is not True or policy.get('noEffectivenessClaim') is not True:
            errors.append('Bounded scope and truthful unresolved states required')
        if set(policy.get('mandatory',[]))!=MANDATORY:errors.append('Mandatory technical/rights gates cannot be weakened')
        if set(policy.get('deferred',{}))!=DEFERRED or not all(isinstance(v,str) and v.strip() for v in policy.get('deferred',{}).values()):
            errors.append('Exact deferrals and reasons required')
        if policy.get('authority')!={'verification':'retained-local-record-required-before-release'}:
            errors.append('Local authority validation prerequisite required')
    except (OSError,ValueError,TypeError,KeyError) as error:errors.append(str(error))
    return {'active':not errors,'id':POLICY_ID,'errors':errors,'deferred':sorted(DEFERRED) if not errors else [],
            'authorityVerification':'required-in-local-pre-release-audit','reviewApproval':False}
