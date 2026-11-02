import { localExplanation } from '../../lib/publication/local-context';
import { isPublicPublication } from '../../lib/publication/scope';
import { variantContext } from '../../lib/publication/supplement';
// Authored publication context. Values and archived outcomes remain canonical.
export const pilotStudies = [
  {
    id: 'trend-quality',
    researchObject: 'A historical portfolio that buys liquid listed company shares when their prices meet a slow upward-trend rule, and retains cash when it cannot invest.',
    question: 'Does the smoothness of the preceding price path add useful information beyond the existing trend ranking?',
    mechanism: 'A rise with fewer departures from its fitted path might identify a different group of opportunities from a ranking based on past return and volatility. The study tested that extra information rather than assuming a smoother-looking chart would produce better future returns.',
    baseline: variantContext,
    qualification: 'These are selected results on reused development history. Positive return or Sharpe cannot establish that quality adds information. V0 and quality-filtered EMA are not eligible substitutes for the unfiltered controls. Complete and partial periods are separate; daily NAV is absent and TSS predecessor execution identity remains unresolved.',
    explanationHref: '/research/cases/trend-quality/#information',
    comparisonHref: '/research/cases/trend-quality/#comparison',
    evidencePath: 'content/cases/trend-quality.md',
  },
  {
    id: 'price-bridge',
    researchObject: 'Historical share-price observations adjusted so prices before and after corporate actions can be compared and connected to their exact raw observations.',
    question: 'Can the adjustment be repaired without inventing missing prices, and do the repaired observations also meet the independent source-rights gate?',
    mechanism: 'A false inferred split applies an unjustified factor to earlier prices. Repeated factors can make small positive adjusted prices round to zero. A ratio using a zero endpoint cannot supply a finite positive bridge.',
    baseline: 'The before/after comparison concerns numerical adjustment and exact raw linkage in a separate repair vintage. It is a data-engineering comparison with no strategy returns.',
    qualification: 'Technical validity and source rights are independent. Observed, valid and linked counts overlap and cannot be added; zero invalid observed bridges does not establish a dense panel. Exact-session gaps and the missing earlier exception receipt remain. No performance claim or rights grant follows.',
    explanationHref: '/research/cases/price-bridge/#repair',
    comparisonHref: '/research/cases/price-bridge/#permission',
    evidencePath: 'content/cases/price-bridge.md',
  },
] as const;

export const pilotFigureCaptions: Record<string, string> = {
  'trend-controls': 'Did the quality portfolio improve on the relevant alternatives? Compare growth together with exposure, volatility and the saved risk-matched return. These selected historical metrics describe the portfolios; they do not establish the additional-information hypothesis or clear the study gates.',
  'trend-selection': 'Could selecting a favorable variant from the tested family explain the apparent improvement? Every selectable variant failed the familywise requirement. A lower unadjusted p-value cannot replace the familywise result.',
  'trend-folds': isPublicPublication ? 'Did the result hold across the complete periods? The archived table retains Sharpe, completeness and the overall decisions. The underlying return inputs are not included in this public edition. Positive Sharpe alone cannot decide the row; the partial period is descriptive and excluded from the complete-period count.' : localExplanation('trendFoldCaption'),
  'bridge-invalid': 'Did the repair remove invalid bridges among observed rows? Compare the saved before/after counts. This checks numerical validity; it does not show investment performance, complete session coverage or permission to use the sources.',
  'bridge-linkage': 'Do the observed rows have valid prices and exact source linkage? These counts describe overlapping properties of the same observations. They must not be added or read as proof that every required symbol-session exists.',
  'bridge-certification': 'Did both independent certifications pass? Numerical validity passed while source rights failed. The encoded flags are certification states, not returns or performance scores; technical success cannot override the rights block.',
};

export const metricExplanations = {
  cagr: { title: 'Net annual compound growth', meaning: 'The annual compound rate summarises growth after the recorded costs over the test history. It is not a forecast or evidence that the added feature caused the return.' },
  sharpe: { title: 'Sharpe ratio', meaning: 'The saved ratio summarises return relative to variability. A positive ratio alone cannot establish the quality hypothesis or satisfy the separate return comparisons.' },
  drawdown: { title: 'Maximum drawdown', meaning: 'The largest recorded peak-to-trough loss summarises a historical downside measure. The underlying daily path is unavailable; this value cannot supply an equity curve.' },
  exposure: { title: 'Average market exposure', meaning: 'This describes how much portfolio capital was invested on average. Comparing raw growth against an almost fully invested reference without this context can mislead.' },
  volatility: { title: 'Annualized volatility', meaning: 'This measures variability of the recorded portfolio returns on an annual scale. It is the risk dimension used by the saved volatility-matched comparison, not a guarantee about future losses.' },
  scaledCagr: { title: 'Growth with the EMA risk cap', meaning: 'The saved calculation reduces candidate daily-return volatility to EMA’s level when necessary and never scales risk up. The publication displays that aggregate; it does not rescale or reconstruct missing daily returns.' },
  familyP: { title: 'Familywise selection p-value', meaning: 'This is the saved test accounting for selection within the eligible variant family. A positive selected return cannot substitute for passing it.' },
  rawP: { title: 'Unadjusted bootstrap p-value', meaning: 'This unadjusted result is reference evidence. It does not replace the familywise selection requirement.' },
  complete: { title: 'Period completeness', meaning: 'Completeness describes whether this is one of the full evaluation periods. It does not say whether a candidate succeeded.' },
  foldGate: { title: 'Archived period decision', meaning: isPublicPublication ? 'A complete candidate period requires both return comparisons and positive Sharpe. The archived derivative omits the underlying return inputs. An overall false flag does not identify which individual condition failed; a partial-period flag remains descriptive.' : localExplanation('trendFoldGateDefinition') },
  count: { title: 'Recorded count', meaning: 'This is a saved count for the named population, not an independent-strategy count or a performance estimate.' },
  certification: { title: 'Certification state', meaning: 'This records one certification dimension. Numerical validity and source-rights readiness must each be satisfied independently; neither is a strategy-performance measure.' },
  reference: { title: 'Study reference value', meaning: 'This exact value belongs to the named study rule, clock or diagnostic. Its scope is given by the archived description and qualifications below.' },
} as const;
