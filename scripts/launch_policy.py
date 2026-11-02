"""Validate the developer-authorized initial-launch exception, never review approval."""
from pathlib import Path
from pipeline_common import ROOT, read_json, sha256
from source_profile import public_profile

POLICY_ID = 'bounded-initial-launch-2026-11-02'
DEFERRED = {'scientific', 'human', 'manual', 'performance'}
MANDATORY = {'material-rights', 'complete-build', 'source-output-binding', 'three-engine-browser-journeys', 'output-integrity', 'public-metadata', 'exact-release-authorization'}


def launch_policy(root: Path = ROOT) -> dict:
    if public_profile(root):
        return {'active': False, 'errors': [], 'deferred': [], 'engineeringOnly': True}
    release = read_json(root / 'config/release.json')
    selected = release.get('launchPolicy')
    if not selected:
        return {'active': False, 'errors': [], 'deferred': []}
    errors = []
    try:
        policy = read_json(root / 'config/launch-policy.json')
        if selected != POLICY_ID or policy.get('id') != POLICY_ID or policy.get('schemaVersion') != 1 or policy.get('status') != 'developer-authorized':
            errors.append('Unsupported or unauthorized launch policy')
        if set(policy.get('deferred', {})) != DEFERRED or not all(isinstance(v, str) and v.strip() for v in policy.get('deferred', {}).values()):
            errors.append('Explicit bounded review deferrals and reasons required')
        if set(policy.get('mandatory', [])) != MANDATORY:
            errors.append('Initial-launch policy cannot weaken mandatory technical/rights gates')
        if policy.get('scope') != 'existing-six-case-static-publication' or policy.get('preservePendingStates') is not True or policy.get('noEffectivenessClaim') is not True:
            errors.append('Initial-launch scope and truthful unresolved-review/claim limits required')
        authority = policy.get('authority', {})
        path = Path(authority.get('path', ''))
        if path.is_absolute() or '..' in path.parts or not path.parts or path.parts[0] != 'receipts':
            raise ValueError('Invalid launch-policy authority path')
        file = root / path
        if file.is_symlink() or not file.is_file() or sha256(file) != authority.get('sha256'):
            raise ValueError('Launch-policy authority is missing or changed')
        record = read_json(file)
        if record.get('scope') != 'bounded-initial-launch-policy' or record.get('authorizedBy') != 'Ardor Lite project developer' or record.get('decision') != 'Prepare a revised launch policy; retain pending acceptance states.' or not record.get('instruction'):
            raise ValueError('Actual developer policy instruction required; no independent review implied')
    except (OSError, ValueError, TypeError, KeyError) as error:
        errors.append(str(error))
    return {'active': not errors, 'id': selected, 'errors': errors, 'deferred': sorted(DEFERRED) if not errors else []}
