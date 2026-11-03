import { BRIDGE_OPERATIONS, DEFAULT_BRIDGE_STATE, bridgeNumber, deriveBridgeFrame, hasInvalidBridgeState, normalizeBridgeState, readBridgeState, writeBridgeState, type BridgeFrame, type BridgeInputState } from '../../lib/experiences/models/bridge';

function initializeBridge(root: HTMLElement): void {
  const required = <T extends HTMLElement>(selector: string): T => { const element = root.querySelector<T>(selector); if (!element) throw new Error(`Missing Bridge view ${selector}`); return element; };
  const preset = required<HTMLSelectElement>('[data-bridge-preset]');
  const operation = required<HTMLSelectElement>('[data-bridge-operation]');
  const status = required('[data-bridge-status]');
  const previous = required<HTMLButtonElement>('[data-bridge-previous]');
  const next = required<HTMLButtonElement>('[data-bridge-next]');
  const explanation = required('[data-bridge-explanation]');
  const operationLabel = required('[data-bridge-operation-label]');
  const sourceSummary = required('[data-bridge-source-summary]');
  const sourceLabel = required('[data-bridge-source-label]');
  const sourcePreview = root.querySelector<HTMLElement>('[data-bridge-source-preview]');
  const sourceLinks = required('[data-bridge-source-links]');
  const outputs = Object.fromEntries([...root.querySelectorAll<HTMLElement>('[data-bridge-value]')].map(element => [element.dataset.bridgeValue!, element]));
  let committed: BridgeInputState = readBridgeState(new URL(location.href));
  function render(frame: BridgeFrame): void {
    const repaired = frame.repair.available ? `₹${bridgeNumber(frame.repair.adjusted)} / ₹${bridgeNumber(frame.repair.totalAdjusted)}; bridge ${bridgeNumber(frame.repair.ratio)}` : 'Unavailable';
    const content: Record<string, string> = {
      'observed-close': bridgeNumber(frame.fixture.close), 'observed-total': bridgeNumber(frame.fixture.total), ratio: bridgeNumber(frame.ratio),
      'mapped-open': bridgeNumber(frame.mapped?.open ?? null), 'mapped-high': bridgeNumber(frame.mapped?.high ?? null), 'mapped-low': bridgeNumber(frame.mapped?.low ?? null), 'mapped-close': bridgeNumber(frame.mapped?.close ?? null),
      'stored-close': frame.fixture.close === null ? 'Unavailable' : Number.isFinite(frame.fixture.close) ? frame.fixture.close.toFixed(6) : 'Nonfinite', 'explicit-repair': repaired,
      'raw-close': bridgeNumber(frame.fixture.raw), 'split-factor': bridgeNumber(frame.fixture.splitFactor), 'total-factor': bridgeNumber(frame.fixture.totalFactor), 'ca-input': !frame.fixture.caInput ? 'Unavailable' : frame.fixture.confirmedAction ? 'Available · confirmed action' : 'Available · no matching action record',
      cliff: `${frame.cliffEligible} / ${frame.cliffDetected}`, cutoff: '2026-06-09', 'known-at': frame.fixture.knownAt, vintage: '2026-08-12', source: `${frame.fixture.rawId ?? 'Unavailable'} / ${frame.fixture.exactSession ? 'present' : 'missing session'}${frame.fixture.unique ? '' : ' / ambiguous'}`,
      technical: String(frame.technical), rights: frame.rights, ready: String(frame.ready), reason: frame.reason,
    };
    for (const [key, text] of Object.entries(content)) { if (!outputs[key]) throw new Error(`Missing Bridge output ${key}`); outputs[key].textContent = text; }
    preset.value = frame.state.preset;
    operation.value = frame.state.operation;
    operationLabel.textContent = frame.operationLabel;
    explanation.textContent = frame.explanation;
    sourceSummary.textContent = root.dataset.publicationScope === "public" ? `Current active operation: ${frame.operationLabel}. Source references identify the operation; original excerpts are omitted from this public edition. The explicit reconstruction and old-rule illustration are separately authored teaching arithmetic.` : `Current active operation: ${frame.operationLabel}. Highlighted lines explain its source mechanism; the explicit reconstruction and old-rule illustration are separately authored teaching arithmetic.`;
    const previewLines: string[] = [];
    const labels: string[] = [];
    const links: HTMLLIElement[] = [];
    for (const span of frame.activeSourceSpans) {
      const panel = required<HTMLElement>(`[data-excerpt-id="${span.excerptId}"]`);
      labels.push(`${span.excerptId} · original lines ${span.lineStart}–${span.lineEnd}`);
      const item = document.createElement('li'); const link = document.createElement('a'); link.href = `#${span.excerptId}`; link.textContent = root.dataset.publicationScope === "public" ? `Source metadata for ${span.excerptId}` : `Exact ${span.excerptId} and provenance`; item.append(link); links.push(item);
      const remaining = 14 - previewLines.length;
      if (remaining > 0) {
        const lines = [...panel.querySelectorAll<HTMLElement>('[data-source-line]')].filter(line => Number(line.dataset.sourceLine) >= span.lineStart && Number(line.dataset.sourceLine) <= span.lineEnd).slice(0, remaining);
        previewLines.push(...lines.map(line => `${line.dataset.sourceLine}  ${(line.textContent ?? '').replace(/\n$/, '')}`));
      }
    }
    sourceLabel.textContent = labels.join('; ');
    if (sourcePreview) sourcePreview.textContent = previewLines.join('\n');
    sourceLinks.replaceChildren(...links);
    const step = BRIDGE_OPERATIONS.indexOf(frame.state.operation);
    previous.disabled = step === 0;
    next.disabled = step === BRIDGE_OPERATIONS.length - 1;
    root.querySelectorAll<HTMLElement>('[data-bridge-node]').forEach(node => { if (node.dataset.bridgeNode === frame.state.operation) node.setAttribute('aria-current', 'step'); else node.removeAttribute('aria-current'); });
    root.querySelectorAll<HTMLElement>('[data-source-panel]').forEach(panel => {
      const active = frame.activeSourceSpans.filter(span => span.excerptId === panel.dataset.excerptId);
      panel.dataset.sourceActive = String(active.length > 0);
      panel.querySelectorAll<HTMLElement>('[data-source-line]').forEach(line => { const number = Number(line.dataset.sourceLine); line.classList.toggle('is-active', active.some(span => number >= span.lineStart && number <= span.lineEnd)); });
    });
  }
  function commit(input: BridgeInputState, announcement: string, mode: 'push' | 'replace' = 'push'): void {
    try {
      const normalized = normalizeBridgeState(input);
      const frame = deriveBridgeFrame(normalized);
      render(frame);
      const current = new URL(location.href);
      const url = writeBridgeState(current, normalized);
      const explicitState = [...current.searchParams.keys()].some(key=>key.startsWith('br.'));
      if ((mode === 'push' || explicitState) && url.href !== location.href) history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
      committed = normalized;
      status.textContent = announcement;
    } catch { render(deriveBridgeFrame(committed)); status.textContent = 'That input could not be applied. The last committed fictional example remains shown.'; }
  }
  render(deriveBridgeFrame(committed));
  const originalUrl = new URL(location.href);
  // A normal reading entrance keeps its exact URL. Normalize only an explicit
  // Bridge state; user actions still write the existing complete share state.
  if ([...originalUrl.searchParams.keys()].some(key=>key.startsWith('br.'))) history.replaceState(null, '', writeBridgeState(originalUrl, committed));
  if (hasInvalidBridgeState(originalUrl)) status.textContent = 'Invalid or unsupported Bridge inputs were restored to safe defaults.';
  preset.addEventListener('change', () => commit(normalizeBridgeState({ preset: preset.value, operation: 'overview' }), 'Fictional preset changed; operation returned to the observation overview.'));
  operation.addEventListener('change', () => commit(normalizeBridgeState({ ...committed, operation: operation.value }), 'Pipeline operation updated.'));
  previous.addEventListener('click', () => commit({ ...committed, operation: BRIDGE_OPERATIONS[Math.max(0, BRIDGE_OPERATIONS.indexOf(committed.operation) - 1)]! }, 'Previous pipeline operation.'));
  next.addEventListener('click', () => commit({ ...committed, operation: BRIDGE_OPERATIONS[Math.min(BRIDGE_OPERATIONS.length - 1, BRIDGE_OPERATIONS.indexOf(committed.operation) + 1)]! }, 'Next pipeline operation.'));
  required<HTMLButtonElement>('[data-bridge-reset]').addEventListener('click', () => commit(DEFAULT_BRIDGE_STATE, 'Bridge example reset to positive inputs and the observation overview.'));
  required<HTMLButtonElement>('[data-bridge-share]').addEventListener('click', async () => { try { if (!navigator.clipboard) throw new Error('Clipboard unavailable'); await navigator.clipboard.writeText(location.href); status.textContent = 'Bridge example link copied.'; } catch { status.textContent = 'Copy the address from your browser’s address bar to share this example.'; } });
  window.addEventListener('popstate', () => commit(readBridgeState(new URL(location.href)), 'Bridge example restored from browser history.', 'replace'));
  root.querySelectorAll<HTMLElement>('[data-bridge-controls]').forEach(controls => { controls.hidden = false; });
}
document.querySelectorAll<HTMLElement>('[data-bridge]').forEach(root => { try { initializeBridge(root); } catch { /* The complete static narrative, values, source and evidence remain readable. */ } });
