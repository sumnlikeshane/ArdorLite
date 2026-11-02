import { DEFAULT_ENGINEERING_STATE, ENGINEERING_STATIONS, deriveEngineeringFrame, hasInvalidEngineeringState, normalizeEngineeringState, readEngineeringState, writeEngineeringState, type EngineeringFrame, type EngineeringInputState } from '../../lib/experiences/models/engineering';

function initializeEngineering(root: HTMLElement): void {
  const required = <T extends HTMLElement>(selector: string): T => {
    const element = root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing engineering display: ${selector}`);
    return element;
  };
  const cutoff = required<HTMLSelectElement>('[data-cutoff]');
  const gate = required<HTMLSelectElement>('[data-gate-preset]');
  const registration = required<HTMLSelectElement>('[data-registration-preset]');
  const comparison = required<HTMLSelectElement>('[data-comparison-preset]');
  const ledger = required<HTMLSelectElement>('[data-ledger-preset]');
  const casePath = required<HTMLSelectElement>('[data-case-preset]');
  const status = required<HTMLElement>('[data-engineering-status]');
  let committed: EngineeringInputState = readEngineeringState(new URL(location.href));
  const output = {
    cutoff: required('[data-observation-cutoff]'), selected: required('[data-observation-selected]'), support: required('[data-observation-support]'),
    observationExplanation: required('[data-observation-explanation]'), verdict: required('[data-gate-verdict]'),
    capable: required('[data-certification-capable]'), profile: required('[data-gate-profile]'), missing: required('[data-gate-missing]'),
    api: required('[data-gate-api]'), gateExplanation: required('[data-gate-explanation]'),
  };
  function render(frame: EngineeringFrame): void {
    cutoff.value = frame.state.cutoff;
    gate.value = frame.state.gate;
    registration.value = frame.state.registration;
    comparison.value = frame.state.comparison;
    ledger.value = frame.state.ledger;
    casePath.value = frame.state.case;
    output.cutoff.textContent = frame.observation.cutoffLabel;
    output.selected.textContent = frame.observation.selectedLabel;
    output.support.textContent = frame.observation.supportLabel;
    output.observationExplanation.textContent = frame.observation.explanation;
    output.verdict.textContent = frame.gate.verdict;
    output.capable.textContent = String(frame.gate.certificationCapable);
    output.profile.textContent = frame.gate.profileName ?? 'null';
    output.missing.textContent = frame.gate.missingFields.join(', ') || 'None';
    output.api.textContent = frame.gate.api;
    output.gateExplanation.textContent = frame.gate.explanation;
    const values: Record<string, string | number> = {
      'registration-name': frame.registration.name, 'registration-schema': frame.registration.schema,
      'registration-outcome': frame.registration.outcome, 'registration-count': frame.registration.retainedCount,
      'registration-explanation': frame.registration.explanation,
      'comparison-key': frame.comparison.thresholdKey, 'comparison-metric': frame.comparison.requiredMetric,
      'comparison-semantics': frame.comparison.semantics, 'comparison-threshold': frame.comparison.threshold,
      'comparison-actual': frame.comparison.actual, 'comparison-verdict': frame.comparison.verdict,
      'comparison-failed': frame.comparison.failedKey, 'comparison-explanation': frame.comparison.explanation,
      'ledger-ok': String(frame.ledger.ok), 'ledger-count': `${frame.ledger.expectedLines} / ${frame.ledger.actualLines}`,
      'ledger-head': frame.ledger.head, 'ledger-prefix': frame.ledger.prefix, 'ledger-reason': frame.ledger.reason,
      'trial-outcome': frame.ledger.trialOutcome, 'ledger-explanation': frame.ledger.explanation,
    };
    for (const [key, value] of Object.entries(values)) required(`[data-${key}]`).textContent = String(value);
    root.querySelectorAll<HTMLAnchorElement>('[data-engineering-station]').forEach(link => {
      const selected = link.dataset.engineeringStation === frame.state.station;
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
      const section = document.getElementById(link.dataset.engineeringStation ?? '');
      if (section) section.dataset.stationSelected = String(selected);
    });
    root.querySelectorAll<HTMLElement>('[data-case-path]').forEach(path => {
      const selected = path.dataset.casePath === frame.state.case;
      path.classList.toggle('is-selected', selected);
      const label = path.querySelector('[data-case-selection]');
      if (label) label.textContent = selected ? 'Selected path' : 'Case path';
    });
    root.querySelectorAll<HTMLElement>('[data-vintage-id]').forEach(row => {
      const selected = row.dataset.vintageId === frame.observation.selected?.id;
      row.classList.toggle('is-selected', selected);
      const label = row.querySelector('[data-vintage-selection]');
      if (label) label.textContent = selected ? 'Selected' : 'Not selected';
    });
    const spans = [...frame.observation.activeSourceSpans, ...frame.registration.activeSourceSpans, ...frame.comparison.activeSourceSpans, ...frame.gate.activeSourceSpans, ...frame.ledger.activeSourceSpans];
    root.querySelectorAll<HTMLElement>('[data-source-panel]').forEach(panel => {
      const active = spans.filter(span => span.excerptId === panel.dataset.excerptId);
      panel.dataset.sourceActive = String(active.length > 0);
      panel.querySelectorAll<HTMLElement>('[data-source-line]').forEach(line => {
        const number = Number(line.dataset.sourceLine);
        line.classList.toggle('is-active', active.some(span => number >= span.lineStart && number <= span.lineEnd));
      });
    });
  }
  function commit(input: EngineeringInputState, announcement: string, mode: 'push' | 'replace' = 'push'): void {
    try {
      const normalized = normalizeEngineeringState(input);
      const frame = deriveEngineeringFrame(normalized);
      const url = writeEngineeringState(new URL(location.href), normalized);
      if (normalized.station !== committed.station) url.hash = normalized.station === 'overview' ? '' : normalized.station;
      if (url.href !== location.href) history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', url);
      render(frame);
      committed = normalized;
      status.textContent = announcement;
    } catch {
      render(deriveEngineeringFrame(committed));
      status.textContent = 'That input could not be applied. The last committed example is still shown.';
    }
  }
  render(deriveEngineeringFrame(committed));
  const initialUrl = new URL(location.href);
  const normalizedUrl = writeEngineeringState(initialUrl, committed);
  const invalidState = hasInvalidEngineeringState(initialUrl);
  history.replaceState(null, '', normalizedUrl);
  if (invalidState) status.textContent = 'Invalid or unsupported example inputs were restored to safe defaults.';
  cutoff.addEventListener('change', () => commit(normalizeEngineeringState({ ...committed, cutoff: cutoff.value }), 'Knowledge cutoff updated.'));
  gate.addEventListener('change', () => commit(normalizeEngineeringState({ ...committed, gate: gate.value }), 'Gate example updated.'));
  registration.addEventListener('change', () => commit(normalizeEngineeringState({ ...committed, registration: registration.value }), 'Registration trace updated.'));
  comparison.addEventListener('change', () => commit(normalizeEngineeringState({ ...committed, comparison: comparison.value }), 'Comparison trace updated.'));
  ledger.addEventListener('change', () => commit(normalizeEngineeringState({ ...committed, ledger: ledger.value }), 'Integrity trace updated.'));
  casePath.addEventListener('change', () => commit(normalizeEngineeringState({ ...committed, case: casePath.value }), 'Case-specific path updated. Every case remains available.'));
  root.querySelectorAll<HTMLAnchorElement>('[data-engineering-station]').forEach(link => link.addEventListener('click', event => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    event.preventDefault();
    commit(normalizeEngineeringState({ ...committed, station: link.dataset.engineeringStation }), 'Engineering station selected. All stations remain available.');
    const target = document.getElementById(link.dataset.engineeringStation ?? '');
    if (target) {
      target.tabIndex = -1;
      target.focus({ preventScroll: true });
      target.scrollIntoView();
    }
  }));
  required<HTMLButtonElement>('[data-engineering-reset]').addEventListener('click', () => commit(DEFAULT_ENGINEERING_STATE, 'Engineering example reset to the documented defaults.'));
  required<HTMLButtonElement>('[data-engineering-share]').addEventListener('click', async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(location.href);
      status.textContent = 'Example link copied.';
    } catch {
      status.textContent = 'Copy the address from your browser’s address bar to share this example.';
    }
  });
  window.addEventListener('popstate', () => commit(readEngineeringState(new URL(location.href)), 'Example restored from browser history.', 'replace'));
  window.addEventListener('hashchange', () => {
    const station = location.hash.slice(1);
    if (ENGINEERING_STATIONS.includes(station as EngineeringInputState['station'])) commit(normalizeEngineeringState({ ...committed, station }), 'Engineering station restored from the link.', 'replace');
  });
  root.querySelectorAll<HTMLElement>('[data-engineering-controls]').forEach(controls => { controls.hidden = false; });
}

document.querySelectorAll<HTMLElement>('[data-engineering]').forEach(root => {
  try { initializeEngineering(root); }
  catch { /* Static worked examples and source disclosures remain available if enhancement fails. */ }
});
