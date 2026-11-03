import * as pagefind from 'pagefind';
import {mkdirSync,writeFileSync,rmSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {entityDocuments} from '../src/lib/search/documents';
import {addHTMLDirectory} from './search_ingest';
// Gate rationale and preserved heading experiments: docs/search/INDEX_CONTRACT.md.
const {index,errors}=await pagefind.createIndex({excludeSelectors:['[data-pagefind-ignore]'],includeCharacters:'_-'});
if(!index||errors.length)throw Error(errors.join('\n'));
try {
 const discoveredHTMLFiles=await addHTMLDirectory(index,'dist');
 for(const doc of entityDocuments){const result=await index.addCustomRecord(doc);if(result.errors.length)throw Error(result.errors.join('\n'));}
 // Remove only generated search assets; old bytes were archived before S5. Avoid stale fragments.
 rmSync('dist/pagefind',{recursive:true,force:true});
 const written=await index.writeFiles({outputPath:'dist/pagefind'});if(written.errors.length)throw Error(written.errors.join('\n'));
 // Pagefind 1.5.2 serializes unordered filter maps. Normalize those tables,
 // retaining exact postings, so source-built releases have repeatable bytes.
 execFileSync('python3.12',['-B','scripts/normalize_pagefind.py'],{stdio:'inherit'});
 execFileSync('python3.12',['-B','scripts/pin_pagefind_wasm.py'],{stdio:'inherit'});
 const entry=JSON.parse(readFileSync('dist/pagefind/pagefind-entry.json','utf8'));
 const total=Object.values(entry.languages).reduce((n:number,lang:any)=>n+lang.page_count,0);
 mkdirSync('generated',{recursive:true});
 writeFileSync('generated/search-inventory.json',JSON.stringify({schemaVersion:1,engine:'Pagefind 1.5.2',discoveredHTMLFiles,htmlPages:total-entityDocuments.length,customRecords:entityDocuments.length,total,judgmentsSha256:createHash('sha256').update(readFileSync('docs/search/JUDGED_QUERIES.json')).digest('hex'),entities:entityDocuments.map(({content,...doc})=>({...doc,contentSha256:createHash('sha256').update(content).digest('hex')}))},null,2)+'\n');
 console.log(`Search: ${total-entityDocuments.length} HTML pages + ${entityDocuments.length} canonical anchored entities`);
} finally {await pagefind.close();}
