import { localExplanation } from '../../lib/publication/local-context';
import { isPublicPublication } from '../../lib/publication/scope';
import { defineComposition, claimLink as cite, claimText } from '../../lib/research/presentation';
import { studyById, familywiseThreshold } from '../../lib/publication';
const study = studyById.get('trend-quality')!;

// Authored arrangement of the admitted pilot explanation, not a second research record.
export const trendComposition = defineComposition({
  caseId: 'trend-quality', opening: 'split', scope: 'Historical cash-share portfolio · Reused development history',
  headline: 'Does a smoother price path improve a trend signal?',
  answer: 'The selected metrics did not survive the family gates.',
  motivation: 'A rising price can follow a steady path or an erratic one. If that difference adds useful information, it should improve on the trend signal already in use—and survive the same research gates.',
  chapters: [
    { id: 'information', number: '01', navLabel: 'The idea & the test', title: 'Separate a rising price from a smooth rise.', layout: 'split', supportAfter: 3,
      paragraphs: [
        'The starting activity was buying company shares whose past prices met a slow upward-trend rule, with cash retained when the portfolio could not invest. Here “quality” means past price-path smoothness, rather than company fundamentals or the quality of the research.',
        isPublicPublication ? 'The unfiltered slow-trend portfolio supplies the baseline. The quality filter asks whether the preceding path adds information beyond that existing ranking; it does not replace the direction and ranking rules.' : localExplanation('trendBaseRule'),
        `${study.mechanism} The recorded measure fits a straight line to past log-adjusted prices over time and measures how closely those observations follow it: regression <strong>R²</strong>. The trend rule supplies direction; smoothness alone does not mean a rising price.`,
        'A <em>fold</em> pairs a training interval with a later test interval: earlier slow-trend onset events set the quality thresholds, then those thresholds stay fixed during the test. Expanding training uses more prior history for each later test. It must not learn a threshold from the period being tested.',
        isPublicPublication ? study.baseline : `${study.baseline}${localExplanation('trendThresholdSuffix')}`,
        `Unfiltered <strong>S0</strong> asks whether adding quality improves on the base trend portfolio. Unfiltered <strong>EMA20/50</strong> asks whether it improves on an established moving-average timing alternative after comparing risk. An EMA gives more weight to recent prices; this comparator uses its short and long averages to time entries. The quality-filtered EMA diagnostic cannot replace this required unfiltered comparison. Buy-and-hold supplies an exposure/risk reference.`,
        `${cite('trend-training-window',0,'','Panel and training window')} · ${cite('trend-testing-start',0,'','Walk-forward test start')} · ${cite('trend-base-slippage',0,' bps per side','Saved costs and slippage')}`,
      ],
      support: {kind: 'process', title: 'The information boundary', note: 'Conceptual sequence of the recorded method. No simulated prices or historical return path.', steps: [
        {label: 'Earlier training', text: 'Learn quality thresholds from prior onset events only.'},
        {label: 'Through t−1', text: 'Measure the preceding price path. The decision session is excluded.'},
        {label: 'After the close', text: 'Make the weekly portfolio decision using available information.'},
        {label: 'Next exact open', text: 'Apply the execution rules. Missing sessions stay missing.'},
      ]},
    },
    { id: 'comparison', number: '02', navLabel: 'Performance in context', title: 'Attractive metrics are the beginning of the question.', layout: 'split',
      paragraphs: [
        `V5’s ${cite('trend-controls-03',2,'% CAGR')} and ${cite('trend-controls-03-sharpe',2,' Sharpe')} came with ${cite('trend-controls-03-market-exposure',2,'% exposure')} and ${cite('trend-controls-03-maximum-drawdown',2,'% maximum drawdown')}. Raw buy-and-hold CAGR was not a like-risk comparison.`,
        `At EMA’s risk, recorded scaled CAGR was ${cite('trend-controls-03-vol-matched-cagr-to-EMA20-50-UNFILTERED',2,'% for V5')} versus ${cite('trend-controls-02',2,'% for unfiltered EMA')}. That descriptive improvement could not replace the information and robustness gates.`,
        'Read growth alongside the amount of capital invested and the variability of returns. The comparison below switches between the saved raw and risk-capped aggregates; it does not reconstruct the absent daily returns.',
      ],
      support: {kind: 'roles', title: 'Different controls, different questions', rows: [
        {label: 'S0 · baseline', purpose: 'Does adding quality improve on the unfiltered trend portfolio?'},
        {label: 'EMA20/50 · binding control', purpose: 'Does it improve on an alternative timing rule after accounting for risk?'},
        {label: 'Buy-and-hold · reference', purpose: 'What changes when capital stays almost fully invested?'},
        {label: 'V0 · observed reference', purpose: 'Already seen. Repeating it is not fresh confirmation.'},
      ]}, figureId: 'trend-controls',
    },
    { id: 'selection', number: '03', navLabel: 'Information & selection', title: 'A positive return does not establish extra information.', layout: 'split',
      paragraphs: [
        'A portfolio can earn a positive return even if the added quality feature contributes nothing beyond the existing trend signal. The direct test therefore compared future returns while accounting for the existing ranking and other registered controls. It asks about the extra information in quality, rather than whether the entire portfolio happened to grow.',
        `The primary direct-quality test had ${cite('trend-direct20-two-way-clustered-t',6,'','two-way clustered t = '+claimText('trend-direct20-two-way-clustered-t',6))} and ${cite('trend-direct20-bonferroni-p-value',1,'','Bonferroni p = '+claimText('trend-direct20-bonferroni-p-value',1))}. Incremental information was not established.`,
        `Choosing a favorable member after trying several variants can also make an improvement look stronger than it is. The familywise selection test addresses that shared selection problem. V5’s ${cite('trend-selection-05',6,'','familywise max-t p-value')} exceeded the required maximum of <strong>${familywiseThreshold}</strong>, read from the reviewed figure’s rule. All selectable variants failed it.`,
      ],
      support: {kind: 'finding', title: 'Two tests with different jobs', text: 'The direct regression asks whether quality contributes information beyond existing controls. Familywise adjustment asks whether selection within the tested family could explain an apparent improvement. Positive selected performance overrides neither.'},
      figureId: 'trend-selection',
    },
    { id: 'stability', number: '04', navLabel: 'Complete folds & decision', title: 'Success had to repeat across complete periods.', layout: 'wide',
      paragraphs: [
        'The study also required repeated success across complete test periods, rather than allowing one favorable stretch to carry the result. A complete period and a successful period are different things.',
        `V5 passed the conjunctive requirements in ${cite('trend-v5-complete-passes',0)} of ${cite('trend-complete-folds',0)} complete folds; ${cite('trend-complete-required',0)} were required. <code>wf5_partial</code> remained descriptive and never counted as a fifth complete fold. An absent EMA control-row gate stays unavailable.`,
        isPublicPublication ? 'Each complete candidate period requires both saved return comparisons and positive Sharpe. The archived table retains the overall decision, but omits the return inputs needed to identify individual failed conditions. Positive Sharpe alone cannot establish a pass.' : localExplanation('trendFoldConditions'),
        `The ${cite('trend-v5-gates',0,'','complete saved gate vector')} also retains failed concentration, mechanism and selection gates. The final decision remained <strong>kill-quality-family</strong> on reused development history, with no live or shadow authorization.`,
      ], figureId: 'trend-folds',
    },
  ],
});
