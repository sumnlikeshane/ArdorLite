"""Adverse material/public-release and acceptance-reuse fixtures; never change real receipts."""
from copy import deepcopy
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from pipeline_common import ROOT, artifact_identity, sha256
from material_permissions import material_permissions, supplement_errors
from acceptance_freshness import binding_errors
from publication_policy import source_digest, dependency_digest, STUDIES
import release_check


def write(root, path, data):
    target = root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(json.dumps(data))
    return target


def output(files):
    return dict(status='passed', artifactIdentity=artifact_identity(files), files=files, errors=[])


def file(path, digest='a'):
    return dict(path=path, sha256=digest * 64, sizeBytes=10, classification='fixture')


def manual(identity):
    return dict(artifactIdentity=identity, checkedAt='2026-10-31', method='Fixture observed browser and assistive/device methods',
                scope={'routes': ['/']}, checks=[dict(id=c, status='passed', evidence='Fixture observation') for c in release_check.MANUAL_CHECKS])


def performance(identity):
    return dict(artifactIdentity=identity, measuredAt='2026-10-31', status='passed', conditions={'browser': 'Fixture Chromium lab', 'metricScope': 'Fixture initial load'}, pages={'/': {}})


class MaterialTests(unittest.TestCase):
    def setUp(self):
        self.ledger = json.loads((ROOT / 'config/material-dispositions.json').read_text())

    def test_current_local_materials_validate_without_public_clearance(self):
        result = material_permissions(ledger=self.ledger)
        self.assertEqual(result['errors'], [])
        self.assertEqual(sum(result['counts'].values()), 381)
        self.assertEqual(result['counts']['supplements'], 1)
        self.assertTrue(any(b.startswith('supplements/trend-fold-context-v1: publicEmbedding is local-only') for b in result['publicBlockers']))
        self.assertTrue(any('publicEmbedding is local-only' in b for b in result['publicBlockers']))
        fixture = deepcopy(self.ledger)
        fixture['profiles']['reviewed-derivative']['downloadableDerivatives']['state'] = 'unknown'
        self.assertTrue(any('downloadableDerivatives is unknown' in b for b in material_permissions(ledger=fixture)['publicBlockers']))
        self.assertFalse(any(b.startswith('sources/') or b.startswith('directories/') for b in result['publicBlockers']))

    def test_unknown_and_local_only_public_embedding_never_clear(self):
        for state in ['unknown', 'local-only', 'restricted']:
            with self.subTest(state=state):
                self.ledger['profiles']['local-excerpt']['publicEmbedding']['state'] = state
                result = material_permissions(ledger=self.ledger)
                self.assertEqual(result['errors'], [])
                self.assertTrue(any(f'publicEmbedding is {state}' in b for b in result['publicBlockers']))

    def test_reference_permission_does_not_grant_original_or_excerpt_contents(self):
        result = material_permissions(ledger=self.ledger)
        self.assertEqual(self.ledger['profiles']['local-excerpt']['referenceMetadata']['state'], 'allowed')
        self.assertEqual(self.ledger['profiles']['excluded-original']['downloadableDerivatives']['state'], 'restricted')
        self.assertTrue(result['publicBlockers'])


    def test_missing_identity_basis_and_unsupported_identity_fail(self):
        for change in ['missing', 'extra', 'basis', 'scope']:
            ledger = deepcopy(self.ledger)
            if change == 'missing': ledger['materials']['src/content/walkthrough-source.json'].pop('timing')
            if change == 'extra': ledger['materials']['sources']['invented-source'] = 'excluded-original'
            if change in ['basis', 'scope']: ledger['profiles']['local-excerpt']['publicEmbedding'][change] = ''
            with self.subTest(change=change): self.assertEqual(material_permissions(ledger=ledger)['status'], 'failed')

class FreshnessTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ardor-acceptance-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.old = output([file('index.html'), file('_astro/site.css'), file('pagefind/index.pf', 'b')])
        self.current = output([file('index.html'), file('_astro/site.css'), file('pagefind/index.pf', 'c')])

    def comparison(self, kind):
        receipt = manual(self.old['artifactIdentity']) if kind == 'manual' else performance(self.old['artifactIdentity'])
        path = f'receipts/{kind}.json'
        source = write(self.root, path, receipt)
        baseline = write(self.root, 'receipts/history/audit.json', self.old)
        review = dict(status='approved-unchanged-scope', kind=kind, reviewer='Fixture reviewer', reviewedAt='2026-10-31',
                      basis='Fixture reviewer compared complete reading output; only unmeasured search serialization changed.',
                      fromArtifactIdentity=self.old['artifactIdentity'], toArtifactIdentity=self.current['artifactIdentity'],
                      sourceReceiptSha256=sha256(source), baselineAudit={'path': 'receipts/history/audit.json', 'sha256': sha256(baseline)},
                      routes=['/'], scopeFiles=['_astro/site.css', 'index.html'], excludedChanges=['pagefind/index.pf'])
        return receipt, path, review

    def test_current_manual_and_performance_bindings_pass(self):
        for kind, receipt in [('manual', manual(self.current['artifactIdentity'])), ('performance', performance(self.current['artifactIdentity']))]:
            self.assertEqual(binding_errors(receipt, self.current, kind), [])

    def test_stale_passing_receipts_fail_without_comparison(self):
        for kind, receipt in [('manual', manual(self.old['artifactIdentity'])), ('performance', performance(self.old['artifactIdentity']))]:
            self.assertTrue(any('stale receipt' in e for e in binding_errors(receipt, self.current, kind)))

    def test_historical_free_text_revalidation_does_not_bind(self):
        receipt = performance(self.old['artifactIdentity'])
        receipt['finalFontPolicyRevision'] = {'artifactIdentity': self.current['artifactIdentity'], 'coordinatorRevalidation': 'passed'}
        self.assertTrue(binding_errors(receipt, self.current, 'performance'))

    def test_reviewed_unchanged_scope_is_supported_for_both_receipt_types(self):
        for kind in ['manual', 'performance']:
            receipt, path, review = self.comparison(kind)
            self.assertEqual(binding_errors(receipt, self.current, kind, review, self.root, path), [])

    def test_unsupported_reuse_is_rejected(self):
        for change in ['wrong-target', 'unreviewed', 'no-basis', 'no-reviewer', 'narrow-scope', 'missing-assets', 'missing-diffs', 'bad-baseline', 'bad-receipt', 'traversal']:
            receipt, path, review = self.comparison('performance')
            if change == 'wrong-target': review['toArtifactIdentity'] = 'f' * 64
            if change == 'unreviewed': review['status'] = 'proposed'
            if change == 'no-basis': review['basis'] = ''
            if change == 'no-reviewer': review['reviewer'] = ''
            if change == 'narrow-scope': review['routes'] = []
            if change == 'missing-assets': review['scopeFiles'] = ['index.html']
            if change == 'missing-diffs': review['excludedChanges'] = []
            if change == 'bad-baseline': review['baselineAudit']['sha256'] = '0' * 64
            if change == 'bad-receipt': review['sourceReceiptSha256'] = '0' * 64
            if change == 'traversal': review['baselineAudit']['path'] = '../audit.json'
            with self.subTest(change=change): self.assertTrue(binding_errors(receipt, self.current, 'performance', review, self.root, path))

    def test_changed_removed_added_or_shared_asset_forces_fresh_acceptance(self):
        for changed in [output([file('index.html', 'd'), file('_astro/site.css'), file('pagefind/index.pf', 'c')]),
                        output([file('index.html'), file('_astro/site.css', 'd'), file('pagefind/index.pf', 'c')]),
                        output([file('index.html'), file('pagefind/index.pf', 'c')]),
                        output([file('index.html'), file('_astro/site.css'), file('_astro/new.js'), file('pagefind/index.pf', 'c')])]:
            receipt, path, review = self.comparison('performance')
            review['toArtifactIdentity'] = changed['artifactIdentity']
            self.assertTrue(any('accepted scope changed' in e for e in binding_errors(receipt, changed, 'performance', review, self.root, path)))

    def test_search_reuse_cannot_exclude_changed_search_index(self):
        receipt, path, review = self.comparison('performance')
        receipt['pages']['/search/'] = {}
        source = write(self.root, path, receipt)
        review['sourceReceiptSha256'] = sha256(source)
        review['routes'] = ['/', '/search/']
        self.assertTrue(any('accepted scope changed' in e for e in binding_errors(receipt, self.current, 'performance', review, self.root, path)))

    def test_missing_or_conflicting_identity_and_missing_observation_details_fail(self):
        for change in ['identity', 'conflict', 'date', 'method', 'scope']:
            receipt = manual(self.current['artifactIdentity'])
            if change == 'identity': receipt.pop('artifactIdentity')
            if change == 'conflict': receipt['artifact_identity'] = self.old['artifactIdentity']
            if change == 'date': receipt['checkedAt'] = 'yesterday'
            if change == 'method': receipt.pop('method')
            if change == 'scope': receipt.pop('scope')
            with self.subTest(change=change): self.assertTrue(binding_errors(receipt, self.current, 'manual'))


