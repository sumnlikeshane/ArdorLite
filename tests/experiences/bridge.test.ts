import assert from 'node:assert/strict';
import test from 'node:test';
import { BRIDGE_OPERATIONS, BRIDGE_PRESETS, DEFAULT_BRIDGE_STATE, deriveBridgeFrame, finitePositive, hasInvalidBridgeState, normalizeBridgeState, positiveBridge, readBridgeState, repairFromExplicitInputs, writeBridgeState } from '../../src/lib/experiences/models/bridge';
import { sourceExcerpts } from '../../src/lib/experiences/registry';
import { validateSourceSpan } from '../../src/lib/experiences/provenance';
import { claimById } from '../../src/lib/evidence/index';

const example = (preset: typeof BRIDGE_PRESETS[number]) => deriveBridgeFrame({ preset, operation: 'overview' });
test('Bridge hand-worked ratio and all four mapped prices stay synchronized', () => {
  const frame = deriveBridgeFrame(DEFAULT_BRIDGE_STATE);
  assert.equal(frame.ratio, 1.02);
  assert.deepEqual(frame.mapped, { open: 100.98, high: 105.06, low: 99.96000000000001, close: 102 });
  assert.ok(Math.abs(frame.mapped!.low - 99.96) < 1e-12);
  assert.equal(frame.numeric, true);
  assert.equal(frame.technical, true);
  assert.equal(frame.rights, 'unknown');
  assert.equal(frame.ready, false);
  assert.equal(frame.dataOrigin, 'synthetic');
  assert.equal(frame.executionMode, 'browser-adaptation');
});
test('finite-positive checks reject zeros, negatives, nonfinite, missing, overflow and underflow without clipping', () => {
  for (const invalid of [null, undefined, '', '100', 0, -1, NaN, Infinity, -Infinity]) {
    assert.equal(finitePositive(invalid), false);
    assert.equal(positiveBridge(invalid, 102), null);
    assert.equal(positiveBridge(100, invalid), null);
  }
  assert.equal(positiveBridge(Number.MIN_VALUE, Number.MAX_VALUE), null);
  assert.equal(positiveBridge(Number.MAX_VALUE, Number.MIN_VALUE), null);
  assert.equal(example('zero-close').ratio, null);
  assert.equal(example('negative-close').ratio, null);
  assert.equal(example('nonfinite-close').ratio, null);
  assert.equal(example('missing-total').ratio, null);
  assert.equal(example('inverted-ohlc').ratio, 1.02);
  assert.equal(example('inverted-ohlc').technical, false);
});
test('penny-tick guard and confirmed low-price action follow distinct paths', () => {
  const penny = example('penny-ticks');
  assert.equal(penny.fixture.caInput, true);
  assert.equal(penny.fixture.confirmedAction, false);
  assert.equal(penny.cliffEligible, false);
  assert.equal(penny.cliffDetected, false);
  assert.equal(penny.observedFactor, 2);
  assert.equal(penny.technical, true);
  const ordinary = example('ordinary-cliff');
  assert.equal(ordinary.cliffEligible, true);
  assert.equal(ordinary.cliffDetected, true);
  const confirmed = example('confirmed-low-split');
  assert.equal(confirmed.fixture.confirmedAction, true);
  assert.equal(confirmed.cliffEligible, false);
  assert.equal(confirmed.repair.available, true);
  if (confirmed.repair.available) assert.equal(confirmed.repair.adjusted, .5);
  const repairedFrame = deriveBridgeFrame({ preset: 'confirmed-low-split', operation: 'repair' });
  assert.deepEqual(repairedFrame.activeSourceSpans.map(span => span.excerptId), ['bridge-confirmed-action']);
});
test('six-decimal rounding does not fabricate a recoverable denominator', () => {
  const frame = example('rounded-zero');
  assert.equal(frame.oldRuleClose, 0.0000000476837158203125);
  assert.equal(frame.oldRuleStored, '0.000000');
  assert.equal(frame.fixture.close, 0);
  assert.equal(frame.ratio, null);
  assert.equal(frame.mapped, null);
  assert.equal(frame.technical, false);
  assert.equal(frame.repair.available, true);
  if (frame.repair.available) { assert.equal(frame.repair.adjusted, .05); assert.equal(frame.repair.totalAdjusted, .051000000000000004); assert.equal(frame.repair.ratio, 1.02); }
});
test('explicit repair requires actual supplied inputs and distinguishes missing CA input from no record', () => {
  for (const preset of ['missing-raw', 'missing-factor', 'missing-ca-input'] as const) {
    const frame = example(preset);
    assert.equal(frame.repair.available, false);
    assert.equal(frame.technical, false);
    assert.equal(frame.ratio, 1.02, 'observed prices are independent from the absent reconstruction inputs');
  }
  assert.match(example('missing-ca-input').reason, /absence is not an available no-record/);
  assert.equal(example('penny-ticks').repair.available, true);
  for (const bad of [0, -1, Infinity, NaN, null]) assert.equal(repairFromExplicitInputs(100, bad, 1.02).available, false);
  assert.equal(repairFromExplicitInputs(Number.MAX_VALUE, Number.MIN_VALUE, 1).available, false);
  assert.equal(repairFromExplicitInputs(100, 1, null).available, false);
  assert.equal(repairFromExplicitInputs(null, 1, 1.02).available, false);
});
test('cutoff, exact identity/session and independent discontinuity flags cannot be repaired by a plausible ratio', () => {
  for (const preset of ['known-late', 'missing-session', 'wrong-identity', 'ambiguous-lineage', 'ca-discontinuity', 'dividend-discontinuity'] as const) {
    const frame = example(preset);
    assert.equal(frame.ratio, 1.02);
    assert.equal(frame.numeric, true);
    assert.equal(frame.technical, false);
  }
  assert.equal(example('known-late').eligibleAtCutoff, false);
  assert.equal(example('wrong-identity').exactIdentity, false);
  assert.match(example('missing-session').reason, /No nearby session/);
  assert.match(example('ca-discontinuity').reason, /Corporate-action/);
  assert.match(example('dividend-discontinuity').reason, /Dividend/);
});
test('all operations use bounded captured source spans and deterministic readonly frames', () => {
  for (const preset of BRIDGE_PRESETS) for (const operation of BRIDGE_OPERATIONS) {
    const frame = deriveBridgeFrame({ preset, operation });
    assert.ok(Object.isFrozen(frame)); assert.ok(Object.isFrozen(frame.state)); assert.ok(Object.isFrozen(frame.fixture));
    assert.ok(Object.isFrozen(frame.activeSourceSpans));
    assert.ok(frame.explanation.length > 40);
    for (const span of frame.activeSourceSpans) assert.doesNotThrow(() => validateSourceSpan(span, sourceExcerpts));
    assert.deepEqual(frame, deriveBridgeFrame({ preset, operation }));
  }
  assert.match(deriveBridgeFrame({ preset: 'penny-ticks', operation: 'repair' }).explanation, /authored, not recovered Python/);
});
test('rights remain independent, readiness blocked, and archived technical/rights/usable values immutable', () => {
  const historicalIds = ['bridge-certification-01-source-boolean', 'bridge-certification-02-source-boolean', 'bridge-fully-usable', 'bridge-missing-session', 'bridge-linkage-01'];
  const before = JSON.stringify(historicalIds.map(id => claimById.get(id)));
  for (const preset of BRIDGE_PRESETS) {
    const frame = example(preset);
    assert.equal(frame.ready, false);
    assert.ok(!Object.keys(frame).some(key => /return|profit|pnl|sharpe|cagr|claim|historical/i.test(key)));
  }
  assert.equal(example('rights-denied').technical, true);
  assert.equal(example('rights-denied').rights, 'denied');
  assert.equal(example('positive').technical, true);
  assert.equal(example('positive').rights, 'unknown');
  assert.equal(JSON.stringify(historicalIds.map(id => claimById.get(id))), before);
  assert.deepEqual(historicalIds.slice(0, 3).map(id => claimById.get(id)?.value), [true, false, 0]);
});
test('normalized share URLs reject unsupported/duplicate inputs and preserve unrelated route state', () => {
  for (const query of ['', '?br.operation=qa&br.preset=positive', '?route=code&br.preset=rounded-zero#bridge-qa']) assert.equal(hasInvalidBridgeState(new URL(`https://example.test/research/cases/price-bridge/${query}`)), false);
  for (const query of ['?br.preset=private-row', '?br.operation=RunPython', '?br.preset=positive&br.preset=positive', '?br.unknown=path']) assert.equal(hasInvalidBridgeState(new URL(`https://example.test/research/cases/price-bridge/${query}`)), true);
  const input = new URL('https://example.test/research/cases/price-bridge/?route=code&br.unknown=x&br.preset=bad#bridge-vintage');
  assert.deepEqual(readBridgeState(input), DEFAULT_BRIDGE_STATE);
  const state = { preset: 'known-late', operation: 'vintage' } as const;
  const written = writeBridgeState(input, state);
  assert.deepEqual(readBridgeState(written), state);
  assert.equal(written.hash, '#bridge-vintage'); assert.equal(written.searchParams.get('route'), 'code'); assert.equal(written.searchParams.has('br.unknown'), false);
  assert.deepEqual(normalizeBridgeState({ preset: ['positive'], operation: { value: 'qa' } }), DEFAULT_BRIDGE_STATE);
});
