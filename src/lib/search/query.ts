/** One Pagefind policy used by the UI and production acceptance checks. */
export const searchRanking={termFrequency:0,pageLength:0,metaWeights:{title:0,summary:0,caveat:0,date:0,identity:0,entity:0,kind:0,outcome:0,context:0,discovery:10}};
export type Facets=Record<string,Record<string,number>>;
export type Result={url:string;meta:Record<string,string>;plain_excerpt:string;sub_results?:{url:string;title:string}[]};
export type Hit={id:string;data:()=>Promise<Result>};
export type SearchResponse={results:Hit[];filters:Facets;unfilteredResultCount:number};
export type Engine={options:(options:{ranking:typeof searchRanking})=>Promise<unknown>;filters:()=>Promise<Facets>;search:(query:string|null,options:{filters:Record<string,string>})=>Promise<SearchResponse>};
export function searchRequest(query:string,filters:Record<string,string>,known:Facets){
 const identity=Object.keys(known.identity??{}).find(id=>id.toLowerCase()===query.toLowerCase());
 // Exact identity is an ordinary Pagefind facet, intersected with the user's filters.
 const literal=/^[\w-]+$/.test(query)&&/[_\d-]/.test(query);
 return identity?{query:null,filters:{...filters,identity}}:{query:query?(literal?`"${query}"`:query):null,filters};
}
export async function searchPublication(engine:Engine,query:string,filters:Record<string,string>,known:Facets){const request=searchRequest(query,filters,known);return engine.search(request.query,{filters:request.filters});}
