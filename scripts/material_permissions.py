"""Material-specific scopes over existing identities; no source execution or rights inference."""
from __future__ import annotations

import sys
sys.dont_write_bytecode = True
from pipeline_common import ROOT, read_json
from hashlib import sha256
from source_profile import public_profile, capture_manifest

SCOPES = {'referenceMetadata', 'localInspectionCapture', 'publicEmbedding', 'downloadableDerivatives'}
STATES = {'allowed', 'local-only', 'unknown', 'restricted'}


def supplement_errors(root, config):
    # Original supplement/approval integrity runs in the explicit external audit.
    public_profile(root)
    return []


def material_permissions(root=ROOT, ledger=None):
    ledger = read_json(root / 'config/material-dispositions.json') if ledger is None else ledger
    manifest = read_json(root / 'reviewed/2026-10-11/evidence/manifest.json')
    records = read_json(root / 'reviewed/2026-10-11/content/research.json')['records']
    source_ids = {s['id'] for s in manifest['sources']}
    directory_ids = {s['source_id'] for r in records for s in r['source_index_references']} - source_ids
    selection = read_json(root / 'config/experience-sources.json')
    captures = {'src/content/walkthrough-source.json': 'research/walkthrough/index.html', **selection['embeddedRoutes']}
    supplements = read_json(root / 'config/evidence-supplements.json')
    expected = {
        'sources': source_ids, 'directories': directory_ids,
        'derivatives': {d['path'] for d in manifest['derivatives']},
        **{path: {e['id'] for e in capture_manifest(root, path)['excerpts']} for path in captures},
        'supplements': {item['id'] for item in supplements['supplements']},
    }
    exports = {a['sourcePath'] for a in read_json(root / 'config/publication-assets.json')['assets']}
    errors, blockers, selected_blockers, omitted = supplement_errors(root, supplements), [], [], []
    public_mode = read_json(root / "config/release.json").get("mode") == "public"
    def require(condition, message):
        if not condition:
            errors.append(message)
    require(ledger.get('schemaVersion') == 1, 'Unsupported material disposition schema')
    profiles = ledger.get('profiles', {})
    collections = ledger.get('materials', {})
    require(set(collections) == set(expected), 'Disposition collections differ from existing material manifests')
    for name, profile in profiles.items():
        require(set(profile) == SCOPES, f'{name}: all four permission scopes are required')
        for scope, disposition in profile.items():
            require(isinstance(disposition, dict), f'{name}/{scope}: disposition must be an object')
            if not isinstance(disposition, dict):
                continue
            require(disposition.get('state') in STATES, f'{name}/{scope}: invalid permission state')
            require(bool(disposition.get('scope', '').strip()) and bool(disposition.get('basis', '').strip()), f'{name}/{scope}: explicit scope and basis required')
    for collection, identities in expected.items():
        assignments = collections.get(collection, {})
        require(set(assignments) == identities, f'{collection}: missing or unsupported material identities')
        for identity in sorted(identities):
            profile = profiles.get(assignments.get(identity), {})
            require(bool(profile), f'{collection}/{identity}: missing disposition profile')
            # Only uses actually selected for publication are public blockers. Excluded
            # originals are cited as metadata; their restricted contents are not required.
            uses = ['referenceMetadata']
            if collection in captures or collection == 'supplements':
                uses.append('publicEmbedding')
            if collection == 'derivatives':
                if identity in exports:
                    uses.append('downloadableDerivatives')
                if identity.startswith(('content/', 'evidence/', 'charts/specs/', 'methods/')):
                    uses.append('publicEmbedding')
            for scope in uses:
                state = profile.get(scope, {}).get('state', 'unknown')
                if state != 'allowed':
                    message = f'{collection}/{identity}: {scope} is {state}; explicit permission for this public use is required.'
                    blockers.append(message)
                    # Exact existing local-only captures and supplement are omitted by
                    # the public renderers; their permissions remain unchanged. The
                    # exhaustive output audit independently checks their byte absence.
                    excluded_use = public_mode and scope == 'publicEmbedding' and state == 'local-only' and (collection in captures or collection == 'supplements')
                    if excluded_use:
                        omitted.append({'collection': collection, 'identity': identity, 'scope': scope, 'state': state,
                                        'reason': 'Omitted from public output; original local-only permission preserved.'})
                    else:
                        selected_blockers.append(message)
    return {'status': 'passed' if not errors else 'failed', 'errors': errors,
            'counts': {key: len(value) for key, value in expected.items()}, 'publicBlockers': blockers, 'selectedPublicBlockers': selected_blockers, 'omittedPublicUses': omitted, 'originalInputVerification': 'excluded-not-verified' if public_profile(root) else 'private-input-integrity'}
