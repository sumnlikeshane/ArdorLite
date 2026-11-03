import { isPublicPublication } from '../../lib/publication/scope';
import { defineComposition, claimLink as c } from '../../lib/research/presentation';
import { rolloutStudies } from '../explanations/rollout';
import { claimById } from '../../lib/evidence';
const pct=(id:string)=>`${(Number(claimById.get(id)!.value)*100).toFixed(2)}%`;
const chapter=(id:string,number:string,title:string,navLabel:string,paragraphs:string[],figureId?:string)=>({id,number,title,navLabel,paragraphs,figureId,layout:'reading' as const});
export const rolloutCompositions = [
 defineComposition({caseId:'atlas-ssf',headline:'Can a cash-price pattern survive the move to futures?',opening:'text',
 motivation:'A discovery map can identify where an effect appears. Trading it requires a second argument about instruments, fills, costs and capacity.',
 answer:'No strategy was nominated from Atlas. The corrected futures follow-up stood down after execution, net-return and capacity failures.',scope:'Cash discovery and corrected intraday single-stock-futures translation · development evidence',chapters:[
 chapter('discovery','01','A map identifies a question, not a trade','Discovery map',[
 'Atlas groups predeclared daily price states and permitted pairs, then compares their forward cash returns with the same eligible equal-weight universe. Cash prices supply both the liquid-cash and point-in-time futures-membership lenses; membership does not turn those returns into futures returns.',
 `The discovery window is ${c('atlas-window',0)}. Its ${c('atlas-holdout-window',0)} holdout remained unopened for this study. Other research used overlapping calendar dates, so this is no claim of globally untouched history.`,
 `There were ${c('atlas-gates-01',0)} accepted cells and ${c('atlas-gates-06',0)} through the first five gates, but ${c('atlas-gates-07',0)} formal nominations. Cells overlap across states and horizons. The counts describe coverage, not independent discoveries.`],'atlas-gates'),
 chapter('translation','02','Actual futures prices change the economics','Futures economics',[
 'The separate follow-up tests a bottom-return-tail and low-close-location pattern as near-month single-stock futures shorts: observe cash features after close, enter the next session open and cover at that non-expiry session’s settlement. Compare against the equal-weight valid PIT-F&O futures long return on that entry session.',
 `Execution-QA v1.0.1 retains ${c('ssf-signal-event-count',0)} signals and ${c('ssf-actual-ssf-fill-count',0)} fills. Equal-event weighting applies to both returns and costs. Exact-date bans and expiry entries without a frozen executable cover are unfillable.`,
 `Gross excess of ${c('ssf-economics-01',2,' bps')} becomes ${c('ssf-economics-04',2,' bps')} at primary central impact and ${c('ssf-economics-05',2,' bps')} under doubled impact, per filled event. One basis point is one hundredth of a percentage point. Positive gross economics did not survive the primary cost line.`],'ssf-economics'),
 chapter('capacity','03','The book must fit the binding convention','Capacity and gates',[
 `Equal-notional median daily capacity is ₹${c('ssf-capacity-01',2)} crore versus the frozen ₹${c('ssf-gate-minimum-median-daily-book-capacity-cr-at-10pct',0)} crore hurdle. The ₹${c('ssf-capacity-04',2)} crore ADV-sum diagnostic cannot certify capacity for the equal-event book.`,
 `Corrected fillability is <a href="#claim-ssf-actual-ssf-fill-rate">${pct('ssf-actual-ssf-fill-rate')}</a>, below <a href="#claim-ssf-gate-minimum-actual-ssf-fill-rate">${pct('ssf-gate-minimum-actual-ssf-fill-rate')}</a>. The <a href="#claim-ssf-gate-vector">complete saved gate vector</a> also records interaction, primary-net mean/t and regime failures. Passing gross t cannot override them.`],'ssf-capacity'),
 ]}),
 defineComposition({caseId:'momentum-v2',headline:'A significant spread—but was there independent alpha?',opening:'text',
 motivation:'A long/short portfolio can execute and earn positive raw return while still carrying familiar factor exposures.',answer:'Execution passed its stress tests. Primary residual alpha was negative; Phase 1 failed and out-of-sample testing stayed closed.',scope:'Monthly cash-long / futures-short momentum book · reconstructed development report',chapters:[
 chapter('execution','01','First ask whether the spread can execute','Execution',[
 'The book buys the strongest past-return quintile and shorts the weakest. Formation uses lagged adjusted prices, skipping the recent month. Rebalance-day prices do not enter the signal; realized holdings belong to the following hold context.',
 `The report covers ${c('momentum-window',0)} and ${c('momentum-rebalances',0)} monthly rebalances. Liquid cash names intersect the point-in-time F&O pool; dividend-inclusive cash longs and futures settlement shorts retain ban, roll and lot constraints.`,
 `After correcting cash-leg impact sizing to cash traded value and rejecting non-finite names, the three saved mean-test statistics were ${c('momentum-execution-01')}, ${c('momentum-execution-02')} and ${c('momentum-execution-03')}. All exceeded the ${c('momentum-phase0-t-threshold',1)} hurdle. Newey–West inference used ${c('momentum-hac-lags',0)} lags to account for serial dependence.`,
 isPublicPublication ? '<a href="/research/walkthrough/">The optional signal walkthrough</a> uses fictional prices and an independent browser adaptation with source identities, locators and hashes. Original Python excerpts are omitted and are not reverified here. It explains mechanics, not historical returns.' : '<a href="/research/walkthrough/">The optional signal walkthrough</a> uses fictional prices and a browser adaptation beside exact Python excerpts. It explains mechanics, not historical returns.'
 ],'momentum-execution'),
 chapter('exposures','02','A neutral wrapper can retain factor exposure','Factor exposures',[
 'Phase 1 asks whether the daily book has positive return unexplained by market, value-proxy and illiquidity factors at central impact. A four-factor diagnostic adds published momentum exposure.',
 `Market beta ${c('momentum-exposures-01')} belongs to the three-factor model; momentum beta ${c('momentum-exposures-02')} belongs to the four-factor diagnostic. Beta measures sensitivity in its own specification. These coefficients cannot be stacked into one decomposition.`],'momentum-exposures'),
 chapter('attribution','03','Raw return cannot replace the gated quantity','Residual alpha',[
 `The raw book’s ${c('momentum-alpha-01',2,'% per year')} is descriptive. Primary residual alpha was ${c('momentum-alpha-02',2,'% per year')}, with HAC t ${c('momentum-alpha-02-reported-hac-t')}. Both positive alpha and sufficient significance were required; neither passed.`,
 'The report and postmortem were reconstructed on 4 July 2026 from earlier commits and session memory. Complete saved return and regression inputs are absent. Disputed book-minus-raw-momentum arithmetic is omitted; no confidence interval or unseen out-of-sample result is reconstructed.'
 ],'momentum-alpha'),
 ]}),
 defineComposition({caseId:'swing-autopsy',headline:'Could better exits or corrected accounting rescue the swing book?',opening:'text',
 motivation:'Favorable price movement is useful only if a rule can retain it after costs, without hindsight or dependence on a few winners.',answer:'V1 lost net of modeled costs. Corrected V2 had a positive primary mean but failed robustness co-gates; KILL was unchanged.',scope:'Mechanical cash-share replay · spent development history · no qualifying forward confirmation',chapters:[
 chapter('risk','01','Keep trade risk and accounting explicit','Risk and accounting',[
 'Weekly structure and relative-strength decisions used truncated history, then conservative daily-bar breakout or resting-pullback fills. This does not test discretionary judgment, live execution or earnings-severity decisions.',
 `The window is ${c('swing-window',0)}. R is profit or loss divided by initial planned trade risk: it is not percent portfolio return. V1 generated ${c('swing-v1-events',0)} events and ${c('swing-v1-fills',0)} scored fills, with ${c('swing-expectancy-01',4,'R')} gross and ${c('swing-expectancy-02',4,'R')} net per filled trade.`,
 'V1 applies conservative per-winning-trade tax without annual loss netting. V2 corrects annual net tax in constant-risk-per-trade units; an earlier rupee-per-share ratio had price-weighted trades. Designs, exit management and samples also changed, so their difference does not isolate an accounting effect.'
 ],'swing-expectancy'),
 chapter('excursion','02','Hindsight opportunity is not an executable exit','Excursion and realization',[
 `Time exits had ${c('swing-excursion-05',4,'R')} mean maximum favorable excursion but ${c('swing-excursion-06',4,'R')} realized net, with ${c('swing-time-giveback',4,'R')} mean giveback. Maximum favorable excursion is the best movement seen afterward, unavailable as a known decision-time exit.`,
 'Grouping by the realized exit reason describes these fills. It cannot establish that changing a rule would causally retain the apparent opportunity.'
 ],'swing-excursion'),
 chapter('policies','03','The full policy search stayed negative','Fourteen policies',[
 `All ${c('swing-policy-count',0)} saved whole-book rows include the baseline; all are negative, from ${c('swing-policy-min',4,'R')} to ${c('swing-policy-max',4,'R')} net per filled trade. The grid reuses V1 fills and is an in-sample diagnostic.`,
 'In the saved labels, bank means take profit, BE means break-even, and time10 means a ten-session time exit. The full original labels and exact means remain below. Favorable subset maxima and a hindsight peak-exit ceiling are excluded; they cannot establish a recommended policy.'
 ],'swing-policies'),
 chapter('correction','04','A positive corrected mean did not clear the co-gates','Corrected V2 decision',[
 `V2 used ${c('swing-v2-fills',0)} fills. Its primary year-net mean was ${c('swing-expectancy-03',4,'R')}, but the trimmed-10% mean was ${c('swing-expectancy-04',4,'R')}. Trimming tests whether the body of trades supports the average after removing extremes.`,
 `The uncertainty interval [${c('swing-v2-ci-low',4,'R')}, ${c('swing-v2-ci-high',4,'R')}] includes zero; shuffled-date placebo p is ${c('swing-v2-placebo-p',4)}. These uncertainty/placebo/regime diagnostics use the per-winning-trade tax stress series, separate from the primary year-net mean.`,
 'The trimmed-body, uncertainty and placebo requirements failed. The replay was kill-only on spent history, even if all metrics had looked favorable. Bear expectancy and regime-sign metric are null; a passing mechanical regime check cannot create an observed bear sample.'
 ]),
 ]}),
 defineComposition({caseId:'delivery-insider',headline:'The events coincided. Did the combination predict returns?',opening:'text',
 motivation:'A strong association can support a story about accumulation without showing that a public observer could predict the next return.',answer:'Co-occurrence was strong. The registered forward interaction supplied no positive incremental edge, and the campaign remained KILLED.',scope:'Validated primary event set · gross cash and SSF settlement-proxy comparisons',chapters:[
 chapter('events','01','Use the public information clock—and retain the discrepancy','Event definition',[
 'A joint event pairs preceding unusual delivery with public clusters of distinct insider purchases. Public disclosure, not the private transaction date, sets the observation clock; intended entry is the following session.',
 `The archived definition uses z > ${c('delivery-z-threshold',1)}, at least ${c('delivery-abs-floor',0)} percentage points of absolute lift, a lagged ${c('delivery-baseline',0)}-session baseline and ${c('delivery-refractory',0)} calendar days of refractory separation. The study covers ${c('delivery-window',0)} and was registered/run on 19/20 June 2026.`,
 '<strong>Dated source discrepancy:</strong> the currently captured builder checks an absolute delivery-ratio level, despite lift wording; the disclosure helper counts recent actionable disclosure dates rather than an established exchange-session window. Exact June run-source binding is unresolved. The complete <a href="#delivery-construction-discrepancy">31 October correction and locators</a> remain in the original narrative. Neither current code nor this guide chooses a historical definition.'
 ]),
 chapter('cash','02','Association and forward return answer different questions','Cash comparison',[
 `The ${c('delivery-association',1)} null-standard-deviation enrichment measures co-occurrence under within-symbol permutation. It is not a forward-return t statistic. The ${c('delivery-validated-events',0)} constructed surges precede fill filtering; the joint forward cash sample has ${c('delivery-cash-03-fillable-n',0)} fillable events.`,
 `Over ${c('delivery-primary-horizon',0)} sessions, cash excess against each same-window equal-weight universe was ${c('delivery-cash-01',0,' bps')} for insider parents, ${c('delivery-cash-02',0,' bps')} for delivery parents and ${c('delivery-cash-03',0,' bp')} for the joint event, whose t statistic was ${c('delivery-cash-03-reported-cash-t')}. Event-date cluster-robust inference addresses a different question from the permutation association test.`
 ],'delivery-cash'),
 chapter('proxy','03','A settlement proxy is not an open fill','Futures proxy',[
 'The universe uses names ever observed in the futures panel, not certified historical point-in-time membership. The driver uses settlement-to-settlement prices and artificial narrow high/low values to bypass solid-bar rejection.',
 'Read these futures-path aggregates as proxy diagnostics. They do not certify next-open futures fills, executable shorting or a fully cost-swept book.'
 ],'delivery-ssf'),
 chapter('increment','04','The registered increment did not support the mechanism','Predictive increment',[
 `Surge-preceded clusters had ${c('delivery-interaction-01',0,' bp')} forward cash excess versus ${c('delivery-interaction-02',0,' bps')} without a surge. The interaction estimate was ${c('delivery-interaction-03',0,' bps')}, t ${c('delivery-interaction-03-reported-clustered-t')}; it supplied no positive incremental edge.`,
 `The source’s required-sample estimate rose to ${c('delivery-required-n',0)} at the near-zero joint mean, far beyond the observed joint sample. This is not a new power calculation. Post-hoc threshold and prior-return subsets are not promoted as passing candidates.`
 ],'delivery-interaction'),
 ]}),
];
export const rolloutById = new Map(rolloutCompositions.map(c=>[c.caseId,c]));
export const rolloutStudyById = new Map(rolloutStudies.map(s=>[s.id as string,s]));
