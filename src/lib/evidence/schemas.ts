import { z } from 'zod';

// These contracts describe the reviewed 2026-10-11 package, including absent
// optional fields. They deliberately do not invent a generic strategy schema.
const text = z.string();
const nullableText = text.nullable();
const hash = text.regex(/^[a-f0-9]{64}$/);
export type EvidenceValue = null | string | number | boolean | EvidenceValue[] | { [key: string]: EvidenceValue };
export const valueSchema: z.ZodType<EvidenceValue> = z.lazy(() => z.union([
  z.null(), text, z.number(), z.boolean(), z.array(valueSchema), z.record(text, valueSchema),
]));
export const reproductionSchema = z.enum(['executable_example', 'archived_result', 'report_transcription', 'private_inputs_required']);
export const statusSchema = z.enum(['tested_killed', 'structural_kill_before_returns', 'invalid_experiment', 'blocked_before_returns', 'stand_down', 'active_unresolved', 'superseded_before_data', 'discovery_map_only', 'design_only', 'research_infrastructure']);
export const claimSchema = z.object({
  id: text, case_id: text, description: text, value: valueSchema, unit: text,
  source_path: text, source_artifact_id: text, source_pointer: text,
  reproduction_level: reproductionSchema, caveats: z.array(text),
}).strict();
const metricSchema = claimSchema.pick({ description: true, value: true, unit: true, source_artifact_id: true })
  .extend({ claim_id: text, included_claims_path: text }).strict();
export const recordSchema = z.object({
  id: text, title: text, family: text, asset_class: text, instrument: nullableText,
  record_kind: text, catalog_cohort: text, parent_id: nullableText, version: nullableText,
  relations: z.array(z.object({ type: text, record_id: text }).strict()),
  hypothesis: text, proposed_mechanism: text, intended_observable_information: nullableText,
  timing: z.object({
    observation_clock: nullableText, publication_clock: nullableText, decision_clock: nullableText,
    entry_convention: nullableText, horizon: nullableText,
    research_dates: z.object({ opened_at: text, resolved_at: nullableText }).strict().nullable(),
  }).strict(),
  design: z.object({
    summary: text, universe: nullableText, sample: nullableText, study_window: nullableText,
    benchmark: nullableText, costs: nullableText, execution_rules: nullableText, inference_method: nullableText,
  }).strict(),
  original_verdict: nullableText, original_verdict_basis: text, archive_original_status: nullableText,
  status: statusSchema, controlling_gates: nullableText, final_outcome: text,
  source_disposition: text.optional(),
  evidence: z.object({
    canonical_metrics: z.array(metricSchema).nullable(), units: z.array(text).nullable(),
    evidence_maturity: text, extraction_method: text,
    artifact_hashes: z.array(z.object({ source_id: text, sha256: hash }).strict()),
    summary_path: text, claim_ids: z.array(text), metadata_basis: text.optional(),
    table_references: z.array(z.object({ data: text, accessible: text }).strict()).optional(),
    archived_display_transformations_reproducible: z.boolean().optional(),
  }).strict(),
  limitations: z.array(text), reproduction_level: reproductionSchema,
  reproduction: z.object({
    publicly_runnable: z.boolean(), archived_inspection: text,
    requires_unavailable_private_inputs: z.boolean().nullable(), missing_outputs: nullableText,
    historical_return_replication_level: reproductionSchema.optional(),
  }).strict(),
  publication: z.object({ state: text, attribution: text, review_result: text, original_material_rights: text, omitted: text }).strict(),
  sources: z.array(z.object({ source_id: text, source_relative_path: text, sha256: hash, role: text, public_reference: text, original_exported: z.literal(false) }).strict()),
  canonical_source_id: text,
  source_index_references: z.array(z.object({ source_id: text, source_relative_path: text, selected_for_public_export: z.boolean() }).strict()),
}).strict();
export const sourceSchema = z.object({
  id: text, source_relative_path: text, sha256: hash, size_bytes: z.number().int().nonnegative(),
  canonical_status: text, catalog_source_roles: z.array(text), observation_date: text,
  source_date: nullableText, source_date_basis: text, version_label: nullableText,
  version_basis: text, original_disposition: text, evidence_gaps: z.array(text),
}).strict();
export const rowSchema = z.object({
  label: text, value: valueSchema, claim_id: text,
  additional_claim_ids: z.record(text, text).optional(),
  two_way_t: z.number().optional(), reported_t: z.number().optional(),
  reported_hac_t: z.number().optional(), reported_cash_t: z.number().optional(),
  reported_ssf_t: z.number().optional(), reported_clustered_t: z.number().optional(),
  fillable_n: z.number().int().optional(), filled_trades: z.number().int().optional(),
  source_boolean: z.boolean().optional(), complete: z.boolean().optional(), conjunctive_fold_pass: z.boolean().optional(),
  sharpe: z.number().optional(), maximum_drawdown: z.number().optional(),
  market_exposure: z.number().optional(), annualized_volatility: z.number().optional(),
  vol_matched_cagr_to_EMA20_50_UNFILTERED: z.number().optional(), raw_bootstrap_p: z.number().optional(),
}).strict();
export const tableSchema = z.object({
  id: text, title: text, case_id: text, status: statusSchema, units: text,
  source_paths: z.array(text), source_artifact_ids: z.array(text), claim_ids: z.array(text),
  extraction_rule: text, study_context: z.record(text, z.union([nullableText, z.number()])), caveats: z.array(text), rows: z.array(rowSchema),
}).strict();
export const specSchema = tableSchema.extend({
  chart_id: text, input_table: text, input_sha256: hash,
  display_rounding: text, missing_values: text, transformation: text,
  outputs: z.array(z.object({ path: text, sha256: hash }).strict()), accessible_table: text,
}).strict();
export const methodSchema = z.object({
  id: text, title: text, path: text, changes: z.array(text), references: z.array(text), limitations: z.array(text), sha256: hash,
  source_artifacts: z.array(z.object({ source_path: text, sha256: hash }).strict()),
  authorship: text, label: text, reproduction_level: z.literal('executable_example'),
  source_dependencies: z.array(text), runtime_dependencies: z.array(text), publication_state: text, rights: text,
}).strict();
export const previewSchema = z.object({
  id: text, title: text, status: statusSchema, maturity: text, record_ids: z.array(text), summary: text,
  what_exists: z.array(text), what_remains: z.array(text), reproduction_level: reproductionSchema,
  evidence_reference: text, source_ids: z.array(text), excluded: z.array(text).optional(),
}).strict();
export const caseSchema = z.object({
  id: text, slug: text, title: text, subtitle: text, question: text, summary: text,
  outcomes: z.array(statusSchema), order: z.number().int(), primaryRecordIds: z.array(text), figureIds: z.array(text),
  claimIds: z.array(text), expectedClaims: z.number().int(), markdownPath: text, credit: nullableText,
}).strict();
export type ResearchRecord = z.infer<typeof recordSchema>;
export type Claim = z.infer<typeof claimSchema>;
export type Source = z.infer<typeof sourceSchema>;
export type FigureSpec = z.infer<typeof specSchema>;
export type EvidenceTable = z.infer<typeof tableSchema>;
export type TableRow = z.infer<typeof rowSchema>;
export type MethodExample = z.infer<typeof methodSchema>;
export type Preview = z.infer<typeof previewSchema>;
export type CasePresentation = z.infer<typeof caseSchema>;
