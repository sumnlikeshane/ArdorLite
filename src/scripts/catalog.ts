const form=document.querySelector<HTMLFormElement>('#catalog-filters');
if(form){
  const fields=['q','family','original_status','instrument','reproduction','view','investigation'] as const;
  const rows=[...document.querySelectorAll<HTMLElement>('[data-catalog-record]')];
  const compact=[...document.querySelectorAll<HTMLElement>('[data-compact-record]')];
  const count=document.querySelector<HTMLElement>('#catalog-count')!;
  const list=document.querySelector<HTMLElement>('#catalog-list')!;
  const table=document.querySelector<HTMLElement>('#catalog-table')!;
  const empty=document.querySelector<HTMLElement>('#catalog-empty')!;
  form.hidden=false;
  function control(key:string){return form!.elements.namedItem(key) as HTMLInputElement|HTMLSelectElement;}
  function readUrl(){const params=new URLSearchParams(location.search);for(const key of fields){const c=control(key);const val=params.get(key)??(key==='view'?'list':'');if(c instanceof HTMLSelectElement)c.value=[...c.options].some(o=>o.value===val)?val:(key==='view'?'list':'');else c.value=val;} const advanced=document.querySelector<HTMLDetailsElement>('#catalog-advanced'); if(advanced) advanced.open=['original_status','instrument','reproduction'].some(key=>!!control(key).value);}
  function render(){
    const values=Object.fromEntries(fields.map(key=>[key,control(key).value]));
    const terms=values.q.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    let total=0;
    rows.forEach((row,i)=>{
      const matches=terms.every(term=>(row.dataset.search??'').includes(term))&&['family','original_status','instrument','reproduction'].every(key=>!values[key]||row.getAttribute(`data-${key}`)===values[key])&&(!values.investigation||(row.dataset.investigation??'').split(' ').includes(values.investigation));
      row.hidden=!matches;if(compact[i])compact[i].hidden=!matches;if(matches)total++;
    });
    document.querySelectorAll<HTMLAnchorElement>('[data-catalog-link]').forEach(link=>{
      const url=new URL(link.href);url.searchParams.set('catalog',location.pathname+location.search);link.href=url.href;
    });
    count.textContent=`${total} of ${rows.length} catalog records`;
    empty.hidden=total!==0;
    const tabular=values.view==='table';list.hidden=tabular;table.hidden=!tabular;
  }
  function apply(){const url=new URL(location.href);for(const key of fields){const v=control(key).value.trim();if(v&&!(key==='view'&&v==='list'))url.searchParams.set(key,v);else url.searchParams.delete(key);}history.pushState(null,'',url);render();}
  form.addEventListener('submit',event=>{event.preventDefault();apply();});
  form.querySelectorAll('select').forEach(select=>select.addEventListener('change',apply));
  form.addEventListener('reset',()=>{queueMicrotask(()=>{history.pushState(null,'',location.pathname);readUrl();render();});});
  addEventListener('popstate',()=>{readUrl();render();});readUrl();render();
}
