/** Scoped production search payload and interaction lab. */
import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {createServer} from 'node:http';
import {chromium} from '@playwright/test';
import {searchRanking} from '../src/lib/search/query.ts';
const root=resolve('dist');
const served=[];
const server=createServer(async(req,res)=>{try{let file=resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(!file.startsWith(root+'/')&&file!==root)throw Error();if((await stat(file)).isDirectory())file+='/index.html';const mime={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.wasm':'application/wasm','.svg':'image/svg+xml','.woff2':'font/woff2'};res.setHeader('Content-Type',mime[extname(file)]??'application/octet-stream');const body=await readFile(file);if(req.url.startsWith('/pagefind/'))served.push({path:new URL(req.url,'http://localhost').pathname,encodedBodySize:body.length});res.end(body);}catch{res.statusCode=404;res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch();
try {
 const origin=`http://127.0.0.1:${server.address().port}`;
 const samples=[];
 for(let run=0;run<3;run++){served.length=0;
 const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const session=await context.newCDPSession(page);
 await session.send('Network.enable');await session.send('Network.setCacheDisabled',{cacheDisabled:true});await session.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1_600_000/8,uploadThroughput:750_000/8});await session.send('Emulation.setCPUThrottlingRate',{rate:4});
 await page.addInitScript(()=>{window.__searchLab={lcp:0,cls:0,shifts:[]};new PerformanceObserver(list=>{for(const e of list.getEntries())window.__searchLab.lcp=e.startTime;}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(list=>{for(const e of list.getEntries())if(!e.hadRecentInput){window.__searchLab.cls+=e.value;window.__searchLab.shifts.push({time:e.startTime,value:e.value,sources:e.sources.map(s=>({node:s.node?.tagName,id:s.node?.id,className:s.node?.className,previousRect:s.previousRect,currentRect:s.currentRect}))});}}).observe({type:'layout-shift',buffered:true});});
 await page.goto(origin+'/search/');await page.locator('[data-search-ready]').waitFor();
 const ready=await page.evaluate(()=>performance.now());
 const coldStart=Date.now();await page.getByRole('textbox',{name:'Search',exact:true}).fill('Atlas');await page.locator('#search-results>li').first().waitFor();const firstQueryWallMs=Date.now()-coldStart;
 const data=await page.evaluate(async ranking=>{
 const pf=await import('/pagefind/pagefind.js');await pf.options({ranking});
 for(const q of ['Atlas','Momentum']){const r=await pf.search(q);await Promise.all(r.results.slice(0,10).map(h=>h.data()));}
 const durations=[];const input=document.querySelector('#search-form input');
 for(let i=0;i<20;i++){const q=i%2?'Atlas':'Momentum';const started=performance.now();input.value=q;input.dispatchEvent(new Event('input',{bubbles:true}));await new Promise(resolve=>{const poll=()=>{if(document.querySelector('#search-results').getAttribute('aria-busy')==='false'&&document.querySelector('#search-results h2 a')?.getAttribute('href')===`/research/cases/${q==='Atlas'?'atlas-ssf':'momentum-v2'}/`){requestAnimationFrame(()=>requestAnimationFrame(resolve));}else requestAnimationFrame(poll);};requestAnimationFrame(poll);});durations.push(performance.now()-started);}
 const resources=performance.getEntriesByType('resource').filter(r=>r.name.includes('/pagefind/')).map(r=>({path:new URL(r.name).pathname,encodedBodySize:r.encodedBodySize,decodedBodySize:r.decodedBodySize,transferSize:r.transferSize}));return {...window.__searchLab,durations,resources};
 },searchRanking);
 samples.push({run:run+1,readyMs:ready,firstQueryAutomationWallMs:firstQueryWallMs,...data,allPagefindRequests:[...served],allPagefindBodyBytes:served.reduce((sum,r)=>sum+r.encodedBodySize,0)});await context.close();}
 const sorted=samples.flatMap(s=>s.durations).sort((a,b)=>a-b);const median=values=>values.sort((a,b)=>a-b)[Math.floor(values.length/2)];
 const report={schemaVersion:1,checkedAt:new Date().toISOString(),artifactIdentity:JSON.parse(await readFile('receipts/output-audit.json','utf8')).artifactIdentity,method:'Chromium on macOS, 390x844 viewport, cold contexts, disabled cache, 4x CPU, 150ms latency, 1.6Mbps down/750kbps up. Warmed 20 changes per run measured from input event to matching result plus two animation frames; cold query is separate automation wall time. All Pagefind body bytes are counted by the isolated HTTP server, including worker requests; main-thread Resource Timing alone omits worker fetches. Local lab, not field INP or a physical-device/zoom result.',runs:3,medianLCP:median(samples.map(s=>s.lcp)),maxCLS:Math.max(...samples.map(s=>s.cls)),warmChanges:sorted.length,warmP95Ms:sorted[Math.ceil(sorted.length*.95)-1],samples};
 await writeFile(process.env.ARDOR_SEARCH_PERFORMANCE_RECEIPT??'receipts/implementation/2026-11-02-s5-search-performance.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({medianLCP:report.medianLCP,maxCLS:report.maxCLS,warmP95Ms:report.warmP95Ms,readyMs:samples.map(s=>s.readyMs),coldQueryAutomationMs:samples.map(s=>s.firstQueryAutomationWallMs),pagefindBytes:samples.map(s=>s.allPagefindBodyBytes)}));
}finally{await browser.close();await new Promise(r=>server.close(r));}
