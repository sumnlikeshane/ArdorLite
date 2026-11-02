// Views change only which saved measurement is shown. Evidence is never recalculated.
const root = document.querySelector<HTMLElement>('[data-research-experience]');
if (root) {
  for (const block of root.querySelectorAll<HTMLElement>('[data-research-comparison]')) {
    const controls = block.querySelector<HTMLFieldSetElement>('[data-comparison-controls]');
    if (!controls) continue;
    const inputs = [...controls.querySelectorAll<HTMLInputElement>('[data-comparison-input]')];
    const panels = [...block.querySelectorAll<HTMLElement>('[data-comparison-panel]')];
    const key = `rp-${block.dataset.researchComparison}`;
    const first = inputs[0]!.value;
    const status = block.querySelector<HTMLElement>('[data-comparison-status]');
    function render() {
      const requested = new URL(location.href).searchParams.get(key);
      const selected = inputs.some(input => input.value === requested) ? requested! : first;
      for (const input of inputs) input.checked = input.value === selected;
      for (const panel of panels) panel.hidden = panel.dataset.comparisonPanel !== selected;
      if (status) status.textContent = `${inputs.find(i => i.checked)!.nextElementSibling?.textContent}. Saved observations; no interpolation or new inference.`;
    }
    function select(value: string) {
      const url = new URL(location.href);
      if (value === first) url.searchParams.delete(key); else url.searchParams.set(key, value);
      history.pushState(null, '', url);
      render();
    }
    controls.hidden = false;
    controls.addEventListener('change', event => {
      if (event.target instanceof HTMLInputElement) select(event.target.value);
    });
    controls.querySelector('[data-comparison-reset]')?.addEventListener('click', () => select(first));
    addEventListener('popstate', render);
    let prior: boolean[] = [];
    addEventListener('beforeprint', () => { prior=panels.map(p=>Boolean(p.hidden)); panels.forEach(p=>p.hidden=false); });
    addEventListener('afterprint', () => { panels.forEach((p,i)=>p.hidden=prior[i]??p.hidden); });
    render();
  }
  const navigation = root.querySelector<HTMLElement>('[data-research-navigation]');
  const links = [...navigation?.querySelectorAll<HTMLAnchorElement>('a') ?? []];
  // Passive wayfinding: no scroll handling, no forced reading sequence or animation.
  const sections = links.flatMap(link => {
    const section = document.getElementById(link.hash.slice(1));
    return section ? [{section, link}] : [];
  });
  const positions = new Map<Element, number>();
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) positions.set(entry.target,entry.boundingClientRect.top);
        else positions.delete(entry.target);
      }
      // Observer entries are transition snapshots, not current scroll positions.
      // A tall previous chapter can still intersect the reading band after an
      // exact deep link; prefer that visible destination, then the nearest heading.
      let fragment = location.hash.slice(1);
      try { fragment = decodeURIComponent(fragment); } catch { /* Invalid fragments do not break passive navigation. */ }
      const hashTarget = document.getElementById(fragment);
      const destination = sections.find(({section}) => section === hashTarget || (hashTarget && section.contains(hashTarget)))?.section;
      const destinationTop = destination?.getBoundingClientRect().top;
      const linked = destination && destinationTop !== undefined && destinationTop >= 0 && destinationTop < innerHeight * .5 ? destination : undefined;
      const current = linked ?? [...positions.keys()].sort((a,b) =>
        Math.abs(a.getBoundingClientRect().top - innerHeight * .05) - Math.abs(b.getBoundingClientRect().top - innerHeight * .05))[0];
      for (const {section,link} of sections) {
        if (section===current) link.setAttribute('aria-current','location'); else link.removeAttribute('aria-current');
      }
    }, {rootMargin:'-5% 0px -60% 0px',threshold:0});
    sections.forEach(({section})=>observer.observe(section));
  }
}
