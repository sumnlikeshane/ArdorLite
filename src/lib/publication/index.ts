import { isPublicPublication } from './scope';
import { z } from 'zod';
import { cases, claims, claimById, claimUrl, figures, figureById } from '../evidence';
import { pilotStudies, metricExplanations, pilotFigureCaptions } from '../../content/explanations/pilots';
import { rolloutStudies, rolloutFigureCaptions } from '../../content/explanations/rollout';
import { trendFoldRows } from './supplement';

const studySchema = z.object({ id: z.enum(['atlas-ssf','momentum-v2','swing-autopsy','trend-quality','delivery-insider','price-bridge']), researchObject: z.string().min(30),
  question: z.string().min(20), mechanism: z.string().min(30), baseline: z.string().min(30), qualification: z.string().min(30),
  explanationHref: z.string().startsWith('/research/cases/'), comparisonHref: z.string().startsWith('/research/cases/'), evidencePath: z.string(),
}).strict();
export const studies = z.array(studySchema).parse([...pilotStudies,...rolloutStudies]);
export const studyById = new Map(studies.map(s => [s.id as string, s]));
export const figureCaptions = {...pilotFigureCaptions,...rolloutFigureCaptions};
const selectionRule=figures.find(f=>f.spec.id==='trend-selection')!.spec.extraction_rule;
const threshold=/Familywise pass threshold (\d+(?:\.\d+)?)/.exec(selectionRule);
if (!threshold) throw new Error('Missing canonical familywise threshold');
export const familywiseThreshold=Number(threshold[1]);
type Metric = keyof typeof metricExplanations;
const fieldMetrics: Record<string, Metric> = { sharpe: 'sharpe', maximum_drawdown: 'drawdown', market_exposure: 'exposure',
  annualized_volatility: 'volatility', vol_matched_cagr_to_EMA20_50_UNFILTERED: 'scaledCagr', raw_bootstrap_p: 'rawP',
  complete: 'complete', conjunctive_fold_pass: 'foldGate', source_boolean: 'certification' };
const figureMetrics: Record<string, Metric> = { 'trend-controls': 'cagr', 'trend-selection': 'familyP', 'trend-folds': 'sharpe',
  'bridge-invalid': 'count', 'bridge-linkage': 'count', 'bridge-certification': 'certification' };
const explicitMetrics: Record<string, Metric> = {
  'trend-direct20-coefficient': 'reference', 'trend-direct20-two-way-clustered-t': 'reference',
  'trend-direct20-bonferroni-p-value': 'reference', 'trend-v5-complete-passes': 'count', 'trend-complete-required': 'count',
  'trend-v5-gates': 'reference', 'trend-base-slippage': 'reference', 'trend-complete-folds': 'count',
  'trend-training-window': 'reference', 'trend-testing-start': 'reference', 'trend-selection-block': 'reference', 'trend-selection-resamples': 'reference',
  'bridge-rights-unusable-all': 'count', 'bridge-fully-usable': 'count', 'bridge-repair-rows': 'count', 'bridge-missing-session': 'count',
  'bridge-window': 'reference', 'bridge-cutoff': 'reference', 'bridge-vintage': 'reference',
};
const mappings = new Map<string, { metricId: Metric; title: string; figureId?: string; foldPeriodId?: string; foldCandidate?: boolean; exposureClaimId?: string }>();
const readableRows = (label: string) => Object.entries({
  S0_UNFILTERED: 'Unfiltered slow-trend baseline (S0)', EMA20_50_UNFILTERED: 'Unfiltered EMA timing comparator',
  V5_S0_Q67_DIVERSIFIED: 'Diversification-aware quality portfolio (V5)', NIFTYBEES_BH: 'Full-capital NIFTYBEES buy-and-hold reference',
}).reduce((text, [identity, meaning]) => text.replaceAll(identity, meaning), label);
for (const figure of figures.filter(f => pilotStudies.some(s=>s.id===f.spec.case_id))) {
  if (!figureCaptions[figure.spec.id]) throw new Error(`Missing pilot caption ${figure.spec.id}`);
  for (const row of figure.table.rows) {
    const fold = figure.spec.id==='trend-folds' ? trendFoldRows.find(f=>row.label.startsWith(`${f.period.id} —`)) : undefined;
    if (figure.spec.id==='trend-folds' && !fold && !isPublicPublication) throw new Error(`Missing fold period mapping ${row.label}`);
    const entries: [string, string][] = [['value', row.claim_id], ...Object.entries(row.additional_claim_ids ?? {})];
    for (const [field, id] of entries) {
      const metricId = field === 'value' ? figureMetrics[figure.spec.id] : fieldMetrics[field];
      if (!metricId || mappings.has(id)) throw new Error(`Missing/duplicate metric mapping ${id}/${field}`);
      mappings.set(id, { metricId, title: `${metricExplanations[metricId].title}: ${readableRows(row.label)}`, figureId: figure.spec.id,
        foldPeriodId:fold?.period.id ?? (figure.spec.id==='trend-folds' ? row.label.split(' —')[0] : undefined),foldCandidate:fold ? fold.existingSharpeClaimId===row.claim_id : row.label.includes('V5') });
      if (figure.spec.id==='trend-controls') mappings.get(id)!.exposureClaimId=row.additional_claim_ids?.market_exposure;
    }
  }
}
for (const [id, metricId] of Object.entries(explicitMetrics)) {
  const claim = claimById.get(id);
  if (!claim || mappings.has(id)) throw new Error(`Invalid explicit pilot mapping ${id}`);
  mappings.set(id, { metricId, title: claim.description.replaceAll('_', ' ') });
}
// Explicit S4 metric classification follows actual canonical units and table fields.
// Every non-table claim is listed; no new claim can inherit a legacy allowance.
const rolloutNonTable = new Set([
 'ssf-signal-event-count','ssf-actual-ssf-fill-count','ssf-actual-ssf-fill-rate','ssf-gate-minimum-actual-ssf-fill-rate',
 'ssf-gate-minimum-median-daily-book-capacity-cr-at-10pct','ssf-gate-minimum-primary-net-short-excess-two-way-t',
 'atlas-invalidated-fo-cells','ssf-gate-vector','ssf-holdout-opened','atlas-window','atlas-holdout-window',
 'momentum-rebalances','momentum-phase0-t-threshold','momentum-hac-lags','momentum-window',
 'swing-v1-events','swing-v1-fills','swing-v1-ci-low','swing-v1-ci-high','swing-v2-fills','swing-v2-ci-low','swing-v2-ci-high',
 'swing-v2-placebo-p','swing-time-giveback','swing-v2-bear-expectancy','swing-net-threshold','swing-window',
 'swing-policy-count','swing-policy-min','swing-policy-max','delivery-association','delivery-required-n',
 'delivery-validated-events','delivery-z-threshold','delivery-abs-floor','delivery-refractory','delivery-baseline','delivery-window','delivery-primary-horizon',
]);
const rolloutMetrics: Record<string,{title:string;meaning:string}> = {
 't statistic':{title:'Reported t statistic',meaning:'The statistic belongs to the named mean or coefficient and its saved inference specification. It is not a return, a probability, or proof that every other gate passed.'},
 'HAC t statistic':{title:'Reported HAC t statistic',meaning:'This saved statistic adjusts inference for serial dependence. Execution spread tests and daily residual-alpha tests have different targets; their significance is not interchangeable.'},
 'factor beta':{title:'Factor exposure',meaning:'This coefficient describes sensitivity within the named regression specification. Three-factor market exposure and four-factor momentum exposure cannot be added as one return decomposition.'},
 'annual percent':{title:'Annual return or residual alpha',meaning:'Read the row identity: raw book return describes the book; residual alpha is the return left after the specified factor controls. Positive raw return cannot replace the primary alpha gate.'},
 'basis points per filled event':{title:'Excess per filled event',meaning:'One basis point is one hundredth of a percentage point. The corrected futures comparison uses equal-event weighting and dated costs; the central-impact net line controls, not gross or statutory-only economics.'},
 'basis points over 10 sessions':{title:'Ten-session forward excess',meaning:'This is a rounded report transcription against the same-window equal-weight universe. Cash, settlement-proxy and interaction rows have distinct roles; association enrichment is not forward-return significance.'},
 'INR crore':{title:'Recorded capacity or capacity hurdle',meaning:'One crore is ten million rupees. Equal-notional capacity is binding for the equal-event book; ADV-sum capacity is a differently weighted diagnostic, not a substitute.'},
 'R':{title:'Trade risk units',meaning:'R divides trade profit or loss by initial planned risk; it is not percent portfolio return. Excursion is hindsight, uncertainty endpoints belong to their saved series, and an unavailable bear sample is not zero.'},
 'R per filled trade':{title:'Mean trade risk units',meaning:'This mean uses fixed initial risk rather than portfolio percent return. V1 and V2 differ in design, sample and tax convention. Primary year-net mean must remain separate from uncertainty/placebo stress diagnostics.'},
 'net R per filled trade':{title:'Whole-book policy net expectancy',meaning:'This is a saved in-sample whole-book V1 exit diagnostic, including costs and conservative per-win tax. Every policy mean remains negative; a better searched row is not forward confirmation.'},
 'fraction':{title:'Fill fraction or required fraction',meaning:'This canonical fraction is displayed without rescaling here: 1 means all eligible signals. Compare corrected actual futures fills with the frozen fillability hurdle; missing fills cannot be treated as executable.'},
 'gate vector':{title:'Recorded co-gate decisions',meaning:'Each boolean records its own frozen requirement. A passed gross test cannot override failed net, fillability, interaction, capacity or regime gates. No missing underlying premise is reconstructed.'},
 'boolean':{title:'Recorded holdout state',meaning:'This saved flag states whether this study opened its holdout. It is not a statement that other Ardor studies left overlapping calendar history unused.'},
 'p-value':{title:'Shuffled-date placebo p-value',meaning:'This tests the named null under the recorded shuffled-date procedure. The V2 diagnostic uses the per-winning-trade tax stress series, separate from the corrected primary year-net mean; a positive primary mean cannot replace it.'},
 'null standard deviations':{title:'Co-occurrence enrichment',meaning:'Distance from the within-symbol permutation null measures association, not future-return significance or an executable strategy.'},
 'z score':{title:'Archived delivery threshold',meaning:'This is the archived event-definition threshold, not a forward-return test. The dated source discrepancy and unresolved June execution identity remain attached.'},
 'percentage points':{title:'Archived delivery lift floor',meaning:'Percentage points describe a difference between ratios. The archived lift wording conflicts with the captured absolute-level predicate; no historical definition is inferred from current code.'},
 'date interval':{title:'Recorded study interval',meaning:'These are the saved study bounds, not a capture date or independent replication. Development, study-specific holdout and spent-history intervals retain their different eligibility.'},
 'year interval':{title:'Reconstructed study interval',meaning:'The report supplies years only. Exact endpoints remain unavailable; no dates are invented.'},
};
const countUnits=new Set(['cells','events','fills','rebalances','lags','trades','policy rows','calendar days','sessions']);
const rolloutTableClaims=new Map<string,string>();
for(const f of figures.filter(f=>rolloutStudies.some(s=>s.id===f.spec.case_id))) {
 if(!figureCaptions[f.spec.id]) throw new Error(`Missing rollout caption ${f.spec.id}`);
 for(const row of f.table.rows) for(const id of [row.claim_id,...Object.values(row.additional_claim_ids??{})]) {
  if(rolloutTableClaims.has(id)) throw new Error(`Duplicate rollout claim ${id}`);
  rolloutTableClaims.set(id,f.spec.id);
 }
}
for(const claim of claims.filter(c=>rolloutStudies.some(s=>s.id===c.case_id))) {
 const metric=rolloutMetrics[claim.unit] ?? (countUnits.has(claim.unit)?{title:'Recorded count or interval',meaning:'This count or interval belongs to the named population, rule or diagnostic. Construction counts, fillable samples, overlapping cells and required samples are different quantities; none is an independent-strategy count.'}:undefined);
 if(!metric || (!rolloutTableClaims.has(claim.id) && !rolloutNonTable.has(claim.id))) throw new Error(`Unreviewed rollout claim ${claim.id}/${claim.unit}`);
 mappings.set(claim.id,{metricId:'reference',title:claim.description.replaceAll('_',' ').replaceAll('MKT ew','Market').replaceAll('WML','Momentum factor'),figureId:rolloutTableClaims.get(claim.id)});
}
const decisionClaimIds: Record<string,string[]> = {
 'atlas-ssf':['atlas-gates-07','ssf-actual-ssf-fill-rate','ssf-gate-minimum-actual-ssf-fill-rate','ssf-economics-04','ssf-capacity-01','ssf-gate-minimum-median-daily-book-capacity-cr-at-10pct','ssf-gate-vector'],
 'momentum-v2':['momentum-phase0-t-threshold','momentum-execution-01','momentum-execution-02','momentum-execution-03','momentum-alpha-02','momentum-alpha-02-reported-hac-t'],
 'swing-autopsy':['swing-v1-fills','swing-expectancy-02','swing-expectancy-03','swing-expectancy-04','swing-v2-ci-low','swing-v2-ci-high','swing-v2-placebo-p','swing-v2-bear-expectancy'],
 'delivery-insider':['delivery-cash-01-reported-cash-t','delivery-cash-01-fillable-n','delivery-cash-03','delivery-cash-03-reported-cash-t','delivery-cash-03-fillable-n','delivery-interaction-02','delivery-interaction-03','delivery-interaction-03-reported-clustered-t'],
};
export function claimPresentation(id: string) {
  const claim = claimById.get(id);
  if (!claim) throw new Error(`Unknown claim ${id}`);
  const study = studyById.get(claim.case_id);
  if (!study) return undefined;
  const mapping = mappings.get(id);
  if (!mapping) throw new Error(`Unmapped pilot claim ${id}`);
  return { ...mapping, study, decisionInputs:(decisionClaimIds[claim.case_id]??[]).map(id=>claimById.get(id)!), figureContext:mapping.figureId && rolloutStudies.some(s=>s.id===claim.case_id)?figureById.get(mapping.figureId)!.spec.study_context:undefined, fold:isPublicPublication ? undefined : trendFoldRows.find(row=>row.period.id===mapping.foldPeriodId),
    measurementPeriod:!isPublicPublication && mapping.figureId==='trend-controls'?{start:trendFoldRows[0]!.period.test_start,end:trendFoldRows.at(-1)!.period.test_end}:undefined,
    exposureClaim:mapping.exposureClaimId?claimById.get(mapping.exposureClaimId):undefined,
    interpretation: rolloutStudies.some(s=>s.id===claim.case_id) ? (rolloutMetrics[claim.unit]?.meaning ?? 'This saved count or interval belongs to the named population or rule. Overlapping cells, construction counts, fillable samples and required samples remain separate; this is not an independent-strategy count.') : metricExplanations[mapping.metricId].meaning,
    comparisonHref: mapping.figureId ? `/research/cases/${claim.case_id}/#figure-${mapping.figureId}` : study.comparisonHref,
    verificationHref: claimUrl(id, 'index') };
}
export const publicationDependencies = studies.map(study => ({
  studyId: study.id, evidencePath: study.evidencePath,
  claimIds: claims.filter(c => c.case_id === study.id).map(c => c.id),
  sourceIds: [...new Set(claims.filter(c => c.case_id === study.id).map(c => c.source_artifact_id))],
  figureIds: cases.find(c => c.id === study.id)!.figureIds,
  qualificationId: `${study.id}-study-boundary`,
}));
// Exhaustively validate all pilot mappings on load. No new canonical identities.
for (const c of claims.filter(c => studyById.has(c.case_id))) claimPresentation(c.id);
