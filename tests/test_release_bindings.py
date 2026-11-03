"""Hypothetical rejection fixtures; no actual authorization is generated."""
from copy import deepcopy
from pathlib import Path
import json, re, sys, tempfile, unittest
import shutil
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from pipeline_common import ROOT
from release_evidence import provider_errors, browser_errors
from launch_policy import launch_policy, MANDATORY
from source_profile import public_profile

class ReleaseBindingTests(unittest.TestCase):
    def setUp(self):
        self.env={'RENDER_SERVICE_ID':'srv-dbk7dngu01pc73990vpg','RENDER_SERVICE_TYPE':'static',
                  'RENDER_EXTERNAL_URL':'https://ardorlite.onrender.com','RENDER_GIT_REPO_SLUG':'sumnlikeshane/ArdorLite',
                  'RENDER_GIT_BRANCH':'main','RENDER_GIT_COMMIT':'a'*40,'ARDOR_APPROVED_COMMIT':'a'*40}

    def test_expected_provider_target_passes_and_each_wrong_missing_or_preview_binding_rejects(self):
        self.assertEqual(provider_errors(ROOT,self.env,check_pins=False),[])
        for key in self.env:
            for value in ('','wrong'):
                env={**self.env,key:value}
                with self.subTest(key=key,value=value):self.assertTrue(provider_errors(ROOT,env,check_pins=False))
        self.assertTrue(provider_errors(ROOT,{**self.env,'IS_PULL_REQUEST':'true'},check_pins=False))
        self.assertTrue(provider_errors(ROOT,self.env))

    def test_repository_binding_requires_exact_case_in_provider_and_contract(self):
        for repository in ('sumnlikeshane/ardorlite','sumnlikeshane/ARDORLITE','sumnlikeshane/ArdorLite-Public','other/ArdorLite'):
            env={**self.env,'RENDER_GIT_REPO_SLUG':repository}
            with self.subTest(repository=repository):
                self.assertIn('Wrong/missing provider binding: RENDER_GIT_REPO_SLUG',provider_errors(ROOT,env,check_pins=False))
                with tempfile.TemporaryDirectory() as directory:
                    root=Path(directory);(root/'config').mkdir()
                    release=json.loads((ROOT/'config/release.json').read_text())
                    release['hosting']['repository']=repository
                    (root/'config/release.json').write_text(json.dumps(release))
                    self.assertIn('Wrong public release target',provider_errors(root,env,check_pins=False))

    def test_full_browser_inventory_is_required_with_no_aggregate_flag_shortcut(self):
        titles=re.findall(r"^  '([^']+)',?$",(ROOT/'tests/browser-reporter.ts').read_text().split('] as const;')[0],re.M)
        self.assertEqual(len(titles),42)
        report={'status':'passed','artifactIdentity':'b'*64,'sourceDigest':'c'*64,'coverage':'production journeys',
                'engines':['chromium','firefox','webkit'],'passed':126,'failed':0,'skipped':0,'checkedAt':'2026-11-03',
                'tests':[{'project':engine,'journeyTitle':title,'status':'passed'} for engine in ('chromium','firefox','webkit') for title in titles]}
        self.assertEqual(browser_errors(ROOT,report,'c'*64,'b'*64),[])
        for change in ('missing','duplicate','skipped','failed','source','output','coverage','engine','future'):
            data=deepcopy(report)
            if change=='missing':data['tests'].pop()
            if change=='duplicate':data['tests'][0]=data['tests'][1]
            if change in ('skipped','failed'):data['tests'][0]['status']=change
            if change=='source':data['sourceDigest']='d'*64
            if change=='output':data['artifactIdentity']='d'*64
            if change=='coverage':data['coverage']='representative'
            if change=='engine':data['engines'].pop()
            if change=='future':data['checkedAt']='2999-01-01'
            with self.subTest(change=change):self.assertTrue(browser_errors(ROOT,data,'c'*64,'b'*64))

    def test_missing_invalid_profile_cannot_select_a_private_fallback(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)
            with self.assertRaises(ValueError):public_profile(root)
            (root/'config').mkdir()
            (root/'config/source-profile.json').write_text('{}')
            with self.assertRaises(ValueError):public_profile(root)

    def test_symlink_metadata_parent_and_traversing_omission_fail_before_private_reads(self):
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory)/'fixture';root.mkdir()
            for name in ['config','src/content']:
                (root/name).mkdir(parents=True,exist_ok=True)
            for name in ['source-profile','release','experience-sources','evidence-supplements','omitted-content-signatures']:
                shutil.copy2(ROOT/f'config/{name}.json',root/f'config/{name}.json')
            shutil.copy2(ROOT/'src/content/public-provenance.json',root/'src/content/public-provenance.json')
            self.assertTrue(public_profile(root))
            original=root/'src/content';moved=root/'safe-content';original.rename(moved);original.symlink_to(moved,target_is_directory=True)
            with self.assertRaises(ValueError):public_profile(root)
            original.unlink();moved.rename(original)
            supplements=json.loads((root/'config/evidence-supplements.json').read_text())
            old=supplements['supplements'][0]['path'];supplements['supplements'][0]['path']='../outside-private.json'
            (root/'config/evidence-supplements.json').write_text(json.dumps(supplements))
            profile=json.loads((root/'config/source-profile.json').read_text());profile['omittedPrivateInputs'].remove(old);profile['omittedPrivateInputs'].append('../outside-private.json')
            (root/'config/source-profile.json').write_text(json.dumps(profile))
            with self.assertRaisesRegex(ValueError,'Unsafe private omission'):public_profile(root)
    def test_policy_deferrals_remain_bounded_without_manufacturing_acceptance(self):
        policy=json.loads((ROOT/'config/launch-policy.json').read_text())
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'config').mkdir()
            (root/'config/release.json').write_text(json.dumps({'launchPolicy':policy['id']}))
            for change in (None,'scope','rights','truth','authority'):
                data=deepcopy(policy)
                if change=='scope':data['scope']='all-future-research'
                if change=='rights':data['mandatory'].remove('material-rights')
                if change=='truth':data['preservePendingStates']=False
                if change=='authority':data['authority']={}
                (root/'config/launch-policy.json').write_text(json.dumps(data))
                result=launch_policy(root)
                self.assertEqual(result['active'],change is None)
                self.assertFalse(result['reviewApproval'])
