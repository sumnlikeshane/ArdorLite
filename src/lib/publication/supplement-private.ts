import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import config from '../../../config/evidence-supplements.json';
import { claimById, repositoryRoot, sourceById } from '../evidence';
import { inspectFold } from './gates';


export function loadPrivateSupplement() {
const descriptor = config.supplements.find(s=>s.id==='trend-fold-context-v1');
if (!descriptor) throw new Error('Missing approved Trend supplement descriptor');
const bytes = readFileSync(resolve(repositoryRoot,descriptor.path));
const trendSupplementHash = createHash('sha256').update(bytes).digest('hex');
if (trendSupplementHash!==descriptor.sha256) throw new Error('Immutable Trend supplement hash mismatch');
const approvalBytes = readFileSync(resolve(repositoryRoot,descriptor.approvalRecord));
if (createHash('sha256').update(approvalBytes).digest('hex')!==descriptor.approvalRecordSha256) throw new Error('Changed Trend approval record');
const proposalBytes=readFileSync(resolve(repositoryRoot,descriptor.proposalPath));
if (createHash('sha256').update(proposalBytes).digest('hex')!==descriptor.proposalSha256) throw new Error('Changed approved Trend proposal');
const proposed=JSON.parse(proposalBytes.toString('utf8')), raw=JSON.parse(bytes.toString('utf8'));
for (const field of ['sources','rows','definitions','locators','validation']) if (!isDeepStrictEqual(proposed[field],raw[field])) throw new Error(`Trend supplement ${field} differs from approved proposal`);
const rate = z.string().regex(/^-?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const rowSchema = z.object({
  period:z.object({id:z.string(),train_start:date,train_end:date,test_start:date,test_end:date,complete:z.boolean()}),
  rates:z.object({candidateNetCagr:rate,s0NetCagr:rate,candidateVolMatchedCagr:rate,emaNetCagr:rate}).strict(),
  existingSharpeClaimId:z.string(),existingDecisionClaimId:z.string(),recordedConditionFlags:z.array(z.boolean()).length(3),
  recordedOverallFlag:z.boolean(),csvLocators:z.object({V5:z.object({line:z.number().int(),columns:z.array(z.string())}),
    S0:z.object({line:z.number().int(),column:z.string()}),EMA:z.object({line:z.number().int(),column:z.string()})}),
}).catchall(z.unknown());
const schema = z.object({id:z.literal('trend-fold-context-v1'),contentRevision:z.literal('v1'),sourceProposalSha256:z.string(),
  sources:z.array(z.object({path:z.string(),sha256:z.string(),frozenSourceId:z.string().nullable(),matchesFrozenHash:z.boolean().nullable()})),
  rows:z.array(rowSchema).length(5),definitions:z.object({
    V0:z.object({maxPositions:z.number(),maxPositionFraction:rate}),
    V5:z.object({maxPositions:z.number(),maxPositionFraction:rate}),
    foldAggregation:z.object({completePeriods:z.number(),requiredPasses:z.number(),partialExcluded:z.literal(true)}),
  }).catchall(z.unknown()),
}).catchall(z.unknown());
const trendSupplement = schema.parse(JSON.parse(bytes.toString('utf8')));
const approval = JSON.parse(approvalBytes.toString('utf8'));
if (approval.localPilotUse!=='allowed' || approval.proposalSha256!==trendSupplement.sourceProposalSha256) throw new Error('Exact Trend local approval missing');
for (const source of trendSupplement.sources) if (source.frozenSourceId && sourceById.get(source.frozenSourceId)?.sha256!==source.sha256) throw new Error(`Supplement source identity drift: ${source.path}`);
const trendFoldRows = trendSupplement.rows.map(row=>{
  const claim=claimById.get(row.existingSharpeClaimId), archived=claimById.get(row.existingDecisionClaimId);
  if (claim?.case_id!=='trend-quality' || archived?.value!==row.recordedOverallFlag
    || claimById.get(`${row.existingSharpeClaimId}-complete`)?.value!==row.period.complete) throw new Error(`Supplement/canonical mismatch ${row.period.id}`);
  const inspection=inspectFold({role:'candidate',complete:row.period.complete,sharpe:Number(claim.value),archived:row.recordedOverallFlag,
    candidateCagr:row.rates.candidateNetCagr,s0Cagr:row.rates.s0NetCagr,matchedCagr:row.rates.candidateVolMatchedCagr,emaCagr:row.rates.emaNetCagr});
  if (row.period.train_end>=row.period.test_start) throw new Error(`Overlapping fold ${row.period.id}`);
  if (row.period.complete && (inspection.consistency!=='agrees' || inspection.conditions.some((state,i)=>(state==='passed')!==row.recordedConditionFlags[i]))) throw new Error(`Gate consistency disagreement ${row.period.id}`);
  return {...row,sharpe:claim,inspection};
});
if (new Set(trendFoldRows.map(r=>r.period.id)).size!==5 || trendFoldRows.filter(r=>r.period.complete).length!==Number(claimById.get('trend-complete-folds')!.value)
  || trendFoldRows.filter(r=>r.period.complete && r.inspection.evaluation==='passed').length!==Number(claimById.get('trend-v5-complete-passes')!.value)
  || trendSupplement.definitions.foldAggregation.requiredPasses!==Number(claimById.get('trend-complete-required')!.value)) throw new Error('Complete fold aggregation disagreement');

return { trendSupplementHash, trendSupplement, trendFoldRows };
}
