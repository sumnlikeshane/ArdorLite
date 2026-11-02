// Optional recorded-value views load Plot only when a reader asks to inspect.
interface SavedRow { label:string; value:number|null; complete?:boolean; conjunctive_fold_pass?:boolean; }
for (const block of document.querySelectorAll<HTMLElement>('[data-recorded-view]')) {
  const select=block.querySelector<HTMLSelectElement>('[data-row-select]')!;
  const sort=block.querySelector<HTMLSelectElement>('[data-sort]');
  const state=block.querySelector<HTMLElement>('[data-chart-state]')!;
  const count=block.querySelector<HTMLElement>('[data-selection-count]')!;
  const holder=block.querySelector<HTMLElement>('[data-plot]')!;
  let rows:SavedRow[]|null=null;
  block.hidden=false;
  async function draw(){
    state.textContent='Loading the optional recorded-value view…';
    try {
      const Plot=await import('@observablehq/plot');
      if(!rows){const response=await fetch(block.dataset.inputUrl!);if(!response.ok)throw new Error('Recorded input unavailable');rows=(await response.json()).rows;}
      if(!rows)throw new Error('No saved rows');
      let shown=rows.map((r,i)=>({...r,sourceIndex:i})).filter(r=>select.value==='all'||r.sourceIndex===Number(select.value));
      if(sort?.value==='ascending')shown.sort((a,b)=>(a.value??Infinity)-(b.value??Infinity));
      if(sort?.value==='descending')shown.sort((a,b)=>(b.value??-Infinity)-(a.value??-Infinity));
      count.textContent=`${shown.length} of ${rows.length} recorded rows`;
      const data=shown.filter((r): r is typeof r&{value:number}=>typeof r.value==='number');
      const tokens=getComputedStyle(block);
      const color=(name:string)=>tokens.getPropertyValue(name).trim();
      const chart=Plot.plot({width:650,height:Math.max(210,data.length*34+70),marginLeft:235,marginRight:45,x:{grid:true,label:'Recorded value (see table for units)',zero:true},y:{domain:shown.map(r=>r.label),label:null},marks:[Plot.ruleX([0]),Plot.barX(data,{x:'value',y:'label',fill:r=>r.complete===false?color('--chart-partial'):r.value<0?color('--chart-negative'):color('--chart-primary'),tip:true}),Plot.text(data,{x:'value',y:'label',text:r=>String(Number(r.value.toFixed(4))),dx:7,textAnchor:'start',fontSize:12})]});
      chart.setAttribute('aria-label','Optional view of saved recorded values; full accessible table remains above.');
      holder.replaceChildren(chart);
      state.textContent=block.dataset.recordedView==='trend-folds'?'Partial fold remains excluded from the complete-fold gate. An absent control gate is unavailable.':block.dataset.recordedView==='ssf-economics'?'The statutory counterfactual is dated 30 July 2026. Primary 1× impact net fails; no inferred stress points.':block.dataset.recordedView==='momentum-execution'?'Intermediate execution results do not override the residual-alpha failure.':'In-sample diagnostic only. Sorting does not establish a recommended winner.';
    }catch {state.textContent='The optional view could not load. Use the preserved original figure and complete data table above.';}
  }
  select.addEventListener('change',draw);sort?.addEventListener('change',draw);
  block.querySelector('[data-reset]')?.addEventListener('click',()=>{select.value='all';if(sort)sort.value='source';void draw();});
  const open=document.createElement('button');open.type='button';open.className='inspector-show';open.textContent='Show recorded-value view';open.addEventListener('click',()=>{open.hidden=true;void draw();});block.querySelector('[data-view-actions]')!.prepend(open);
}
