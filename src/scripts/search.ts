export {};
// The Pagefind 1.5.2 search API remains the engine; this small renderer owns URL and recovery behavior.
import {searchRanking,searchPublication,type Facets,type Engine,type Hit} from '../lib/search/query';
const keys=['type','investigation','family','maturity','reproduction','role'] as const;
const form=document.querySelector<HTMLFormElement>('#search-form')!;
const query=form.elements.namedItem('q') as HTMLInputElement;
const selects=Object.fromEntries(keys.map(key=>[key,form.elements.namedItem(key) as HTMLSelectElement]));
const state=document.querySelector<HTMLElement>('#search-state')!;
const results=document.querySelector<HTMLOListElement>('#search-results')!;
const more=document.querySelector<HTMLButtonElement>('#search-more')!;
const recovery=document.querySelector<HTMLElement>('#search-recovery')!;
const retry=document.querySelector<HTMLAnchorElement>('#search-retry')!;
let engine:Engine,known:Facets={},hits:Hit[]=[],shown=0,epoch=0,timer:ReturnType<typeof setTimeout>|undefined;
let notice='';
const text=(tag:string,value:string,className?:string)=>{const el=document.createElement(tag);el.textContent=value;if(className)el.className=className;return el;};
const safeURL=(value:string)=>{const url=new URL(value,location.origin);return url.origin===location.origin&&url.pathname.startsWith('/')?url.pathname+url.search+url.hash:null;};
function updateURL(push:boolean){const url=new URL(location.href);for(const key of ['q',...keys]){url.searchParams.delete(key);const value=key==='q'?query.value.trim():selects[key].value;if(value)url.searchParams.set(key,value);}if(url.href!==location.href)history[push?'pushState':'replaceState']({},'',url);}
function restore(){const url=new URL(location.href);let invalid=false;query.value=(url.searchParams.get('q')??'').trim().slice(0,300);
 for(const key of keys){const value=url.searchParams.get(key)??'';selects[key].value=value&&known[key]?.[value]?value:'';if(value&&!selects[key].value)invalid=true;}
 for(const key of ['q',...keys])if(url.searchParams.getAll(key).length>1)invalid=true;
 if((url.searchParams.get('q')??'')!==query.value)invalid=true;
 notice=invalid?'Unsupported or repeated search state was recovered. ':'';updateURL(false);
 if(['maturity','reproduction','role'].some(key=>selects[key].value))document.querySelector<HTMLDetailsElement>('#search-extra-filters')!.open=true;
}
function facets(counts:Facets){for(const key of keys){const select=selects[key],selected=select.value;select.replaceChildren(new Option('All',''));
 for(const value of Object.keys(known[key]??{}).sort()){const count=counts[key]?.[value]??0;if(count>0||value===selected)select.add(new Option(`${value.replaceAll('_',' ')} (${count})`,value));}select.value=selected;
 // A facet with no applicable values is explicit rather than a list of zero-count options.
 select.disabled=select.options.length===1;
 select.classList.toggle('has-selection',Boolean(select.value));
}}
function failed(){state.replaceChildren(text('span','Search could not load. '));const catalog=document.createElement('a');catalog.href='/research/catalog/';catalog.textContent='Browse the complete catalog';state.append(catalog);recovery.hidden=false;retry.href=location.href;results.setAttribute('aria-busy','false');more.hidden=true;}
async function renderBatch(token:number){const start=shown;const batch=await Promise.all(hits.slice(start,start+10).map(h=>h.data()));if(token!==epoch)return;
 const nodes=batch.map(result=>{const li=document.createElement('li');li.dataset.searchEntity=result.meta.entity??result.url;
 li.append(text('p',[result.meta.kind,result.meta.identity].filter(Boolean).join(' · '),'search-result-kind'));
 if(result.meta.context)li.append(text('p',result.meta.context,'small'));
 const heading=document.createElement('h2'),link=document.createElement('a');link.href=safeURL(result.url)??'/search/';link.textContent=result.meta.title;heading.append(link);li.append(heading);
 li.append(text('p',result.meta.summary||result.plain_excerpt));
 if(result.meta.date)li.append(text('p',result.meta.date,'small search-result-date'));
 if(result.meta.caveat)li.append(text('p',result.meta.caveat,'small'));
 const subs=(result.sub_results??[]).filter(s=>s.url!==result.url&&safeURL(s.url)).slice(0,2);
 if(subs.length){const nav=document.createElement('ul');nav.className='search-subresults';for(const sub of subs){const item=document.createElement('li'),a=document.createElement('a');a.href=safeURL(sub.url)!;a.textContent=sub.title;item.append(a);nav.append(item);}li.append(nav);}return li;});
 results.append(...nodes);shown=start+batch.length;more.hidden=shown>=hits.length;more.textContent=`Show more results (${hits.length-shown} remaining)`;
}
async function search(push=false){clearTimeout(timer);const token=++epoch;updateURL(push);results.replaceChildren();results.setAttribute('aria-busy','true');more.hidden=true;recovery.hidden=true;state.textContent='Searching evidence…';
 document.querySelector<HTMLElement>('#search-start')!.hidden=true;
 try {const filters=Object.fromEntries(keys.filter(k=>selects[k].value).map(k=>[k,selects[k].value]));const q=query.value.trim();
 if(!q&&!Object.keys(filters).length){hits=[];facets(known);state.textContent=notice+'Search is ready. Enter a question or exact ID, or choose a filter.';document.querySelector<HTMLElement>('#search-start')!.hidden=false;results.setAttribute('aria-busy','false');return;}
 const response=await searchPublication(engine,q,filters,known);if(token!==epoch)return;hits=response.results;shown=0;facets(response.filters);
 state.textContent=notice+(hits.length?`${hits.length} matching ${hits.length===1?'result':'results'}.`:'No matching results. Try a broader phrase or clear search and filters.');notice='';
 recovery.hidden=hits.length>0;retry.href=location.href;await renderBatch(token);if(token===epoch)results.setAttribute('aria-busy','false');
 }catch{if(token===epoch)failed();}
}
form.addEventListener('submit',event=>{event.preventDefault();void search(true);});
query.addEventListener('input',()=>{clearTimeout(timer);++epoch;timer=setTimeout(()=>void search(true),80);});
for(const select of Object.values(selects))select.addEventListener('change',()=>void search(true));
form.addEventListener('reset',event=>{event.preventDefault();query.value='';for(const select of Object.values(selects))select.value='';notice='';void search(true);query.focus();});
more.addEventListener('click',async()=>{more.disabled=true;const before=shown,token=epoch;try{await renderBatch(token);if(token===epoch){results.children[before]?.querySelector('a')?.focus();state.textContent=`Showing ${shown} of ${hits.length} matching results.`;}}catch{if(token===epoch)failed();}finally{more.disabled=false;}});
retry.addEventListener('click',event=>{event.preventDefault();location.reload();});
window.addEventListener('popstate',()=>{if(engine){clearTimeout(timer);facets(known);restore();void search();}});
window.addEventListener('pageshow',event=>{if(event.persisted&&engine){facets(known);restore();void search();}});
async function boot(){try{const bundle='/pagefind/pagefind.js';engine=await import(/* @vite-ignore */ bundle) as Engine;await engine.options({ranking:searchRanking});known=await engine.filters();facets(known);document.querySelector<HTMLFieldSetElement>('#search-controls')!.disabled=false;form.setAttribute('aria-busy','false');restore();form.dataset.searchReady='true';await search();}catch{failed();}}
void boot();
