import { createScenario, calculateMomentum, scenarioIds, scenarioLabels, type ScenarioId, type WalkthroughRow } from '../lib/walkthrough';

const root = document.querySelector<HTMLElement>('[data-walkthrough]');
if (root) {
  const get = <T extends HTMLElement>(selector: string) => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing walkthrough control: ${selector}`);
    return element;
  };
  const scenarioSelect = get<HTMLSelectElement>('[data-scenario]');
  const stockSelect = get<HTMLSelectElement>('[data-stock]');
  const today = get<HTMLInputElement>('[data-today]');
  const names = ['Respect the clock', 'Measure momentum', 'Build the baskets', 'Check execution', 'Read the verdict'];
  const excerptIds = ['timing', 'signal', 'ranking', 'guards', 'quintiles'];
  let scenario: ScenarioId = 'baseline';
  let selected = 'JUNIPER';
  let step = 0;
  let priceOverride: number | null = null;
  const price = (n: number | null) => n === null ? 'Unavailable' : n.toFixed(2);
  const percent = (n: number | null) => n === null ? 'Unavailable' : `${n >= 0 ? '+' : ''}${(n * 100).toFixed(2)}%`;
  const defaultSymbol = (id: ScenarioId) => id === 'banned' || id === 'missing-history' ? 'ASTER' : 'JUNIPER';

  function readUrl() {
    const params = new URL(location.href).searchParams;
    const candidate = params.get('scenario');
    scenario = scenarioIds.includes(candidate as ScenarioId) ? candidate as ScenarioId : 'baseline';
    const requestedStep = Number(params.get('step'));
    step = Number.isInteger(requestedStep) && requestedStep >= 0 && requestedStep <= 4 ? requestedStep : 0;
    const symbols = createScenario(scenario).map(stock => stock.symbol);
    selected = symbols.includes(params.get('stock') ?? '') ? params.get('stock')! : defaultSymbol(scenario);
    const requestedPrice = Number(params.get('today'));
    priceOverride = params.has('today') && Number.isFinite(requestedPrice) && requestedPrice >= 20 && requestedPrice <= 250 ? requestedPrice : null;
  }
  function writeUrl(replace = false) {
    const url = new URL(location.href);
    for (const key of ['scenario', 'stock', 'step', 'today']) url.searchParams.delete(key);
    url.searchParams.set('scenario', scenario);
    url.searchParams.set('stock', selected);
    url.searchParams.set('step', String(step));
    if (priceOverride !== null) url.searchParams.set('today', String(priceOverride));
    url.hash = '';
    if (url.href !== location.href) history[replace ? 'replaceState' : 'pushState']({}, '', url);
  }
  function svgElement(tag: string, attributes: Record<string, string | number>, text?: string) {
    const element = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, String(value));
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function drawChart(row: WalkthroughRow) {
    const values = [...row.prices, row.currentPrice];
    const low = Math.min(...values) * .92;
    const high = Math.max(...values) * 1.08;
    const x = (i: number) => 45 + i / row.prices.length * 530;
    const y = (value: number) => 245 - (value - low) / (high - low) * 200;
    const svg = svgElement('svg', { viewBox: '0 0 620 300', role: 'img', 'aria-label': `${row.label} synthetic prices. Momentum ${percent(row.momentum)}; decision-day price excluded. See numerical values below.` });
    svg.append(svgElement('title', {}, `${row.label}: strictly prior prices and excluded decision day`));
    const skipIndex = row.skipIndex ?? Math.max(0, row.prices.length - 21);
    svg.append(svgElement('rect', { x: x(skipIndex), y: 28, width: x(row.prices.length) - x(skipIndex), height: 223, fill: 'var(--chart-skipped-surface)' }));
    for (let i = 0; i < 4; i++) {
      const value = low + (high - low) * i / 3;
      svg.append(svgElement('line', { x1: 45, y1: y(value), x2: 588, y2: y(value), stroke: 'var(--border-subtle)', 'stroke-width': 1 }));
      svg.append(svgElement('text', { x: 36, y: y(value) + 4, 'text-anchor': 'end' }, value.toFixed(0)));
    }
    const points = row.prices.map((value, i) => `${x(i)},${y(value)}`).join(' ');
    svg.append(svgElement('polyline', { points, fill: 'none', stroke: 'var(--chart-primary)', 'stroke-width': 2.5, 'stroke-linejoin': 'round' }));
    if (row.backIndex !== null && row.skipIndex !== null) {
      for (const [index, label] of [[row.backIndex, '−252'], [row.skipIndex, '−21']] as const) {
        svg.append(svgElement('line', { x1: x(index), y1: 28, x2: x(index), y2: 251, stroke: 'var(--chart-primary)', 'stroke-dasharray': '4 5', opacity: .5 }));
        svg.append(svgElement('circle', { cx: x(index), cy: y(row.prices[index]!), r: step === 1 ? 6 : 4, fill: 'var(--chart-primary)', stroke: 'var(--surface-raised)', 'stroke-width': 2 }));
        svg.append(svgElement('text', { x: x(index), y: 272, 'text-anchor': 'middle' }, label));
      }
    }
    svg.append(svgElement('line', { x1: x(row.prices.length), y1: 28, x2: x(row.prices.length), y2: 251, stroke: 'var(--chart-negative)', 'stroke-dasharray': '3 4' }));
    svg.append(svgElement('circle', { cx: x(row.prices.length), cy: y(row.currentPrice), r: 5, fill: 'var(--chart-negative)' }));
    svg.append(svgElement('text', { x: 585, y: 290, 'text-anchor': 'end' }, 'Decision day'));
    svg.append(svgElement('text', { x: 45, y: 290 }, 'Prior observation offsets'));
    get('[data-chart]').replaceChildren(svg);
  }
  function text(selector: string, content: string) { get(selector).textContent = content; }
  function render() {
    const stocks = createScenario(scenario);
    const stock = stocks.find(stock => stock.symbol === selected)!;
    if (priceOverride !== null) stock.currentPrice = priceOverride;
    const rows = calculateMomentum(stocks);
    const row = rows.find(row => row.symbol === selected)!;
    scenarioSelect.value = scenario;
    stockSelect.replaceChildren(...stocks.map(stock => new Option(stock.label, stock.symbol, false, stock.symbol === selected)));
    today.value = String(Math.round(row.currentPrice));
    text('[data-today-output]', price(row.currentPrice));
    text('[data-step-counter]', `Step ${step + 1} / 5 · ${names[step]}`);
    text('[data-symbol]', row.symbol);
    text('[data-chart-heading]', step === 1 ? 'Two prices. One signal.' : 'What the signal can see');
    text('[data-chart-description]', `${row.priorCount} invented prior observations. Blue markers identify the −252 and −21 endpoints when history is sufficient. The shaded interval contains the 20 later prior observations; the brown point is the excluded decision day.`);
    root!.querySelectorAll<HTMLAnchorElement>('[data-step]').forEach(link => {
      if (Number(link.dataset.step) === step) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
    });
    get<HTMLButtonElement>('[data-prev]').disabled = step === 0;
    get<HTMLButtonElement>('[data-next]').disabled = step === 4;
    drawChart(row);
    const variables = [ ['prior_count', String(row.priorCount)], ['bucket / 5', row.bucket?.toString() ?? 'Unavailable'], ['p_back · −252', price(row.pBack)], ['p_skip · −21', price(row.pSkip)], ['mom_12_1', percent(row.momentum)], ['banned_at_open', String(row.banned)] ];
    get('[data-variables]').replaceChildren(...variables.map(([name,value]) => {
      const group = document.createElement('div'); const dt = document.createElement('dt'); const dd = document.createElement('dd');
      dt.textContent = name!; dd.textContent = value!; group.append(dt, dd); return group;
    }));
    const sourcePanel = document.querySelector<HTMLElement>(`[data-walkthrough-source="${excerptIds[step]}"]`)!;
    text('[data-code-heading]', step === 4 ? 'Mechanics are only the beginning' : sourcePanel.dataset.title!);
    text('[data-code-path]', `${sourcePanel.dataset.path} · lines ${sourcePanel.dataset.start}–${sourcePanel.dataset.end}`);
    const sourceCode = sourcePanel.querySelector('pre code');
    const rawLines = sourceCode ? sourceCode.textContent!.trimEnd().split('\n') : [];
    if (!sourceCode) text('[data-code-heading]', 'Original source excerpt omitted from the public edition');
    const indentation = Math.min(...rawLines.filter(line => line.trim()).map(line => line.length - line.trimStart().length));
    get('[data-code]').replaceChildren(...rawLines.map((line,i) => {
      const element = document.createElement('span'); element.className = 'lab-code-line';
      if (/prior =|p_skip =|p_back =|mom =|rank\(|opened =|dropped_banned_open =|top_quantile:/.test(line)) element.classList.add('is-active');
      const number = document.createElement('span'); number.className = 'lab-line-number'; number.setAttribute('aria-hidden', 'true'); number.textContent = String(Number(sourcePanel.dataset.start) + i);
      element.append(number, document.createTextNode(line.slice(indentation))); return element;
    }));
    if (!sourceCode) text('[data-code]', 'Original source excerpt omitted from the public edition. The synthetic calculation remains available.');
    const descriptions = [
      row.priorCount < 252 ? `${row.label} has only ${row.priorCount} prior observations. The source requires 252, so its signal is unavailable and it is excluded from ranking.` : `${row.label} has ${row.priorCount} prior observations. Today's price (${price(row.currentPrice)}) is outside that input. Change the slider: momentum remains ${percent(row.momentum)}.`,
      row.momentum === null ? 'The required historical endpoints do not exist. No zero, borrowed price or inferred momentum fills the gap.' : `${price(row.pSkip)} ÷ ${price(row.pBack)} − 1 = ${percent(row.momentum)} (display rounded). Only these two historical endpoints determine this signal. The recent reversal scenario changes the picture after the −21 point, without changing this calculation.`,
      row.bucket === null ? 'No signal means no rank and no bucket. The remaining names are re-ranked; missing history is not treated as a zero return.' : `${row.label} ranks ${row.rank} of ${rows.filter(row => row.rank !== null).length} valid signals, in bucket ${row.bucket} of 5. The source uses floor((rank − 1) / n × 5) + 1. The bottom and top buckets supply candidates; this is not a portfolio allocation recommendation.`,
      `${row.reason} This teaching model stops at candidate selection. The original strategy also needs sufficient breadth, liquidity, substitutions or parking, settlement, costs and portfolio checks. Ten fictitious names cannot meet its 25-short-name minimum.`,
      'The recorded study passed its Phase 0 execution check, then failed Phase 1 attribution. Working source code and an attractive signal do not establish residual alpha. The original quintile configuration shown here explains basket construction, not the final statistical verdict. Read the independent recorded figures below.',
    ];
    text('[data-state-label]', step === 4 ? 'Recorded outcome · independent of the simulation' : scenarioLabels[scenario]);
    text('[data-state-title]', names[step]!);
    text('[data-state-description]', descriptions[step]!);
    const positions: Record<WalkthroughRow['selection'],string> = { long: 'Cash long candidate', short: 'SSF short candidate', middle: 'Outside candidate baskets', blocked: 'Short blocked', excluded: 'Signal unavailable' };
    get('[data-universe]').replaceChildren(...rows.map(item => {
      const tr = document.createElement('tr'); if (item.symbol === selected) tr.dataset.selected = 'true';
      const symbolCell = document.createElement('td'); const button = document.createElement('button'); button.type = 'button'; button.textContent = item.label;
      button.setAttribute('aria-pressed', String(item.symbol === selected)); button.setAttribute('aria-label', `Inspect ${item.label}`);
      button.addEventListener('click', () => { selected = item.symbol; priceOverride = null; writeUrl(); render(); get<HTMLButtonElement>(`[data-stock-symbol="${item.symbol}"]`).focus(); });
      button.dataset.stockSymbol = item.symbol; symbolCell.append(button); tr.append(symbolCell);
      for (const value of [String(item.priorCount), percent(item.momentum), item.bucket?.toString() ?? 'Unavailable']) { const cell = document.createElement('td'); cell.className = 'numeric'; cell.textContent = value; tr.append(cell); }
      const decision = document.createElement('td'); const label = document.createElement('span'); label.className = 'lab-position'; label.dataset.position = item.selection; label.textContent = positions[item.selection]; decision.append(label); tr.append(decision); return tr;
    }));
    text('[data-basket-summary]', `${rows.filter(row => row.selection === 'long').length} long candidates · ${rows.filter(row => row.selection === 'short').length} short candidates · ${rows.filter(row => row.selection === 'blocked').length} blocked · ${rows.filter(row => row.selection === 'excluded').length} unavailable. These are teaching candidates, not filled trades.`);
  }
  function changeStep(next: number) { step = Math.max(0, Math.min(4, next)); writeUrl(); render(); }
  root.querySelectorAll<HTMLAnchorElement>('[data-step]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); changeStep(Number(link.dataset.step)); }));
  scenarioSelect.addEventListener('change', () => { scenario = scenarioSelect.value as ScenarioId; selected = defaultSymbol(scenario); priceOverride = null; writeUrl(); render(); });
  stockSelect.addEventListener('change', () => { selected = stockSelect.value; priceOverride = null; writeUrl(); render(); });
  today.addEventListener('input', () => { priceOverride = Number(today.value); writeUrl(true); render(); });
  get('[data-prev]').addEventListener('click', () => changeStep(step - 1));
  get('[data-next]').addEventListener('click', () => changeStep(step + 1));
  get('[data-reset]').addEventListener('click', () => { scenario = 'baseline'; selected = 'JUNIPER'; step = 0; priceOverride = null; writeUrl(); render(); text('[data-share-status]', 'Walkthrough reset.'); });
  get('[data-share]').addEventListener('click', async () => {
    writeUrl(true);
    try { await navigator.clipboard.writeText(location.href); text('[data-share-status]', 'View URL copied. This preview link works on this computer.'); }
    catch { text('[data-share-status]', 'Copy the address bar URL to save this view.'); }
  });
  addEventListener('popstate', () => { readUrl(); render(); });
  readUrl(); render();
  get('[data-lab-controls]').hidden = false;
  get('[data-live-lab]').hidden = false;
}
