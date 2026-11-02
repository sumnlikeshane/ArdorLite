import assert from 'node:assert/strict';
import test from 'node:test';
import { deliveryDiscrepancy } from '../src/content/editorial-notes';
import { caseClaims, claimById, figureById, recordById, renderCaseMarkdown, rewriteEvidenceLink, formatValue } from '../src/lib/evidence/index';

test('unit-sensitive secondary figure cells use their own exact claims and units', () => {
  const ssf = figureById.get('ssf-economics')!;
  assert.equal(ssf.columns.find(column => column.key === 'value')!.unit, 'basis points per filled event');
  assert.equal(ssf.columns.find(column => column.key === 'two_way_t')!.unit, 't statistic');
  const trend = figureById.get('trend-controls')!.table.rows.find(row => row.label === 'V5_S0_Q67_DIVERSIFIED')!;
  assert.equal(trend.value, 4.303282556817045); // already converted display percent; never multiply again
  assert.equal(formatValue(trend.value), '4.3033');
});

test('control-row absence and partial-fold false remain different states', () => {
  const rows = figureById.get('trend-folds')!.table.rows;
  const control = rows.find(row => row.label.includes('EMA20_50_UNFILTERED'))!;
  assert.equal(Object.hasOwn(control, 'conjunctive_fold_pass'), false);
  const partial = rows.find(row => row.label.includes('wf5_partial') && row.label.includes('V5_'))!;
  assert.equal(partial.complete, false);
  assert.equal(partial.conjunctive_fold_pass, false);
});

test('all non-table claims retain canonical case membership, original nulls stay null', () => {
  assert.equal(caseClaims('trend-quality').length, 71);
  assert.equal(caseClaims('atlas-ssf').length, 34);
  assert.equal(recordById.get('screener_swing_v2_mechanical')!.original_verdict, 'KILL');
  assert.equal(formatValue(null), 'Unavailable');
  assert.equal(typeof claimById.get('bridge-certification-01-source-boolean')?.value, 'boolean');
});

test('case narrative turns archived comments into visible valid evidence citations and figure links', async () => {
  const html = await renderCaseMarkdown('atlas-ssf');
  assert.ok(html.includes('href="/research/cases/atlas-ssf/#claim-atlas-gates-01"'));
  assert.ok(html.includes('href="/research/cases/atlas-ssf/#figure-atlas-gates"'));
  assert.ok(!html.includes('<!-- claims:') && !html.includes('<img'));
  assert.throws(() => rewriteEvidenceLink('../../../../private.md', 'content/cases/atlas-ssf.md'));
  assert.throws(() => rewriteEvidenceLink('file:///private.md', 'content/cases/atlas-ssf.md'));
});

test('Delivery qualification follows the retained archived definition and separates capture from run identity', async () => {
  const html = await renderCaseMarkdown('delivery-insider');
  const archived = html.indexOf('an absolute lift of at least <strong>5 percentage points</strong>');
  const note = html.indexOf(`<aside id="${deliveryDiscrepancy.id}"`);
  const nextChapter = html.indexOf('<h2>Universe, implementation, benchmark and inference</h2>');
  assert.ok(archived > 0 && note > archived && note < nextChapter);
  assert.equal(html.match(new RegExp(`id="${deliveryDiscrepancy.id}"`, 'g'))?.length, 1);
  assert.ok(html.includes(deliveryDiscrepancy.title));
  assert.equal(deliveryDiscrepancy.date, '2026-10-31');
  assert.match(html, /does not subtract the trailing mean/);
  assert.match(html, /k most recent actionable disclosure dates/);
  assert.match(html, /Exact historical run-source binding remains unresolved/);
  assert.match(html, /recorded KILLED decision and null predictive interaction are unchanged/);
  for (const id of deliveryDiscrepancy.claimIds) assert.equal(claimById.get(id)?.case_id, deliveryDiscrepancy.caseId);
  const floor = claimById.get('delivery-abs-floor')!;
  assert.equal(floor.description, 'Primary absolute delivery lift floor');
  assert.equal(floor.value, 5);
  assert.equal(floor.unit, 'percentage points');
  assert.equal(floor.source_artifact_id, 'src-30e89f2139b6');
  assert.equal(caseClaims('delivery-insider').length, 28);
  assert.equal((await renderCaseMarkdown('price-bridge')).includes(deliveryDiscrepancy.id), false);
});
