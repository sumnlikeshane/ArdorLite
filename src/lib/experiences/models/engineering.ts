import { readNamespacedState, writeNamespacedState } from '../state';

/** Bounded authored teaching states. This module never reads a database or runs Ardor Python. */
export const KNOWLEDGE_CUTOFFS = ['latest', '2026-05-31', '2026-06-02', '2026-06-04'] as const;
export const GATE_PRESETS = ['legacy-empty', 'missing-profile', 'missing-evidence', 'complete-profile'] as const;
export const REGISTRATION_PRESETS = ['new-name', 'existing-name', 'invalid-schema'] as const;
export const COMPARISON_PRESETS = ['numeric-ge', 'numeric-le', 'missing-numeric', 'nonfinite-numeric', 'unknown-comparator', 'exact-null', 'exact-absent', 'legacy-min'] as const;
export const LEDGER_PRESETS = ['intact', 'unsealed-append', 'changed-history'] as const;
export const ENGINEERING_CASES = ['atlas-ssf', 'momentum-v2', 'swing-autopsy', 'trend-quality', 'delivery-insider', 'price-bridge'] as const;
export const ENGINEERING_STATIONS = ['overview', 'observation', 'question', 'comparison', 'certification', 'record', 'cases'] as const;
export type KnowledgeCutoff = typeof KNOWLEDGE_CUTOFFS[number];
export type GatePreset = typeof GATE_PRESETS[number];
export type EngineeringInputState = Readonly<{
  cutoff: KnowledgeCutoff; gate: GatePreset;
  registration: typeof REGISTRATION_PRESETS[number]; comparison: typeof COMPARISON_PRESETS[number];
  ledger: typeof LEDGER_PRESETS[number]; case: typeof ENGINEERING_CASES[number]; station: typeof ENGINEERING_STATIONS[number];
}>;
export const DEFAULT_ENGINEERING_STATE: EngineeringInputState = Object.freeze({ cutoff: '2026-06-02', gate: 'legacy-empty', registration: 'new-name', comparison: 'numeric-ge', ledger: 'intact', case: 'price-bridge', station: 'overview' });
const ALLOWED = { cutoff: KNOWLEDGE_CUTOFFS, gate: GATE_PRESETS, registration: REGISTRATION_PRESETS, comparison: COMPARISON_PRESETS, ledger: LEDGER_PRESETS, case: ENGINEERING_CASES, station: ENGINEERING_STATIONS };

export const OBSERVATION_ROWS = Object.freeze([
  Object.freeze({ id: 'vintage-a', symbol: 'FICTION', tradeDate: '2026-06-01', asOf: '2026-06-01', close: 100, sourceId: 'synthetic-receipt-a' }),
  Object.freeze({ id: 'vintage-b', symbol: 'FICTION', tradeDate: '2026-06-01', asOf: '2026-06-03', close: 101, sourceId: 'synthetic-receipt-b' }),
  Object.freeze({ id: 'vintage-c', symbol: 'FICTION', tradeDate: '2026-06-01', asOf: '2026-06-05', close: 102, sourceId: null }),
]);

export function normalizeEngineeringState(input: Partial<Record<keyof EngineeringInputState, unknown>> = {}): EngineeringInputState {
  const state = { ...DEFAULT_ENGINEERING_STATE };
  for (const key of Object.keys(ALLOWED) as (keyof EngineeringInputState)[]) {
    const value = input[key];
    if (typeof value === 'string' && (ALLOWED[key] as readonly string[]).includes(value)) Object.assign(state, { [key]: value });
  }
  return Object.freeze(state);
}

const REGISTRATIONS = {
  'new-name': { name: 'fictional-quality-v2', schema: 'quality_floor → quality_score · GE · FINITE_NUMBER', outcome: 'Accepted in this authored trace', retainedCount: 2, explanation: 'The name is new and every threshold has an explicit comparator/value schema. Under the exclusive lock, the original helper checks uniqueness, serializes strict JSON and durably appends. This browser only displays a fixed trace; no record is written.' },
  'existing-name': { name: 'fictional-quality-v1', schema: 'quality_floor → quality_score · GE · FINITE_NUMBER', outcome: 'Rejected · duplicate name', retainedCount: 1, explanation: 'The name already exists. The duplicate check raises before any append, preserving the registered question. Revising a hypothesis requires a new name; selecting this trace cannot overwrite the earlier record.' },
  'invalid-schema': { name: 'fictional-quality-v2', schema: 'quality_floor has no typed binding', outcome: 'Rejected · incomplete threshold schema', retainedCount: 1, explanation: 'register_typed requires the schema keys to bind every kill threshold exactly once. The missing binding fails before registration. Historical rows without typed metadata remain a separate, non-certifying contract.' },
} as const;
const COMPARISONS = {
  'numeric-ge': { thresholdKey: 'quality_floor', requiredMetric: 'quality_score', semantics: 'GE · FINITE_NUMBER · explicit binding', threshold: '0.50', actual: '0.60', verdict: 'PASS', failedKey: 'None', explanation: 'Both values are finite numbers and 0.60 ≥ 0.50. The comparison passes this synthetic threshold; it does not certify evidence or validate a research edge.' },
  'numeric-le': { thresholdKey: 'drawdown_ceiling', requiredMetric: 'drawdown', semantics: 'LE · FINITE_NUMBER · explicit binding', threshold: '0.20', actual: '0.25', verdict: 'FAIL', failedKey: 'drawdown_ceiling', explanation: 'Both values are finite numbers, but 0.25 ≤ 0.20 is false. The named threshold is retained in failing_thresholds; the result is not silently changed into a different metric.' },
  'missing-numeric': { thresholdKey: 'quality_floor', requiredMetric: 'quality_score', semantics: 'GE · FINITE_NUMBER · explicit binding', threshold: '0.50', actual: 'Unavailable · key absent', verdict: 'FAIL', failedKey: 'quality_floor', explanation: 'metrics.get("quality_score") returns None when the key is absent. The finite-number guard rejects it before ordered comparison. Missingness is not zero and cannot pass this numeric threshold.' },
  'nonfinite-numeric': { thresholdKey: 'quality_floor', requiredMetric: 'quality_score', semantics: 'GE · FINITE_NUMBER · explicit binding', threshold: '0.50', actual: 'Infinity · nonfinite', verdict: 'FAIL', failedKey: 'quality_floor', explanation: 'Infinity is not a finite numeric actual. The original guard rejects nonfinite values and booleans before GE/LE comparison. No bounded teaching trace can turn an unavailable result into a pass.' },
  'unknown-comparator': { thresholdKey: 'quality_bar', requiredMetric: 'Unavailable · no resolved binding', semantics: 'Unknown · free-form key without typed schema', threshold: '0.50', actual: 'Not compared · no required metric resolved', verdict: 'FAIL', failedKey: 'quality_bar', explanation: 'The free-form key has neither an explicit typed binding nor the historical _min/_max suffix. _threshold_spec returns None and the threshold fails. There is no exact-match fallback or invented metric name.' },
  'exact-null': { thresholdKey: 'receipt_state', requiredMetric: 'receipt', semantics: 'EQ · STRICT_JSON · explicit binding', threshold: 'null', actual: 'null · explicitly present', verdict: 'PASS', failedKey: 'None', explanation: 'The exact matcher treats None and None as equal. An explicit JSON null therefore passes this exact-null threshold. This is equality behavior, not evidence that a receipt exists.' },
  'exact-absent': { thresholdKey: 'receipt_state', requiredMetric: 'receipt', semantics: 'EQ · STRICT_JSON · explicit binding', threshold: 'null', actual: 'Unavailable · key absent; get() returns None', verdict: 'PASS', failedKey: 'None', explanation: 'Exact-null limitation: metrics.get("receipt") returns None for both a missing key and explicit null. The exact matcher compares them equal, so this missing key also passes. Do not generalize numeric missing-value rejection to every exact comparison.' },
  'legacy-min': { thresholdKey: 'quality_score_min', requiredMetric: 'quality_score', semantics: 'GE · FINITE_NUMBER · historical _min compatibility', threshold: '0.50', actual: '0.60', verdict: 'PASS', failedKey: 'None', explanation: 'The historical _min suffix resolves quality_score_min to quality_score with GE; _max similarly resolves to LE. This explicit compatibility differs from a free-form unknown key, and does not make historical rows certification-capable.' },
} as const;
const LEDGERS = {
  intact: { ok: true, expectedLines: 2, actualLines: 2, head: 'Matches recorded head', prefix: 'Matches sealed prefix', reason: 'chain intact', onceCreated: false, trialOutcome: 'Repeated source/run/cell → existing record; created=false', explanation: 'The recomputed head and line count both match the sidecar. In the independent trial trace, record_trial_once finds the same (source, run_uuid, cell_id) under lock and retains the existing record.' },
  'unsealed-append': { ok: false, expectedLines: 2, actualLines: 3, head: 'Differs after the append', prefix: 'First 2 lines match sealed prefix', reason: 'un-sealed append (+1 lines) — re-seal()', onceCreated: true, trialOutcome: 'New source/run/cell → append once; created=true', explanation: 'The file has one extra line and its sealed prefix is unchanged. Verification reports an unsealed append, not intact history. A distinct synthetic cell can be appended once; repeated replay returns that same record. This page never seals or writes a ledger.' },
  'changed-history': { ok: false, expectedLines: 2, actualLines: 3, head: 'Differs from recorded head', prefix: 'First 2 lines disagree with sealed prefix', reason: 'TAMPER: historical line edited/reordered/removed', onceCreated: false, trialOutcome: 'Repeated source/run/cell → existing record; created=false', explanation: 'More lines alone do not prove a harmless append. Here the earlier prefix also changed, so verification reports disagreement with sealed history. Trial deduplication is a separate identity rule and cannot repair or certify this ledger.' },
} as const;
const span = (excerptId: string, lineStart: number, lineEnd: number) => Object.freeze({ excerptId, lineStart, lineEnd });

const GATES = {
  'legacy-empty': { api: 'check({})', verdict: 'GO', certificationCapable: false, profileName: null, missingFields: [], explanation: 'No comparisons failed, so this legacy call returns GO. Its certification_capable flag remains false: this result cannot certify evidence.' },
  'missing-profile': { api: 'certify({}, profile=None)', verdict: 'NO-GO', certificationCapable: true, profileName: null, missingFields: ['certification_profile'], explanation: 'The certification entry point requires a typed, non-empty profile. Missing that contract returns NO-GO, even though no numeric comparison failed.' },
  'missing-evidence': { api: 'certify({}, profile=teaching_history_v1)', verdict: 'NO-GO', certificationCapable: true, profileName: 'teaching_history_v1', missingFields: ['available_years', 'required_years_min'], explanation: 'This authored profile requires a history threshold and its actual value. Both inputs are absent, so the named contract fails.' },
  'complete-profile': { api: 'certify({required_years_min: 5, available_years: 6}, profile=teaching_history_v1)', verdict: 'GO', certificationCapable: true, profileName: 'teaching_history_v1', missingFields: [], explanation: 'The synthetic five-year threshold and six-year actual satisfy this small teaching profile. GO applies only to that profile; it says nothing about a historical strategy or source rights.' },
} as const;

export function deriveEngineeringFrame(input: Partial<EngineeringInputState>) {
  const state = normalizeEngineeringState(input);
  const eligible = OBSERVATION_ROWS.filter(row => state.cutoff === 'latest' || row.asOf <= state.cutoff);
  const selected = eligible.at(-1) ?? null;
  const observation = Object.freeze({
    executionMode: 'browser-adaptation' as const,
    dataOrigin: 'synthetic' as const,
    selected,
    cutoffLabel: state.cutoff === 'latest' ? 'Latest known · no explicit cutoff' : state.cutoff,
    selectedLabel: selected ? `${selected.asOf} · ₹${selected.close.toFixed(2)}` : 'Unavailable · no eligible vintage',
    supportLabel: selected ? (selected.sourceId === null ? 'Unknown · source_id is null' : 'Supported · synthetic receipt present') : 'Unavailable · no observation selected',
    explanation: !selected
      ? 'No vintage was known by this cutoff. An unavailable observation stays unavailable; it does not become a zero price.'
      : state.cutoff === 'latest'
        ? 'With as_of=None, the reader chooses the latest known vintage. That default does not impose an explicit point-in-time knowledge cutoff. The selected row has no source receipt; support remains unknown.'
        : `Only vintages dated on or before ${state.cutoff} are eligible. The latest eligible vintage is ${selected.asOf}; a later correction cannot enter this read.`,
    sourceIds: ['engineering-observation-vintage', 'engineering-observation-support'],
    activeSourceSpans: Object.freeze([
      Object.freeze({ excerptId: 'engineering-observation-vintage', lineStart: 90, lineEnd: 108 }),
      Object.freeze({ excerptId: 'engineering-observation-support', lineStart: 119, lineEnd: 125 }),
    ]),
  });
  const gate = Object.freeze({ ...GATES[state.gate], executionMode: 'authored-precomputed-trace' as const, dataOrigin: 'synthetic' as const, sourceIds: ['engineering-gate-profile', 'engineering-gate-legacy', 'engineering-gate-certify'], activeSourceSpans: Object.freeze(state.gate === 'legacy-empty'
    ? [Object.freeze({ excerptId: 'engineering-gate-legacy', lineStart: 431, lineEnd: 436 })]
    : [Object.freeze({ excerptId: 'engineering-gate-profile', lineStart: 347, lineEnd: 372 }), Object.freeze({ excerptId: 'engineering-gate-certify', lineStart: 439, lineEnd: 456 })]) });
  const registration = Object.freeze({ ...REGISTRATIONS[state.registration], executionMode: 'authored-precomputed-trace' as const, dataOrigin: 'synthetic' as const, sourceIds: ['engineering-registration-unique', 'engineering-registration-typed'], activeSourceSpans: Object.freeze(state.registration === 'invalid-schema' ? [span('engineering-registration-typed', 249, 253)] : [span('engineering-registration-unique', 136, state.registration === 'existing-name' ? 147 : 152), span('engineering-registration-typed', 249, 272)]) });
  const comparisonSpans = [span('engineering-comparison-evaluate', 152, state.comparison === 'unknown-comparator' ? 156 : 175)];
  if (state.comparison.startsWith('exact-')) comparisonSpans.push(span('engineering-comparison-null', 234, 235));
  else if (state.comparison === 'legacy-min' || state.comparison === 'unknown-comparator') comparisonSpans.push(span('engineering-comparison-legacy', 195, 207));
  else comparisonSpans.push(span('engineering-comparison-finite', 210, 216));
  const comparison = Object.freeze({ ...COMPARISONS[state.comparison], executionMode: 'authored-precomputed-trace' as const, dataOrigin: 'synthetic' as const, sourceIds: ['engineering-comparison-evaluate', 'engineering-comparison-legacy', 'engineering-comparison-finite', 'engineering-comparison-null'], activeSourceSpans: Object.freeze(comparisonSpans) });
  const ledger = Object.freeze({ ...LEDGERS[state.ledger], executionMode: 'authored-precomputed-trace' as const, dataOrigin: 'synthetic' as const, sourceIds: ['engineering-ledger-verify', 'engineering-trial-once'], activeSourceSpans: Object.freeze([span('engineering-ledger-verify', state.ledger === 'intact' ? 189 : state.ledger === 'unsealed-append' ? 193 : 202, state.ledger === 'intact' ? 192 : state.ledger === 'unsealed-append' ? 201 : 209), span('engineering-trial-once', 201, 223)]) });
  return Object.freeze({ state, fixtureId: 'engineering-synthetic-v2', dataOrigin: 'synthetic' as const, observation, registration, comparison, gate, ledger });
}

export type EngineeringFrame = ReturnType<typeof deriveEngineeringFrame>;

export function readEngineeringState(url: URL): EngineeringInputState {
  const state = readNamespacedState(url.searchParams, 'eng', { ...DEFAULT_ENGINEERING_STATE }, ALLOWED);
  const hashStation = url.hash.slice(1);
  if (!url.searchParams.has('eng.station') && ENGINEERING_STATIONS.includes(hashStation as EngineeringInputState['station'])) state.station = hashStation as EngineeringInputState['station'];
  return normalizeEngineeringState(state);
}

/** Query ordering and unrelated state do not make valid teaching inputs invalid. */
export function hasInvalidEngineeringState(url: URL): boolean {
  const state = readEngineeringState(url);
  for (const key of url.searchParams.keys()) {
    if (!key.startsWith('eng.')) continue;
    const field = key.slice(4) as keyof EngineeringInputState;
    if (!Object.hasOwn(ALLOWED, field)) return true;
    const values = url.searchParams.getAll(key);
    if (values.length !== 1 || values[0] !== state[field]) return true;
  }
  return false;
}

export function writeEngineeringState(url: URL, state: Partial<EngineeringInputState>): URL {
  return writeNamespacedState(url, 'eng', { ...normalizeEngineeringState(state) });
}
