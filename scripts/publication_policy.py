"""Source-bound scientific/human acceptance. Reporting never issues approval."""
from __future__ import annotations

from datetime import datetime, timezone
import hashlib
from html import unescape
import json
from pathlib import Path
import re
import sys
from urllib.parse import unquote, urlsplit

sys.dont_write_bytecode = True
from pipeline_common import ROOT, artifact_identity, now, read_json, sha256, write_json
from launch_policy import launch_policy
from source_profile import public_profile

STUDIES = ('atlas-ssf', 'momentum-v2', 'swing-autopsy', 'trend-quality', 'delivery-insider', 'price-bridge')
SLUG = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*\Z')
DIGEST = re.compile(r'[a-f0-9]{64}\Z')


def source_inventory(root: Path = ROOT) -> list[dict]:
    """Conservative shared closure; any listed addition/removal/edit invalidates reviews.

    Receipts, docs and generated files are excluded to avoid approval/hash cycles.
    Generated public exports/notices are derived from hashed source and existing gates.
    """
    files = []
    for name in ('src', 'config', 'scripts', 'vendor', 'tests', '.github', 'playwright.config.ts', '.agents/skills/ardor-publication-review', 'reviewed', 'reviewed-supplements', 'snapshots',
                 'public/brand', 'public/images', 'public/favicon.svg', 'public/robots.txt',
                 'package.json', 'pnpm-lock.yaml', 'pnpm-workspace.yaml', '.node-version', '.python-version', '.npmrc', 'NOTICE.md', 'astro.config.mjs', 'tsconfig.json'):
        path = root / name
        if path.is_symlink():
            raise ValueError(f'Symlink in publication inputs: {name}')
        candidates = sorted(path.rglob('*')) if path.is_dir() else [path] if path.exists() else []
        for candidate in candidates:
            if any(p in {'__pycache__', '.DS_Store'} for p in candidate.parts):
                continue
            if candidate.is_symlink():
                raise ValueError(f'Symlink in publication inputs: {candidate.relative_to(root)}')
            if candidate.is_file():
                files.append({'path': candidate.relative_to(root).as_posix(), 'sha256': sha256(candidate), 'sizeBytes': candidate.stat().st_size})
    return sorted(files, key=lambda item: item['path'])


def source_digest(root: Path = ROOT) -> str:
    return artifact_identity(source_inventory(root))


def dependency_digest(root: Path, target: str, files: list[dict] | None = None) -> str:
    """Draft additions do not invalidate the six existing studies' acceptance.

    All shared production inputs remain conservative dependencies. An authored
    entry also depends on its own files and transitively linked writing entries.
    Output/manual/performance checks still bind the whole actual artifact.
    """
    files = files if files is not None else source_inventory(root)
    prefix = 'src/content/entries/'
    slugs = {target.removeprefix('entry-')} if target.startswith('entry-') else set()
    pending = list(slugs)
    while pending:
        slug = pending.pop()
        for name in ('entry.json', 'body.md'):
            path = root / prefix / slug / name
            if path.is_file():
                text = path.read_text()
                if name == 'entry.json':
                    text = json.dumps(json.loads(text), ensure_ascii=False)
                # Match URL spellings that Markdown/HTML and the output auditor
                # decode, including JSON escapes and percent-encoded slugs.
                text = unescape(unquote(text)).replace('\\/', '/')
                for linked in re.findall(r'/writing/([a-z0-9]+(?:-[a-z0-9]+)*)/', text):
                    if linked not in slugs:
                        slugs.add(linked)
                        pending.append(linked)
    return artifact_identity([item for item in files if not item['path'].startswith(prefix) or item['path'].split('/')[3] in slugs])


def included_entries(root: Path = ROOT) -> list[dict]:
    directory = root / 'src/content/entries'
    if not directory.exists():
        return []
    entries = []
    if directory.is_symlink():
        raise ValueError('Symlink entry directory')
    for folder in sorted(directory.iterdir()):
        if folder.is_symlink() or not folder.is_dir() or not SLUG.fullmatch(folder.name):
            raise ValueError(f'Unsafe authored entry path: {folder.name}')
        path = folder / 'entry.json'
        if path.is_symlink() or (folder / 'body.md').is_symlink():
            raise ValueError(f'Symlink authored entry: {folder.name}')
        meta = read_json(path)
        if meta.get('slug') != folder.name or meta.get('status') not in {'draft', 'published', 'archived'}:
            raise ValueError(f'Invalid entry identity/status: {folder.name}')
        if meta['status'] == 'published':
            entries.append(meta)
    return entries


def authored_routes(root: Path = ROOT) -> set[str]:
    entries = included_entries(root)
    return {'/writing/'} | {f'/writing/{e["slug"]}/' for e in entries} if entries else set()


def actual_date(value) -> bool:
    if not isinstance(value, str):
        return False
    try:
        date = datetime.fromisoformat(value.replace('Z', '+00:00'))
        date = date.replace(tzinfo=timezone.utc) if date.tzinfo is None else date
        return date <= datetime.now(timezone.utc)
    except ValueError:
        return False


def evidence_errors(root: Path, evidence) -> list[str]:
    if not isinstance(evidence, dict) or not isinstance(evidence.get('path'), str) or not DIGEST.fullmatch(str(evidence.get('sha256', ''))):
        return ['missing hashed observation evidence']
    rel = Path(evidence['path'])
    if rel.is_absolute() or '..' in rel.parts or not rel.parts or rel.parts[0] not in {'receipts', 'docs'}:
        return ['observation evidence must be a repository-relative receipts/docs file']
    path = root / rel
    if any(p.is_symlink() for p in [path, *path.parents] if p != root.parent) or not path.is_file():
        return ['missing or symlink observation evidence']
    return [] if sha256(path) == evidence['sha256'] else ['observation evidence hash changed']


def review_errors(root: Path, receipt: dict, target: str, kind: str, digest: str) -> list[str]:
    if not isinstance(receipt, dict):
        return ['review receipt must be an object']
    errors = []
    if receipt.get('schemaVersion') != 1 or receipt.get('target') != target or receipt.get('kind') != kind or receipt.get('status') != 'approved':
        errors.append('missing explicit approved review for this target/kind')
    if receipt.get('dependencyDigest') != digest:
        errors.append('stale source/evidence/renderer dependencies')
    if receipt.get('changeClass') not in {'typo', 'definition', 'semantic', 'new-entry', 'shared-renderer', 'new-evidence'}:
        errors.append('explicit change classification required; no automatic cosmetic exemption')
    if not actual_date(receipt.get('reviewedAt')):
        errors.append('missing/invalid/future observation date')
    reviewer = receipt.get('reviewer', {})
    if not isinstance(reviewer, dict) or reviewer.get('type') != 'human' or not reviewer.get('name', '').strip() or not reviewer.get('role', '').strip():
        errors.append('actual human reviewer identity/role required; agent diagnostics are separate')
    if not isinstance(receipt.get('method'), str) or not receipt['method'].strip():
        errors.append('actual review method required')
    errors.extend(evidence_errors(root, receipt.get('evidence')))
    if receipt.get('unresolvedCriticalFindings') != []:
        errors.append('critical findings unresolved or unrecorded')
    if kind == 'scientific':
        checks = receipt.get('checks', {})
        if not isinstance(checks, dict) or any(checks.get(key) is not True for key in ('sourceFidelity', 'comparisonEligibility', 'decisionRule', 'limitations')):
            errors.append('scientific source/comparison/decision/limitation review incomplete')
    else:
        sessions = receipt.get('sessions', [])
        valid = isinstance(sessions, list) and len(sessions) == 6 and all(isinstance(s, dict) for s in sessions)
        if valid:
            valid = len({s.get('id') for s in sessions}) == 6 and all(isinstance(s.get('id'), str) and s['id'].strip() for s in sessions)
            valid = valid and all(s.get('independentUnfamiliarHuman') is True and s.get('unresolvedCriticalMisunderstandings') == 0 and isinstance(s.get('scores'), list) and len(s['scores']) == 7 and all(type(v) is int and 0 <= v <= 2 for v in s['scores']) for s in sessions)
        if valid:
            pairs = ['general', 'finance', 'technical']
            valid = sum(sum(s['scores']) >= 11 for s in sessions) >= 5 and all(len([s for s in sessions if s.get('audience') == pair]) == 2 and any(sum(s['scores']) >= 11 for s in sessions if s.get('audience') == pair) for pair in pairs)
        if not valid:
            errors.append('six independent reader sessions must satisfy the recorded seven-task protocol and audience/critical-error thresholds')
    return errors


def publication_readiness(root: Path = ROOT) -> dict:
    try:
        files = source_inventory(root)
        digest = artifact_identity(files)
        entries = included_entries(root)
    except (ValueError, OSError, KeyError, TypeError) as error:
        return {'status': 'failed', 'sourceDigest': None, 'errors': [str(error)], 'publicBlockers': [str(error)], 'targets': []}
    targets = [f'study-{study}' for study in STUDIES] + [f'entry-{entry["slug"]}' for entry in entries]
    blockers, results = [], []
    policy = launch_policy(root)
    for target in targets:
        target_digest = dependency_digest(root, target, files)
        states = {}
        for kind in ('scientific', 'human'):
            path = root / f'receipts/publication-acceptance/{target}/{kind}.json'
            errors = ['review not recorded']
            if path.exists():
                try:
                    if path.is_symlink() or any(parent.is_symlink() for parent in path.parents if parent != root.parent):
                        raise ValueError('symlink acceptance receipt')
                    errors = review_errors(root, read_json(path), target, kind, target_digest)
                except (ValueError, OSError, TypeError, KeyError, AttributeError) as error:
                    errors = [f'invalid review receipt: {error}']
            states[kind] = {'status': 'current' if not errors else 'pending-or-stale', 'errors': errors}
            blockers.extend(f'{target}/{kind}: {error}' for error in errors)
        results.append({'target': target, 'dependencyDigest': target_digest, 'reviews': states})
    review_blockers = list(blockers)
    eligible_reviews = [b for b in review_blockers if any(b.startswith(f'study-{s}/') for s in STUDIES)]
    deferred_reviews = eligible_reviews if policy['active'] else []
    blockers = list(policy['errors']) + [b for b in review_blockers if b not in deferred_reviews]
    for entry in entries:
        rights = entry.get('rights', {})
        if rights.get('state') != 'allowed' or not isinstance(rights.get('basis'), str) or not rights['basis'].strip():
            blockers.append(f'entry-{entry["slug"]}: material-specific public embedding permission unresolved')
    return {'schemaVersion': 1, 'checkedAt': now(), 'status': 'structurally-reportable', 'sourceDigest': digest,
            'errors': policy['errors'], 'publicBlockers': blockers, 'targets': results,
            'deferredReviews': deferred_reviews, 'allReviewBlockers': review_blockers,
            'launchBlockers': blockers, 'launchPolicy': policy,
            'engineeringBuildBlockers': [b for b in blockers if b not in eligible_reviews],
            'policy': 'Conservative shared dependency closure. Initial launch may defer reviews only under the validated developer-authorized policy; all review states and digests remain truthful. No approval is generated.'}


def authorization_errors(root: Path, release: dict, identity: str) -> list[str]:
    origin = release.get('publicOrigin')
    try:
        parsed = urlsplit(origin or '')
        valid = parsed.scheme == 'https' and bool(parsed.hostname) and parsed.hostname not in {'localhost', '127.0.0.1', '::1'} and not parsed.username and not parsed.password and parsed.path in {'', '/'} and not parsed.query and not parsed.fragment and parsed.port in {None, 443}
    except ValueError:
        valid = False
    valid = valid and not (parsed.hostname or '').endswith('.invalid')
    errors = [] if valid else ['A canonical HTTPS publishing origin without credentials/path/query is required.']
    if public_profile(root):
        errors.append('Public-source engineering profile cannot authorize deployment; use the canonical release pipeline.')
    path = root / 'receipts/public-release-authorization.json'
    try:
        if path.is_symlink():
            raise ValueError('symlink authorization')
        receipt = read_json(path)
        if not isinstance(receipt, dict) or receipt.get('schemaVersion') != 1 or receipt.get('scope') != 'public-deployment' or receipt.get('artifactIdentity') != identity or receipt.get('releaseConfigSha256') != sha256(root / 'config/release.json') or receipt.get('origin') != origin or not receipt.get('authorizedBy') or not receipt.get('instruction') or not actual_date(receipt.get('authorizedAt')):
            errors.append('Explicit public-release authorization must bind this exact artifact, release configuration and origin with the actual user instruction/date/identity.')
    except (OSError, ValueError, TypeError):
        errors.append('No valid exact-candidate public-release authorization; deployment remains unauthorized.')
    return errors


if __name__ == '__main__':
    result = publication_readiness()
    write_json(ROOT / 'receipts/publication-acceptance.json', result)
    engineering = '--engineering' in sys.argv and public_profile(ROOT) is not None
    public = not engineering and (read_json(ROOT / 'config/release.json').get('mode') == 'public' or '--public' in sys.argv)
    print(f'Publication dependencies: {result["sourceDigest"]}; {len(result["targets"])} targets; {len(result["publicBlockers"])} public review/rights blockers.')
    build_blockers = result.get('engineeringBuildBlockers', result['publicBlockers']) if engineering else []
    for error in result['errors'] + build_blockers + (result['publicBlockers'] if public else []):
        print(error)
    raise SystemExit(1 if result['errors'] or build_blockers or (public and result['publicBlockers']) else 0)
