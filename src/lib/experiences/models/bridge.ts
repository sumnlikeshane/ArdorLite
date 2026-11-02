import { readNamespacedState, writeNamespacedState } from '../state';

/** Fictional, bounded inputs only. No warehouse, original runtime or historical rows. */
export const BRIDGE_OPERATIONS = ['overview', 'repair', 'vintage', 'linkage', 'qa', 'rights'] as const;
export const BRIDGE_PRESETS = ['positive', 'penny-ticks', 'ordinary-cliff', 'confirmed-low-split', 'rounded-zero', 'missing-raw', 'missing-factor', 'missing-ca-input', 'zero-close', 'negative-close', 'nonfinite-close', 'missing-total', 'inverted-ohlc', 'missing-session', 'wrong-identity', 'ambiguous-lineage', 'known-late', 'ca-discontinuity', 'dividend-discontinuity', 'rights-denied'] as const;
export type BridgeOperation = typeof BRIDGE_OPERATIONS[number];
export type BridgePreset = typeof BRIDGE_PRESETS[number];
export type BridgeInputState = Readonly<{ preset: BridgePreset; operation: BridgeOperation }>;
export const DEFAULT_BRIDGE_STATE: BridgeInputState = Object.freeze({ preset: 'positive', operation: 'overview' });
export const BRIDGE_OPERATION_LABELS: Record<BridgeOperation, string> = { overview: 'Invalid observations', repair: 'Explicit-input repair', vintage: 'Two independent dates', linkage: 'Exact source and session', qa: 'Technical QA', rights: 'Independent rights gate' };
export const BRIDGE_PRESET_LABELS: Record<BridgePreset, string> = {
  positive: 'Positive bridge · 100 → 102', 'penny-ticks': 'Penny ticks · available CA input, no action record', 'ordinary-cliff': 'Ordinary-price unconfirmed cliff · 100 → 50', 'confirmed-low-split': 'Confirmed low-price split · 1 → 0.50',
  'rounded-zero': 'Six-decimal rounded zero', 'missing-raw': 'Repair unavailable · raw close absent', 'missing-factor': 'Repair unavailable · split factor absent', 'missing-ca-input': 'Repair unavailable · CA input absent',
  'zero-close': 'Zero adjusted close', 'negative-close': 'Negative adjusted close', 'nonfinite-close': 'Nonfinite adjusted close', 'missing-total': 'Missing total-return close', 'inverted-ohlc': 'Inverted signal OHLC',
  'missing-session': 'Missing exact held-session mark', 'wrong-identity': 'Wrong exact raw identity', 'ambiguous-lineage': 'Ambiguous raw lineage', 'known-late': 'Old trade, known after cutoff', 'ca-discontinuity': 'Corporate-action discontinuity flag', 'dividend-discontinuity': 'Dividend discontinuity flag', 'rights-denied': 'Valid technical row · denied rights receipt',
};
type Fixture = Readonly<{ close: number | null; total: number | null; open: number; high: number; low: number; raw: number | null; splitFactor: number | null; totalFactor: number | null; caInput: boolean; confirmedAction: boolean; previous: number; current: number; knownAt: string; rawId: string | null; exactSession: boolean; unique: boolean; caFlag: boolean; dividendFlag: boolean; rights: 'unknown' | 'denied' }>;
const BASE: Fixture = Object.freeze({ close: 100, total: 102, open: 99, high: 103, low: 98, raw: 100, splitFactor: 1, totalFactor: 1.02, caInput: true, confirmedAction: false, previous: 100, current: 100, knownAt: '2026-06-08', rawId: 'fictional-raw-a', exactSession: true, unique: true, caFlag: false, dividendFlag: false, rights: 'unknown' });
const MODIFIERS: Record<BridgePreset, Partial<Fixture>> = {
  positive: {}, 'penny-ticks': { close: .05, total: .051, open: .05, high: .1, low: .05, raw: .05, previous: .1, current: .05 },
  'ordinary-cliff': { close: 50, total: 51, open: 50, high: 51, low: 49, raw: 100, splitFactor: 2, previous: 100, current: 50 },
  'confirmed-low-split': { close: .5, total: .51, open: .5, high: .51, low: .49, raw: 1, splitFactor: 2, previous: 1, current: .5, confirmedAction: true },
  'rounded-zero': { close: 0, total: 0, open: 0, high: 0, low: 0, raw: .05, previous: .1, current: .05 },
  'missing-raw': { raw: null }, 'missing-factor': { splitFactor: null }, 'missing-ca-input': { caInput: false },
  'zero-close': { close: 0 }, 'negative-close': { close: -100 }, 'nonfinite-close': { close: Infinity }, 'missing-total': { total: null }, 'inverted-ohlc': { low: 104, high: 98 },
  'missing-session': { exactSession: false }, 'wrong-identity': { rawId: 'fictional-raw-b' }, 'ambiguous-lineage': { unique: false }, 'known-late': { knownAt: '2026-06-10' },
  'ca-discontinuity': { caFlag: true }, 'dividend-discontinuity': { dividendFlag: true }, 'rights-denied': { rights: 'denied' },
};
export const FICTIONAL_KNOWLEDGE_CUTOFF = '2026-06-09';
export const FICTIONAL_REPAIR_VINTAGE = '2026-08-12';
export function finitePositive(value: unknown): value is number { return typeof value === 'number' && Number.isFinite(value) && value > 0; }
export function positiveBridge(close: unknown, total: unknown): number | null {
  if (!finitePositive(close) || !finitePositive(total)) return null;
  const ratio = total / close;
  return finitePositive(ratio) ? ratio : null;
}
export function repairFromExplicitInputs(raw: unknown, split: unknown, total: unknown, caInputAvailable = true) {
  if (!caInputAvailable) return Object.freeze({ available: false as const, reason: 'Corporate-action input unavailable; absence is not an available no-record input.' });
  if (!finitePositive(raw) || !finitePositive(split) || !finitePositive(total)) return Object.freeze({ available: false as const, reason: 'Required explicit raw close or finite-positive factor is missing or invalid. No factor is guessed.' });
  const adjusted = raw / split;
  const totalAdjusted = adjusted * total;
  const ratio = positiveBridge(adjusted, totalAdjusted);
  if (ratio === null) return Object.freeze({ available: false as const, reason: 'Explicit arithmetic is unrepresentable as a finite-positive bridge.' });
  return Object.freeze({ available: true as const, adjusted, totalAdjusted, ratio, reason: 'Rebuilt from supplied unrounded teaching inputs, independently of the stored observation.' });
}
export function normalizeBridgeState(input: { preset?: unknown; operation?: unknown } = {}): BridgeInputState {
  return Object.freeze({ preset: BRIDGE_PRESETS.includes(input.preset as BridgePreset) ? input.preset as BridgePreset : DEFAULT_BRIDGE_STATE.preset, operation: BRIDGE_OPERATIONS.includes(input.operation as BridgeOperation) ? input.operation as BridgeOperation : DEFAULT_BRIDGE_STATE.operation });
}
const spans = (operation: BridgeOperation, confirmed: boolean) => {
  switch (operation) {
    case 'overview': case 'qa': return [{ excerptId: 'bridge-numeric-check', lineStart: 103, lineEnd: 138 }];
    case 'repair': return confirmed ? [{ excerptId: 'bridge-confirmed-action', lineStart: 77, lineEnd: 90 }] : [{ excerptId: 'bridge-cliff-guard', lineStart: 101, lineEnd: 115 }, { excerptId: 'bridge-cliff-threshold', lineStart: 63, lineEnd: 63 }, { excerptId: 'bridge-cliff-minimum', lineStart: 79, lineEnd: 79 }];
    case 'vintage': return [{ excerptId: 'bridge-repair-vintage', lineStart: 33, lineEnd: 51 }];
    case 'linkage': return [{ excerptId: 'bridge-lineage-cutoff', lineStart: 28, lineEnd: 37 }, { excerptId: 'bridge-lineage-unique', lineStart: 48, lineEnd: 56 }, { excerptId: 'bridge-exact-session', lineStart: 167, lineEnd: 188 }];
    case 'rights': return [{ excerptId: 'bridge-certification-decision', lineStart: 125, lineEnd: 146 }];
  }
};
export const bridgeNumber = (value: number | null) => value === null ? 'Unavailable' : !Number.isFinite(value) ? 'Nonfinite' : String(Number(value.toPrecision(12)));
export function deriveBridgeFrame(input: BridgeInputState) {
  const state = normalizeBridgeState(input);
  const fixture: Fixture = Object.freeze({ ...BASE, ...MODIFIERS[state.preset] });
  const ratio = positiveBridge(fixture.close, fixture.total);
  const mapped = ratio === null ? null : Object.freeze({ open: fixture.open * ratio, high: fixture.high * ratio, low: fixture.low * ratio, close: fixture.total! });
  const ordered = finitePositive(fixture.close) && fixture.low <= fixture.open && fixture.open <= fixture.high && fixture.low <= fixture.close && fixture.close <= fixture.high;
  const mappedValid = mapped !== null && Object.values(mapped).every(finitePositive);
  const numeric = ratio !== null && [fixture.open, fixture.high, fixture.low].every(finitePositive) && ordered && mappedValid;
  const repair = repairFromExplicitInputs(fixture.raw, fixture.splitFactor, fixture.totalFactor, fixture.caInput);
  const eligibleAtCutoff = fixture.knownAt <= FICTIONAL_KNOWLEDGE_CUTOFF;
  const exactIdentity = fixture.rawId === 'fictional-raw-a' && fixture.unique;
  const technical = numeric && fixture.exactSession && exactIdentity && eligibleAtCutoff && repair.available && !fixture.caFlag && !fixture.dividendFlag;
  const reason = !repair.available ? repair.reason : ratio === null ? 'Unavailable bridge: both observed closes and their ratio must be finite and strictly positive.' : !numeric ? 'Technical failure: signal OHLC must be positive, finite and correctly ordered; mapped prices must remain finite-positive.' : !fixture.exactSession ? 'Missing exact held-session mark. No nearby session or fill is substituted.' : !fixture.unique ? 'Ambiguous lineage: duplicate source candidates are rejected at the knowledge cutoff.' : !exactIdentity ? 'Exact raw identity mismatch. Matching symbol and date cannot replace the retained source ID.' : !eligibleAtCutoff ? 'Known after the frozen cutoff; an earlier trade date cannot make this input eligible.' : fixture.caFlag ? 'Corporate-action factor discontinuity is a separate quarantine reason.' : fixture.dividendFlag ? 'Dividend factor discontinuity is a separate technical blocker.' : 'Technical checks pass for this fictional input. Source-rights remain independently blocked.';
  const cliffEligible = fixture.previous >= 1 && fixture.current >= 1;
  const observedFactor = fixture.previous / fixture.current;
  const oldRuleClose = .05 / 2 ** 20;
  const oldRuleStored = oldRuleClose.toFixed(6);
  const explanations: Record<BridgeOperation, string> = {
    overview: `${reason} The displayed observed prices and the explicit reconstruction are separate values; a reconstruction does not overwrite the stored observation.`,
    repair: !repair.available ? repair.reason : fixture.confirmedAction ? 'The known low-price split uses the separate corporate-action path. The ₹1 unconfirmed-cliff guard does not suppress confirmed actions. Explicit supplied factors reconstruct the displayed adjusted prices.' : `Both adjacent closes must be at least ₹1 for an unconfirmed cliff: ${cliffEligible}. The selected ratio is ${bridgeNumber(observedFactor)}; a cliff requires the separate ≥1.4 ratio threshold. Available CA input with no matching action record is distinct from missing input. The old-rule repeated-factor illustration is authored, not recovered Python execution.`,
    vintage: `Trade date 2026-06-05; known-at ${fixture.knownAt}; knowledge cutoff ${FICTIONAL_KNOWLEDGE_CUTOFF}. Eligible: ${eligibleAtCutoff}. The independent repair vintage ${FICTIONAL_REPAIR_VINTAGE} labels new storage and preserves the original vintage. Repairing later cannot move the knowledge boundary.`,
    linkage: `Exact source ${fixture.rawId ?? 'unavailable'}; unique lineage ${fixture.unique}; exact session present ${fixture.exactSession}. Origin needs the exact retained raw ID, a unique cutoff-eligible mapping and the required session. A source link does not grant use permission.`,
    qa: reason,
    rights: `Technical=${technical}. Rights=${fixture.rights}: ${fixture.rights === 'denied' ? 'the fixed fictional receipt denies the required use' : 'the fixed fictional receipt is absent; allowed fields, use and time remain unknown'}. Readiness=false. The archived certification below is immutable and uses its own taxonomy and active-receipt condition, not this teaching fixture.`,
  };
  return Object.freeze({ state, fixtureId: 'bridge-fictional-v1', executionMode: 'browser-adaptation' as const, dataOrigin: 'synthetic' as const, fixture, ratio, mapped, repair, numeric, ordered, technical, rights: fixture.rights, ready: false as const, reason, cliffEligible, cliffDetected: cliffEligible && observedFactor >= 1.4, observedFactor, oldRuleClose, oldRuleStored, eligibleAtCutoff, exactIdentity, operationLabel: BRIDGE_OPERATION_LABELS[state.operation], explanation: explanations[state.operation], activeSourceSpans: Object.freeze(spans(state.operation, fixture.confirmedAction).map(span => Object.freeze(span))) });
}
export type BridgeFrame = ReturnType<typeof deriveBridgeFrame>;
export function readBridgeState(url: URL): BridgeInputState { return normalizeBridgeState(readNamespacedState(url.searchParams, 'br', { ...DEFAULT_BRIDGE_STATE }, { preset: BRIDGE_PRESETS, operation: BRIDGE_OPERATIONS })); }
export function writeBridgeState(url: URL, state: BridgeInputState): URL { return writeNamespacedState(url, 'br', { ...normalizeBridgeState(state) }); }
export function hasInvalidBridgeState(url: URL): boolean {
  const state = readBridgeState(url);
  for (const key of url.searchParams.keys()) {
    if (!key.startsWith('br.')) continue;
    if (key !== 'br.preset' && key !== 'br.operation') return true;
    const values = url.searchParams.getAll(key);
    const field = key === 'br.preset' ? 'preset' : 'operation';
    if (values.length !== 1 || values[0] !== state[field]) return true;
  }
  return false;
}
