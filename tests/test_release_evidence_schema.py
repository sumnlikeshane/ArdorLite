"""Complete synthetic release evidence exercises every binding in isolation."""
from pathlib import Path
from copy import deepcopy
import json, re, sys, tempfile, unittest
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from pipeline_common import ROOT, sha256
import release_evidence as release

class EvidenceSchemaTests(unittest.TestCase):
    def write(self,path,data):
        file=self.root/path;file.parent.mkdir(parents=True,exist_ok=True)
        file.write_text(json.dumps(data));return file
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.root=Path(self.tmp.name)
        self.source='c'*64;self.output='d'*64
        self.write('config/release.json',json.loads((ROOT/'config/release.json').read_text()))
        for path in ['config/source-profile.json','src/content/public-provenance.json']:
            self.write(path,{})
        self.write('receipts/output-audit.json',{'artifactIdentity':self.output})
        path=self.root/'tests/browser-reporter.ts';path.parent.mkdir();path.write_text((ROOT/'tests/browser-reporter.ts').read_text())
        titles=re.findall(r"^  '([^']+)',?$",path.read_text().split('] as const;')[0],re.M)
        browser={'status':'passed','sourceDigest':self.source,'artifactIdentity':self.output,'coverage':'production journeys','engines':['chromium','firefox','webkit'],'passed':126,'failed':0,'skipped':0,'checkedAt':'2026-11-03','tests':[{'project':e,'journeyTitle':t,'status':'passed'} for e in ('chromium','firefox','webkit') for t in titles]}
        tasks=json.loads((ROOT/'docs/search/JUDGED_QUERIES.json').read_text())['tasks'];self.write('docs/search/JUDGED_QUERIES.json',{'tasks':tasks})
        entities=[{'meta':{'entity':f'claim:synthetic-{i}'},'url':f'/fixture/#synthetic-{i}'} for i in range(422)]
        records=[{'id':f'synthetic-record-{i}'} for i in range(114)]
        self.write('generated/search-inventory.json',{'entities':entities});self.write('reviewed/2026-10-11/content/research.json',{'records':records})
        exact=[{'query':e['meta']['entity'].split(':')[1],'url':e['url'],'first':e['url'],'passed':True} for e in entities]
        exact += [{'query':r['id'],'url':f'/research/records/{r["id"]}/','first':f'/research/records/{r["id"]}/','passed':True} for r in records]
        search={'status':'passed','artifactIdentity':self.output,'checkedAt':'2026-11-03','judgments':[{**t,'rank':1 if t['expectedDestination'] else 0,'total':1 if t['expectedDestination'] else 0,'passed':True,'duplicates':[]} for t in tasks],'identities':exact}
        refs={}
        for key,data in [('browser',browser),('search',search)]:
            relative='receipts/'+('browser-results' if key=='browser' else 'search-acceptance')+'.json'
            refs[key]={'path':relative,'sha256':sha256(self.write(relative,data))}
        audit={'schemaVersion':1,'status':'passed','sourceDigest':self.source,'projectionSha256':sha256(self.root/'src/content/public-provenance.json'),'inputContractSha256':sha256(self.root/'config/source-profile.json'),'privateInventorySha256':'b'*64,'auditRecordSha256':'b'*64,'toolSha256':'b'*64,'checks':sorted(release.PRIVATE_CHECKS),'originalInputVerification':'retained-capture-supplement-integrity','checkedAt':'2026-11-03'}
        approval={'schemaVersion':1,'status':'exact-candidate-authorized','scope':'public-deployment','commit':'a'*40,'sourceDigest':self.source,'artifactIdentity':self.output,'releaseConfigSha256':sha256(self.root/'config/release.json'),'origin':'https://ardorlite.onrender.com','repository':'sumnlikeshane/ArdorLite','serviceId':'srv-dbk7dngu01pc73990vpg','authorityRecordSha256':'b'*64,'authorizedAt':'2026-11-03'}
        self.approval=approval
        self.data={'schemaVersion':1,'sourceDigest':self.source,'artifactIdentity':self.output,'releaseConfigSha256':approval['releaseConfigSha256'],'inputContractSha256':audit['inputContractSha256'],**refs,'privateAudit':audit,'ownerApproval':{'verification':'external-protected-binding-required'}}
        self.env={name:approval[key] for key,name in release.PINS.items()}
        self.env['ARDOR_RELEASE_APPROVAL_JSON']=json.dumps(approval)
    def errors(self,data=None,env=None):
        self.write('receipts/release-evidence.json',self.data if data is None else data)
        with patch.object(release,'source_digest',return_value=self.source),patch.object(release,'public_profile',return_value={'synthetic':True}),patch.object(release.subprocess,'check_output',return_value='a'*40):
            return release.evidence_errors(self.root,self.env if env is None else env)
    def test_complete_hypothetical_evidence_can_pass(self):self.assertEqual(self.errors(),[])
    def test_each_stale_identity_and_absent_protected_pin_rejects(self):
        for key in ('sourceDigest','artifactIdentity','releaseConfigSha256','inputContractSha256'):
            data=deepcopy(self.data);data[key]='f'*64
            with self.subTest(key=key):self.assertTrue(self.errors(data))
        for name in self.env:
            with self.subTest(pin=name):self.assertTrue(self.errors(env={k:v for k,v in self.env.items() if k!=name}))
    def test_private_original_audit_cannot_be_absent_failed_stale_or_just_a_flag(self):
        for field,value in [('status','failed'),('sourceDigest','f'*64),('checks',[]),('originalInputVerification','absent-not-verified'),('auditRecordSha256',''),('projectionSha256','f'*64),('inputContractSha256','f'*64),('checkedAt','2999-01-01')]:
            data=deepcopy(self.data);data['privateAudit'][field]=value
            with self.subTest(field=field):self.assertTrue(self.errors(data))
        data=deepcopy(self.data);data['privateAudit']={'status':'passed'};self.assertTrue(self.errors(data))
    def test_missing_wrong_stale_or_unapproved_owner_authority_rejects(self):
        for field,value in [('status','pending'),('scope','local-build'),('commit','b'*40),('origin','https://wrong.example'),('repository','sumnlikeshane/ardorlite'),('serviceId','wrong'),('sourceDigest','f'*64),('artifactIdentity','f'*64),('releaseConfigSha256','f'*64),('authorityRecordSha256',''),('authorizedAt','2999-01-01')]:
            approval={**self.approval,field:value}
            with self.subTest(field=field):self.assertTrue(self.errors(env={**self.env,'ARDOR_RELEASE_APPROVAL_JSON':json.dumps(approval)}))
    def test_committed_commit_self_reference_and_malformed_external_approval_reject(self):
        data=deepcopy(self.data);data['ownerApproval']=self.approval
        self.assertTrue(self.errors(data))
        self.assertTrue(self.errors(env={**self.env,'ARDOR_RELEASE_APPROVAL_JSON':'invalid json'}))
    def test_tampered_or_traversing_technical_records_reject(self):
        for key in ('browser','search'):
            data=deepcopy(self.data);data[key]['sha256']='f'*64;self.assertTrue(self.errors(data))
            data[key]['path']='../private.json';self.assertTrue(self.errors(data))
    def test_aggregate_search_pass_cannot_hide_wrong_destinations_or_rank(self):
        path=self.root/'receipts/search-acceptance.json';base=json.loads(path.read_text())
        for change in ('rank','destination','missing','false'):
            record=deepcopy(base)
            if change=='rank':record['judgments'][0]['rank']=999
            if change=='destination':record['identities'][0]['first']='/wrong/'
            if change=='missing':record['identities'].pop()
            if change=='false':record['identities'][0]['passed']=False
            self.write('receipts/search-acceptance.json',record)
            data=deepcopy(self.data);data['search']['sha256']=sha256(path)
            with self.subTest(change=change):self.assertTrue(self.errors(data))
