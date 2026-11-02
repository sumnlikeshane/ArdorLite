"""Validate local dispositions; fail closed for public-mode material use."""
import sys
sys.dont_write_bytecode = True
from pipeline_common import ROOT, guard, read_json
from material_permissions import material_permissions

if __name__ == '__main__':
    guard()
    result = material_permissions()
    mode = read_json(ROOT / 'config/release.json').get('mode')
    errors = result['errors'] + ([] if mode == 'local' else result.get('selectedPublicBlockers', result['publicBlockers']))
    if mode not in {'local', 'public'}:
        errors.append('Unknown release mode')
    for error in errors:
        print(error)
    print(f'Material dispositions: {mode}; {sum(result["counts"].values())} identities; {len(errors)} errors; {len(result["publicBlockers"])} public blockers.')
    raise SystemExit(bool(errors))
