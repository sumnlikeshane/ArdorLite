// Complete reference HTML is open without JS. Enhancement reduces repetition only.
const pilot = document.querySelector<HTMLElement>('[data-case-pilot]');
if (pilot) {
  const disclosures = [...pilot.querySelectorAll<HTMLDetailsElement>('[data-pilot-disclosure]')];
  const target = () => {
    try { return document.getElementById(decodeURIComponent(location.hash.slice(1))); }
    catch { return null; }
  };
  for (const disclosure of disclosures) disclosure.open = !!target() && disclosure.contains(target());
  let firstFrame=0, secondFrame=0, focusRevision=0;
  pilot.addEventListener('focusin',()=>{ focusRevision++; });
  function reveal() {
    cancelAnimationFrame(firstFrame);
    cancelAnimationFrame(secondFrame);
    const element = target();
    if (!element || !pilot?.contains(element)) return;
    for (let parent = element.parentElement; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement) parent.open = true;
    }
    if (element instanceof HTMLDetailsElement) element.open = true;
    // Run after browser history restoration; focusing the target keeps the next Tab meaningful.
    const fragment=location.hash, revision=focusRevision;
    firstFrame=requestAnimationFrame(() => { secondFrame=requestAnimationFrame(() => {
      // Popstate/hashchange can coincide. Do not replay an old target or steal a
      // reader's newer keyboard focus while native history restoration settles.
      if (location.hash!==fragment || (focusRevision!==revision && document.activeElement!==element)) return;
      if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex','-1');
      element.focus({preventScroll:true});
      element.scrollIntoView({block:'start',behavior:'instant'});
    }); });
  }
  reveal();
  addEventListener('hashchange',reveal);
  addEventListener('popstate',reveal);
  let prior: boolean[] = [];
  const allDetails = [...pilot.querySelectorAll<HTMLDetailsElement>('details')];
  addEventListener('beforeprint',() => { prior=allDetails.map(d=>d.open); allDetails.forEach(d=>d.open=true); });
  addEventListener('afterprint',() => { allDetails.forEach((d,i)=>d.open=prior[i]??d.open); });
}
