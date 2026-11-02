"""Bind manual/performance evidence to output or an explicitly reviewed byte comparison."""
from __future__ import annotations

from datetime import datetime
from pathlib import PurePosixPath
import re
import sys
sys.dont_write_bytecode = True
from pipeline_common import ROOT, artifact_identity, read_json, sha256

DIGEST = re.compile(r'[0-9a-f]{64}')


def dated(value):
    try:
        datetime.fromisoformat(value.replace('Z', '+00:00'))
        return True
    except (AttributeError, TypeError, ValueError):
        return False


def acceptance_scope(receipt, kind):
    if kind == 'performance':
        return sorted(receipt.get('pages', {}))
    return sorted(receipt.get('scope', {}).get('routes', []))


def local_file(root, relative):
    if not isinstance(relative, str):
        raise ValueError('Comparison requires a repository-relative evidence path')
    path = PurePosixPath(relative)
    if path.is_absolute() or '..' in path.parts or str(path) != relative or '\\' in relative:
        raise ValueError('Unsafe acceptance evidence path')
    target = root / relative
    if any(p.is_symlink() for p in [target, *target.parents] if p.is_relative_to(root)):
        raise ValueError('Symlink acceptance evidence rejected')
    if not target.resolve().is_relative_to(root.resolve()):
        raise ValueError('Acceptance evidence escaped repository')
    return target


def binding_errors(receipt, output, kind, review=None, root=ROOT, receipt_path=None):
    """A review cannot turn missing/failed acceptance into passed acceptance."""
    errors = []
    def require(condition, message):
        if not condition:
            errors.append(f'{kind} acceptance: {message}')
    identity = receipt.get('artifactIdentity', receipt.get('artifact_identity'))
    require(isinstance(identity, str) and DIGEST.fullmatch(identity), 'valid observed artifact identity required')
    if 'artifactIdentity' in receipt and 'artifact_identity' in receipt:
        require(receipt['artifactIdentity'] == receipt['artifact_identity'], 'conflicting artifact identities')
    date = receipt.get('measuredAt') if kind == 'performance' else receipt.get('checkedAt', receipt.get('date'))
    require(dated(date), 'observed date required')
    routes = acceptance_scope(receipt, kind)
    require(bool(routes) and all(isinstance(r, str) and r.startswith('/') and r.endswith('/') and '..' not in r for r in routes), 'explicit route scope required')
    if kind == 'performance':
        conditions = receipt.get('conditions', {})
        require(bool(conditions.get('browser')) and bool(conditions.get('metricScope')), 'recorded method and measurement scope required')
    else:
        require(bool(receipt.get('method')), 'observed manual method required')
    if identity == output['artifactIdentity']:
        return errors
    require(isinstance(review, dict), 'stale receipt; current artifact or reviewed unchanged-scope comparison required')
    if not isinstance(review, dict):
        return errors
    require(review.get('status') == 'approved-unchanged-scope' and review.get('kind') == kind, 'explicit scoped approval required')
    require(bool(str(review.get('reviewer', '')).strip()) and dated(review.get('reviewedAt')) and bool(str(review.get('basis', '')).strip()), 'reviewer, review date and comparison basis required')
    require(review.get('fromArtifactIdentity') == identity and review.get('toArtifactIdentity') == output['artifactIdentity'], 'comparison must bind both exact artifacts')
    require(review.get('routes') == routes, 'comparison may not narrow the observed route scope')
    try:
        source = local_file(root, receipt_path)
        require(sha256(source) == review.get('sourceReceiptSha256'), 'reviewed receipt bytes changed')
        baseline_ref = review.get('baselineAudit', {})
        baseline_path = local_file(root, baseline_ref.get('path'))
        require(sha256(baseline_path) == baseline_ref.get('sha256'), 'baseline inventory digest mismatch')
        baseline = read_json(baseline_path)
        require(baseline.get('status') == 'passed' and baseline.get('artifactIdentity') == identity and artifact_identity(baseline['files']) == identity, 'baseline inventory must establish the observed artifact')
        old = {f['path']: f for f in baseline['files']}
        current = {f['path']: f for f in output['files']}
        require(len(old) == len(baseline['files']) and len(current) == len(output['files']), 'duplicate inventory paths')
        # Manual release checks span the whole publication. Performance compares
        # every measured route plus all non-HTML assets (conservative dependency
        # closure). Pagefind is excluded only when Search was not measured.
        paths = set(old) | set(current)
        def relevant(path):
            if path.startswith('pagefind/') and '/search/' not in routes:
                return False
            if kind == 'manual' or not path.endswith('.html'):
                return True
            return path in {r.lstrip('/') + 'index.html' for r in routes}
        required = sorted(p for p in paths if relevant(p))
        require(review.get('scopeFiles') == required, 'scopeFiles must cover the complete acceptance dependency scope')
        changed = sorted(p for p in paths if old.get(p) != current.get(p))
        require(review.get('excludedChanges') == changed, 'all changed/added/removed files must be listed and reviewed')
        require(not set(required).intersection(changed), 'accepted scope changed; fresh observation required')
    except (OSError, ValueError, KeyError, TypeError) as error:
        errors.append(f'{kind} acceptance: unsupported comparison evidence: {error}')
    return errors
