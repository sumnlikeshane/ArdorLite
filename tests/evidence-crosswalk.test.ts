import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cases, records, claims, sources, figures, methods, publicationAssets, claimUrl, sourceUrl,
} from '../src/lib/evidence/index';
import { evidenceCrosswalk } from '../src/lib/evidence/crosswalk';
import { buildEvidenceCrosswalk, type RelationshipInput, type EntityKind } from '../src/lib/evidence/relationships';
import { methodCaseContext } from '../src/content/evidence-context';
import captureSelection from '../config/experience-sources.json';
import {walkthroughSource as walkthrough, readingManifest} from '../src/lib/experiences/captures';

// Actual selected identities are the fixture. Mutations affect only cloned data;
// no original checkout, reviewed input, capture, export or permission is written.
function fixture(): RelationshipInput {
  const excerpts = captureSelection.manifests.flatMap(path => {
    const manifest = readingManifest(path);
    const route = captureSelection.embeddedRoutes[path as keyof typeof captureSelection.embeddedRoutes].replace(/index\.html$/, '');
    return manifest.excerpts.map(excerpt => ({ id: excerpt.id, path: excerpt.path, sha256: excerpt.sha256,
      href: `/${route}#${excerpt.id}`, label: excerpt.symbol }));
  });
  excerpts.push(...walkthrough.excerpts.map(excerpt => ({ id: `walkthrough-${excerpt.id}`, path: excerpt.path,
    sha256: excerpt.fileSha256, href: `/research/walkthrough/#walkthrough-source-${excerpt.id}`, label: excerpt.title })));
  return structuredClone({ cases, records, claims, sources, figures: figures.map(figure => figure.spec), methods,
    assets: publicationAssets, excerpts, methodCases: methodCaseContext });
}

test('crosswalk preserves every entity identity and reciprocal relationship without mutating evidence', () => {
  const input = fixture(), before = structuredClone(input);
  const crosswalk = buildEvidenceCrosswalk(input);
  const counts = new Map<EntityKind, number>();
  for (const entity of crosswalk.entities.values()) counts.set(entity.kind, (counts.get(entity.kind) ?? 0) + 1);
  assert.deepEqual(Object.fromEntries(counts), {
    case: 6, record: 114, claim: 204, source: 201, directory: 17, figure: 18, method: 5, asset: 110, excerpt: 28,
  });
  assert.deepEqual(input, before);
  for (const relation of crosswalk.relations) {
    assert.strictEqual(crosswalk.get(relation.from.kind, relation.from.id), relation.from);
    assert.strictEqual(crosswalk.get(relation.to.kind, relation.to.id), relation.to);
    assert.ok(crosswalk.outgoing(relation.from.kind, relation.from.id, relation.kind).includes(relation));
    assert.ok(crosswalk.incoming(relation.to.kind, relation.to.id, relation.kind).includes(relation));
    assert.ok(relation.basis.length > 0);
  }
  assert.equal(crosswalk.relations.length, evidenceCrosswalk.relations.length);
  for (const claim of claims) {
    assert.equal(crosswalk.get('claim', claim.id).href, claimUrl(claim.id));
    assert.equal(claimUrl(claim.id, 'index'), `/evidence/claims/#claim-${claim.id}`);
    assert.equal(crosswalk.incoming('claim', claim.id, 'case-claim').length, 1);
    assert.equal(crosswalk.incoming('claim', claim.id, 'record-claim').length, 1);
    assert.equal(crosswalk.outgoing('claim', claim.id, 'claim-source')[0]?.to.id, claim.source_artifact_id);
  }
  for (const source of sources) assert.equal(crosswalk.get('source', source.id).href, sourceUrl(source.id));
  for (const figure of figures) {
    assert.deepEqual(crosswalk.outgoing('figure', figure.spec.id, 'figure-claim').map(edge => edge.to.id), figure.spec.claim_ids);
    assert.deepEqual(crosswalk.outgoing('figure', figure.spec.id, 'figure-source').map(edge => edge.to.id), figure.spec.source_artifact_ids);
    assert.equal(crosswalk.outgoing('figure', figure.spec.id, 'figure-asset').length, 5);
  }
  for (const asset of publicationAssets) {
    assert.equal(crosswalk.get('asset', asset.sourcePath).href, asset.outputUrl);
    assert.deepEqual(crosswalk.outgoing('asset', asset.sourcePath, 'asset-source').map(edge => edge.to.id), asset.sourceIds);
  }
  // Five reviewed aggregate/metadata derivatives declare no source IDs. Keep
  // their mapped availability without manufacturing original-file provenance.
  assert.equal(publicationAssets.filter(asset => asset.sourceIds.length === 0).length, 5);
});

test('all sources expose actual consumers, including the fifteen formerly disconnected claim sources', () => {
  const disconnected = sources.filter(source => claims.some(claim => claim.source_artifact_id === source.id)
    && !records.some(record => record.sources.some(reference => reference.source_id === source.id)));
  assert.equal(disconnected.length, 15);
  assert.equal(disconnected.filter(source => figures.some(figure => figure.spec.source_artifact_ids.includes(source.id))).length, 10);
  for (const source of sources) {
    const context = evidenceCrosswalk.sourceContext(source.id);
    const supportedClaims = claims.filter(claim => claim.source_artifact_id === source.id);
    assert.deepEqual(context.claims.map(claim => claim.id), supportedClaims.map(claim => claim.id));
    const owners = records.filter(record => record.evidence.claim_ids.some(id => supportedClaims.some(claim => claim.id === id)));
    assert.deepEqual(new Set(context.owningRecords.map(record => record.id)), new Set(owners.map(record => record.id)));
    for (const figure of context.figures) assert.ok(figures.find(item => item.spec.id === figure.id)?.spec.source_artifact_ids.includes(source.id));
  }
  for (const source of disconnected) {
    const context = evidenceCrosswalk.sourceContext(source.id);
    assert.ok(context.claims.length > 0 && context.owningRecords.length > 0 && context.cases.length > 0);
  }
  assert.equal(records.filter(record => record.evidence.claim_ids.length === 0).length, 105);
  for (const record of records.filter(record => record.evidence.claim_ids.length === 0)) {
    assert.deepEqual(evidenceCrosswalk.outgoing('record', record.id, 'record-claim'), []);
  }
  const bridge = evidenceCrosswalk.sourceContext('src-3f6afd0415da');
  assert.equal(bridge.claims.length, 13);
  assert.equal(bridge.figures.length, 3);
  assert.deepEqual(bridge.owningRecords.map(record => record.id), ['trend_following_price_bridge_certification_v1_1']);
});

test('secondary case context retains explicit direction and one-hop basis instead of inventing lineage', () => {
  const predecessor = evidenceCrosswalk.recordCases('momentum_xs_v1');
  assert.equal(predecessor.length, 1);
  assert.equal(predecessor[0]?.case.id, 'momentum-v2');
  assert.equal(predecessor[0]?.role, 'Related record');
  assert.equal(predecessor[0]?.via?.id, 'momentum_xs_v2');
  assert.match(predecessor[0]!.basis, /momentum_xs_v2 → momentum_xs_v1: later separate implementation/);
  assert.ok(evidenceCrosswalk.recordCases('momentum_xs_v2').every(context => context.role === 'Primary record'));
  const input = fixture();
  input.records.find(record => record.id === 'sweep_reclaim')!.relations.push({ type: 'related_test_fixture', record_id: 'momentum_xs_v1' });
  assert.deepEqual(buildEvidenceCrosswalk(input).recordCases('sweep_reclaim'), []);
  assert.ok(evidenceCrosswalk.incoming('record', 'ssf_translation_original_v1', 'record-relation')
    .some(edge => edge.from.id === 'atlas_clv_downside_continuation_v1' && edge.basis === 'canonical_corrected_version_of'));
});

test('capture joins require exact path and complete-file hash; unmatched captures remain separate', () => {
  const input = fixture();
  const expectedMatched = input.excerpts.filter(excerpt => sources.some(source => source.source_relative_path === excerpt.path && source.sha256 === excerpt.sha256));
  assert.equal(expectedMatched.length, 18);
  assert.equal(evidenceCrosswalk.unmatchedExcerptIds.length, 10);
  for (const excerpt of input.excerpts) {
    const edges = evidenceCrosswalk.outgoing('excerpt', excerpt.id, 'excerpt-source');
    const original = sources.find(source => source.source_relative_path === excerpt.path && source.sha256 === excerpt.sha256);
    assert.equal(edges.length, original ? 1 : 0);
    if (original) {
      assert.equal(edges[0]?.to.id, original.id);
      assert.match(edges[0]!.basis, /does not establish historical execution/);
    } else assert.ok(evidenceCrosswalk.unmatchedExcerptIds.includes(excerpt.id));
  }
  const matched = input.excerpts.find(excerpt => expectedMatched.some(item => item.id === excerpt.id))!;
  const originalHash = matched.sha256;
  matched.sha256 = '0'.repeat(64);
  const changedHash = buildEvidenceCrosswalk(input);
  assert.deepEqual(changedHash.outgoing('excerpt', matched.id, 'excerpt-source'), []);
  assert.ok(changedHash.unmatchedExcerptIds.includes(matched.id));
  matched.sha256 = originalHash;
  matched.path = 'unrecognized/current-source.py';
  assert.deepEqual(buildEvidenceCrosswalk(input).outgoing('excerpt', matched.id, 'excerpt-source'), []);
});

test('synthetic methods retain their exact conceptual sources and separately labelled authored case context', () => {
  for (const method of methods) {
    const sourceEdges = evidenceCrosswalk.outgoing('method', method.id, 'method-source');
    assert.equal(sourceEdges.length, method.source_artifacts.length);
    for (const edge of sourceEdges) assert.match(edge.basis, /Conceptual source.*not historical reproduction/);
    const context = evidenceCrosswalk.outgoing('method', method.id, 'method-case');
    assert.equal(context.length, 1);
    assert.equal(context[0]?.to.id, methodCaseContext[method.id]);
    assert.match(context[0]!.basis, /Authored teaching association; not research evidence/);
  }
  for (const entity of evidenceCrosswalk.entities.values()) {
    assert.ok(entity.href.startsWith('/'));
    assert.ok(!entity.href.startsWith('//') && !entity.href.includes('/Users/') && !entity.href.includes('file:'));
    if (['source', 'directory'].includes(entity.kind)) assert.match(entity.href, /^\/evidence\/sources\/#src-/);
    if (entity.kind === 'asset') assert.ok(publicationAssets.some(asset => asset.outputUrl === entity.href));
  }
});

test('a record can declare distinct roles for the same source without duplicating its identity or used-by record', () => {
  const input = fixture();
  const owner = input.records.find(record => record.sources.length)!;
  const original = owner.sources[0]!;
  owner.sources.push({ ...original, role: `${original.role}; additional explicit fixture role` });
  const crosswalk = buildEvidenceCrosswalk(input);
  const edges = crosswalk.outgoing('record', owner.id, 'record-source').filter(edge => edge.to.id === original.source_id);
  assert.equal(edges.length, 2);
  assert.notEqual(edges[0]!.basis, edges[1]!.basis);
  assert.equal(crosswalk.sourceContext(original.source_id).directRecords.filter(record => record.id === owner.id).length, 1);
});

const rejectCases: { name: string; mutate: (input: RelationshipInput) => void; error: RegExp }[] = [
  { name: 'duplicate source identity', mutate: input => input.sources.push(structuredClone(input.sources[0]!)), error: /Duplicate source identity/ },
  { name: 'duplicate record identity', mutate: input => input.records.push(structuredClone(input.records[0]!)), error: /Duplicate record identity/ },
  { name: 'duplicate claim identity', mutate: input => input.claims.push(structuredClone(input.claims[0]!)), error: /Duplicate claim identity/ },
  { name: 'duplicate figure identity', mutate: input => input.figures.push(structuredClone(input.figures[0]!)), error: /Duplicate figure identity/ },
  { name: 'duplicate asset identity', mutate: input => input.assets.push({ ...input.assets[0]!, outputUrl: '/downloads/fixture.json' }), error: /Duplicate asset identity/ },
  { name: 'duplicate asset destination', mutate: input => input.assets[1]!.outputUrl = input.assets[0]!.outputUrl, error: /Duplicate asset destination/ },
  { name: 'duplicate excerpt identity', mutate: input => input.excerpts.push(structuredClone(input.excerpts[0]!)), error: /Duplicate excerpt identity/ },
  { name: 'duplicate case claim join', mutate: input => input.cases[0]!.claimIds.push(input.cases[0]!.claimIds[0]!), error: /Duplicate case claims/ },
  { name: 'duplicate record claim join', mutate: input => { const owner = input.records.find(record => record.evidence.claim_ids.length)!; owner.evidence.claim_ids.push(owner.evidence.claim_ids[0]!); }, error: /Duplicate record-claim join/ },
  { name: 'duplicate record source join with identical role', mutate: input => { const owner = input.records.find(record => record.sources.length)!; owner.sources.push(structuredClone(owner.sources[0]!)); }, error: /Duplicate record-source join/ },
  { name: 'duplicate figure source join', mutate: input => input.figures[0]!.source_artifact_ids.push(input.figures[0]!.source_artifact_ids[0]!), error: /Unsupported figure\/source paths/ },
  { name: 'missing record relation target', mutate: input => input.records[0]!.relations.push({ type: 'fixture', record_id: 'missing-record' }), error: /Missing record target/ },
  { name: 'missing parent target', mutate: input => input.records[0]!.parent_id = 'missing-parent', error: /Missing record target/ },
  { name: 'missing claim source target', mutate: input => input.claims[0]!.source_artifact_id = 'src-missing', error: /Unsupported claim\/source identity/ },
  { name: 'missing figure derivative target', mutate: input => input.figures[0]!.input_table = 'evidence/tables/absent.json', error: /Unsupported figure\/asset provenance/ },
  { name: 'unsupported claim case membership', mutate: input => input.cases[0]!.claimIds.push(input.cases[1]!.claimIds[0]!), error: /Unsupported claim\/case join/ },
  { name: 'unsupported figure case membership', mutate: input => input.cases[0]!.figureIds.push(input.cases[1]!.figureIds[0]!), error: /Unsupported figure\/case join/ },
  { name: 'unowned claim', mutate: input => { const owner = input.records.find(record => record.evidence.claim_ids.includes(input.claims[0]!.id))!; owner.evidence.claim_ids = owner.evidence.claim_ids.filter(id => id !== input.claims[0]!.id); }, error: /Claim ownership cardinality/ },
  { name: 'multiply owned claim', mutate: input => input.records.find(record => record.evidence.claim_ids.length === 0)!.evidence.claim_ids.push(input.claims[0]!.id), error: /Claim ownership cardinality/ },
  { name: 'record source hash mismatch', mutate: input => input.records.find(record => record.sources.length)!.sources[0]!.sha256 = '0'.repeat(64), error: /Unsupported record\/source identity/ },
  { name: 'record artifact hash mismatch', mutate: input => input.records.find(record => record.evidence.artifact_hashes.length)!.evidence.artifact_hashes[0]!.sha256 = '0'.repeat(64), error: /Unsupported record artifact hash/ },
  { name: 'missing record artifact source', mutate: input => input.records.find(record => record.evidence.artifact_hashes.length)!.evidence.artifact_hashes[0]!.source_id = 'src-missing', error: /Unsupported record artifact hash/ },
  { name: 'claim source path mismatch', mutate: input => input.claims[0]!.source_path = 'unrecognized/source.md', error: /Unsupported claim\/source identity/ },
  { name: 'source-index path mismatch', mutate: input => { const record = input.records.find(record => record.source_index_references.some(ref => input.sources.some(source => source.id === ref.source_id)))!; const ref = record.source_index_references.find(ref => input.sources.some(source => source.id === ref.source_id))!; ref.source_relative_path = 'unrecognized/source.md'; }, error: /Source index path mismatch/ },
  { name: 'unsupported figure claim join', mutate: input => input.figures[0]!.claim_ids.push(input.claims.find(claim => claim.case_id !== input.figures[0]!.case_id)!.id), error: /Unsupported figure\/claim join/ },
  { name: 'figure source path mismatch', mutate: input => input.figures[0]!.source_paths[0] = 'unsupported/report.md', error: /Unsupported figure\/source paths/ },
  { name: 'duplicate figure source path', mutate: input => input.figures[0]!.source_paths.push(input.figures[0]!.source_paths[0]!), error: /Duplicate figure source paths/ },
  { name: 'figure derivative provenance mismatch', mutate: input => { const asset = input.assets.find(asset => asset.sourcePath === input.figures[0]!.input_table)!; asset.sourceIds = [input.sources.find(source => !input.figures[0]!.source_artifact_ids.includes(source.id))!.id]; }, error: /Unsupported figure\/asset provenance/ },
  { name: 'additional unrelated figure source', mutate: input => { const source = input.sources.find(source => !input.figures[0]!.source_artifact_ids.includes(source.id))!; input.figures[0]!.source_artifact_ids.push(source.id); input.figures[0]!.source_paths.push(source.source_relative_path); }, error: /Unsupported figure\/asset provenance/ },
  { name: 'unsupported directory identity', mutate: input => input.records[0]!.source_index_references.push({ source_id: 'src-not-derived', source_relative_path: 'example/', selected_for_public_export: false }), error: /Unsupported directory join/ },
  { name: 'unknown file masquerading as directory', mutate: input => input.records[0]!.source_index_references.push({ source_id: 'src-missing', source_relative_path: 'example/file.py', selected_for_public_export: false }), error: /Unsupported directory join/ },
  { name: 'unmapped original download', mutate: input => input.assets[0]!.outputUrl = '/originals/private.py', error: /Unsupported asset destination/ },
  { name: 'unsupported capture destination', mutate: input => input.excerpts[0]!.href = 'file:///private.py', error: /Unsupported excerpt destination/ },
  { name: 'method source hash mismatch', mutate: input => input.methods[0]!.source_artifacts[0]!.sha256 = '0'.repeat(64), error: /Unsupported method\/source identity/ },
  { name: 'missing authored method context', mutate: input => { delete input.methodCases[input.methods[0]!.id]; }, error: /Missing authored method context/ },
  { name: 'unknown authored method target', mutate: input => input.methodCases[input.methods[0]!.id] = 'missing-case', error: /Missing case target/ },
  { name: 'ambiguous exact method source identity', mutate: input => { const artifact = input.methods[0]!.source_artifacts[0]!; const original = input.sources.find(source => source.source_relative_path === artifact.source_path && source.sha256 === artifact.sha256)!; input.sources.push({ ...original, id: 'src-ambiguous-fixture' }); }, error: /Duplicate source path\/hash identity/ },
];
for (const fixtureCase of rejectCases) test(`crosswalk rejects ${fixtureCase.name}`, () => {
  const input = fixture();
  fixtureCase.mutate(input);
  assert.throws(() => buildEvidenceCrosswalk(input), fixtureCase.error);
});
