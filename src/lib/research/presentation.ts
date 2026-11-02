import { isPublicPublication } from '../publication/scope';
import { z } from 'zod';
import { caseById, caseClaims, claimById, claimUrl, figureById, formatValue } from '../evidence';
import { familywiseThreshold } from '../publication';
import { trendFoldRows } from '../publication/supplement';

// Presentation references resolve existing evidence. This module owns no research values.
const processSchema = z.object({ kind: z.literal('process'), title: z.string(), note: z.string(),
  steps: z.array(z.object({ label: z.string(), text: z.string() })).min(2) });
const rolesSchema = z.object({ kind: z.literal('roles'), title: z.string(),
  rows: z.array(z.object({ label: z.string(), purpose: z.string() })).min(2) });
const findingSchema = z.object({ kind: z.literal('finding'), title: z.string(), text: z.string() });
export const compositionSchema = z.object({
  caseId: z.string(), headline: z.string(), motivation: z.string(), answer: z.string(), scope: z.string(), opening: z.enum(['split', 'text']),
  chapters: z.array(z.object({ id: z.string().regex(/^[a-z][a-z0-9-]*$/), number: z.string(),
    title: z.string(), navLabel: z.string(), layout: z.enum(['split', 'reading', 'wide']),
    paragraphs: z.array(z.string()).min(1),
    supportAfter: z.number().int().positive().optional(),
    support: z.discriminatedUnion('kind', [processSchema, rolesSchema, findingSchema]).optional(),
    figureId: z.string().optional(),
  })).min(1),
}).strict();
export type ResearchComposition = z.infer<typeof compositionSchema> & {claimCount:number};
export function defineComposition(input: z.infer<typeof compositionSchema>) {
  const composition = compositionSchema.parse(input);
  const owner = caseById.get(composition.caseId);
  if (!owner) throw new Error(`Unknown composition case ${composition.caseId}`);
  if (new Set(composition.chapters.map(c => c.id)).size !== composition.chapters.length) throw new Error('Duplicate chapter anchor');
  for (const chapter of composition.chapters) {
    if (chapter.figureId && figureById.get(chapter.figureId)?.spec.case_id !== owner.id) throw new Error(`Wrong composition figure ${chapter.figureId}`);
    for (const html of chapter.paragraphs) for (const match of html.matchAll(/#claim-([a-zA-Z0-9_-]+)/g)) {
      if (claimById.get(match[1]!)?.case_id !== owner.id) throw new Error(`Wrong composition claim ${match[1]}`);
    }
  }
  return {...composition, claimCount:caseClaims(owner.id).length};
}
export function claimText(id: string, precision = 2, suffix = ''): string {
  const claim = claimById.get(id);
  if (!claim) throw new Error(`Unknown presentation claim ${id}`);
  return (typeof claim.value === 'number'
    ? new Intl.NumberFormat('en-IN', {minimumFractionDigits: precision, maximumFractionDigits: precision}).format(claim.value)
    : formatValue(claim.value)) + suffix;
}
export const claimLink = (id: string, precision = 2, suffix = '', label?: string) =>
  `<a href="${claimUrl(id)}">${label ?? claimText(id, precision, suffix)}</a>`;

export interface ComparisonRow { label: string; value: number | null; claimId: string; context?: string; }
export interface ComparisonPanel { id: string; label: string; title: string; unit: string; description: string;
  minimum: number; maximum: number; ticks: number[]; threshold?: number; rows: ComparisonRow[]; }
export function comparisonPanels(figureId: string): ComparisonPanel[] {
  const figure = figureById.get(figureId);
  if (!figure) throw new Error(`Unknown comparison figure ${figureId}`);
  const rows = figure.table.rows;
  const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;
  if (figureId === 'trend-controls') {
    const labels = ['S0 · unfiltered trend', 'EMA20/50 · unfiltered timing', 'V5 · quality + diversification', 'NIFTYBEES · buy-and-hold'];
    return [
      { id: 'growth', label: 'Recorded growth', title: 'Growth, with exposure in view', unit: '% per year', minimum: 0, maximum: 12, ticks: [0, 4, 8, 12],
        description: 'Net annual compound growth, 2018-01-01–2026-06-05. Average invested capital is shown beside each row; buy-and-hold has much greater exposure and volatility.',
        rows: rows.map((r, i) => ({label: labels[i]!, value: numeric(r.value), claimId: r.claim_id,
          context: `${formatValue(r.market_exposure, 2)}% exposure · ${formatValue(r.annualized_volatility, 2)}% annual volatility`})) },
      { id: 'risk-cap', label: 'At EMA risk', title: 'Growth with the saved EMA risk cap', unit: '% per year', minimum: 0, maximum: 5, ticks: [0, 1, 2, 3, 4, 5],
        description: 'Saved annual growth after capping daily-return volatility at unfiltered EMA’s level. Risk is reduced when necessary and never scaled up. This view does not calculate a new return series.',
        rows: rows.map((r, i) => ({label: labels[i]!, value: numeric(r.vol_matched_cagr_to_EMA20_50_UNFILTERED),
          claimId: r.additional_claim_ids!.vol_matched_cagr_to_EMA20_50_UNFILTERED!,
          context: `${formatValue(r.market_exposure, 2)}% original exposure · ${formatValue(r.annualized_volatility, 2)}% original annual volatility`})) },
    ];
  }
  if (figureId === 'trend-selection') return [{id: 'familywise', label: 'Familywise result',
    title: 'Every selectable variant missed the threshold', unit: 'p-value', minimum: 0, maximum: 1, ticks: [0, .25, .5, .75, 1], threshold: familywiseThreshold,
    description: `Familywise max-t versus S0. The required maximum is ${familywiseThreshold}; lower is required. These saved selection-adjusted values cannot be replaced by the unadjusted bootstrap results.`,
    rows: rows.map(r => ({label: r.label.replaceAll('_', ' · '), value: numeric(r.value), claimId: r.claim_id,
      context: 'Failed familywise requirement'}))}];
  return [];
}

const localFoldMatrix = trendFoldRows.map(row => ({id: row.period.id,
  label: row.period.id, period: `${row.period.test_start}–${row.period.test_end}`,
  complete: row.period.complete, conditions: row.recordedConditionFlags,
  outcome: !row.period.complete ? 'Excluded · partial' : row.recordedOverallFlag ? 'Passed' : 'Failed',
  href: `#fold-${row.period.id}`, claimId: row.existingDecisionClaimId,
}));

const publicFoldMatrix = figureById.get('trend-folds')!.table.rows.filter(row => row.label.includes('V5')).map(row => {
  const id = row.label.split(' —')[0]!;
  return {id, label:id, period:'Additional period dates are not included in the public edition', complete:row.complete !== false,
    conditions:[null, null, Number(row.value)>0], outcome:row.complete === false?'Excluded · partial':row.conjunctive_fold_pass === true?'Passed':'Failed',
    href:`#fold-${id}`, claimId:row.additional_claim_ids!.conjunctive_fold_pass!};
});

export const foldMatrix = isPublicPublication ? publicFoldMatrix : localFoldMatrix;

// Deliberately small adapter registry; unsupported figures keep their complete original renderer.
export function readingFigure(figureId: string) {
  if (figureId === 'trend-folds') return {kind: 'gate-matrix' as const, rows: foldMatrix,
    conditions: ['Net growth > S0', 'Growth at EMA risk > EMA', 'Sharpe > 0']};
  if (comparisonPanels(figureId).length) return {kind: 'comparison' as const};
  return {kind: 'original' as const};
}
