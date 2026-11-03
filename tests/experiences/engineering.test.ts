import { sourceTextAvailable } from '../../src/lib/experiences/captures';
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  DEFAULT_ENGINEERING_STATE, deriveEngineeringFrame, normalizeEngineeringState,
  readEngineeringState, writeEngineeringState, hasInvalidEngineeringState,
} from '../../src/lib/experiences/models/engineering';
import { sourceExcerpts } from '../../src/lib/experiences/registry';
import { validateSourceSpan } from '../../src/lib/experiences/provenance';
import { engineeringCasePaths } from '../../src/content/experiences/engineering';

test('a knowledge cutoff excludes later corrections while latest-known leaves support unknown', () => {
  const initial = deriveEngineeringFrame(DEFAULT_ENGINEERING_STATE);
  assert.equal(initial.observation.selected?.asOf, '2026-06-01');
  assert.equal(initial.observation.selected?.close, 100);

  const corrected = deriveEngineeringFrame({cutoff: '2026-06-04', gate: 'legacy-empty'});
  assert.equal(corrected.observation.selected?.asOf, '2026-06-03');
  assert.equal(corrected.observation.selected?.close, 101);
  assert.notEqual(corrected.observation.selected?.asOf, '2026-06-05');

  const latest = deriveEngineeringFrame({cutoff: 'latest', gate: 'legacy-empty'});
  assert.equal(latest.observation.selected?.close, 102);
  assert.equal(latest.observation.selected?.sourceId, null);
  assert.match(latest.observation.supportLabel, /^Unknown/);
  assert.match(latest.observation.explanation, /does not impose an explicit point-in-time/);
});

test('a cutoff before every vintage yields missingness rather than a fabricated zero observation', () => {
  const frame = deriveEngineeringFrame({cutoff: '2026-05-31', gate: 'legacy-empty'});
  assert.equal(frame.observation.selected, null);
  assert.match(frame.observation.selectedLabel, /^Unavailable/);
  assert.match(frame.observation.supportLabel, /^Unavailable/);
  assert.equal(frame.dataOrigin, 'synthetic');
  assert.equal(frame.observation.executionMode, 'browser-adaptation');
  assert.equal(frame.observation.dataOrigin, 'synthetic');
  assert.equal(frame.gate.executionMode, 'authored-precomputed-trace');
  assert.equal(frame.gate.dataOrigin, 'synthetic');
});

test('legacy comparison GO and a certification-capable call have independent meanings', () => {
  const comparison = deriveEngineeringFrame(DEFAULT_ENGINEERING_STATE).gate;
  assert.equal(comparison.verdict, 'GO');
  assert.equal(comparison.certificationCapable, false);
  assert.equal(comparison.profileName, null);

  const absentProfile = deriveEngineeringFrame({cutoff: 'latest', gate: 'missing-profile'}).gate;
  assert.equal(absentProfile.verdict, 'NO-GO');
  assert.equal(absentProfile.certificationCapable, true);
  assert.equal(absentProfile.profileName, null);
  assert.deepEqual(absentProfile.missingFields, ['certification_profile']);

  const missingEvidence = deriveEngineeringFrame({cutoff: 'latest', gate: 'missing-evidence'}).gate;
  assert.equal(missingEvidence.verdict, 'NO-GO');
  assert.equal(missingEvidence.profileName, 'teaching_history_v1');
  assert.deepEqual(missingEvidence.missingFields, ['available_years', 'required_years_min']);

  const complete = deriveEngineeringFrame({cutoff: 'latest', gate: 'complete-profile'}).gate;
  assert.equal(complete.verdict, 'GO');
  assert.equal(complete.certificationCapable, true);
  assert.deepEqual(complete.missingFields, []);
  assert.match(complete.explanation, /nothing about a historical strategy or source rights/);
});

test('invalid or hostile URL values normalize to the documented engineering state', () => {
  const input = new URL('https://example.test/engineering/?eng.cutoff=2026-02-31&eng.gate=GO&unrelated=keep#e4');
  assert.deepEqual(readEngineeringState(input), DEFAULT_ENGINEERING_STATE);
  assert.deepEqual(normalizeEngineeringState({cutoff: ['latest'], gate: {value: 'complete-profile'}}), DEFAULT_ENGINEERING_STATE);
  assert.deepEqual(normalizeEngineeringState({cutoff: null, gate: NaN}), DEFAULT_ENGINEERING_STATE);

  const selected = {cutoff: '2026-05-31', gate: 'missing-profile'} as const;
  const written = writeEngineeringState(input, selected);
  assert.deepEqual(readEngineeringState(written), {...DEFAULT_ENGINEERING_STATE, ...selected});
  assert.equal(written.searchParams.get('unrelated'), 'keep');
  assert.equal(written.hash, '#e4');
  assert.equal(input.searchParams.get('eng.gate'), 'GO');
});

test('changing one engineering teaching control does not rewrite the other output', () => {
  const initial = deriveEngineeringFrame(DEFAULT_ENGINEERING_STATE);
  const changedGate = deriveEngineeringFrame({...DEFAULT_ENGINEERING_STATE, gate: 'complete-profile'});
  const changedCutoff = deriveEngineeringFrame({...DEFAULT_ENGINEERING_STATE, cutoff: 'latest'});
  assert.deepEqual(changedGate.observation, initial.observation);
  assert.deepEqual(changedCutoff.gate, initial.gate);
  assert.equal(initial.observation.selected?.close, 100);
  assert.equal(initial.gate.certificationCapable, false);
  assert.ok(Object.isFrozen(initial));
  assert.ok(Object.isFrozen(initial.state));
});

test('query order and ordinary navigation do not trigger an invalid-input notice', () => {
  for (const query of [
    '', '?route=code#observation', '?eng.cutoff=latest',
    '?eng.gate=complete-profile&eng.cutoff=2026-06-04',
    '?route=code&eng.gate=complete-profile&eng.cutoff=2026-06-04#certification',
    '?eng%2Egate=complete-profile&eng%2Ecutoff=2026-06-04',
  ]) assert.equal(hasInvalidEngineeringState(new URL(`https://example.test/engineering/${query}`)), false, query);

  const reverseOrder = new URL('https://example.test/engineering/?eng.gate=complete-profile&eng.cutoff=2026-06-04');
  assert.deepEqual(readEngineeringState(reverseOrder), {...DEFAULT_ENGINEERING_STATE, cutoff: '2026-06-04', gate: 'complete-profile'});
  for (const query of [
    '?eng.cutoff=', '?eng.gate=GO', '?eng.cutoff=2026-02-31', '?eng.unknown=private.py',
    '?eng.cutoff=latest&eng.cutoff=latest', '?eng.gate=legacy-empty&eng.gate=complete-profile',
  ]) assert.equal(hasInvalidEngineeringState(new URL(`https://example.test/engineering/${query}`)), true, query);
});

test('registration retains the old question and rejects duplicates or incomplete typed bindings before append', () => {
  const accepted = deriveEngineeringFrame({registration: 'new-name'}).registration;
  assert.equal(accepted.name, 'fictional-quality-v2');
  assert.equal(accepted.retainedCount, 2);
  assert.match(accepted.outcome, /^Accepted/);
  const duplicate = deriveEngineeringFrame({registration: 'existing-name'}).registration;
  assert.equal(duplicate.name, 'fictional-quality-v1');
  assert.equal(duplicate.retainedCount, 1);
  assert.equal(duplicate.outcome, 'Rejected · duplicate name');
  const incomplete = deriveEngineeringFrame({registration: 'invalid-schema'}).registration;
  assert.equal(incomplete.retainedCount, 1);
  assert.match(incomplete.outcome, /incomplete threshold schema/);
  assert.deepEqual(incomplete.activeSourceSpans, [{excerptId: 'engineering-registration-typed', lineStart: 249, lineEnd: 253}]);
});

test('typed comparison known answers preserve numeric missingness, nonfiniteness, exact-null limitation and legacy semantics', () => {
  const expected = [
    ['numeric-ge', 'PASS', 'quality_score', 'None'],
    ['numeric-le', 'FAIL', 'drawdown', 'drawdown_ceiling'],
    ['missing-numeric', 'FAIL', 'quality_score', 'quality_floor'],
    ['nonfinite-numeric', 'FAIL', 'quality_score', 'quality_floor'],
    ['unknown-comparator', 'FAIL', 'Unavailable · no resolved binding', 'quality_bar'],
    ['exact-null', 'PASS', 'receipt', 'None'],
    ['exact-absent', 'PASS', 'receipt', 'None'],
    ['legacy-min', 'PASS', 'quality_score', 'None'],
  ] as const;
  for (const [comparison, verdict, metric, failed] of expected) {
    const frame = deriveEngineeringFrame({comparison}).comparison;
    assert.equal(frame.verdict, verdict, comparison);
    assert.equal(frame.requiredMetric, metric, comparison);
    assert.equal(frame.failedKey, failed, comparison);
    assert.equal(frame.executionMode, 'authored-precomputed-trace');
  }
  const absent = deriveEngineeringFrame({comparison: 'exact-absent'}).comparison;
  const explicitNull = deriveEngineeringFrame({comparison: 'exact-null'}).comparison;
  assert.notEqual(absent.actual, explicitNull.actual);
  assert.match(absent.explanation, /cannot distinguish|both a missing key/);
  assert.match(deriveEngineeringFrame({comparison: 'missing-numeric'}).comparison.actual, /Unavailable/);
  assert.match(deriveEngineeringFrame({comparison: 'legacy-min'}).comparison.semantics, /historical _min compatibility/);
});

test('ledger classification checks the earlier prefix even when the file has more lines; trial identity is a separate trace', () => {
  const intact = deriveEngineeringFrame({ledger: 'intact'}).ledger;
  assert.equal(intact.ok, true);
  assert.equal(intact.reason, 'chain intact');
  assert.equal(intact.expectedLines, 2);
  assert.equal(intact.actualLines, 2);
  assert.equal(intact.onceCreated, false);
  const append = deriveEngineeringFrame({ledger: 'unsealed-append'}).ledger;
  const changed = deriveEngineeringFrame({ledger: 'changed-history'}).ledger;
  assert.equal(append.actualLines, 3);
  assert.equal(changed.actualLines, 3);
  assert.equal(append.ok, false);
  assert.equal(changed.ok, false);
  assert.match(append.reason, /^un-sealed append/);
  assert.match(changed.reason, /^TAMPER/);
  assert.match(append.prefix, /match sealed prefix/);
  assert.match(changed.prefix, /disagree/);
  assert.equal(append.onceCreated, true);
  assert.equal(changed.onceCreated, false);
});

test('extended teaching URL states preserve old links, station fragments, independent selections and safe recovery', () => {
  const direct = readEngineeringState(new URL('https://example.test/engineering/#comparison'));
  assert.equal(direct.station, 'comparison');
  assert.equal(direct.gate, 'legacy-empty');
  const chosen = {...DEFAULT_ENGINEERING_STATE, registration: 'existing-name', comparison: 'exact-absent', ledger: 'changed-history', case: 'trend-quality', station: 'cases'} as const;
  const url = writeEngineeringState(new URL('https://example.test/engineering/?other=keep#cases'), chosen);
  assert.deepEqual(readEngineeringState(url), chosen);
  assert.equal(hasInvalidEngineeringState(url), false);
  assert.equal(url.searchParams.get('other'), 'keep');
  assert.equal(url.hash, '#cases');
  for (const query of ['?eng.station=unknown', '?eng.case=highest-return', '?eng.comparison=eval()', '?eng.ledger=intact&eng.ledger=intact']) {
    const invalid = new URL(`https://example.test/engineering/${query}`);
    assert.equal(hasInvalidEngineeringState(invalid), true);
    assert.deepEqual(readEngineeringState(invalid), DEFAULT_ENGINEERING_STATE);
  }
});

test('all new trace spans lie inside their exact captures; six paths retain distinct stops and version limits', () => {
  const states = [
    DEFAULT_ENGINEERING_STATE,
    {...DEFAULT_ENGINEERING_STATE, registration: 'invalid-schema', comparison: 'unknown-comparator', ledger: 'unsealed-append'},
    {...DEFAULT_ENGINEERING_STATE, registration: 'existing-name', comparison: 'exact-absent', ledger: 'changed-history'},
    {...DEFAULT_ENGINEERING_STATE, comparison: 'legacy-min'},
  ] as const;
  for (const state of states) {
    const frame = deriveEngineeringFrame(state);
    for (const operation of [frame.registration, frame.comparison, frame.ledger]) {
      assert.equal(operation.dataOrigin, 'synthetic');
      for (const span of operation.activeSourceSpans) assert.doesNotThrow(() => validateSourceSpan(span, sourceExcerpts));
    }
  }
  assert.equal(engineeringCasePaths.length, 6);
  assert.equal(new Set(engineeringCasePaths.map(path => path.id)).size, 6);
  assert.match(engineeringCasePaths.find(path => path.id === 'trend-quality')!.boundary, /seal does not match/);
  assert.match(engineeringCasePaths.find(path => path.id === 'delivery-insider')!.boundary, /not proven/);
  assert.match(engineeringCasePaths.find(path => path.id === 'price-bridge')!.decision, /technical=true; source-rights=false; zero/);
});

test('comparison and certification frames point to their corresponding captured source operations', () => {
  const legacy = deriveEngineeringFrame(DEFAULT_ENGINEERING_STATE);
  assert.deepEqual(legacy.gate.activeSourceSpans.map(span => span.excerptId), ['engineering-gate-legacy']);
  const certifying = deriveEngineeringFrame({...DEFAULT_ENGINEERING_STATE, gate: 'missing-profile'});
  assert.deepEqual(certifying.gate.activeSourceSpans.map(span => span.excerptId), ['engineering-gate-profile', 'engineering-gate-certify']);
  for (const frame of [legacy, certifying]) {
    for (const span of [...frame.observation.activeSourceSpans, ...frame.gate.activeSourceSpans]) {
      assert.doesNotThrow(() => validateSourceSpan(span, sourceExcerpts));
    }
  }
});

// Availability follows both the edition boundary and actual content, even if a
// manifest has a complete identity/hash but no captured body.
test('source inspection never promises captured text from a metadata identity alone', () => {
  const body = {text: 'synthetic fixture body\n'};
  assert.equal(sourceTextAvailable(body, false), true);
  assert.equal(sourceTextAvailable({code: 'synthetic fixture body\n'}, false), true);
  for (const publicEdition of [true, false]) {
    assert.equal(sourceTextAvailable({contentOmitted: true}, publicEdition), false);
    assert.equal(sourceTextAvailable({text: '   '}, publicEdition), false);
    assert.equal(sourceTextAvailable({...body, contentOmitted: true}, publicEdition), false);
  }
  assert.equal(sourceTextAvailable(body, true), false);
});
