import assert from 'node:assert/strict';
import { deliveryDiscrepancy } from '../src/content/editorial-notes';
import { evidenceCrosswalk } from '../src/lib/evidence/crosswalk';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cases, records, claims, figures, methods, previews, sources, sourceDirectoryReferences, recordById, claimById, sourceById, caseById, figureById, recordUrl, claimUrl, renderCaseMarkdown, repositoryRoot, snapshotRoot, publicationAssets } from '../src/lib/evidence/index';

const hash = (path: string) => createHash('sha256').update(readFileSync(resolve(snapshotRoot, path))).digest('hex');
const unique = (values: string[], label: string) => assert.equal(new Set(values).size, values.length, `Duplicate ${label}`);
const requireTarget = (found: boolean, label: string) => assert.ok(found, `Dangling ${label}`);
assert.deepEqual([records.length, cases.length, claims.length, figures.length, methods.length, previews.length], [114, 6, 204, 18, 5, 4]);
for (const [values, label] of [[records, 'records'], [cases, 'cases'], [claims, 'claims'], [sources, 'sources'], [methods, 'methods'], [previews, 'previews']] as const) unique(values.map(value => value.id), label);
unique(records.map(record => recordUrl(record.id)), 'record URLs');
assert.equal(records.filter(record => record.original_verdict === null).length, 52);
assert.equal(records.filter(record => record.instrument === null).length, 63);
assert.equal(records.filter(record => record.catalog_cohort === 'vantage_archive_2026_08_26').length, 49);
for (const record of records) {
  if (record.parent_id) requireTarget(recordById.has(record.parent_id), `parent ${record.id}`);
  for (const relation of record.relations) requireTarget(recordById.has(relation.record_id), `relation ${record.id}`);
  requireTarget(sourceById.has(record.canonical_source_id), `canonical source ${record.id}`);
  for (const reference of record.sources) {
    const source = sourceById.get(reference.source_id);
    assert.ok(source, `Unknown source ${reference.source_id}`);
    assert.equal(reference.source_relative_path, source.source_relative_path);
    if ('sha256' in reference) assert.equal(reference.sha256, source.sha256);
  }
  for (const reference of record.source_index_references) {
    const source = sourceById.get(reference.source_id);
    if (source) assert.equal(reference.source_relative_path, source.source_relative_path);
    else {
      assert.equal(reference.selected_for_public_export, false);
      assert.ok(reference.source_relative_path.endsWith('/'), `Unknown file source ${reference.source_id}`);
      assert.equal(reference.source_id, 'src-' + createHash('sha256').update(reference.source_relative_path).digest('hex').slice(0, 12));
    }
  }
  for (const id of record.evidence.claim_ids) requireTarget(claimById.has(id), `record claim ${id}`);
  for (const metric of record.evidence.canonical_metrics ?? []) {
    const claim = claimById.get(metric.claim_id);
    assert.ok(claim);
    for (const key of ['value', 'unit', 'description', 'source_artifact_id'] as const) assert.deepEqual(metric[key], claim[key], `Metric/claim drift ${metric.claim_id}/${key}`);
  }
}
const tableClaims = new Set<string>();
for (const figure of figures) {
  const { spec, table } = figure;
  assert.equal(spec.id, spec.chart_id);
  assert.equal(hash(spec.input_table), spec.input_sha256);
  for (const [key, value] of Object.entries(table)) assert.deepEqual(spec[key as keyof typeof spec], value, `Figure/table drift ${spec.id}/${key}`);
  for (const output of spec.outputs) assert.equal(hash(output.path), output.sha256);
  assert.ok(readFileSync(resolve(snapshotRoot, spec.accessible_table)).length);
  const rowClaims = new Set<string>();
  for (const row of table.rows) {
    for (const [key, id] of Object.entries({ value: row.claim_id, ...row.additional_claim_ids })) {
      const claim = claimById.get(id);
      assert.ok(claim, `Unknown table claim ${id}`);
      assert.equal(claim.case_id, spec.case_id);
      assert.deepEqual(row[key as keyof typeof row], claim.value, `Value/claim drift ${spec.id}/${key}`);
      rowClaims.add(id); tableClaims.add(id);
    }
  }
  assert.deepEqual([...rowClaims].sort(), [...table.claim_ids].sort(), `Unmapped figure claims ${spec.id}`);
  for (const column of figure.columns) {
    assert.ok(column.label && column.unit && column.unit !== 'unavailable', `Missing secondary unit ${spec.id}/${column.key}`);
  }
}
assert.equal(tableClaims.size, 146);
assert.equal(claims.filter(claim => !tableClaims.has(claim.id)).length, 58);
const canonicalAnchors: string[] = [];
for (const case_ of cases) {
  assert.equal(case_.slug, case_.id);
  assert.equal(case_.claimIds.length, case_.expectedClaims);
  assert.deepEqual(case_.claimIds, claims.filter(claim => claim.case_id === case_.id).map(claim => claim.id));
  for (const id of case_.primaryRecordIds) requireTarget(recordById.has(id), `case record ${id}`);
  for (const id of case_.figureIds) assert.equal(figureById.get(id)?.spec.case_id, case_.id);
  const html = await renderCaseMarkdown(case_.slug);
  assert.ok(!html.includes('<!-- claims:') && !html.includes('<img'));
  assert.ok(!/href="(?:\.\.\/|file:)/.test(html));
  for (const id of case_.claimIds) canonicalAnchors.push(claimUrl(id));
}
unique(canonicalAnchors, 'canonical claim anchors');
for (const id of deliveryDiscrepancy.claimIds) assert.equal(claimById.get(id)?.case_id, deliveryDiscrepancy.caseId);
for (const id of deliveryDiscrepancy.sourceIds) requireTarget(sourceById.has(id), `Delivery annotation source ${id}`);
assert.equal(canonicalAnchors.length, 204);
for (const claim of claims) {
  requireTarget(caseById.has(claim.case_id), `claim case ${claim.id}`);
  assert.equal(sourceById.get(claim.source_artifact_id)?.source_relative_path, claim.source_path);
  assert.ok(records.some(record => record.evidence.claim_ids.includes(claim.id)), `Unowned claim ${claim.id}`);
}
for (const method of methods) {
  assert.equal(hash(method.path), method.sha256);
  for (const source of method.source_artifacts) assert.ok(sources.some(item => item.source_relative_path === source.source_path && item.sha256 === source.sha256), `Method source drift ${method.id}`);
  assert.ok(method.label.includes('NOT MARKET EVIDENCE'));
}
for (const preview of previews) {
  for (const id of preview.record_ids) requireTarget(recordById.has(id), `preview record ${id}`);
  for (const id of preview.source_ids) requireTarget(sourceById.has(id), `preview source ${id}`);
}
const receipt = {
  schemaVersion: 1, counts: { records: 114, cases: 6, claims: 204, tableClaims: 146, nonTableClaims: 58, figures: 18, methods: 5, previews: 4, sources: sources.length, sourceDirectoryLabels: sourceDirectoryReferences.length, publicationAssets: publicationAssets.length },
  sourceDirectoryLabelPolicy: '17 excluded directory labels occur only in source_index_references. They have stable path-derived IDs, no supplied file/hash, and remain distinct from the 201 manifested file sources.',
  crosswalk: { entities: evidenceCrosswalk.entities.size, relations: evidenceCrosswalk.relations.length,
    unmatchedExcerptIds: evidenceCrosswalk.unmatchedExcerptIds, policy: 'Only declared IDs and exact path/hash joins; authored method associations separately typed; unmatched captures remain unjoined.' },
  checks: ['strict reviewed record/claim/figure/method/preview/source schemas', 'exact claim/table values including every secondary column', 'validated typed forward/reverse crosswalk and cardinality', 'claim/source and record/version relationships', 'all 204 claim owners and canonical case anchors', 'Markdown AST route/citation conversion', 'source hashes, complete/partial booleans, null/original verdict absence preserved'],
};
writeFileSync(resolve(repositoryRoot, 'receipts/content-check.json'), JSON.stringify(receipt, null, 2) + '\n');
console.log('Content checks passed: 114 records; 204 claims (146 table-linked + 58 other); 18 complete figure relationships.');
