// Optional registry browsing. The full reference content and links are static HTML.
export {};
const form = document.querySelector<HTMLFormElement>('[data-evidence-locate]');
if (form) {
  const query = form.querySelector<HTMLInputElement>('[data-locate-query]')!;
  const investigation = form.querySelector<HTMLSelectElement>('[data-locate-case]')!;
  const status = form.querySelector<HTMLElement>('[data-locate-status]')!;
  const entries = [...document.querySelectorAll<HTMLElement>('[data-evidence-entry]')];
  const groups = [...document.querySelectorAll<HTMLElement>('[data-evidence-group]')];
  // Search the rendered metadata once; no private source or separate search index.
  const text = new Map(entries.map(entry => [entry, entry.textContent?.toLocaleLowerCase() ?? '']));
  const cases = new Set([...investigation.options].map(option => option.value));
  let printing = false;
  let firstFrame=0, secondFrame=0, focusRevision=0;
  document.addEventListener('focusin',()=>{focusRevision++;});
  const read = (url: URL) => ({
    q: url.searchParams.getAll('q').length === 1 ? (url.searchParams.get('q') ?? '').trim() : '',
    caseId: url.searchParams.getAll('case').length === 1 && cases.has(url.searchParams.get('case') ?? '') ? url.searchParams.get('case')! : '',
  });
  const write = (url: URL, q: string, caseId: string) => {
    url.searchParams.delete('q'); url.searchParams.delete('case');
    if (q) url.searchParams.set('q', q);
    if (caseId) url.searchParams.set('case', caseId);
  };
  const apply = () => {
    cancelAnimationFrame(firstFrame);cancelAnimationFrame(secondFrame);
    const url = new URL(location.href);
    let { q, caseId } = read(url);
    let target: HTMLElement | undefined;
    try { target = entries.find(entry => entry.id === decodeURIComponent(url.hash.slice(1))); } catch { /* Malformed fragment leaves complete browsing available. */ }
    const matches = (entry: HTMLElement) => (!q || text.get(entry)!.includes(q.toLocaleLowerCase())) && (!caseId || entry.dataset.locateCases?.split(' ').includes(caseId));
    const linkedGroup = groups.find(group => `#${group.id}` === url.hash);
    const overridden = (target && !matches(target)) || (linkedGroup && ![...linkedGroup.querySelectorAll<HTMLElement>('[data-evidence-entry]')].some(matches));
    if (overridden) { q = ''; caseId = ''; }
    query.value = q; investigation.value = caseId;
    write(url, q, caseId);
    if (url.href !== location.href) history.replaceState(null, '', url);
    let count = 0;
    for (const entry of entries) { const visible = printing || matches(entry); entry.hidden = !visible; if (visible) count++; }
    for (const group of groups) group.hidden = ![...group.querySelectorAll<HTMLElement>('[data-evidence-entry]')].some(entry => !entry.hidden);
    status.textContent = `${count} of ${entries.length} entries.${overridden ? ' Filters cleared to show the directly linked entry.' : count === 0 ? ' No matches. Change the text or investigation, or choose Show all.' : ''}`;
    // History may restore a scroll offset from expanded disclosures after reload.
    // Re-anchor after that restoration, without animated travel through the registry.
    const destination = target ?? linkedGroup;
    const revision=focusRevision;
    if (destination && !printing) firstFrame=requestAnimationFrame(() => {secondFrame=requestAnimationFrame(() => {
      const active=document.activeElement;
      // Font/load/pageshow callbacks may settle after a reader has reached a link.
      // Preserve that deliberate focus as well as any newer focus since scheduling.
      if (location.hash !== url.hash || focusRevision!==revision ||
          (active instanceof HTMLElement && active!==destination && active.matches('a,button,input,select,textarea,summary,[contenteditable]'))) return;
      destination.focus({ preventScroll: true });
      destination.scrollIntoView({ block: 'start', behavior: 'instant' });
    });});
  };
  form.addEventListener('submit', event => {
    event.preventDefault();
    const url = new URL(location.href);
    write(url, query.value.trim(), investigation.value);
    url.hash = '';
    history.pushState(null, '', url); apply();
  });
  form.querySelector('[data-locate-reset]')!.addEventListener('click', () => {
    const url = new URL(location.href); write(url, '', ''); url.hash = '';
    history.pushState(null, '', url); apply();
  });
  window.addEventListener('popstate', apply);
  window.addEventListener('hashchange', apply);
  window.addEventListener('pageshow', apply);
  window.addEventListener('load', apply);
  // Enlarged long registries can finish font layout after the first anchor restoration.
  // Re-apply the same committed URL once local fonts settle; never change its state.
  void document.fonts.ready.then(apply);
  window.addEventListener('beforeprint', () => { printing = true; apply(); });
  window.addEventListener('afterprint', () => { printing = false; apply(); });
  apply(); form.hidden = false;
}
