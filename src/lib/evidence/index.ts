import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { caseSchema, claimSchema, methodSchema, previewSchema, recordSchema, sourceSchema, specSchema, tableSchema } from './schemas';
import type { EvidenceValue, FigureSpec, EvidenceTable } from './schemas';
export type * from './schemas';

export const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
export const snapshotDate = '2026-10-11';
export const snapshotRoot = resolve(repositoryRoot, 'reviewed', snapshotDate);
const read = (path: string): unknown => JSON.parse(readFileSync(resolve(snapshotRoot, path), 'utf8'));
const object = (input: unknown): Record<string, unknown> => z.record(z.string(), z.unknown()).parse(input);
export const snapshot = object(JSON.parse(readFileSync(resolve(repositoryRoot, 'snapshots', `${snapshotDate}.json`), 'utf8')));
export const research = object(read('content/research.json'));
export const records = z.array(recordSchema).parse(research.records);
export const claims = z.array(claimSchema).parse(object(read('evidence/claims.json')).claims);
export const sources = z.array(sourceSchema).parse(object(read('evidence/manifest.json')).sources);
export const methodInventory = object(read('content/methods.json'));
export const methods = z.array(methodSchema).parse(methodInventory.examples).map(method => ({ ...method, slug: method.id.replace(/^method-/, '') }));
export const previews = z.array(previewSchema).parse(object(read('content/previews.json')).records);
export const project = object(read('content/project.json'));
export const methodAttribution = object(read('methods/ATTRIBUTION.json'));
export const cases = z.array(caseSchema).parse(JSON.parse(readFileSync(resolve(repositoryRoot, 'src/content/cases.json'), 'utf8'))).sort((a, b) => a.order - b.order);
export const recordById = new Map(records.map(record => [record.id, record]));
export const claimById = new Map(claims.map(claim => [claim.id, claim]));
export const sourceById = new Map(sources.map(source => [source.id, source]));
export const sourceDirectoryReferences = [...new Map(records.flatMap(record => record.source_index_references)
  .filter(reference => !sourceById.has(reference.source_id))
  .map(reference => [reference.source_id, { id: reference.source_id, source_relative_path: reference.source_relative_path, sha256: null,
    original_disposition: 'Excluded directory provenance label; no file artifact or hash is supplied in the reviewed snapshot.',
    recordIds: records.filter(record => record.source_index_references.some(item => item.source_id === reference.source_id)).map(record => record.id) }])).values()];
export const caseById = new Map(cases.map(case_ => [case_.id, case_]));
export const recordUrl = (id: string): string => {
  if (!recordById.has(id)) throw new Error(`Unknown record: ${id}`);
  return `/research/records/${encodeURIComponent(id)}/`;
};
export const claimUrl = (id: string, destination: 'case' | 'index' = 'case'): string => {
  const claim = claimById.get(id);
  if (!claim) throw new Error(`Unknown claim: ${id}`);
  return destination === 'index' ? `/evidence/claims/#claim-${id}` : `/research/cases/${claim.case_id}/#claim-${id}`;
};
export const sourceUrl = (id: string): string => {
  if (!sourceById.has(id) && !sourceDirectoryReferences.some(source => source.id === id)) throw new Error(`Unknown source: ${id}`);
  return `/evidence/sources/#${id}`;
};
export const methodUrl = (id: string): string => {
  const method = methods.find(method => method.id === id || method.slug === id);
  if (!method) throw new Error(`Unknown method: ${id}`);
  return `/methods/${method.slug}/`;
};
export const getCase = (slug: string) => {
  const found = caseById.get(slug);
  if (!found) throw new Error(`Unknown case: ${slug}`);
  return found;
};
export const caseClaims = (id: string) => claims.filter(claim => claim.case_id === id);
export const recordClaims = (id: string) => {
  const record = recordById.get(id);
  if (!record) throw new Error(`Unknown record: ${id}`);
  return record.evidence.claim_ids.map(id => {
    const claim = claimById.get(id);
    if (!claim) throw new Error(`Dangling record claim: ${id}`);
    return claim;
  });
};
export const caseRecords = (id: string) => getCase(id).primaryRecordIds.map(id => {
  const record = recordById.get(id);
  if (!record) throw new Error(`Dangling case record: ${id}`);
  return record;
});
export const claimRecords = (id: string) => records.filter(record => record.evidence.claim_ids.includes(id));
export const recordRelations = (id: string) => {
  const record = recordById.get(id);
  if (!record) throw new Error(`Unknown record: ${id}`);
  const ids = [...(record.parent_id ? [record.parent_id] : []), ...record.relations.map(relation => relation.record_id)];
  return [...new Set(ids)].map(id => {
    const related = recordById.get(id);
    if (!related) throw new Error(`Dangling record relation: ${id}`);
    return related;
  });
};

type Asset = { sourcePath: string; sourceSha256: string; outputUrl: string; role: string; sourceIds: string[]; notices: string[]; transformation: string };
const assetsPath = resolve(repositoryRoot, 'config/publication-assets.json');
const assetConfig = existsSync(assetsPath) ? JSON.parse(readFileSync(assetsPath, 'utf8')) as { assets: Asset[] } : { assets: [] };
export const publicationAssets = assetConfig.assets;
const assetMap = new Map(publicationAssets.map(asset => [asset.sourcePath, asset]));
export const assetUrl = (path: string): string => {
  const asset = assetMap.get(path);
  if (!asset) throw new Error(`Unapproved public evidence asset: ${path}`);
  return asset.outputUrl;
};
export const formatValue = (value: EvidenceValue | undefined, precision = 4): string => {
  if (value === null || value === undefined) return 'Unavailable';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return new Intl.NumberFormat('en-IN', { maximumFractionDigits: precision }).format(value);
  if (Array.isArray(value)) return value.map(item => formatValue(item, precision)).join(' · ');
  if (typeof value === 'object') return Object.entries(value).map(([key, item]) => `${key}: ${formatValue(item, precision)}`).join('; ');
  return value;
};
const columnLabels: Record<string, string> = {
  value: 'Recorded value', two_way_t: 'Two-way clustered t', reported_t: 'Reported t', reported_hac_t: 'Reported HAC t',
  reported_cash_t: 'Reported cash t', reported_ssf_t: 'Reported SSF t', reported_clustered_t: 'Reported clustered t',
  fillable_n: 'Fillable sample', filled_trades: 'Filled trades', source_boolean: 'Source boolean', complete: 'Complete fold',
  conjunctive_fold_pass: 'Conjunctive fold gate', sharpe: 'Sharpe', maximum_drawdown: 'Maximum drawdown',
  market_exposure: 'Market exposure', annualized_volatility: 'Annualized volatility',
  vol_matched_cagr_to_EMA20_50_UNFILTERED: 'CAGR scaled to EMA20/50 risk', raw_bootstrap_p: 'Raw bootstrap p',
};
export type FigureColumn = { key: string; label: string; unit: string };
export type Figure = { spec: FigureSpec; table: EvidenceTable; svgUrl: string; pngUrl: string; dataUrl: string; columns: FigureColumn[] };
export const figures: Figure[] = readdirSync(resolve(snapshotRoot, 'charts/specs')).filter(name => name.endsWith('.json')).sort().map(name => {
  const spec = specSchema.parse(read(`charts/specs/${name}`));
  const table = tableSchema.parse(read(spec.input_table));
  const keys = [...new Set(table.rows.flatMap(row => Object.keys(row)))].filter(key => !['label', 'claim_id', 'additional_claim_ids'].includes(key));
  const columns = keys.map(key => {
    const linkedClaims = table.rows.flatMap(row => {
      const id = key === 'value' ? row.claim_id : row.additional_claim_ids?.[key];
      return id ? [claimById.get(id)] : [];
    }).filter(claim => claim !== undefined);
    const units = [...new Set(linkedClaims.map(claim => claim.unit))];
    if (units.length > 1) throw new Error(`Mixed units in ${spec.id}/${key}`);
    return { key, label: columnLabels[key] ?? key, unit: units[0] ?? (key === 'value' ? table.units : 'unavailable') };
  });
  const output = (extension: string) => {
    const path = spec.outputs.find(output => output.path.endsWith(`.${extension}`))?.path;
    if (!path) throw new Error(`Missing ${extension} for ${spec.id}`);
    return assetUrl(path);
  };
  return { spec, table, svgUrl: output('svg'), pngUrl: output('png'), dataUrl: assetUrl(spec.input_table), columns };
});
export const figureById = new Map(figures.map(figure => [figure.spec.id, figure]));
export const caseFigures = (id: string) => getCase(id).figureIds.map(id => {
  const figure = figureById.get(id);
  if (!figure) throw new Error(`Dangling case figure: ${id}`);
  return figure;
});
export const syntheticDemo = existsSync(resolve(repositoryRoot, 'generated/synthetic-demo.json'))
  ? object(JSON.parse(readFileSync(resolve(repositoryRoot, 'generated/synthetic-demo.json'), 'utf8'))) : null;
export { renderCaseMarkdown, rewriteEvidenceLink } from './markdown';
