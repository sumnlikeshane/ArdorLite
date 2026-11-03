"""Adverse phase 7 controls; all favorable approvals here are synthetic fixtures."""
from copy import deepcopy
import gzip
import hashlib
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from pipeline_common import artifact_identity, sha256
from publication_policy import source_digest, dependency_digest, review_errors, publication_readiness, authorization_errors, authored_routes
from rollback_exercise import restore, verify_tree


class PolicyTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ardor-phase7-')
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()
        self.write('src/component.astro', 'Fixture renderer')
        self.write('config/release.json', json.dumps({'mode': 'local', 'publicOrigin': None}))
        self.write('docs/fixture-observation.txt', 'SYNTHETIC TEST OBSERVATION; never actual acceptance')

    def write(self, path, text):
        target = self.root / path
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text)
        return target

    def receipt(self, kind):
        return dict(schemaVersion=1, target='study-trend-quality', kind=kind, status='approved', changeClass='semantic', dependencyDigest=dependency_digest(self.root, 'study-trend-quality'),
                    reviewedAt='2026-10-31', reviewer={'type': 'human', 'name': 'Synthetic fixture human', 'role': 'Fixture'}, method='Synthetic fixture protocol',
                    evidence={'path': 'docs/fixture-observation.txt', 'sha256': sha256(self.root / 'docs/fixture-observation.txt')}, unresolvedCriticalFindings=[],
                    checks={key: True for key in ('sourceFidelity', 'comparisonEligibility', 'decisionRule', 'limitations')},
                    sessions=[{'id': f'fixture-{i}', 'audience': ['general', 'finance', 'technical'][i // 2], 'independentUnfamiliarHuman': True, 'unresolvedCriticalMisunderstandings': 0, 'scores': [2] * 7} for i in range(6)])

    def errors(self, receipt, kind):
        return review_errors(self.root, receipt, 'study-trend-quality', kind, dependency_digest(self.root, 'study-trend-quality'))

    def test_exact_synthetic_scientific_and_human_reviews_can_validate(self):
        for kind in ('scientific', 'human'):
            self.assertEqual(self.errors(self.receipt(kind), kind), [])

    def test_content_evidence_rules_renderer_additions_removals_invalidate_acceptance(self):
        for path in ('src/new-note.md', 'src/component.astro', 'config/rules.json', 'reviewed/fixture.json', 'snapshots/fixture.json', 'scripts/checker.py', 'public/brand/logo.svg'):
            receipt = self.receipt('scientific')
            self.write(path, 'changed fixture dependency')
            self.assertTrue(any('stale' in error for error in self.errors(receipt, 'scientific')))
        receipt = self.receipt('human')
        (self.root / 'src/new-note.md').unlink()
        self.assertTrue(self.errors(receipt, 'human'))

    def test_agent_missing_evidence_future_dates_unresolved_findings_and_tampering_fail(self):
        for change in ('agent', 'identity', 'evidence', 'traversal', 'future', 'findings', 'checks'):
            receipt = self.receipt('scientific')
            if change == 'agent': receipt['reviewer']['type'] = 'agent'
            if change == 'identity': receipt['reviewer']['name'] = ''
            if change == 'evidence': receipt['evidence']['sha256'] = '0' * 64
            if change == 'traversal': receipt['evidence']['path'] = '../outside'
            if change == 'future': receipt['reviewedAt'] = '2999-01-01'
            if change == 'findings': receipt['unresolvedCriticalFindings'] = ['still open']
            if change == 'checks': receipt['checks']['decisionRule'] = False
            with self.subTest(change=change): self.assertTrue(self.errors(receipt, 'scientific'))

    def test_reader_thresholds_independence_tasks_audiences_and_critical_errors_fail_closed(self):
        for change in ('count', 'duplicate', 'audience', 'scores', 'low', 'critical', 'familiar'):
            receipt = self.receipt('human')
            if change == 'count': receipt['sessions'].pop()
            if change == 'duplicate': receipt['sessions'][1]['id'] = receipt['sessions'][0]['id']
            if change == 'audience': receipt['sessions'][0]['audience'] = 'technical'
            if change == 'scores': receipt['sessions'][0]['scores'][0] = True
            if change == 'low':
                for s in receipt['sessions'][:2]: s['scores'] = [0] * 7
            if change == 'critical': receipt['sessions'][0]['unresolvedCriticalMisunderstandings'] = 1
            if change == 'familiar': receipt['sessions'][0]['independentUnfamiliarHuman'] = False
            with self.subTest(change=change): self.assertTrue(self.errors(receipt, 'human'))

    def test_no_reviews_remain_pending_and_drafts_archives_are_not_routes(self):
        report = publication_readiness(self.root)
        self.assertEqual(report['errors'], [])
        self.assertEqual(len(report['publicBlockers']), 12)
        self.assertEqual(authored_routes(self.root), set())
        meta = {'slug': 'fixture', 'status': 'draft'}
        path = 'src/content/entries/fixture/entry.json'
        for status in ('draft', 'archived', 'published'):
            meta['status'] = status
            self.write(path, json.dumps(meta))
            self.assertEqual(authored_routes(self.root), {'/writing/', '/writing/fixture/'} if status == 'published' else set())
        self.assertTrue(any('public embedding' in b for b in publication_readiness(self.root)['publicBlockers']))

    def test_symlink_input_fails(self):
        (self.root / 'src/alias').symlink_to(self.root / 'docs/fixture-observation.txt')
        self.assertEqual(publication_readiness(self.root)['status'], 'failed')

    def test_unrelated_entry_drafts_do_not_stale_studies_but_linked_entries_stale_their_consumers(self):
        study = dependency_digest(self.root, 'study-trend-quality')
        self.write('src/content/entries/first/entry.json', '{"slug":"first","status":"draft"}')
        self.write('src/content/entries/first/body.md', 'Fixture links /writing/%73econd/ for supporting explanation')
        first = dependency_digest(self.root, 'entry-first')
        self.write('src/content/entries/unrelated/entry.json', '{"slug":"unrelated","status":"draft"}')
        self.write('src/content/entries/unrelated/body.md', 'Unrelated draft')
        self.assertEqual(study, dependency_digest(self.root, 'study-trend-quality'))
        self.assertEqual(first, dependency_digest(self.root, 'entry-first'))
        self.write('src/content/entries/second/entry.json', '{"slug":"second","status":"draft"}')
        self.write('src/content/entries/second/body.md', 'Changed linked evidence explanation')
        self.assertNotEqual(first, dependency_digest(self.root, 'entry-first'))

    def test_authorization_file_existence_never_authorizes_release(self):
        release = {'publicOrigin': 'https://fixture.example'}
        self.write('config/release.json', json.dumps(release))
        path = 'receipts/public-release-authorization.json'
        self.write(path, '{}')
        self.assertTrue(authorization_errors(self.root, release, 'a' * 64))
        receipt = dict(schemaVersion=1, scope='public-deployment', artifactIdentity='a' * 64, releaseConfigSha256=sha256(self.root / 'config/release.json'), origin=release['publicOrigin'], authorizedBy='Synthetic user', instruction='Synthetic fixture instruction', authorizedAt='2026-10-31')
        self.write(path, json.dumps(receipt))
        self.assertEqual(authorization_errors(self.root, release, 'a' * 64), [])
        for field in ('artifactIdentity', 'releaseConfigSha256', 'origin', 'scope', 'authorizedBy', 'instruction', 'authorizedAt'):
            bad = {**receipt, field: ''}; self.write(path, json.dumps(bad))
            with self.subTest(field=field): self.assertTrue(authorization_errors(self.root, release, 'a' * 64))
        self.write(path, json.dumps(receipt))
        for origin in ('http://fixture.example', 'https://localhost', 'https://user:pass@fixture.example', 'https://fixture.example/path'):
            self.assertTrue(authorization_errors(self.root, {'publicOrigin': origin}, 'a' * 64))


class RollbackTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='ardor-rollback-test-'); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name).resolve()

    def package(self, name='index.html', link=False):
        data = b'fixture retained bytes'
        item = {'path': name, 'sha256': hashlib.sha256(data).hexdigest(), 'sizeBytes': len(data), 'classification': 'fixture'}
        archive = self.root / 'fixture.tar.gz'
        with tarfile.open(archive, 'w:gz') as tar:
            member = tarfile.TarInfo(name); member.size = len(data)
            if link: member.type = tarfile.SYMTYPE; member.linkname = '/tmp/escaped'; member.size = 0; item['sizeBytes'] = 0
            tar.addfile(member, None if link else io.BytesIO(data))
        receipt = {'files': [item], 'artifact': {'sha256': sha256(archive), 'inventoryIdentity': artifact_identity([item])}}
        return archive, receipt

    def test_restore_preserves_bytes_and_detects_changed_missing_extra_output(self):
        archive, receipt = self.package(); target = self.root / 'restored'; target.mkdir()
        restore(archive, receipt, target)
        verify_tree(target, receipt['files'])
        (target / 'index.html').write_text('corrupt')
        with self.assertRaises(ValueError): verify_tree(target, receipt['files'])
        (target / 'index.html').unlink()
        with self.assertRaises(ValueError): verify_tree(target, receipt['files'])
        (target / 'extra').write_text('extra')
        with self.assertRaises(ValueError): restore(archive, receipt, target)

    def test_archive_checksum_inventory_traversal_and_links_fail_closed(self):
        for name, link in [('../escape', False), ('/absolute', False), ('x/../../escape', False), ('alias', True)]:
            archive, receipt = self.package(name, link); target = self.root / 'restored'; target.mkdir(exist_ok=True)
            with self.subTest(name=name), self.assertRaises(ValueError): restore(archive, receipt, target)
        archive, receipt = self.package(); receipt['artifact']['sha256'] = '0' * 64
        with self.assertRaises(ValueError): restore(archive, receipt, self.root / 'restored')
        receipt['artifact']['sha256'] = sha256(archive); receipt['artifact']['inventoryIdentity'] = '0' * 64
        with self.assertRaises(ValueError): restore(archive, receipt, self.root / 'restored')


if __name__ == '__main__': unittest.main()
