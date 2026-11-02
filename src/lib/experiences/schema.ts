import { z } from 'zod';

const Id = z.string().regex(/^[a-z][a-z0-9-]*$/);
const Sha256 = z.string().regex(/^[a-f0-9]{64}$/);
const Nonempty = z.string().trim().min(1);
export const SourceExcerptSchema = z.object({
  id: Id,
  repositoryLabel: Nonempty,
  path: Nonempty,
  symbol: Nonempty,
  versionContext: Nonempty,
  lineStart: z.number().int().positive(),
  lineEnd: z.number().int().positive(),
  text: z.string().min(1),
  sha256: Sha256,
  excerptSha256: Sha256,
  capturedAt: z.iso.date(),
  normalization: z.literal('exact-utf8-lf'),
  rightsNote: Nonempty,
  originalHead: z.string().regex(/^[a-f0-9]{40}$/),
  dirty: z.boolean(),
  historicalRelation: z.enum(['run-seal-match', 'historical-commit-match', 'current-only', 'mismatch', 'unrecovered']),
  historicalNote: Nonempty,
}).strict().refine(value => value.lineEnd >= value.lineStart, 'Reversed source line range');
export const SourceManifestSchema = z.object({
  schemaVersion: z.literal(1), excerpts: z.array(SourceExcerptSchema).min(1),
}).strict();
export type SourceExcerpt = z.infer<typeof SourceExcerptSchema>;
export type SourceManifest = z.infer<typeof SourceManifestSchema>;

export const ProjectAuthorshipSchema = z.object({
  schemaVersion: z.literal(1), confirmedAt: z.iso.date(), basis: Nonempty,
  ownership: Nonempty, developmentDuration: Nonempty,
  publicName: Nonempty.nullable(), publicRole: Nonempty.nullable(), biography: Nonempty.nullable(),
  contact: Nonempty.nullable(), profileUrls: z.array(z.url()).nullable(),
  upstreamBoundary: Nonempty, remainingAttribution: Nonempty,
}).strict();

export const EvidenceReferenceSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('claim'), id: Nonempty }).strict(),
  z.object({ kind: z.literal('table'), id: Nonempty, field: Nonempty.optional() }).strict(),
  z.object({ kind: z.literal('record'), id: Nonempty, field: z.string().startsWith('/') }).strict(),
  z.object({ kind: z.literal('source'), id: Nonempty }).strict(),
]);
export const OperationSchema = z.object({
  id: Id, question: Nonempty, interpretation: Nonempty,
  executionMode: z.enum(['browser-adaptation', 'authored-precomputed-trace', 'recorded-display', 'source-only']),
  dataOrigin: z.enum(['synthetic', 'reviewed-historical', 'current-source-metadata']),
  excerptIds: z.array(Id),
  evidenceRefs: z.array(EvidenceReferenceSchema),
  variables: z.array(z.object({ name: Nonempty, unit: Nonempty }).strict()),
}).strict().superRefine((operation, context) => {
  if (operation.dataOrigin === 'synthetic' && operation.evidenceRefs.length) {
    context.addIssue({ code: 'custom', message: 'Synthetic outputs cannot carry historical evidence references; place those in a separate recorded operation.' });
  }
  if (operation.dataOrigin === 'reviewed-historical' && operation.executionMode !== 'recorded-display' && operation.executionMode !== 'source-only') {
    context.addIssue({ code: 'custom', message: 'Historical results are readonly recorded displays.' });
  }
});
const Definition = z.object({
  id: Id, question: Nonempty,
  implementationStatus: z.enum(['entry-only', 'existing', 'partial', 'complete']),
  limitations: z.array(Nonempty).min(1), operations: z.array(OperationSchema),
}).strict();
// Each form has its own case identity. This contract does not impose a shared step/chart model.
export const ExperienceDefinitionSchema = z.discriminatedUnion('visualKind', [
  Definition.extend({ visualKind: z.literal('atlas-translation'), caseId: z.literal('atlas-ssf') }),
  Definition.extend({ visualKind: z.literal('momentum-questions'), caseId: z.literal('momentum-v2') }),
  Definition.extend({ visualKind: z.literal('swing-anatomy'), caseId: z.literal('swing-autopsy') }),
  Definition.extend({ visualKind: z.literal('trend-window'), caseId: z.literal('trend-quality') }),
  Definition.extend({ visualKind: z.literal('event-clocks'), caseId: z.literal('delivery-insider') }),
  Definition.extend({ visualKind: z.literal('bridge-pipeline'), caseId: z.literal('price-bridge') }),
  Definition.extend({ visualKind: z.literal('engineering-stations'), caseId: z.null() }),
]);
export type ExperienceDefinition = z.infer<typeof ExperienceDefinitionSchema>;

export const SourceSpanSchema = z.object({ excerptId: Id, lineStart: z.number().int().positive(), lineEnd: z.number().int().positive() }).strict();
