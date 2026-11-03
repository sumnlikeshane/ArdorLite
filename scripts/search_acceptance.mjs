import {writeSearchReceipt} from './search_receipt.mjs';
/** Production Pagefind ranking, exhaustive identities and scoped cold-search lab. */
import {readFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
import {searchRanking} from '../src/lib/search/query.ts';
const root=resolve('dist');
const server=createServer(async(req,res)=>{try{let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+'/')&&file!==root)throw Error();if((await stat(file)).isDirectory())file+='/index.html';const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2'};res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');res.end(await readFile(file));}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch();
try {
 const page=await browser.newPage();await page.goto(`http://127.0.0.1:${server.address().port}/search/`);await page.locator('[data-search-ready]').waitFor();
 const tasks=JSON.parse(await readFile('docs/search/JUDGED_QUERIES.json','utf8')).tasks;
 const inventory=JSON.parse(await readFile('generated/search-inventory.json','utf8'));
 const records=JSON.parse(await readFile('reviewed/2026-10-11/content/research.json','utf8')).records;
 const exact=[...inventory.entities.filter(d=>!d.meta.entity.startsWith('preview:')).map(d=>({query:d.meta.entity.split(':')[1],url:d.url})),...records.map(r=>({query:r.id,url:`/research/records/${r.id}/`}))];
 const observations=await page.evaluate(async({tasks,exact,ranking})=>{
  const pf=await import('/pagefind/pagefind.js');await pf.options({ranking});const known=await pf.filters();const run=q=>{const id=Object.keys(known.identity??{}).find(id=>id.toLowerCase()===q.toLowerCase());const literal=/^[\w-]+$/.test(q)&&/[_\d-]/.test(q);return pf.search(id?null:literal?`"${q}"`:q,id?{filters:{identity:id}}:{});};const judgments=[];
  for(const t of tasks){const response=await run(t.query);const data=await Promise.all(response.results.slice(0,10).map(r=>r.data()));const rank=data.findIndex(r=>r.url===t.expectedDestination)+1;
   judgments.push({...t,total:response.results.length,rank,passed:t.expectedDestination===null?response.results.length===0:rank>0&&rank<=t.maximumRank,duplicates:data.map(d=>d.meta.entity).filter((v,i,a)=>a.indexOf(v)!==i),topTen:data.map(d=>({url:d.url,title:d.meta.title,entity:d.meta.entity,date:d.meta.date,summary:d.meta.summary,caveat:d.meta.caveat}))});}
  const identities=[];for(const t of exact){const response=await run(t.query);const first=response.results[0]?await response.results[0].data():null;identities.push({...t,first:first?.url??null,passed:first?.url===t.url});}
  const types=await pf.filters();const coverage=[];for(const type of Object.keys(types.type)){const r=await pf.search(null,{filters:{type}});coverage.push({type,count:r.results.length,declared:types.type[type]});}
  return {judgments,identities,coverage};
 },{tasks,exact,ranking:searchRanking});
 const report={schemaVersion:1,checkedAt:new Date().toISOString(),artifactIdentity:JSON.parse(await readFile('receipts/output-audit.json','utf8')).artifactIdentity,...observations};
 report.status=observations.judgments.every(t=>t.passed&&!t.duplicates.length)&&observations.identities.every(t=>t.passed)?'passed':'failed';
 const destination=process.env.ARDOR_SEARCH_RECEIPT??'receipts/search-acceptance.json';await writeSearchReceipt(destination,report);
 console.log('Judged tasks',observations.judgments.filter(t=>t.passed).length,'/',tasks.length,'Exact identities',observations.identities.filter(t=>t.passed).length,'/',exact.length);
 for(const t of observations.judgments.filter(t=>!t.passed))console.log('FAIL',t.query,'rank',t.rank,t.topTen.slice(0,3).map(t=>t.url));
 console.log('Identity failures',observations.identities.filter(t=>!t.passed).slice(0,15));
 if(report.status!=='passed')process.exitCode=1;
}finally{await browser.close();await new Promise(r=>server.close(r));}
