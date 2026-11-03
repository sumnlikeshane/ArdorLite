import {test} from 'node:test';
import assert from 'node:assert/strict';
import {entityDocuments,pageSearchContext} from '../src/lib/search/documents';
import {claims,sources,sourceDirectoryReferences,previews,records,claimUrl,sourceUrl,formatValue} from '../src/lib/evidence';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,readdirSync,rmSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {execFileSync} from 'node:child_process';
import {gunzipSync} from 'node:zlib';
import * as pagefind from 'pagefind';
import {addHTMLDirectory} from '../scripts/search_ingest';

test('Real search index is identical across opposite filesystem creation orders',async()=>{
 const root=mkdtempSync(join(tmpdir(),'ardor-search-order-'));
 const paths=['z/index.html','index.html','nested/a/index.html','plain.html'];
 const outputs: Record<string,string>[]=[];
 try {
  for (const [name,order] of [['forward',paths],['reverse',[...paths].reverse()]] as const) {
   const input=join(root,name),output=join(root,`${name}-index`);
   for (const path of order) {
    const file=join(input,path);mkdirSync(dirname(file),{recursive:true});
    writeFileSync(file,`<html lang="en"><head><title>${path}</title></head><body><main data-pagefind-body data-pagefind-filter="type:Fixture"><h1>${path}</h1><p>Shared evidence, distinct ${path}.</p></main></body></html>`);
   }
   const created=await pagefind.createIndex();assert.deepEqual(created.errors,[]);assert.ok(created.index);
   assert.equal(await addHTMLDirectory(created.index,input),4);
   assert.deepEqual((await created.index.writeFiles({outputPath:output})).errors,[]);
   execFileSync('python3.12',['-B','scripts/normalize_pagefind.py',output]);
   const urls=readdirSync(join(output,'fragment')).map(file=>JSON.parse(gunzipSync(readFileSync(join(output,'fragment',file))).subarray('pagefind_dcd'.length).toString()).url).sort();
   assert.deepEqual(urls,['/','/nested/a/','/plain.html','/z/']);
   const files:Record<string,string>={};
   function collect(relative='') {
    for (const entry of readdirSync(join(output,relative),{withFileTypes:true})) {
     const path=relative?`${relative}/${entry.name}`:entry.name;
     if(entry.isDirectory())collect(path);else files[path]=readFileSync(join(output,path)).toString('base64');
    }
   }
   collect();outputs.push(files);await created.index.deleteIndex();
  }
  assert.deepEqual(outputs[0],outputs[1]);
 } finally {await pagefind.close();rmSync(root,{recursive:true,force:true});}
});

test('Search entity contract covers every canonical anchored identity once',()=>{
 const expected=[...claims.map(c=>claimUrl(c.id)),...sources.map(s=>sourceUrl(s.id)),...sourceDirectoryReferences.map(s=>sourceUrl(s.id)),...previews.map(p=>`/research/previews/#${p.id}`)];
 assert.equal(entityDocuments.length,426);assert.deepEqual(entityDocuments.map(d=>d.url).sort(),expected.sort());
 assert.equal(new Set(entityDocuments.map(d=>d.meta.entity)).size,426);
 for(const doc of entityDocuments){assert.ok(doc.meta.title);assert.ok(doc.meta.caveat);assert.ok(doc.meta.date);assert.ok(!doc.url.includes('/downloads/'));}
});
test('Search claim snippets preserve values and controlling caveats without inventing results',()=>{
 for(const claim of claims){const doc=entityDocuments.find(d=>d.meta.entity===`claim:${claim.id}`)!;
 assert.ok(doc.content.includes(claim.id));assert.ok(doc.meta.summary.startsWith(`${formatValue(claim.value)} ${claim.unit}.`));
 for(const caveat of claim.caveats)assert.ok(doc.meta.caveat.includes(caveat));}
});
test('Search source observation dates never replace unavailable source dates or directory hashes',()=>{
 for(const source of sources){const doc=entityDocuments.find(d=>d.meta.entity===`source:${source.id}`)!;
 assert.ok(doc.meta.date.includes(`Observed ${source.observation_date}; source date: ${source.source_date??'Unavailable'}`));assert.ok(doc.meta.summary.includes(source.source_relative_path));}
 for(const source of sourceDirectoryReferences){const doc=entityDocuments.find(d=>d.meta.entity===`directory:${source.id}`)!;assert.match(doc.meta.caveat,/no file artifact or hash/i);assert.match(doc.meta.date,/file date unavailable/);}
});
test('Search record facets retain exact known maturity/reproduction and explicit family/context',()=>{
 for(const record of records){const context=pageSearchContext(`/research/records/${record.id}/`,'record',record.final_outcome,record.reproduction_level);
 assert.equal(context.meta.entity,`record:${record.id}`);assert.deepEqual(context.filters.reproduction,[record.reproduction_level]);assert.deepEqual(context.filters.maturity,[record.evidence.evidence_maturity.replaceAll('_',' ')]);assert.ok(context.filters.family.length);assert.equal(context.meta.outcome,record.final_outcome);}
});

import {searchRequest} from '../src/lib/search/query';
test('Exact identities use one engine facet and retain conflicting user filters',()=>{
 assert.deepEqual(searchRequest('SWEEP_RECLAIM',{type:'Claim'},{identity:{sweep_reclaim:1}}),{query:null,filters:{identity:'sweep_reclaim',type:'Claim'}});
 assert.deepEqual(searchRequest('partial folds',{},{}),{query:'partial folds',filters:{}});
 assert.deepEqual(searchRequest('unknown-id-84729',{},{}),{query:'"unknown-id-84729"',filters:{}});
});
