"""Validate public technical projections and protected exact-release bindings.

Records identify evidence. Actual owner instructions and private originals are
validated by external local tooling before protected provider pins are prepared.
"""
import json, os, re, subprocess
from pathlib import Path
from pipeline_common import ROOT, read_json, sha256
from publication_policy import source_digest, actual_date
from source_profile import public_profile

DIGEST=re.compile(r'[a-f0-9]{64}\Z')
COMMIT=re.compile(r'[a-f0-9]{40}\Z')
ENGINES={'chromium','firefox','webkit'}
PRIVATE_CHECKS={'capture-integrity','supplement-approval-integrity','public-projection-equality','omission-signature-equality','bounded-policy-authority','material-rights-authority','private-regressions'}
PINS={'commit':'ARDOR_APPROVED_COMMIT','sourceDigest':'ARDOR_APPROVED_SOURCE_SHA256',
      'artifactIdentity':'ARDOR_APPROVED_OUTPUT_SHA256','releaseConfigSha256':'ARDOR_APPROVED_RELEASE_CONFIG_SHA256',
      'authorityRecordSha256':'ARDOR_RELEASE_APPROVAL_SHA256'}

def hashed_record(root, record, expected):
    if not isinstance(record,dict) or set(record)!={'path','sha256'} or record.get('path')!=expected or not DIGEST.fullmatch(str(record.get('sha256',''))):
        raise ValueError('Invalid technical record reference: '+expected)
    path=root/expected
    if not path.is_file() or any(p.is_symlink() for p in [path,*path.parents] if p.is_relative_to(root)) or sha256(path)!=record['sha256']:
        raise ValueError('Missing/changed technical record: '+expected)
    return read_json(path)

def browser_errors(root, report, source, identity):
    errors=[]
    reporter=(root/'tests/browser-reporter.ts').read_text()
    expected=re.findall(r"^  '([^']+)',?$",reporter.split('] as const;')[0],re.M)
    if len(expected)!=42 or len(set(expected))!=42:errors.append('Unexpected browser journey inventory')
    if report.get('status')!='passed' or report.get('artifactIdentity')!=identity or report.get('sourceDigest')!=source or report.get('coverage')!='production journeys' or set(report.get('engines',[]))!=ENGINES or report.get('skipped')!=0 or report.get('failed')!=0 or report.get('passed')!=126 or not actual_date(report.get('checkedAt')):
        errors.append('Complete current three-engine browser evidence required')
    tests=report.get('tests',[])
    if not isinstance(tests,list) or len(tests)!=126:errors.append('All 126 browser journey records required'); return errors
    for engine in ENGINES:
        rows=[t for t in tests if t.get('project')==engine]
        if len(rows)!=42 or sorted(t.get('journeyTitle','') for t in rows)!=sorted(expected) or any(t.get('status')!='passed' for t in rows):
            errors.append('Incomplete/failed browser journeys: '+engine)
    return errors

def search_errors(root, report, identity):
    errors=[]
    tasks=read_json(root/'docs/search/JUDGED_QUERIES.json')['tasks']
    rows=report.get('judgments',[]); exact=report.get('identities',[])
    if report.get('status')!='passed' or report.get('artifactIdentity')!=identity or len(rows)!=28 or len(exact)!=536 or not actual_date(report.get('checkedAt')):
        errors.append('Current 28 judged searches and 536 identities required')
    if any(r.get('passed') is not True or r.get('duplicates') for r in rows) or any(r.get('passed') is not True or r.get('first')!=r.get('url') for r in exact):errors.append('Search evidence contains failures')
    for row,task in zip(rows,tasks):
        rank=row.get('rank')
        if (task['expectedDestination'] is None and row.get('total')!=0) or (task['expectedDestination'] is not None and (type(rank) is not int or rank<1 or rank>task['maximumRank'])):
            errors.append('Judged search rank/empty result failed: '+task['query'])
    if [{k:r.get(k) for k in t} for r,t in zip(rows,tasks)]!=tasks:errors.append('Judged query scope changed')
    inventory=read_json(root/'generated/search-inventory.json')
    records=read_json(root/'reviewed/2026-10-11/content/research.json')['records']
    expected=[{'query':d['meta']['entity'].split(':')[1],'url':d['url']} for d in inventory['entities'] if not d['meta']['entity'].startswith('preview:')]
    expected += [{'query':r['id'],'url':f'/research/records/{r["id"]}/'} for r in records]
    if [{'query':r.get('query'),'url':r.get('url')} for r in exact]!=expected:errors.append('Exact search identity inventory changed')
    return errors

def provider_errors(root=ROOT, env=None, check_pins=True):
    env=os.environ if env is None else env
    release=read_json(root/'config/release.json'); host=release.get('hosting',{})
    errors=[]
    expected={'RENDER_SERVICE_ID':host.get('serviceId'),'RENDER_SERVICE_TYPE':'static',
              'RENDER_EXTERNAL_URL':release.get('publicOrigin'),'RENDER_GIT_REPO_SLUG':host.get('repository'),
              'RENDER_GIT_BRANCH':host.get('branch')}
    for name,value in expected.items():
        if not value or env.get(name)!=value:errors.append('Wrong/missing provider binding: '+name)
    origin=release.get('publicOrigin','')
    from urllib.parse import urlsplit
    parsed=urlsplit(origin)
    if parsed.scheme!='https' or not parsed.hostname or parsed.hostname.endswith('.invalid') or parsed.path not in ('','/') or parsed.query or parsed.fragment or parsed.username or parsed.password or parsed.port not in (None,443):errors.append('Invalid release origin')
    if release.get('mode')!='public' or host.get('repository')!='sumnlikeshane/ArdorLite' or host.get('serviceId')!='srv-dbk7dngu01pc73990vpg' or host.get('branch')!='main':errors.append('Wrong public release target')
    if env.get('IS_PULL_REQUEST','false').lower() not in ('false','0','') or env.get('RENDER_SERVICE_NAME','').endswith('-pr') or env.get('RENDER_GIT_BRANCH')!='main':errors.append('Preview builds cannot release')
    commit=env.get('RENDER_GIT_COMMIT','')
    if not COMMIT.fullmatch(commit) or commit!=env.get('ARDOR_APPROVED_COMMIT'):errors.append('Wrong/missing approved provider commit')
    if check_pins:
        for name in PINS.values():
            pattern=COMMIT if name=='ARDOR_APPROVED_COMMIT' else DIGEST
            if not pattern.fullmatch(env.get(name,'')):errors.append('Missing/invalid protected pin: '+name)
        if env.get('ARDOR_APPROVED_SOURCE_SHA256')!=source_digest(root) or env.get('ARDOR_APPROVED_RELEASE_CONFIG_SHA256')!=sha256(root/'config/release.json'):errors.append('Source/config differs from protected pins')
    return errors

def evidence_errors(root=ROOT, env=None, provider=False):
    env=os.environ if env is None else env
    errors=[]
    try:
        public_profile(root)
        source=source_digest(root); output=read_json(root/'receipts/output-audit.json'); identity=output['artifactIdentity']
        data=read_json(root/'receipts/release-evidence.json')
        if set(data)!={'schemaVersion','sourceDigest','artifactIdentity','releaseConfigSha256','inputContractSha256','browser','search','privateAudit','ownerApproval'} or data['schemaVersion']!=1:raise ValueError('Invalid release evidence schema')
        for key,value in {'sourceDigest':source,'artifactIdentity':identity,'releaseConfigSha256':sha256(root/'config/release.json'),'inputContractSha256':sha256(root/'config/source-profile.json')}.items():
            if data.get(key)!=value:errors.append('Stale release evidence: '+key)
        errors+=browser_errors(root,hashed_record(root,data['browser'],'receipts/browser-results.json'),source,identity)
        errors+=search_errors(root,hashed_record(root,data['search'],'receipts/search-acceptance.json'),identity)
        audit=data['privateAudit']
        expected_keys={'schemaVersion','status','sourceDigest','projectionSha256','inputContractSha256','privateInventorySha256','auditRecordSha256','toolSha256','checks','originalInputVerification','checkedAt'}
        if set(audit)!=expected_keys or audit.get('schemaVersion')!=1 or audit.get('status')!='passed' or audit.get('sourceDigest')!=source or audit.get('projectionSha256')!=sha256(root/'src/content/public-provenance.json') or audit.get('inputContractSha256')!=sha256(root/'config/source-profile.json') or set(audit.get('checks',[]))!=PRIVATE_CHECKS or audit.get('originalInputVerification')!='retained-capture-supplement-integrity' or not actual_date(audit.get('checkedAt')) or any(not DIGEST.fullmatch(str(audit.get(k,''))) for k in ['privateInventorySha256','auditRecordSha256','toolSha256']):
            errors.append('Exact local private-original/projection/authority audit required')
        if data['ownerApproval']!={'verification':'external-protected-binding-required'}:
            errors.append('Commit-independent external owner approval reference required')
        # This projection is supplied only after the final merge, through protected
        # owner-controlled settings. It must never be committed into its own SHA.
        try:
            approval=json.loads(env.get('ARDOR_RELEASE_APPROVAL_JSON','{}'))
        except (TypeError,ValueError):
            approval={}
        keys={'schemaVersion','status','scope','commit','sourceDigest','artifactIdentity','releaseConfigSha256','origin','repository','serviceId','authorityRecordSha256','authorizedAt'}
        release=read_json(root/'config/release.json'); host=release['hosting']
        if set(approval)!=keys or approval.get('schemaVersion')!=1 or approval.get('status')!='exact-candidate-authorized' or approval.get('scope')!='public-deployment' or not actual_date(approval.get('authorizedAt')) or not DIGEST.fullmatch(str(approval.get('authorityRecordSha256',''))) or not COMMIT.fullmatch(str(approval.get('commit',''))):
            errors.append('Actual exact-candidate owner authorization remains required')
        for key,value in {'sourceDigest':source,'artifactIdentity':identity,'releaseConfigSha256':data['releaseConfigSha256'],'origin':release['publicOrigin'],'repository':host['repository'],'serviceId':host['serviceId']}.items():
            if approval.get(key)!=value:errors.append('Wrong approval binding: '+key)
        for key,name in PINS.items():
            if not env.get(name) or env.get(name)!=approval.get(key):errors.append('Protected approval pin mismatch: '+name)
        commit=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
        if approval.get('commit')!=commit:errors.append('Checked-out commit differs from owner approval')
        if provider:errors+=provider_errors(root,env)
    except (OSError,ValueError,KeyError,TypeError,AttributeError,subprocess.CalledProcessError) as error:errors.append('Release evidence invalid: '+str(error))
    return errors
