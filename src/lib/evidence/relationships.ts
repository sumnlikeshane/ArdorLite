import { createHash } from 'node:crypto';
import type { CasePresentation, Claim, FigureSpec, MethodExample, ResearchRecord, Source } from './schemas';

export type EntityKind = 'case' | 'record' | 'claim' | 'source' | 'directory' | 'figure' | 'method' | 'asset' | 'excerpt';
export type Entity = { kind: EntityKind; id: string; label: string; href: string };
export type RelationKind = 'case-record' | 'case-claim' | 'case-figure' | 'claim-source' | 'record-parent' | 'record-relation'
  | 'record-source' | 'record-source-index' | 'record-canonical-source' | 'record-claim' | 'figure-source'
  | 'figure-claim' | 'figure-asset' | 'asset-source' | 'method-source' | 'method-asset' | 'method-case' | 'excerpt-source';
export type Relation = { kind: RelationKind; from: Entity; to: Entity; basis: string };
export type AssetReference = { sourcePath: string; outputUrl: string; sourceIds: string[]; role: string };
export type ExcerptReference = { id: string; path: string; sha256: string; href: string; label: string };
export type RelationshipInput = {
  cases: CasePresentation[]; records: ResearchRecord[]; claims: Claim[]; sources: Source[];
  figures: FigureSpec[]; methods: MethodExample[]; assets: AssetReference[];
  excerpts: ExcerptReference[]; methodCases: Record<string, string>;
};
const key = (kind: EntityKind, id: string) => `${kind}:${id}`;
const unique = (ids: string[], label: string) => {
  if (new Set(ids).size !== ids.length) throw new Error(`Duplicate ${label}`);
};

/** One deterministic crosswalk, derived only from declared IDs or exact path/hash pairs.
 * No similarity matching, transitive lineage or historical-execution inference. */
export function buildEvidenceCrosswalk(input: RelationshipInput) {
  const entities = new Map<string, Entity>();
  const relations: Relation[] = [];
  const forward = new Map<string, Relation[]>(), reverse = new Map<string, Relation[]>();
  const add = (kind: EntityKind, id: string, label: string, href: string) => {
    if (entities.has(key(kind, id))) throw new Error(`Duplicate ${kind} identity: ${id}`);
    const entity = { kind, id, label, href };
    entities.set(key(kind, id), entity);
    return entity;
  };
  const get = (kind: EntityKind, id: string): Entity => {
    const found = entities.get(key(kind, id));
    if (!found) throw new Error(`Missing ${kind} target: ${id}`);
    return found;
  };
  const source = (id: string) => entities.get(key('source', id)) ?? get('directory', id);
  const edgeKeys = new Set<string>();
  const link = (kind: RelationKind, from: Entity, to: Entity, basis: string) => {
    const id = `${kind}/${key(from.kind, from.id)}/${key(to.kind, to.id)}/${basis}`;
    if (edgeKeys.has(id)) throw new Error(`Duplicate ${kind} join: ${from.id}/${to.id}`);
    edgeKeys.add(id);
    const edge = { kind, from, to, basis };
    relations.push(edge);
    const append = (map: Map<string, Relation[]>, entity: Entity) => {
      const id = key(entity.kind, entity.id);
      map.set(id, [...(map.get(id) ?? []), edge]);
    };
    append(forward, from); append(reverse, to);
  };
  const outgoing = (kind: EntityKind, id: string, relation?: RelationKind) => {
    get(kind, id);
    return (forward.get(key(kind, id)) ?? []).filter(edge => !relation || edge.kind === relation);
  };
  const incoming = (kind: EntityKind, id: string, relation?: RelationKind) => {
    get(kind, id);
    return (reverse.get(key(kind, id)) ?? []).filter(edge => !relation || edge.kind === relation);
  };
  const distinct = (values: Entity[]) => [...new Map(values.map(entity => [key(entity.kind, entity.id), entity])).values()];
  for (const item of input.cases) add('case', item.id, item.title, `/research/cases/${item.slug}/`);
  for (const item of input.records) add('record', item.id, item.title, `/research/records/${encodeURIComponent(item.id)}/`);
  for (const item of input.claims) add('claim', item.id, item.description, `${get('case', item.case_id).href}#claim-${item.id}`);
  for (const item of input.sources) add('source', item.id, `${item.id} · ${item.source_relative_path.split('/').at(-1)}`, `/evidence/sources/#${item.id}`);
  unique(input.sources.map(item => `${item.source_relative_path}/${item.sha256}`), 'source path/hash identity');
  const directories = new Map<string, string>();
  for (const item of input.records.flatMap(record => record.source_index_references)) {
    const file = input.sources.find(source => source.id === item.source_id);
    if (file) {
      if (file.source_relative_path !== item.source_relative_path) throw new Error(`Source index path mismatch: ${item.source_id}`);
    } else {
      const expected = 'src-' + createHash('sha256').update(item.source_relative_path).digest('hex').slice(0, 12);
      if (!item.source_relative_path.endsWith('/') || item.selected_for_public_export || item.source_id !== expected) {
        throw new Error(`Unsupported directory join: ${item.source_id}`);
      }
      if (directories.has(item.source_id) && directories.get(item.source_id) !== item.source_relative_path) throw new Error(`Conflicting directory: ${item.source_id}`);
      directories.set(item.source_id, item.source_relative_path);
    }
  }
  for (const [id, path] of directories) add('directory', id, path, `/evidence/sources/#${id}`);
  for (const item of input.figures) add('figure', item.id, item.title, `${get('case', item.case_id).href}#figure-${item.id}`);
  for (const item of input.methods) add('method', item.id, item.title, `/methods/${item.id.replace(/^method-/, '')}/`);
  unique(input.assets.map(asset => asset.outputUrl), 'asset destination');
  for (const item of input.assets) {
    if (!item.outputUrl.startsWith('/downloads/') || item.outputUrl.includes('..')) throw new Error(`Unsupported asset destination: ${item.outputUrl}`);
    add('asset', item.sourcePath, `${item.sourcePath} · ${item.role.replaceAll('_', ' ')}`, item.outputUrl);
  }
  for (const item of input.excerpts) {
    if (!/^\/(engineering\/|research\/(cases\/price-bridge\/|walkthrough\/))#[a-z0-9-]+$/.test(item.href)) throw new Error(`Unsupported excerpt destination: ${item.id}`);
    add('excerpt', item.id, item.label, item.href);
  }
  for (const item of input.cases) {
    unique(item.primaryRecordIds, `case records ${item.id}`); unique(item.claimIds, `case claims ${item.id}`); unique(item.figureIds, `case figures ${item.id}`);
    for (const id of item.primaryRecordIds) link('case-record', get('case', item.id), get('record', id), 'Declared primary record');
    for (const id of item.claimIds) {
      if (input.claims.find(claim => claim.id === id)?.case_id !== item.id) throw new Error(`Unsupported claim/case join: ${id}`);
      link('case-claim', get('case', item.id), get('claim', id), 'Declared canonical case');
    }
    for (const id of item.figureIds) {
      if (input.figures.find(figure => figure.id === id)?.case_id !== item.id) throw new Error(`Unsupported figure/case join: ${id}`);
      link('case-figure', get('case', item.id), get('figure', id), 'Declared case figure');
    }
  }
  for (const item of input.records) {
    const record = get('record', item.id);
    if (item.parent_id) link('record-parent', record, get('record', item.parent_id), 'parent_id');
    for (const relation of item.relations) link('record-relation', record, get('record', relation.record_id), relation.type);
    for (const id of item.evidence.claim_ids) link('record-claim', record, get('claim', id), 'Record owns reviewed claim');
    link('record-canonical-source', record, get('source', item.canonical_source_id), 'Canonical source in reviewed record');
    for (const ref of item.sources) {
      const original = input.sources.find(source => source.id === ref.source_id);
      if (!original || original.source_relative_path !== ref.source_relative_path || original.sha256 !== ref.sha256) throw new Error(`Unsupported record/source identity: ${ref.source_id}`);
      link('record-source', record, get('source', ref.source_id), ref.role);
    }
    for (const ref of item.source_index_references) link('record-source-index', record, source(ref.source_id), 'Source index reference');
    for (const artifact of item.evidence.artifact_hashes) {
      if (input.sources.find(source => source.id === artifact.source_id)?.sha256 !== artifact.sha256) throw new Error(`Unsupported record artifact hash: ${item.id}/${artifact.source_id}`);
    }
  }
  for (const item of input.claims) {
    const original = input.sources.find(source => source.id === item.source_artifact_id);
    if (!original || original.source_relative_path !== item.source_path) throw new Error(`Unsupported claim/source identity: ${item.id}`);
    if (incoming('claim', item.id, 'case-claim').length !== 1 || incoming('claim', item.id, 'record-claim').length !== 1) throw new Error(`Claim ownership cardinality: ${item.id}`);
    link('claim-source', get('claim', item.id), get('source', original.id), item.source_pointer);
  }
  for (const item of input.figures) {
    const figure = get('figure', item.id);
    if (incoming('figure', item.id, 'case-figure').length !== 1) throw new Error(`Figure case cardinality: ${item.id}`);
    unique(item.source_paths, `figure source paths ${item.id}`);
    const paths = item.source_artifact_ids.map(id => input.sources.find(source => source.id === id)?.source_relative_path);
    if ([...paths].sort().join('\n') !== [...item.source_paths].sort().join('\n')) throw new Error(`Unsupported figure/source paths: ${item.id}`);
    for (const id of item.claim_ids) {
      const claim = input.claims.find(claim => claim.id === id);
      if (!claim || claim.case_id !== item.case_id || !item.source_artifact_ids.includes(claim.source_artifact_id)) throw new Error(`Unsupported figure/claim join: ${item.id}/${id}`);
      link('figure-claim', figure, get('claim', id), 'Exact reviewed table claim');
    }
    for (const id of item.source_artifact_ids) link('figure-source', figure, get('source', id), 'Declared figure/table provenance');
    for (const path of [item.input_table, item.accessible_table, `charts/specs/${item.id}.json`, ...item.outputs.map(output => output.path)]) {
      const asset = input.assets.find(asset => asset.sourcePath === path);
      if (!asset || [...asset.sourceIds].sort().join('\n') !== [...item.source_artifact_ids].sort().join('\n')) throw new Error(`Unsupported figure/asset provenance: ${item.id}/${path}`);
      link('figure-asset', figure, get('asset', path), 'Mapped reviewed figure derivative');
    }
  }
  for (const item of input.assets) for (const id of item.sourceIds) link('asset-source', get('asset', item.sourcePath), get('source', id), 'Export map provenance; no original-file availability implied');
  const exactSource = (path: string, hash: string) => {
    const found = input.sources.filter(source => source.source_relative_path === path && source.sha256 === hash);
    if (found.length > 1) throw new Error(`Ambiguous source path/hash: ${path}`);
    return found[0];
  };
  for (const item of input.methods) {
    for (const artifact of item.source_artifacts) {
      const original = exactSource(artifact.source_path, artifact.sha256);
      if (!original) throw new Error(`Unsupported method/source identity: ${item.id}`);
      link('method-source', get('method', item.id), get('source', original.id), 'Conceptual source; exact path/hash, not historical reproduction');
    }
    link('method-asset', get('method', item.id), get('asset', item.path), 'Independent synthetic example download');
    if (!Object.hasOwn(input.methodCases, item.id)) throw new Error(`Missing authored method context: ${item.id}`);
  }
  for (const [id, caseId] of Object.entries(input.methodCases)) link('method-case', get('method', id), get('case', caseId), 'Authored teaching association; not research evidence');
  const unmatchedExcerptIds: string[] = [];
  for (const item of input.excerpts) {
    const original = exactSource(item.path, item.sha256);
    if (original) link('excerpt-source', get('excerpt', item.id), get('source', original.id), 'Exact captured file path/hash; capture does not establish historical execution');
    else unmatchedExcerptIds.push(item.id);
  }
  const recordCases = (id: string) => {
    const primary = incoming('record', id, 'case-record').map(edge => ({ case: edge.from, role: 'Primary record', via: null as Entity | null, basis: edge.basis }));
    const related = [...outgoing('record', id), ...incoming('record', id)].filter(edge => ['record-parent', 'record-relation'].includes(edge.kind));
    const secondary = related.flatMap(edge => {
      const other = edge.from.id === id ? edge.to : edge.from;
      return incoming('record', other.id, 'case-record').filter(candidate => !primary.some(context => context.case.id === candidate.from.id)).map(candidate => ({
        case: candidate.from, role: 'Related record', via: other,
        basis: `${edge.from.id} → ${edge.to.id}: ${edge.basis.replaceAll('_', ' ')}`,
      }));
    });
    return [...primary, ...secondary];
  };
  const sourceContext = (id: string) => {
    const entity = source(id);
    const uses = incoming(entity.kind, id);
    const claimEntities = uses.filter(edge => edge.from.kind === 'claim').map(edge => edge.from);
    const figureEntities = uses.filter(edge => edge.kind === 'figure-source').map(edge => edge.from);
    const owningRecords = distinct(claimEntities.flatMap(claim => incoming('claim', claim.id, 'record-claim').map(edge => edge.from)));
    const directRecords = distinct(uses.filter(edge => edge.from.kind === 'record').map(edge => edge.from));
    const caseEntities = distinct([...claimEntities.flatMap(claim => incoming('claim', claim.id, 'case-claim').map(edge => edge.from)),
      ...figureEntities.flatMap(figure => incoming('figure', figure.id, 'case-figure').map(edge => edge.from)),
      ...directRecords.flatMap(record => incoming('record', record.id, 'case-record').map(edge => edge.from))]);
    return { claims: claimEntities, figures: figureEntities, owningRecords, directRecords, cases: caseEntities,
      methods: uses.filter(edge => edge.kind === 'method-source').map(edge => edge.from),
      assets: uses.filter(edge => edge.kind === 'asset-source').map(edge => edge.from),
      excerpts: uses.filter(edge => edge.kind === 'excerpt-source').map(edge => edge.from) };
  };
  return { entities, relations, get, outgoing, incoming, distinct, recordCases, sourceContext, unmatchedExcerptIds };
}
